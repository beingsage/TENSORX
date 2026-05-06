from __future__ import annotations

from app.core.config import settings
from app.models.schemas import AddressResolution, SearchRequest
from app.services.http import fetch_json
from app.services.utils import safe_float


def _address_lookup(address: dict) -> dict[str, str | None]:
    return {
        "locality": address.get("suburb")
        or address.get("neighbourhood")
        or address.get("village")
        or address.get("hamlet"),
        "city": address.get("city") or address.get("town") or address.get("municipality"),
        "district": address.get("county") or address.get("state_district"),
        "state": address.get("state"),
        "country": address.get("country"),
        "postcode": address.get("postcode"),
    }


async def resolve_location(query: SearchRequest) -> AddressResolution:
    if query.latitude is not None and query.longitude is not None:
        payload = await fetch_json(
            f"{settings.nominatim_base_url}/reverse",
            params={
                "lat": query.latitude,
                "lon": query.longitude,
                "format": "jsonv2",
                "addressdetails": 1,
            },
            headers={"Accept": "application/json"},
        )
        address = payload.get("address", {})
        details = _address_lookup(address)
        return AddressResolution(
            display_name=payload.get("display_name"),
            address=query.address or payload.get("display_name"),
            latitude=safe_float(payload.get("lat")) or query.latitude,
            longitude=safe_float(payload.get("lon")) or query.longitude,
            locality=details["locality"],
            city=details["city"],
            district=details["district"],
            state=details["state"],
            country=details["country"],
            postcode=details["postcode"],
            confidence=0.95,
            raw=payload,
        )

    payload = await fetch_json(
        f"{settings.nominatim_base_url}/search",
        params={
            "q": query.address,
            "format": "jsonv2",
            "limit": 1,
            "addressdetails": 1,
        },
        headers={"Accept": "application/json"},
    )
    if not payload:
        raise ValueError("No geocoding result found for the supplied address.")

    best = payload[0]
    address = best.get("address", {})
    details = _address_lookup(address)
    return AddressResolution(
        display_name=best.get("display_name"),
        address=query.address,
        latitude=safe_float(best.get("lat")) or 0.0,
        longitude=safe_float(best.get("lon")) or 0.0,
        locality=details["locality"],
        city=details["city"],
        district=details["district"],
        state=details["state"],
        country=details["country"],
        postcode=details["postcode"],
        confidence=0.9,
        raw=best,
    )

