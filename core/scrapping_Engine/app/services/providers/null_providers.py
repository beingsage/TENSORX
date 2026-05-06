from __future__ import annotations

from app.models.schemas import (
    AddressResolution,
    MarketStats,
    ProviderAvailability,
    ProviderSearchResponse,
    SearchRequest,
)
from app.services.providers.base import BaseListingProvider


class PassiveProvider(BaseListingProvider):
    def __init__(
        self,
        *,
        slug: str,
        name: str,
        availability: ProviderAvailability,
        mechanism: str,
        notes: str,
        warning: str,
    ) -> None:
        self.slug = slug
        self.name = name
        self.availability = availability
        self.mechanism = mechanism
        self.notes = notes
        self.warning = warning

    async def search(
        self,
        query: SearchRequest,
        resolved_location: AddressResolution,
    ) -> ProviderSearchResponse:
        return ProviderSearchResponse(
            provider=self.slug,
            availability=self.availability,
            query=query,
            resolved_location=resolved_location,
            warnings=[self.warning],
            stats=MarketStats(provider_count=1, listing_count=0),
        )

