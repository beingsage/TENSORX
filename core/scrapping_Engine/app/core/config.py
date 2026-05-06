from __future__ import annotations

import os
from dataclasses import dataclass


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("SCRAPPING_ENGINE_APP_NAME", "Collateral Scraping Engine")
    app_version: str = os.getenv("SCRAPPING_ENGINE_APP_VERSION", "0.1.0")
    app_env: str = os.getenv("SCRAPPING_ENGINE_ENV", "development")
    host: str = os.getenv("SCRAPPING_ENGINE_HOST", "0.0.0.0")
    port: int = _env_int("SCRAPPING_ENGINE_PORT", 8010)
    cors_allow_all: bool = _env_bool("SCRAPPING_ENGINE_CORS_ALLOW_ALL", True)
    request_timeout_seconds: float = _env_float("SCRAPPING_ENGINE_TIMEOUT_SECONDS", 20.0)
    default_radius_km: float = _env_float("SCRAPPING_ENGINE_DEFAULT_RADIUS_KM", 3.0)
    default_max_results: int = _env_int("SCRAPPING_ENGINE_DEFAULT_MAX_RESULTS", 20)
    user_agent: str = os.getenv(
        "SCRAPPING_ENGINE_USER_AGENT",
        (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 "
            "CollateralScrapingEngine/0.1"
        ),
    )
    contact_email: str | None = os.getenv("SCRAPPING_ENGINE_CONTACT_EMAIL")
    nominatim_base_url: str = os.getenv(
        "SCRAPPING_ENGINE_NOMINATIM_URL",
        "https://nominatim.openstreetmap.org",
    )
    overpass_base_url: str = os.getenv(
        "SCRAPPING_ENGINE_OVERPASS_URL",
        "https://overpass-api.de/api/interpreter",
    )
    magicbricks_base_url: str = os.getenv(
        "SCRAPPING_ENGINE_MAGICBRICKS_BASE_URL",
        "https://www.magicbricks.com",
    )
    enable_magicbricks: bool = _env_bool("SCRAPPING_ENGINE_ENABLE_MAGICBRICKS", True)
    enable_99acres: bool = _env_bool("SCRAPPING_ENGINE_ENABLE_99ACRES", False)
    enable_housing: bool = _env_bool("SCRAPPING_ENGINE_ENABLE_HOUSING", False)


settings = Settings()

