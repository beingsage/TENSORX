# 🧠 Geospatial Intelligence Map — Fixed Full Specification
**Version:** 2.0 | **Target Region:** Bengaluru, Karnataka, India (lat ~12.93, lng ~77.62)

---

## 🎯 Objective

Build a production-grade real estate intelligence map where:
- Every layer is functional (live API or defined fallback — no silent failures)
- The map is the primary analysis tool — not a sidebar feature
- Data is visual-first (gradients, heatmaps, arcs — not tables or text dumps)
- All APIs are integrated with independent error handling (one failure cannot cascade)
- System is stable under rapid layer toggling (5 toggles in under 2 seconds = no crash)

---

## ⚙️ Core Technical Rules

### Map Initialization
- Initialize `DeckGL` overlay **exactly once** inside a `useEffect` with an empty dependency array
- Store the instance in `overlayRef.current`
- ALL layer updates must use:
  ```ts
  overlayRef.current.setProps({ layers: buildLayers(activeToggles, data) })
  ```
- This call lives in a single `useEffect` that depends on `[activeToggles, data]`
- **NEVER** call `new DeckGL(...)` or `new MapboxOverlay(...)` more than once

### Layer Architecture Rules
- Every layer is independent — toggling one layer never affects another
- Every layer must handle null/empty data gracefully using its `FALLBACK_*` constant
- All layers must be constructed exclusively inside `lib/map/buildLayers.ts`
- No layer configuration (colors, opacity, radiusScale) lives inside component files

### API Rules
- All external API calls use `Promise.allSettled` — never `Promise.all`
- Each fetcher has its own try/catch and returns its `FALLBACK_*` on any error
- API responses are cached at the route level using `unstable_cache`
- Coordinates passed to APIs are rounded to 3 decimal places for cache key consistency

---

## 📁 Required File Structure

```
lib/
  map/
    buildLayers.ts         ← ONLY place layers are constructed
    layerDefinitions.ts    ← ALL visual config (colors, opacity, radiusScale)
    scoring.ts             ← ALL scoring formulas (BestBuy, Livability, Investment)
    types.ts               ← LayerKey enum, MapDataBundle type, StreetViewState type
  providers/
    mapsAPI.ts             ← fetchAllMapsData + individual fetchers
    aqi.ts
    elevation.ts
    nearbyPlaces.ts
    directions.ts
    snapToRoad.ts
    streetView.ts
```

---

## 🗺️ Master Layer Registry (Canonical Order)

All 21 layers listed in render order (bottom = rendered first):

| # | Layer Key | Display Name | Deck.gl Type | Mock OK in Phase 1 |
|---|-----------|--------------|-------------|---------------------|
| 1 | BASE_MAP | Base Map | (Mapbox tiles) | No |
| 2 | ROADS | Road Network | PathLayer | No |
| 3 | WATER | Water Bodies | GeoJsonLayer | Yes |
| 4 | GREEN | Green Cover | GeoJsonLayer | Yes |
| 5 | DENSITY | Population Density | HexagonLayer | Yes |
| 6 | VALUE | Property Value | HeatmapLayer | Yes |
| 7 | LIQUIDITY | Liquidity Index | HeatmapLayer | Yes |
| 8 | AQI | Air Quality | HeatmapLayer | No |
| 9 | TRAFFIC | Traffic Congestion | PathLayer | No |
| 10 | RISK | Combined Risk | ContourLayer | Yes (legal portion) |
| 11 | METRO | Metro Influence | ContourLayer | No |
| 12 | FLOOD | Flood Risk | ContourLayer | No |
| 13 | BEST_BUY | Best Buy Zones | ScatterplotLayer | No |
| 14 | CONNECTIVITY | Connectivity Arcs | ArcLayer | No |
| 15 | ISOCHRONE | Travel Time Zones | LineLayer | No |
| 16 | INFRASTRUCTURE | Infrastructure POIs | ScatterplotLayer | No |
| 17 | SPEED_LIMIT | Speed Limits | PathLayer | No |
| 18 | POI_DENSITY | POI Density (Livability) | HeatmapLayer | No |
| 19 | STREET_VIEW | Street View Trigger | (UI modal, no deck layer) | No |
| 20 | MICRO_INSIGHT | Micro-Location Insights | (UI panel on click) | No |
| 21 | INVESTMENT_GRID | Investment Score Grid | GridLayer | Yes |

