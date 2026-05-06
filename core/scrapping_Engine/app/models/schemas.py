from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, model_validator


class ProviderAvailability(str, Enum):
    available = "available"
    experimental = "experimental"
    blocked = "blocked"
    disabled = "disabled"


class SearchRequest(BaseModel):
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float = Field(default=3.0, ge=0.1, le=50)
    max_results: int = Field(default=20, ge=1, le=200)
    bedrooms: int | None = Field(default=None, ge=1, le=10)
    property_type: str = "residential"
    sub_type: str | None = None
    providers: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_location(self) -> "SearchRequest":
        if self.address:
            return self
        if self.latitude is not None and self.longitude is not None:
            return self
        raise ValueError("Provide either address or both latitude and longitude.")


class AddressResolution(BaseModel):
    display_name: str | None = None
    address: str | None = None
    latitude: float
    longitude: float
    locality: str | None = None
    city: str | None = None
    district: str | None = None
    state: str | None = None
    country: str | None = None
    postcode: str | None = None
    source: str = "nominatim"
    confidence: float = 0.0
    raw: dict[str, Any] = Field(default_factory=dict)


class ListingRecord(BaseModel):
    source: str
    listing_id: str
    title: str
    address: str | None = None
    locality: str | None = None
    city: str | None = None
    state: str | None = None
    price: int | None = None
    price_label: str | None = None
    price_per_sqft: float | None = None
    square_feet: float | None = None
    carpet_area_sqft: float | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None
    property_type: str | None = None
    sub_type: str | None = None
    seller_type: str | None = None
    project_name: str | None = None
    posted_at: datetime | None = None
    posted_at_label: str | None = None
    days_on_market: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    distance_km: float | None = None
    listing_url: str | None = None
    image_url: str | None = None
    raw_quality_score: float = 0.0
    raw: dict[str, Any] = Field(default_factory=dict)


class MarketStats(BaseModel):
    provider_count: int = 0
    listing_count: int = 0
    avg_price: int | None = None
    median_price: int | None = None
    avg_price_per_sqft: float | None = None
    median_price_per_sqft: float | None = None
    avg_days_on_market: float | None = None
    min_price: int | None = None
    max_price: int | None = None


class PoiBucket(BaseModel):
    category: str
    count: int = 0
    nearest_distance_km: float | None = None
    sample_names: list[str] = Field(default_factory=list)


class LocationEnrichment(BaseModel):
    resolution: AddressResolution
    poi_buckets: list[PoiBucket] = Field(default_factory=list)
    infrastructure_score: float = 0.0
    warnings: list[str] = Field(default_factory=list)


class SourceDescriptor(BaseModel):
    slug: str
    name: str
    availability: ProviderAvailability
    mechanism: str
    notes: str
    required_inputs: list[str] = Field(default_factory=list)


class ProviderSearchResponse(BaseModel):
    provider: str
    availability: ProviderAvailability
    query: SearchRequest
    resolved_location: AddressResolution | None = None
    listings: list[ListingRecord] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    stats: MarketStats = Field(default_factory=MarketStats)


class AggregateSearchResponse(BaseModel):
    query: SearchRequest
    resolved_location: AddressResolution | None = None
    providers: list[ProviderSearchResponse] = Field(default_factory=list)
    listings: list[ListingRecord] = Field(default_factory=list)
    stats: MarketStats = Field(default_factory=MarketStats)
    warnings: list[str] = Field(default_factory=list)
    location_enrichment: LocationEnrichment | None = None

