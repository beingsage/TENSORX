from __future__ import annotations

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.models.schemas import (
    AggregateSearchResponse,
    LocationEnrichment,
    ProviderSearchResponse,
    SearchRequest,
)
from app.services.geocoding import resolve_location
from app.services.infrastructure import enrich_location_context
from app.services.market import PROVIDERS, provider_descriptors, scrape_market

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Scraping and location enrichment service for collateral valuation, "
        "market comparables, and resale liquidity signals."
    ),
)

if settings.cors_allow_all:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "swagger": "/swagger",
        "health": "/health",
    }


@app.get("/swagger")
async def swagger_redirect():
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
    }


@app.get("/sources")
async def sources():
    return {
        "sources": provider_descriptors(),
    }


@app.get(
    "/providers/{provider_slug}/search",
    response_model=ProviderSearchResponse,
)
async def provider_search_get(
    provider_slug: str,
    address: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_km: float = Query(default=settings.default_radius_km, ge=0.1, le=50),
    max_results: int = Query(default=settings.default_max_results, ge=1, le=200),
    bedrooms: int | None = Query(default=None, ge=1, le=10),
    property_type: str = "residential",
    sub_type: str | None = None,
):
    provider = PROVIDERS.get(provider_slug)
    if provider is None:
        raise HTTPException(status_code=404, detail=f"Unsupported provider: {provider_slug}")

    try:
        query = SearchRequest(
            address=address,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            max_results=max_results,
            bedrooms=bedrooms,
            property_type=property_type,
            sub_type=sub_type,
            providers=[provider_slug],
        )
        resolved = await resolve_location(query)
        return await provider.search(query, resolved)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.post(
    "/providers/{provider_slug}/search",
    response_model=ProviderSearchResponse,
)
async def provider_search_post(
    provider_slug: str,
    query: SearchRequest = Body(...),
):
    provider = PROVIDERS.get(provider_slug)
    if provider is None:
        raise HTTPException(status_code=404, detail=f"Unsupported provider: {provider_slug}")

    try:
        resolved = await resolve_location(query)
        return await provider.search(query, resolved)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.get("/listings/search", response_model=AggregateSearchResponse)
async def aggregate_search_get(
    address: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_km: float = Query(default=settings.default_radius_km, ge=0.1, le=50),
    max_results: int = Query(default=settings.default_max_results, ge=1, le=200),
    bedrooms: int | None = Query(default=None, ge=1, le=10),
    property_type: str = "residential",
    sub_type: str | None = None,
    providers: list[str] = Query(default=["magicbricks"]),
):
    try:
        query = SearchRequest(
            address=address,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            max_results=max_results,
            bedrooms=bedrooms,
            property_type=property_type,
            sub_type=sub_type,
            providers=providers,
        )
        return await scrape_market(query)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.post("/listings/search", response_model=AggregateSearchResponse)
async def aggregate_search_post(
    query: SearchRequest = Body(...),
):
    try:
        return await scrape_market(query)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.get("/location/enrich", response_model=LocationEnrichment)
async def location_enrich_get(
    address: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
):
    try:
        query = SearchRequest(
            address=address,
            latitude=latitude,
            longitude=longitude,
        )
        resolved = await resolve_location(query)
        return await enrich_location_context(resolved)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.post("/location/enrich", response_model=LocationEnrichment)
async def location_enrich_post(query: SearchRequest = Body(...)):
    try:
        resolved = await resolve_location(query)
        return await enrich_location_context(resolved)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
