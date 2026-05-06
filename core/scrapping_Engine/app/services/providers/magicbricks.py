from __future__ import annotations

from urllib.parse import quote

from app.core.config import settings
from app.models.schemas import (
    AddressResolution,
    ListingRecord,
    MarketStats,
    ProviderAvailability,
    ProviderSearchResponse,
    SearchRequest,
)
from app.services.http import fetch_text
from app.services.providers.base import BaseListingProvider
from app.services.utils import (
    days_since,
    derive_quality_score,
    extract_balanced_json_object,
    haversine_km,
    normalize_text,
    parse_datetime,
    safe_float,
    safe_int,
)


class MagicBricksProvider(BaseListingProvider):
    slug = "magicbricks"
    name = "MagicBricks"
    availability = ProviderAvailability.available
    mechanism = "Server-rendered HTML with embedded window.SERVER_PRELOADED_STATE_ JSON"
    notes = "Best current source in this environment for public sale comparable extraction."

    CITY_ALIASES = {
        "bengaluru": "Bangalore",
        "bengaluru urban": "Bangalore",
        "bombay": "Mumbai",
        "gurugram": "Gurgaon",
        "new delhi": "Delhi",
    }

    def _normalize_city(self, city: str) -> str:
        return self.CITY_ALIASES.get(city.strip().lower(), city)

    def _build_search_url(self, query: SearchRequest, resolved_location: AddressResolution) -> str:
        city = resolved_location.city or resolved_location.district or resolved_location.state
        if not city:
            raise ValueError("Could not resolve city for MagicBricks search.")
        city = self._normalize_city(city)

        base = f"{settings.magicbricks_base_url}/property-for-sale/residential-real-estate"
        params = [f"cityName={quote(city)}"]
        if query.bedrooms:
            params.append(f"bedroom={query.bedrooms}")
        return f"{base}?{'&'.join(params)}"

    def _distance_km(
        self,
        resolved_location: AddressResolution,
        latitude: float | None,
        longitude: float | None,
    ) -> float | None:
        if latitude is None or longitude is None:
            return None
        return round(
            haversine_km(
                resolved_location.latitude,
                resolved_location.longitude,
                latitude,
                longitude,
            ),
            2,
        )

    def _normalize_listing(
        self,
        raw_item: dict,
        resolved_location: AddressResolution,
    ) -> ListingRecord:
        latitude = safe_float(raw_item.get("pmtLat"))
        longitude = safe_float(raw_item.get("pmtLong"))

        if (latitude is None or longitude is None) and raw_item.get("ltcoordGeo"):
            try:
                lat_text, lon_text = str(raw_item["ltcoordGeo"]).split(",", maxsplit=1)
                latitude = safe_float(lat_text)
                longitude = safe_float(lon_text)
            except ValueError:
                latitude = latitude
                longitude = longitude

        square_feet = safe_float(raw_item.get("coveredArea") or raw_item.get("ca"))
        price = safe_int(raw_item.get("price"))
        posted_at = parse_datetime(raw_item.get("postDateT"))

        listing_url = raw_item.get("url")
        if listing_url and not str(listing_url).startswith("http"):
            listing_url = f"{settings.magicbricks_base_url}/{str(listing_url).lstrip('/')}"

        title = (
            normalize_text(raw_item.get("propertyTitle"))
            or normalize_text(raw_item.get("seoDesc"))
            or "MagicBricks listing"
        )
        address = (
            normalize_text(raw_item.get("psmAdd"))
            or normalize_text(raw_item.get("defaultAdddressGoogle"))
            or normalize_text(raw_item.get("locSeoName"))
        )
        locality = normalize_text(raw_item.get("lmtDName") or raw_item.get("locSeoName"))
        city = normalize_text(raw_item.get("ctName")) or resolved_location.city
        seller_type = normalize_text(raw_item.get("userType"))
        project_name = normalize_text(raw_item.get("prjname"))
        bedrooms = safe_int(raw_item.get("bedroomD") or raw_item.get("bedroom"))
        bathrooms = safe_int(raw_item.get("bathD") or raw_item.get("bathroom"))
        property_sub_type = normalize_text(raw_item.get("propTypeD"))
        price_per_sqft = None
        if price is not None and square_feet:
            price_per_sqft = round(price / square_feet, 2)

        derived_fields = {
            "price": price,
            "square_feet": square_feet,
            "bedrooms": bedrooms,
            "latitude": latitude,
            "longitude": longitude,
            "listing_url": listing_url,
            "locality": locality,
            "project_name": project_name,
        }

        return ListingRecord(
            source=self.slug,
            listing_id=str(raw_item.get("id") or raw_item.get("encId") or raw_item.get("url")),
            title=title,
            address=address,
            locality=locality,
            city=city,
            state=resolved_location.state,
            price=price,
            price_label=normalize_text(raw_item.get("priceD")),
            price_per_sqft=price_per_sqft,
            square_feet=square_feet,
            carpet_area_sqft=safe_float(raw_item.get("carpetArea")),
            bedrooms=bedrooms,
            bathrooms=bathrooms,
            property_type="residential",
            sub_type=property_sub_type,
            seller_type=seller_type.lower() if seller_type else None,
            project_name=project_name,
            posted_at=posted_at,
            posted_at_label=normalize_text(raw_item.get("postedLabelD")),
            days_on_market=days_since(posted_at),
            latitude=latitude,
            longitude=longitude,
            distance_km=self._distance_km(resolved_location, latitude, longitude),
            listing_url=listing_url,
            image_url=normalize_text(raw_item.get("image") or raw_item.get("wapImgUrl1")),
            raw_quality_score=derive_quality_score(derived_fields),
            raw={
                "id": raw_item.get("id"),
                "project_id": raw_item.get("prjid"),
                "project_name": raw_item.get("prjname"),
                "seller_name": raw_item.get("contName") or raw_item.get("oname"),
                "seller_company": raw_item.get("companyname"),
                "rera": raw_item.get("reraValidity"),
                "price_label": raw_item.get("priceD"),
                "posted_at": raw_item.get("postDateT"),
                "source_url": raw_item.get("url"),
            },
        )

    def _dedupe(self, listings: list[ListingRecord]) -> list[ListingRecord]:
        unique: dict[str, ListingRecord] = {}
        for listing in listings:
            key = "|".join(
                [
                    (listing.project_name or listing.title or "").strip().lower(),
                    (listing.locality or "").strip().lower(),
                    str(listing.price or ""),
                    str(listing.square_feet or ""),
                    str(listing.bedrooms or ""),
                ]
            )
            current = unique.get(key)
            if current is None:
                unique[key] = listing
                continue
            current_days = current.days_on_market if current.days_on_market is not None else 9999
            listing_days = listing.days_on_market if listing.days_on_market is not None else 9999
            if listing_days < current_days:
                unique[key] = listing
        return list(unique.values())

    def _compute_stats(self, listings: list[ListingRecord]) -> MarketStats:
        prices = [listing.price for listing in listings if listing.price is not None]
        price_per_sqft = [
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

        avg_price = round(sum(prices) / len(prices)) if prices else None
        avg_ppsf = round(sum(price_per_sqft) / len(price_per_sqft), 2) if price_per_sqft else None
        avg_days = round(sum(days) / len(days), 2) if days else None
        median_price = round(_median([float(value) for value in prices])) if prices else None
        median_ppsf = round(_median(price_per_sqft), 2) if price_per_sqft else None

        return MarketStats(
            provider_count=1,
            listing_count=len(listings),
            avg_price=avg_price,
            median_price=median_price,
            avg_price_per_sqft=avg_ppsf,
            median_price_per_sqft=median_ppsf,
            avg_days_on_market=avg_days,
            min_price=min(prices) if prices else None,
            max_price=max(prices) if prices else None,
        )

    async def search(
        self,
        query: SearchRequest,
        resolved_location: AddressResolution,
    ) -> ProviderSearchResponse:
        if not settings.enable_magicbricks:
            return ProviderSearchResponse(
                provider=self.slug,
                availability=ProviderAvailability.disabled,
                query=query,
                resolved_location=resolved_location,
                warnings=["MagicBricks provider is disabled by configuration."],
            )

        url = self._build_search_url(query, resolved_location)
        page_html = await fetch_text(url)
        state = extract_balanced_json_object(page_html, "window.SERVER_PRELOADED_STATE_ =")
        raw_results = state.get("searchResult") or []

        listings: list[ListingRecord] = []
        warnings: list[str] = []

        for raw_item in raw_results:
            listing = self._normalize_listing(raw_item, resolved_location)
            if listing.distance_km is not None and listing.distance_km > query.radius_km:
                continue
            listings.append(listing)

        if not listings:
            warnings.append(
                "No listings survived radius filtering. Try a larger radius or a different locality."
            )

        listings = sorted(
            self._dedupe(listings),
            key=lambda item: (
                item.distance_km if item.distance_km is not None else 9999,
                -(item.raw_quality_score or 0),
            ),
        )[: query.max_results]

        return ProviderSearchResponse(
            provider=self.slug,
            availability=self.availability,
            query=query,
            resolved_location=resolved_location,
            listings=listings,
            warnings=warnings,
            stats=self._compute_stats(listings),
        )