---

## 🎨 Global Visual Rules (Enforced in layerDefinitions.ts)

```ts
// layerDefinitions.ts — all values live here, nowhere else
export const VISUAL = {
  opacity: {
    min: 0.15,
    max: 0.5,
    infrastructure: 0.4,
    heatmap: 0.35,
    contour: 0.3,
    arc: 0.6,
  },
  transition: { duration: 250 },
  heatmap: {
    intensity: 1,
    radiusPixels: 60,
    threshold: 0.05,
  },
  contour: {
    // Minimum 3 thresholds required for all ContourLayers
    defaultThresholds: [
      { threshold: 1, color: [0, 188, 212, 80] },
      { threshold: 5, color: [255, 193, 7, 100] },
      { threshold: 10, color: [244, 67, 54, 120] },
    ],
  },
  colors: {
    metro: [33, 150, 243, 180],      // Blue
    hospital: [244, 67, 54, 180],    // Red
    school: [255, 235, 59, 180],     // Yellow
    mall: [156, 39, 176, 180],       // Purple
    bestBuy: [76, 175, 80, 200],     // Green
    risk: [244, 67, 54, 150],        // Red
    value: [[0,128,0], [255,165,0], [255,0,0]],  // Green → Orange → Red
    aqi: [[0,200,0], [255,165,0], [255,0,0]],
    isochroneBlue: [0, 100, 255],
    isochroneRed: [255, 50, 0],
  },
}
```

No hardcoded color arrays, opacity values, or radiusScale values in any component.

---

## ⚠️ Data Rules

- **NEVER** leave a layer with no data — every layer has a `FALLBACK_*` constant
- **ALWAYS** return fallback on API failure — never throw, never return undefined
- **ALWAYS** cache API responses (see cache TTLs per feature below)
- Fallback data must match the exact shape of the live API response

---

## 🧩 FEATURES — FULL SPECIFICATION

---

### Feature 1 — Road Network Visualization

**Purpose:** Show physical road infrastructure. Used as preprocessing for all spatial layers.

**Product:** PathLayer showing major road segments. No interaction.

**Empty State:** Show a sparse grid of fallback road segments so the map is never blank.

**Technical:**

API — SnapToRoad:
```
POST https://api.olamaps.io/routing/v1/snapToRoad
  ?points={lat,lng|lat,lng|...}
  &enhancePath=false
  &api_key=OLA_MAPS_API_KEY
```

API — NearestRoads:
```
GET https://api.olamaps.io/routing/v1/nearestRoads
  ?mode=DRIVING
  &points={lat,lng|...}
  &radius=500
  &api_key=OLA_MAPS_API_KEY
```

Fallback:
```ts
export const FALLBACK_ROADS = [
  { path: [[77.580, 12.920], [77.600, 12.935], [77.620, 12.950]], width: 3 },
  { path: [[77.590, 12.910], [77.610, 12.930], [77.630, 12.945]], width: 2 },
]
```

