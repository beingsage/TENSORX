from __future__ import annotations

import asyncio

from app.core.config import settings
from app.models.schemas import (
    AggregateSearchResponse,
    ListingRecord,
    MarketStats,
    ProviderAvailability,
    ProviderSearchResponse,
    SearchRequest,
)
from app.services.geocoding import resolve_location
from app.services.infrastructure import enrich_location_context
from app.services.providers.base import BaseListingProvider
from app.services.providers.magicbricks import MagicBricksProvider
from app.services.providers.null_providers import PassiveProvider


def build_provider_registry() -> dict[str, BaseListingProvider]:
    providers: dict[str, BaseListingProvider] = {
        "magicbricks": MagicBricksProvider(),
        "99acres": PassiveProvider(
            slug="99acres",
            name="99acres",
            availability=ProviderAvailability.blocked,
            mechanism="HTML pages appear anti-bot protected from the current environment",
            notes="Keep behind a feature flag until a stable access strategy exists.",
            warning="99acres is currently marked blocked in this environment and returns no listings.",
        ),
        "housing": PassiveProvider(
            slug="housing",
            name="Housing.com",
            availability=ProviderAvailability.blocked,
            mechanism="HTML pages currently return security blocks from the current environment",
            notes="Keep behind a feature flag until browser/session handling is hardened.",
            warning="Housing.com is currently marked blocked in this environment and returns no listings.",
        ),
    }

    if not settings.enable_99acres:
        providers["99acres"].availability = ProviderAvailability.disabled
        providers["99acres"].warning = "99acres provider is disabled by configuration."
    if not settings.enable_housing:
        providers["housing"].availability = ProviderAvailability.disabled
        providers["housing"].warning = "Housing.com provider is disabled by configuration."
    return providers


PROVIDERS = build_provider_registry()


def provider_descriptors():
    return [provider.describe() for provider in PROVIDERS.values()]


def _dedupe(listings: list[ListingRecord]) -> list[ListingRecord]:
    unique: dict[str, ListingRecord] = {}
    for listing in listings:
        key = "|".join(
            [
                listing.source,
                listing.listing_id or "",
                str(listing.price or ""),
                str(listing.square_feet or ""),
            ]
        )
        if key not in unique:
            unique[key] = listing
    return list(unique.values())


def _aggregate_stats(
    listings: list[ListingRecord],
    provider_count: int,
) -> MarketStats:
    prices = [listing.price for listing in listings if listing.price is not None]
    ppsf = [
        listing.price_per_sqft
        for listing in listings
        if listing.price_per_sqft is not None
    ]
    days = [
        listing.days_on_market
        for listing in listings
        if listing.days_on_market is not None
    ]

    def _median(values: list[float]) -> float | None:
        if not values:
            return None
        ordered = sorted(values)
        midpoint = len(ordered) // 2
        if len(ordered) % 2:
            return ordered[midpoint]
        return (ordered[midpoint - 1] + ordered[midpoint]) / 2

    return MarketStats(
        provider_count=provider_count,
        listing_count=len(listings),
        avg_price=round(sum(prices) / len(prices)) if prices else None,
        median_price=round(_median([float(value) for value in prices])) if prices else None,
        avg_price_per_sqft=round(sum(ppsf) / len(ppsf), 2) if ppsf else None,
        median_price_per_sqft=round(_median(ppsf), 2) if ppsf else None,
        avg_days_on_market=round(sum(days) / len(days), 2) if days else None,
        min_price=min(prices) if prices else None,
        max_price=max(prices) if prices else None,
    )


async def scrape_provider(
    provider_slug: str,
    query: SearchRequest,
) -> ProviderSearchResponse:
    provider = PROVIDERS.get(provider_slug)
    if provider is None:
        raise ValueError(f"Unsupported provider: {provider_slug}")
    resolved_location = await resolve_location(query)
    return await provider.search(query, resolved_location)


async def scrape_market(query: SearchRequest) -> AggregateSearchResponse:
    resolved_location = await resolve_location(query)
    provider_slugs = query.providers or ["magicbricks"]
    providers = []
    for slug in provider_slugs:
        if slug not in PROVIDERS:
            raise ValueError(f"Unsupported provider: {slug}")
        providers.append(PROVIDERS[slug])

    provider_responses = await asyncio.gather(
        *(provider.search(query, resolved_location) for provider in providers)
    )
    merged = _dedupe(
        [
            listing
            for provider_response in provider_responses
            for listing in provider_response.listings
        ]
    )
    merged = sorted(
        merged,
        key=lambda item: (
            item.distance_km if item.distance_km is not None else 9999,
            -(item.raw_quality_score or 0),
        ),
    )[: query.max_results]

    location_enrichment = await enrich_location_context(resolved_location)
    warnings = [
        warning
        for provider_response in provider_responses
        for warning in provider_response.warnings
    ]
    warnings.extend(location_enrichment.warnings)

    return AggregateSearchResponse(
        query=query,
        resolved_location=resolved_location,
        providers=provider_responses,
        listings=merged,
        stats=_aggregate_stats(merged, len(provider_responses)),
        warnings=warnings,
        location_enrichment=location_enrichment,
    )

