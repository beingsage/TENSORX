from __future__ import annotations

from abc import ABC, abstractmethod

from app.models.schemas import (
    AddressResolution,
    ProviderAvailability,
    ProviderSearchResponse,
    SearchRequest,
    SourceDescriptor,
)


class BaseListingProvider(ABC):
    slug: str
    name: str
    availability: ProviderAvailability
    mechanism: str
    notes: str

    def describe(self) -> SourceDescriptor:
        return SourceDescriptor(
            slug=self.slug,
            name=self.name,
            availability=self.availability,
            mechanism=self.mechanism,
            notes=self.notes,
            required_inputs=["address or lat/lng", "radius_km"],
        )

    @abstractmethod
    async def search(
        self,
        query: SearchRequest,
        resolved_location: AddressResolution,
    ) -> ProviderSearchResponse:
        raise NotImplementedError