Cache TTL: 86400s (roads don't change daily)

Deck.gl: `PathLayer`, width 2–4px, color `[200, 200, 200, 120]`

---

### Feature 2 — Connectivity (Routes + Travel Time)

**Purpose:** Show accessibility arcs between key nodes (property → metro, hospital, hub).

**Product:** Animated ArcLayer between node pairs. PathLayer for actual route geometry.

**Empty State:** Show 3 fallback arcs between known Bengaluru landmarks.

**Technical:**

API — Directions:
```
POST https://api.olamaps.io/routing/v1/directions
  ?origin={lat,lng}
  &destination={lat,lng}
  &mode=driving
  &overview=full
  &api_key=OLA_MAPS_API_KEY
```

API — Distance Matrix:
```
GET https://api.olamaps.io/routing/v1/distanceMatrix
  ?origins={lat,lng}
  &destinations={lat,lng|lat,lng}
  &mode=driving
  &api_key=OLA_MAPS_API_KEY
```

Fallback:
```ts
export const FALLBACK_CONNECTIVITY = [
  { source: [77.5946, 12.9716], target: [77.6101, 12.9352], travelMinutes: 18 },
  { source: [77.5946, 12.9716], target: [77.5667, 12.9141], travelMinutes: 25 },
]
```

Cache TTL: 300s (traffic-sensitive)

Deck.gl: `ArcLayer` (animated), arc color mapped from travel time (green < 15min → red > 45min)

---

### Feature 3 — Isochrone (Travel Time Zones)

**Purpose:** Show reachable area within 10 / 20 / 30 / 60 minutes from a property.

**Important:** This is approximated using Distance Matrix — NOT a true polygon isochrone. Label it "Travel Time Reach" in the UI to be accurate. True isochrone polygon requires OpenRouteService `/isochrones` or custom convex-hull computation.

**Product:** LineLayer rings in blue→red gradient. 10min=blue, 30min=orange, 60min=red.

**Empty State:** Show 3 static concentric rings at 1km, 3km, 8km radii.

**Technical:**

Uses same Directions + Distance Matrix APIs as Feature 2 with a radial grid of destination points.

Fallback:
```ts
export const FALLBACK_ISOCHRONE = [
  { ring: 'close',  color: [0, 100, 255, 180], points: [...] }, // 10min
  { ring: 'medium', color: [255, 165, 0, 180],  points: [...] }, // 30min
  { ring: 'far',    color: [255, 50, 0, 180],   points: [...] }, // 60min
]
```

Cache TTL: 300s

Deck.gl: `LineLayer`, gradient from `isochroneBlue` → `isochroneRed`

---

### Feature 4 — Metro Influence

**Purpose:** Show how metro proximity affects property value via distance rings.

**Product:** ContourLayer showing influence decay from each metro station.

**Empty State:** Show influence rings from 5 known Bengaluru metro stations (hardcoded coords).

**Technical:**

API — Places Nearby (metro_station type):
```
GET https://api.olamaps.io/places/v1/nearbysearch
  ?location={lat,lng}
  &types=metro_station
  &radius=10000
  &rankBy=popular
  &api_key=OLA_MAPS_API_KEY
```

Fallback:
```ts
export const FALLBACK_METRO_STATIONS = [
  { name: 'MG Road', position: [77.6101, 12.9752] },
  { name: 'Indiranagar', position: [77.6408, 12.9784] },
  { name: 'Koramangala', position: [77.6245, 12.9352] },
  { name: 'Whitefield', position: [77.7499, 12.9698] },
  { name: 'Electronic City', position: [77.6599, 12.8458] },
]
```

Cache TTL: 86400s

Deck.gl: `ContourLayer`, 3 thresholds (500m, 1km, 2km rings), color from blue (close) → faded (far)

---

### Feature 5 — POI Density (Livability Heatmap)

**Purpose:** Visualize neighborhood quality based on amenity concentration.

**Product:** HeatmapLayer intensity driven by number of POIs per grid cell.

**Empty State:** Show low-intensity heatmap using fallback POI coordinates.

**Technical:**

API — Nearby Search (multiple types):
```
GET https://api.olamaps.io/places/v1/nearbysearch
  ?location={lat,lng}
  &types=school|hospital|shopping_mall|park
  &radius=10000
  &rankBy=popular
  &limit=50
  &api_key=OLA_MAPS_API_KEY
```

Fallback:
```ts
export const FALLBACK_POIS = [
  { position: [77.6101, 12.9352], weight: 3, type: 'hospital' },
  { position: [77.6245, 12.9716], weight: 2, type: 'school' },
  // ... 10 more points
]
```

Cache TTL: 3600s

Deck.gl: `HeatmapLayer`, `radiusPixels: 60`, intensity based on POI count weight

---

### Feature 6 — Livability Score (Computed)

**Purpose:** Single 0–100 score per area cell combining POIs + connectivity.

**Product:** Not a separate visual layer. Feeds into Feature 13 (Best Buy Zones) and Feature 21 (Investment Grid). Displayed as a tooltip value on hover.

**Formula:** See `lib/map/scoring.ts` — `computeLivabilityScore()`

```ts
export function computeLivabilityScore(input: {
  poiCount: number         // nearby schools + hospitals + parks (capped at 20)
  avgTravelMinutes: number // average minutes to nearest 3 destinations
  greenCoverPct: number    // 0–1, fraction of area that is green
}): number {
  const poiScore        = Math.min(input.poiCount / 20, 1) * 40
  const travelScore     = Math.max(0, 1 - input.avgTravelMinutes / 60) * 40
  const greenScore      = input.greenCoverPct * 20
  return Math.round(poiScore + travelScore + greenScore)
}
```

---

### Feature 7 — Traffic Layer

**Purpose:** Show current congestion on roads.

**Product:** PathLayer where segment color = congestion level. Green = free flow, red = heavy.

**Congestion Derivation:** `congestion = actualTime / freeFlowTime`. Values: <1.2=green, 1.2–1.6=yellow, >1.6=red.

**Empty State:** Show road segments in neutral gray with no congestion data.

**Technical:**

Same Directions API as Feature 2. Compare `duration` vs `distance/speed_limit` to derive congestion.

Fallback:
```ts
export const FALLBACK_TRAFFIC = [
  { path: [[77.580, 12.920], [77.600, 12.935]], congestion: 0.8 },
  { path: [[77.610, 12.930], [77.630, 12.945]], congestion: 1.8 },
]
```

Cache TTL: 300s (5 min — traffic changes fast)

Deck.gl: `PathLayer`, color from `[0,200,0]` (free) → `[255,0,0]` (jammed)

---

### Feature 8 — Speed Limit Layer

**Purpose:** Show road efficiency and legal speed context.

**Product:** PathLayer colored by speed limit (slow=red, fast=green).

**Empty State:** Show roads in uniform neutral color with no speed data.

**Technical:**

API — Speed Limits:
```
GET https://api.olamaps.io/routing/v1/speedLimits
  ?points={lat,lng|lat,lng}
  &snapStrategy=snaptoroad
  &api_key=OLA_MAPS_API_KEY
```

Fallback:
```ts
export const FALLBACK_SPEED_LIMITS = [
  { path: [[77.580, 12.920], [77.600, 12.935]], speedKmh: 60 },
  { path: [[77.590, 12.910], [77.610, 12.930]], speedKmh: 30 },
]
```

Cache TTL: 86400s

Deck.gl: `PathLayer`, color mapped from speed: ≤30kmh=red, 60=yellow, ≥80=green

---

### Feature 9 — AQI (Air Quality Index)

**Purpose:** Show air quality as an environmental risk factor for property buyers.

**Product:** HeatmapLayer. Green (AQI 0) → Red (AQI 300+).

**Empty State:** Show city-average AQI (85) as a uniform low-intensity heatmap.

**Technical:**

API:
```
GET http://api.openweathermap.org/data/2.5/air_pollution
  ?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}
```

Fallback:
```ts
export const FALLBACK_AQI = {
  aqi: 85,
  components: { pm2_5: 35, pm10: 55, no2: 20, o3: 40 },
  position: [77.5946, 12.9716],
}
```

Cache TTL: 3600s (1 hour)

Deck.gl: `HeatmapLayer`, intensity mapped from AQI value

Mock OK in Phase 1: **No** — this is a key differentiator feature

---

### Feature 10 — Flood Risk

**Purpose:** Identify flood-prone areas from elevation data.

**Product:** ContourLayer. Low elevation = higher flood risk. 3 contour bands.

**Flood Risk Derivation:** elevation < 900m = high risk (for Bengaluru), 900–920m = medium, >920m = low.

**Empty State:** Show 3 contour rings using known low-elevation zones in Bengaluru.

**Technical:**

API — Elevation:
```
POST https://api.olamaps.io/places/v1/elevation
  ?api_key=OLA_MAPS_API_KEY
  Content-Type: application/json
  Body: { "locations": ["12.931, 77.616", "12.897, 77.651", ...] }
```

Fallback:
```ts
export const FALLBACK_ELEVATION = [
  { position: [77.5946, 12.9352], elevation: 895 }, // high flood risk
  { position: [77.6101, 12.9716], elevation: 920 }, // low risk
  // ... 20 sample points covering the viewport
]
```

Cache TTL: 86400s (elevation is static)

Deck.gl: `ContourLayer`, 3 bands: high risk (red), medium (yellow), low (green)

---

### Feature 11 — Value Layer

**Purpose:** Show property price distribution across the city.

**Product:** HeatmapLayer. Intensity = relative price per sqft. Green (low) → Red (high).

**Data Source:** Derived/modeled — computed from known price anchors per locality. This is intentionally mocked in Phase 1 with realistic Bengaluru price data.

**Mock Data (Phase 1):**
```ts
export const FALLBACK_VALUE = [
  { position: [77.6399, 12.9784], weight: 95 }, // Indiranagar — high value
  { position: [77.5667, 12.9141], weight: 45 }, // Jayanagar — medium
  { position: [77.7499, 12.9698], weight: 60 }, // Whitefield — medium-high
  // ... 30 points covering Bengaluru
]
```

Cache TTL: N/A (computed client-side from mock in Phase 1)

Deck.gl: `HeatmapLayer`

---

### Feature 12 — Liquidity Layer

**Purpose:** Show how easily a property can be resold.

**Product:** HeatmapLayer. High liquidity = bright green. Low = dark red.

**Liquidity Formula:**
```ts
export function computeLiquidityScore(input: {
  avgTravelMinutes: number  // to city center — lower = more liquid
  poiCount: number          // amenity density — higher = more liquid
  valueScore: number        // 0–100 — high value areas tend to be liquid
}): number {
  const accessScore  = Math.max(0, 1 - input.avgTravelMinutes / 90) * 40
  const amenityScore = Math.min(input.poiCount / 20, 1) * 30
  const valueBonus   = (input.valueScore / 100) * 30
  return Math.round(accessScore + amenityScore + valueBonus)
}
```

Cache TTL: N/A (computed client-side)

Deck.gl: `HeatmapLayer`

---

### Feature 13 — Risk Layer

**Purpose:** Aggregate risk from flood exposure and legal ambiguity.

**Product:** ContourLayer. Three risk bands: Low / Medium / High.

**Risk Formula:**
```ts
export function computeRiskScore(input: {
  floodRisk: number   // 0–100, from elevation data
  legalRisk: number   // 0–100, mocked in Phase 1
}): number {
  return Math.round(input.floodRisk * 0.6 + input.legalRisk * 0.4)
}
```

Legal risk mock: use random seed per grid cell so it's deterministic.

Cache TTL: 86400s for flood data; legal is static mock

Deck.gl: `ContourLayer`, 3 thresholds, red palette

---

### Feature 14 — Density Layer

**Purpose:** Show population and building density per area.

**Product:** HexagonLayer. Taller hex = denser area.

**Data Source:** Mocked in Phase 1 with Bengaluru population distribution estimates.

**Fallback:**
```ts
export const FALLBACK_DENSITY = [
  { position: [77.5946, 12.9716], count: 850 }, // dense: MG Road
  { position: [77.6399, 12.9784], count: 620 }, // medium: Indiranagar
  // ... 40 points
]
```

Deck.gl: `HexagonLayer`, `radius: 300`, `elevationScale: 4`, `extruded: true`

---

### Feature 15 — Green Cover

**Purpose:** Show parks, forests, vegetation for livability scoring.

**Product:** GeoJsonLayer with green fill. Low opacity so it doesn't obscure other layers.

**Data Source:** OpenStreetMap Overpass API query for `landuse=forest`, `leisure=park`, `natural=wood` within bounding box. Mock GeoJSON acceptable in Phase 1.

**Fallback:** Static GeoJSON with 5 known Bengaluru parks (Cubbon Park, Lalbagh, etc.)

Cache TTL: 86400s

Deck.gl: `GeoJsonLayer`, fill `[34, 139, 34, 80]`, no stroke

---

### Feature 16 — Water Bodies

**Purpose:** Geographic context — lakes, rivers, reservoirs.

**Product:** GeoJsonLayer with blue fill. Static reference layer.

**Data Source:** OSM Overpass API for `natural=water`, `waterway=river`. Mock GeoJSON acceptable.

**Fallback:** Static GeoJSON with Bengaluru's major lakes (Ulsoor, Bellandur, Hebbal, Varthur).

Cache TTL: 86400s

Deck.gl: `GeoJsonLayer`, fill `[30, 144, 255, 70]`

---

### Feature 17 — Best Buy Zones (AI Feature)

**Purpose:** Highlight top investment areas based on composite score.

**Product:** ScatterplotLayer. Green dots of varying size. Larger = better score.

**Formula (in `lib/map/scoring.ts`):**
```ts
export function computeBestBuyScore(input: {
  valueScore: number      // 0–100, higher = undervalued (inverted from price)
  liquidityScore: number  // 0–100, higher = easier to sell
  riskScore: number       // 0–100, higher = MORE risk (inverted below)
  livabilityScore: number // 0–100, higher = better amenities
}): number {
  return Math.round(
    input.valueScore      * 0.35 +
    input.liquidityScore  * 0.25 +
    (100 - input.riskScore) * 0.20 +
    input.livabilityScore * 0.20
  )
}
```

Only areas with score ≥ 65 are shown as Best Buy Zones.

Deck.gl: `ScatterplotLayer`, radius mapped from score (65→5px, 100→20px), color `[76, 175, 80]`

---

### Feature 18 — Micro-Location Insights

**Purpose:** On-click panel showing detailed data for any map point.

**Trigger:** Click anywhere on the map → coordinates passed to API.

**Max API calls per click:** 2 (Places Details + Distance Matrix). Do not fire more.

**Output Panel shows:**
- Nearest hospital (name + distance in km)
- Nearest metro station (name + walk time in min)
- Nearest school (name + distance)
- Livability score for this cell
- Risk level (Low / Medium / High)

**Technical:**

API — Places Details:
```
GET https://api.olamaps.io/places/v1/details/advanced
  ?place_id={place_id}
  &api_key=OLA_MAPS_API_KEY
```

API — Distance Matrix (for travel times):
```
GET https://api.olamaps.io/routing/v1/distanceMatrix
  ?origins={clicked_lat,clicked_lng}
  &destinations={hospital_lat,lng}|{metro_lat,lng}|{school_lat,lng}
  &mode=driving
  &api_key=OLA_MAPS_API_KEY
```

Empty State: Show "Loading location data..." then "Data unavailable for this area" if both APIs fail.

Cache TTL: 3600s per coordinate (rounded to 3dp)

---

### Feature 19 — Infrastructure Layer

**Purpose:** Show metro stations, hospitals, schools, and malls as static reference points.

**Product:** ScatterplotLayer. Color-coded by type. Small radius, low opacity.

**Visual Rules (strict):**
- Metro → `[33, 150, 243, 180]` (Blue)
- Hospital → `[244, 67, 54, 180]` (Red)
- School → `[255, 235, 59, 180]` (Yellow)
- Mall → `[156, 39, 176, 180]` (Purple)
- Radius: 6px. Opacity: 0.4. NO ArcLayer here.
- Static — no animation, no pulsing

**Tooltip on hover:** Name, Type, Distance from property (computed client-side from Haversine)

**Technical:**

API — Nearby Search (4 separate calls, one per type):
```
GET https://api.olamaps.io/places/v1/nearbysearch
  ?location={lat,lng}
  &types={metro_station|hospital|school|shopping_mall}
  &radius=5000
  &rankBy=popular
  &api_key=OLA_MAPS_API_KEY
```

Fallback:
```ts
export const FALLBACK_INFRASTRUCTURE = [
  { name: 'MG Road Metro', type: 'metro_station', position: [77.6101, 12.9752] },
  { name: 'Manipal Hospital', type: 'hospital', position: [77.6480, 12.9563] },
  { name: 'Baldwin Girls School', type: 'school', position: [77.6003, 12.9641] },
  { name: 'Phoenix MarketCity', type: 'shopping_mall', position: [77.6963, 12.9974] },
  // ... 8 more per type
]
```

Cache TTL: 86400s

---

### Feature 20 — Street View

**Purpose:** Let users inspect the physical reality of a location.

**Trigger:** Dedicated "Street View" button in the UI, not a map click. Opens in a modal/split-screen panel.

**State Machine (strict — all states must be handled):**
```ts
type StreetViewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'no_coverage'; message: 'No street view available within 30m' }
  | { status: 'error'; message: string }
  | { status: 'ready'; imageId: string; metadata: StreetViewMetadata }
```

**UI Rules:**
- `idle` → show "Click map to preview street view"
- `loading` → show spinner with "Checking coverage..."
- `no_coverage` → show icon + "No street view available within 30m of this location"
- `error` → show icon + error message + "Try a different location"
- `ready` → render panorama iframe
- **NEVER** show a blank panel or an infinite spinner

**Flow:**

Step 1 — Coverage Check:
```
GET https://api.olamaps.io/sli/v1/streetview/coverage
  ?xMin={lng-0.002}&yMin={lat-0.002}&xMax={lng+0.002}&yMax={lat+0.002}
  &api_key=OLA_MAPS_API_KEY
→ If empty array: set state = 'no_coverage'. Stop.
```

Step 2 — Get ImageId:
```
GET https://api.olamaps.io/sli/v1/streetview/imageId
  ?lat={lat}&lon={lng}&radius=30
  &api_key=OLA_MAPS_API_KEY
→ If fails: set state = 'error'. Stop.
```

Step 3 — Get Metadata:
```
GET https://api.olamaps.io/sli/v1/streetview/metadata
  ?imageId={imageId}
  &api_key=OLA_MAPS_API_KEY
→ If fails: still render with imageId only. Metadata is optional.
```

Step 4 — Render: embed panorama viewer using imageId. Show capture date and orientation from metadata if available.

---

### Feature 21 — Investment Score Grid

**Purpose:** Area-level scoring grid for comparing zones side by side.

**Product:** GridLayer where each cell color = investment score.

**Score:** Uses `computeBestBuyScore()` from `lib/map/scoring.ts` — same formula as Feature 17.

**Grid Cell Size:** 500m × 500m

**Color Scale:** Score 0=dark red → 50=yellow → 100=bright green

**Deck.gl:** `GridLayer`, `cellSize: 500`, `extruded: false`, `colorRange` from `layerDefinitions.ts`

---

## 🎛️ Layer Control System

- Each toggle affects exactly one `LayerKey` in `activeToggles`
- `buildLayers()` re-runs whenever `activeToggles` changes
- Multiple layers can be active simultaneously
- Opacity scaling is automatic — handled inside `layerDefinitions.ts` VISUAL constants
- Toggle buttons are grouped: Base Layers | Analysis | Infrastructure | Insights

---

## 📊 Scoring Formulas Summary (all in lib/map/scoring.ts)

| Function | Weights |
|----------|---------|
| `computeBestBuyScore` | value×0.35, liquidity×0.25, (100-risk)×0.20, livability×0.20 |
| `computeLivabilityScore` | poi×0.40, travel×0.40, green×0.20 |
| `computeLiquidityScore` | access×0.40, amenity×0.30, value×0.30 |
| `computeRiskScore` | flood×0.60, legal×0.40 |

---

## 📋 Phase 1 Implementation Checklist

### Phase 1 (Ship This First)
- [ ] Base Map + Roads (live)
- [ ] AQI (live — OpenWeather)
- [ ] Metro Influence (live — Ola Places)
- [ ] Infrastructure POIs (live — Ola Nearby)
- [ ] Value Layer (mock)
- [ ] Density Layer (mock)

### Phase 2
- [ ] Traffic + Speed Limits (live)
- [ ] Flood Risk from Elevation (live)
- [ ] POI Density Heatmap (live)
- [ ] Connectivity Arcs (live)
- [ ] Isochrone / Travel Time (live)

### Phase 3
- [ ] Best Buy Zones (computed from Phase 1+2 data)
- [ ] Investment Score Grid (computed)
- [ ] Street View (live)
- [ ] Micro-Location Insights (live)
- [ ] Green Cover + Water (OSM)

---

## ✅ Validation Checklist

- [ ] No map re-initialization after first render
- [ ] No blank map at any point — all fallbacks populated
- [ ] All 21 toggles work independently
- [ ] Toggling same layer 5x in 2 seconds causes no crash or duplicate
- [ ] API failure on any single layer does not affect other layers
- [ ] No opacity above 0.5 in any layer
- [ ] All ContourLayers have minimum 3 thresholds
- [ ] Street View shows explicit state for no_coverage and error
- [ ] Micro-Location fires max 2 API calls per click
- [ ] All scoring formulas are in scoring.ts only — no inline logic in components

---

## 🏆 Final Goal

> The map should feel like a real estate decision engine, not a demo.
> Every layer tells the buyer something actionable. Every click surfaces real data.
> No spinner should ever be the last thing a user sees.