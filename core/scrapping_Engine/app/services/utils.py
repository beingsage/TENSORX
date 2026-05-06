from __future__ import annotations

import json
import math
from datetime import UTC, datetime


def safe_float(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip().replace(",", "")
        cleaned = "".join(ch for ch in cleaned if ch.isdigit() or ch in ".-")
        if not cleaned:
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def safe_int(value: object) -> int | None:
    numeric = safe_float(value)
    if numeric is None:
        return None
    return int(round(numeric))


def normalize_text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def haversine_km(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    radius_km = 6371.0
    lat_a = math.radians(latitude_a)
    lat_b = math.radians(latitude_b)
    delta_lat = math.radians(latitude_b - latitude_a)
    delta_lon = math.radians(longitude_b - longitude_a)

    anchor = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat_a) * math.cos(lat_b) * math.sin(delta_lon / 2) ** 2
    )
    return radius_km * (2 * math.atan2(math.sqrt(anchor), math.sqrt(1 - anchor)))


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=UTC)
        return parsed
    except ValueError:
        return None


def days_since(value: datetime | None, reference: datetime | None = None) -> int | None:
    if value is None:
        return None
    now = reference or datetime.now(UTC)
    delta = now - value.astimezone(UTC)
    return max(0, delta.days)


def median(values: list[float]) -> float | None:
    if not values:
        return None
    sorted_values = sorted(values)
    midpoint = len(sorted_values) // 2
    if len(sorted_values) % 2:
        return sorted_values[midpoint]
    return (sorted_values[midpoint - 1] + sorted_values[midpoint]) / 2


def derive_quality_score(fields: dict[str, object]) -> float:
    checks = [
        fields.get("price"),
        fields.get("square_feet"),
        fields.get("bedrooms"),
        fields.get("latitude"),
        fields.get("longitude"),
        fields.get("listing_url"),
        fields.get("locality"),
        fields.get("project_name"),
    ]
    present = sum(1 for value in checks if value not in (None, "", []))
    return round(present / len(checks), 2)


def extract_balanced_json_object(text: str, marker: str) -> dict:
    start_index = text.find(marker)
    if start_index < 0:
        raise ValueError(f"Marker not found: {marker}")

    object_start = text.find("{", start_index)
    if object_start < 0:
        raise ValueError(f"No JSON object found after marker: {marker}")

    depth = 0
    in_string = False
    escape = False

    for position in range(object_start, len(text)):
        character = text[position]

        if in_string:
            if escape:
                escape = False
            elif character == "\\":
                escape = True
            elif character == '"':
                in_string = False
            continue

        if character == '"':
            in_string = True
            continue

        if character == "{":
            depth += 1
        elif character == "}":
            depth -= 1
            if depth == 0:
                payload = text[object_start : position + 1]
                return json.loads(payload)

    raise ValueError(f"Could not extract JSON object after marker: {marker}")

