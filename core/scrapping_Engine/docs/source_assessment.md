# Source Assessment For Collateral Valuation Scraper

## Purpose

This document is the working intake sheet for the scraping engine that will feed the collateral valuation and liquidity pipeline.

Use it to decide:

- which websites should be scraped first
- which data points are actually required
- how each source should be collected
- what legal, technical, and quality risks exist

The rule for this engine is simple:

- extract only signals that improve valuation, liquidity, explainability, or fraud checks
- do not collect nice-to-have data that the downstream engine will not use

---

## Mandatory Output Signals

The scraper should only prioritize data that helps compute one or more of the following:

| Output | Why it matters |
| --- | --- |
| `market_value_range` | price benchmarking and comparable discovery |
| `distress_value_range` | liquidity discount and downside estimate |
| `resale_potential_index` | demand, fungibility, and liquidity signal |
| `estimated_time_to_sell_days` | absorption and exit-timeline estimate |
| `confidence_score` | data coverage and consistency signal |
| `key_drivers` | explainability |
| `risk_flags` | underwriting and fraud controls |

---

## Data Points To Extract

Fill this before expanding any new source.

### 1. Comparable Listing Data

| Field | Needed | Priority | Notes |
| --- | --- | --- | --- |
| Listing price | `[ ]` | High | Base comparable signal |
| Price per sqft | `[ ]` | High | Derived if area exists |
| Built-up area / super built-up area | `[ ]` | High | Required for normalization |
| Carpet area | `[ ]` | Medium | Useful where available |
| Bedrooms / BHK | `[ ]` | High | Standard configuration matching |
| Bathrooms | `[ ]` | Medium | Similarity scoring |
| Property type | `[ ]` | High | Residential/commercial/plot |
| Sub-type | `[ ]` | High | Apartment/villa/plot/shop/warehouse |
| Floor number | `[ ]` | Medium | Vertical accessibility signal |
| Total floors | `[ ]` | Medium | Context for high-rise vs low-rise |
| Furnishing status | `[ ]` | Low | Useful but not core |
| Age / possession / vintage | `[ ]` | High | Depreciation and liquidity |
| Posted date / freshness | `[ ]` | High | Days-on-market proxy |
| Seller type | `[ ]` | Medium | Owner/broker/builder |
| Project/society name | `[ ]` | High | Duplicate detection and clustering |
| Locality / micro-market | `[ ]` | High | Local price banding |
| Latitude / longitude | `[ ]` | High | Distance/radius filtering |
| Listing URL | `[ ]` | High | Auditability |
| Listing ID | `[ ]` | High | Dedupe and refresh |
| Image URL | `[ ]` | Low | Optional evidence trail |

### 2. Location Intelligence Data

| Field | Needed | Priority | Notes |
| --- | --- | --- | --- |
| Geocoded latitude/longitude | `[ ]` | High | Required anchor signal |
| State / city / locality / pincode | `[ ]` | High | Search routing and grouping |
| Nearby metro / rail / bus stops | `[ ]` | High | Infrastructure proximity |
| Nearby schools | `[ ]` | Medium | Neighborhood quality |
| Nearby hospitals | `[ ]` | High | Neighborhood quality |
| Nearby highways / major roads | `[ ]` | High | Accessibility |
| Nearby malls / commercial hubs | `[ ]` | Medium | Demand proxy |
| POI counts by category | `[ ]` | High | Density-based quality signal |
| Distance to top POIs | `[ ]` | High | Explainable infrastructure score |

### 3. Market Activity Data

| Field | Needed | Priority | Notes |
| --- | --- | --- | --- |
| Number of comparable listings in radius | `[ ]` | High | Supply proxy |
| Median asking price in radius | `[ ]` | High | Local benchmark |
| Average asking price per sqft | `[ ]` | High | Normalized market benchmark |
| Median days-on-market proxy | `[ ]` | High | Liquidity estimate |
| Count by property type | `[ ]` | Medium | Fungibility |
| Count by BHK / configuration | `[ ]` | Medium | Standardization |
| Rental listing count | `[ ]` | Medium | Investor appeal proxy |
| Rental yield proxy | `[ ]` | Medium | Buy-to-let demand signal |

### 4. Legal / Registry / Government Signals

| Field | Needed | Priority | Notes |
| --- | --- | --- | --- |
| Circle rate / guidance value | `[ ]` | High | Statutory floor |
| RERA project identifier | `[ ]` | Medium | Project legitimacy |
| RERA possession status | `[ ]` | Medium | Delivery risk |
| Dispute / legal complexity flags | `[ ]` | Medium | Liquidity and underwriting risk |
| Land use / planning hints | `[ ]` | Medium | Property-location mismatch checks |

---

## Priority Source Matrix

### Tier 1: Build First

