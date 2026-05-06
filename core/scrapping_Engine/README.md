# Scrapping Engine

FastAPI-based scraping and enrichment service for the collateral valuation stack.

## What It Does

- exposes a Swagger page at `/docs`
- normalizes public listing data for the valuation app
- geocodes addresses with Nominatim
- enriches locations with OSM/Overpass POI context
- scrapes MagicBricks search results into a stable JSON format
- keeps weak providers like `99acres` and `housing` behind disabled/blocked adapters until hardened

## Source Planning

Before adding new providers, review:

- [docs/source_assessment.md](./docs/source_assessment.md)

## Run

```bash
cd core/scrapping_Engine
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8010
```

Swagger:

- `http://localhost:8010/docs`
- `http://localhost:8010/swagger`

## Main Endpoints

- `GET /health`
- `GET /sources`
- `GET /providers/magicbricks/search`
- `POST /providers/magicbricks/search`
- `GET /listings/search`
- `POST /listings/search`
- `GET /location/enrich`
- `POST /location/enrich`

## Example Calls

### Health

```bash
curl http://localhost:8010/health
```

### Location Enrichment

```bash
curl 'http://localhost:8010/location/enrich?address=Whitefield%20Bangalore'
```

### Aggregate Listing Search

```bash
curl 'http://localhost:8010/listings/search?address=Whitefield%20Bangalore&radius_km=8&max_results=5&bedrooms=2'
```

### Provider-Specific Search

```bash
curl 'http://localhost:8010/providers/magicbricks/search?address=Whitefield%20Bangalore&radius_km=8&max_results=5&bedrooms=2'
```

## App Integration

The existing Next.js app can point to this service with these values:

```bash
MAGICBRICKS_SEARCH_URL=http://localhost:8010/providers/magicbricks/search
NINETY_NINE_ACRES_SEARCH_URL=http://localhost:8010/providers/99acres/search
HOUSING_SEARCH_URL=http://localhost:8010/providers/housing/search
LISTINGS_AGGREGATOR_URL=http://localhost:8010/listings/search
```

Notes:

- `99acres` and `housing` currently return structured empty responses unless explicitly hardened later.
- the app can safely use `LISTINGS_AGGREGATOR_URL` immediately

## Current Provider Status

- `magicbricks`: working
- `99acres`: disabled by default, anti-bot concerns
- `housing`: disabled by default, anti-bot concerns

## Environment Variables

Optional overrides:

```bash
SCRAPPING_ENGINE_PORT=8010
SCRAPPING_ENGINE_TIMEOUT_SECONDS=20
SCRAPPING_ENGINE_DEFAULT_RADIUS_KM=3
SCRAPPING_ENGINE_DEFAULT_MAX_RESULTS=20
SCRAPPING_ENGINE_ENABLE_MAGICBRICKS=true
SCRAPPING_ENGINE_ENABLE_99ACRES=false
SCRAPPING_ENGINE_ENABLE_HOUSING=false
SCRAPPING_ENGINE_MAGICBRICKS_BASE_URL=https://www.magicbricks.com
SCRAPPING_ENGINE_NOMINATIM_URL=https://nominatim.openstreetmap.org
SCRAPPING_ENGINE_OVERPASS_URL=https://overpass-api.de/api/interpreter
SCRAPPING_ENGINE_CONTACT_EMAIL=you@example.com
```

## Output Shape

Normalized listing objects include:

- `source`
- `listing_id`
- `title`
- `address`
- `locality`
- `city`
- `price`
- `price_label`
- `price_per_sqft`
- `square_feet`
- `bedrooms`
- `bathrooms`
- `property_type`
- `sub_type`
- `seller_type`
- `project_name`
- `posted_at`
- `days_on_market`
- `latitude`
- `longitude`
- `distance_km`
- `listing_url`
- `image_url`

## Known Limits

- MagicBricks search currently works best for city-level search plus radius filtering.
- Nominatim may resolve some micromarket names to transit stations or landmarks instead of pure administrative polygons.
- Overpass enrichment uses a curl fallback because Python HTTP clients are rejected by the endpoint in this environment.
- Circle-rate, RERA, and state registry scrapers are not implemented yet.
