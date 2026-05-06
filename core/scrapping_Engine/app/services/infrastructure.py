from __future__ import annotations

import json
import subprocess

from app.core.config import settings
from app.models.schemas import AddressResolution, LocationEnrichment, PoiBucket
from app.services.http import post_form_json
from app.services.utils import haversine_km


def _categorize(tags: dict[str, str]) -> str | None:
    amenity = tags.get("amenity")
    railway = tags.get("railway")
    highway = tags.get("highway")
    public_transport = tags.get("public_transport")
    shop = tags.get("shop")

    if amenity in {"school", "college", "university"}:
        return "education"
    if amenity in {"hospital", "clinic"}:
        return "healthcare"
    if railway in {"station", "halt"} or public_transport in {"station", "stop_position"}:
        return "rail_transit"
    if highway in {"bus_stop", "primary", "trunk"} or amenity == "bus_station":
        return "road_transit"
    if shop in {"mall", "supermarket"}:
        return "commercial"
    return None


def _score_from_buckets(buckets: list[PoiBucket]) -> float:
    weight_map = {
        "education": 0.2,
        "healthcare": 0.25,
        "rail_transit": 0.3,
        "road_transit": 0.15,
        "commercial": 0.1,
    }
    score = 0.0
    for bucket in buckets:
        weight = weight_map.get(bucket.category, 0)
        count_component = min(bucket.count / 10, 1.0)
        distance_component = 1.0
        if bucket.nearest_distance_km is not None:
            distance_component = max(0.0, 1 - min(bucket.nearest_distance_km / 5, 1.0))
        score += weight * ((count_component * 0.6) + (distance_component * 0.4))
    return round(score * 100, 2)


async def enrich_location_context(
    resolved_location: AddressResolution,
    *,
    radius_meters: int = 2500,
) -> LocationEnrichment:
    query = f"""
[out:json][timeout:25];
(
  node(around:{radius_meters},{resolved_location.latitude},{resolved_location.longitude})["amenity"];
  way(around:{radius_meters},{resolved_location.latitude},{resolved_location.longitude})["amenity"];
  relation(around:{radius_meters},{resolved_location.latitude},{resolved_location.longitude})["amenity"];
  node(around:{radius_meters},{resolved_location.latitude},{resolved_location.longitude})["railway"];
  way(around:{radius_meters},{resolved_location.latitude},{resolved_location.longitude})["railway"];
  node(around:{radius_meters},{resolved_location.latitude},{resolved_location.longitude})["public_transport"];
  way(around:{radius_meters},{resolved_location.latitude},{resolved_location.longitude})["public_transport"];
  node(around:{radius_meters},{resolved_location.latitude},{resolved_location.longitude})["highway"];
  way(around:{radius_meters},{resolved_location.latitude},{resolved_location.longitude})["highway"];
  node(around:{radius_meters},{resolved_location.latitude},{resolved_location.longitude})["shop"];
  way(around:{radius_meters},{resolved_location.latitude},{resolved_location.longitude})["shop"];
);
out center tags;
""".strip()

    warnings: list[str] = []

    try:
        try:
            payload = await post_form_json(
                settings.overpass_base_url,
                headers={"Accept": "application/json"},
                data={"data": query},
            )
        except Exception:
            # Overpass may reject common Python HTTP clients in some environments.
            # `curl` succeeds reliably here, so keep a subprocess fallback.
            result = subprocess.run(
                [
                    "curl",
                    "-sS",
                    "--data-urlencode",
                    f"data={query}",
                    settings.overpass_base_url,
                ],
                capture_output=True,
                check=True,
                text=True,
            )
            payload = json.loads(result.stdout)
    except Exception as error:  # pragma: no cover - network dependent
        warnings.append(f"Overpass lookup failed: {error}")
        return LocationEnrichment(
            resolution=resolved_location,
            poi_buckets=[],
            infrastructure_score=0.0,
            warnings=warnings,
        )

    grouped: dict[str, PoiBucket] = {}
    for element in payload.get("elements", []):
        tags = element.get("tags") or {}
        category = _categorize(tags)
        if not category:
            continue

        latitude = element.get("lat") or (element.get("center") or {}).get("lat")
        longitude = element.get("lon") or (element.get("center") or {}).get("lon")
        if latitude is None or longitude is None:
            continue

        distance = haversine_km(
            resolved_location.latitude,
            resolved_location.longitude,
            float(latitude),
            float(longitude),
        )
        bucket = grouped.setdefault(category, PoiBucket(category=category))
        bucket.count += 1
        if bucket.nearest_distance_km is None or distance < bucket.nearest_distance_km:
            bucket.nearest_distance_km = round(distance, 2)
        name = tags.get("name")
        if name and len(bucket.sample_names) < 3:
            bucket.sample_names.append(name)

    buckets = sorted(grouped.values(), key=lambda item: item.category)
    return LocationEnrichment(
        resolution=resolved_location,
        poi_buckets=buckets,
        infrastructure_score=_score_from_buckets(buckets),
        warnings=warnings,
    )