| Source | Purpose | Mechanism | Current viability | Why it matters |
| --- | --- | --- | --- | --- |
| MagicBricks search pages | Sale listing comparables | Server-rendered HTML with embedded `window.SERVER_PRELOADED_STATE_` JSON | Good | Gives price, area, BHK, coords, posted label, project, seller type |
| OpenStreetMap Nominatim | Geocoding and area normalization | Public geocoding API | Good | Converts address to city/locality/pincode/lat-lng |
| OpenStreetMap Overpass | Nearby POIs and infrastructure context | Public query API | Good | Metro, schools, hospitals, road-adjacent demand signals |

### Tier 2: Build With Caution

| Source | Purpose | Mechanism | Current viability | Risk |
| --- | --- | --- | --- | --- |
| 99acres | Sale comparables | HTML search pages, likely anti-bot protected | Weak from current environment | Access denied risk |
| Housing.com | Sale/rental comparables | HTML search pages, anti-bot protection visible | Weak from current environment | Block pages likely without browser/session strategy |
| NoBroker | Rental and no-broker comps | Dynamic web app | Unknown | May need browser automation and stronger session handling |

### Tier 3: State/Government Integrations

| Source | Purpose | Mechanism | Current viability | Notes |
| --- | --- | --- | --- | --- |
| State circle-rate portals | Floor valuation | HTML/PDF scraping by state | Varies by state | Needs state-wise adapters |
| State RERA portals | Builder/project validation | HTML search pages or PDFs | Varies by state | Good for legitimacy and possession |
| Court / encumbrance / land record portals | Legal complexity hints | Portal or PDF extraction | Varies by state | High value, slower rollout |

---

## Per-Source Collection Sheet

Copy this block for every new source before implementation.

### Source Name

- Source:
- URL:
- Source owner:
- Segment:
- Geography:
- Data class:
- Business owner approval:
- Terms reviewed:
- Robots reviewed:
- Authentication required:
- Anti-bot observed:
- Captcha observed:
- Rate limit notes:
- Priority:

### Exact Data Fields To Extract

| Field | Extract? | Selector / path / parser note | Required by which model output? |
| --- | --- | --- | --- |
|  | `[ ]` |  |  |
|  | `[ ]` |  |  |
|  | `[ ]` |  |  |

### Extraction Mechanism

- Entry URL pattern:
- Request type:
- Query parameters:
- Pagination method:
- HTML selector strategy:
- Embedded JSON strategy:
- Fallback strategy:
- Retry strategy:
- Dedupe key:
- Freshness signal:

### Output Mapping

- `price` <=
- `square_feet` <=
- `bedrooms` <=
- `bathrooms` <=
- `property_type` <=
- `sub_type` <=
- `posted_at` <=
- `latitude` <=
- `longitude` <=
- `locality` <=
- `city` <=
- `source_listing_id` <=
- `source_url` <=

### Risks

- Blocking risk:
- Structure-change risk:
- Missing-field risk:
- Data-quality risk:
- Legal/compliance risk:

---

## Proposed Rollout Order

1. MagicBricks search scraper for sale comparables
2. Nominatim geocoder for address normalization
3. Overpass POI enrichment for infrastructure scoring
4. Aggregator endpoint that merges comparables + POI context
5. 99acres adapter behind a feature flag
6. Housing adapter behind a feature flag
7. State-wise circle rate adapters
8. RERA adapters

---

## Engine Output Contract

The scraper service should normalize all sources to this minimum shape:

```json
{
  "source": "magicbricks",
  "listing_id": "84466833",
  "title": "2 BHK apartment for sale in Gunjur",
  "address": "Gunjur, Bangalore",
  "locality": "Gunjur",
  "city": "Bangalore",
  "price": 14204000,
  "price_label": "1.42 Cr",
  "square_feet": 1330,
  "bedrooms": 2,
  "bathrooms": 3,
  "property_type": "residential",
  "sub_type": "apartment",
  "seller_type": "agent",
  "project_name": "Abhee Aaria",
  "posted_at_label": "Posted Yesterday",
  "latitude": 12.94162601,
  "longitude": 77.74251723,
  "listing_url": "https://www.magicbricks.com/...",
  "raw_quality_score": 0.88
}
```

---

## Decisions Still Needed

| Decision | Options | Selected |
| --- | --- | --- |
| Primary geography at launch | Bengaluru / NCR / Mumbai / Multi-city | `_____` |
| Asset classes at launch | Residential only / Residential + commercial / Full coverage | `_____` |
| Listing use | Sale only / Sale + rental | `_____` |
| Circle rate rollout | Karnataka first / state-by-state / later | `_____` |
| Browser automation allowed | Yes / No | `_____` |
| Persistent caching required | Yes / No | `_____` |
| Refresh frequency | Hourly / 6-hour / daily | `_____` |

---

## Immediate Recommendation

For the first usable version:

- use MagicBricks for sale comparable extraction
- use Nominatim for address normalization
- use Overpass for infrastructure and neighborhood density
- keep 99acres and Housing behind explicit feature flags until access strategy is hardened
- add state circle-rate connectors next, because valuation floor logic depends on them
