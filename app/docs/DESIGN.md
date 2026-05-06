# DESIGN.md — TenzorX Collateral Intelligence Platform
### Frontend Design Specification · Statement 4A · Team UZUMAKI

---

## 0. The One-Line Brief

> A **Bloomberg Terminal for Real Estate Collateral** — where lenders see price, risk, and liquidity not in silos, but as a single living intelligence layer.

---

## 1. Design Philosophy

### 1.1 The Aesthetic Direction: "Brutalist Precision"

We sit at the intersection of two worlds that rarely meet:

- **Brutalism** — exposed grid bones, unashamed data density, bold border-defined structure, monospace truth, zero decoration-for-decoration's-sake
- **Million-dollar fintech** — micro-animation polish, exact spacing, a palette that no AI has touched before, hierarchy so clear it feels inevitable

The tension between these two is the point. The roughness is the sophistication. When a credit underwriter looks at this interface, they should feel: *"This was built by people who understand my job."* When a CTO shows it to investors, they should feel: *"This looks like a product worth 10x what we paid for it."*

### 1.2 Human-ness

Data-heavy fintech UIs feel inhuman because they optimize for density over comprehension. We break that by:

- **Grain texture** — a subtle SVG noise filter over every surface. The screen breathes.
- **Annotation-style labels** — data labels that look slightly handwritten (IBM Plex Mono at light weight, rotated or tilted 2°)
- **Purposeful imperfection** — one element per screen that breaks the grid intentionally (a headline that bleeds into the border, a card that overlaps its neighbor by 1px)
- **Confident whitespace** — we don't fill every pixel. Empty space is a design choice.
- **Warm copy** — UI microcopy that sounds like a smart colleague, not a legal disclaimer

### 1.3 The Rule of One Unforgettable Thing

Every major screen has one hero element that is visually unreasonable — something you'd screenshot and send to a friend. That element is always functional, never decorative.

---

## 2. Color System

All colors reference the Material Design 3 tonal palette below. CSS custom properties must match these exact values.

```css
:root {
  /* === SURFACES === */
  --surface:                  #16121a;
  --surface-dim:              #16121a;
  --surface-bright:           #3c3741;
  --surface-container-lowest: #110d15;
  --surface-container-low:    #1e1a22;
  --surface-container:        #221e26;
  --surface-container-high:   #2d2831;
  --surface-container-highest:#38333c;

  /* === ON SURFACES === */
  --on-surface:               #e9dfec;
  --on-surface-variant:       #dfc0b4;
  --inverse-surface:          #e9dfec;
  --inverse-on-surface:       #342e38;

  /* === OUTLINES === */
  --outline:                  #a68b80;
  --outline-variant:          #584239;

  /* === PRIMARY (CORAL / PEACH) === */
  --surface-tint:             #ffb595;
  --primary:                  #ffb595;
  --on-primary:               #571e00;
  --primary-container:        #e86c2c;
  --on-primary-container:     #4d1a00;
  --inverse-primary:          #a23f00;
  --primary-fixed:            #ffdbcd;
  --primary-fixed-dim:        #ffb595;
  --on-primary-fixed:         #360f00;
  --on-primary-fixed-variant: #7c2e00;

  /* === SECONDARY (PINK / ROSE) === */
  --secondary:                #ffade3;
  --on-secondary:             #5a0f4a;
  --secondary-container:      #782b65;
  --on-secondary-container:   #f999da;
  --secondary-fixed:          #ffd8ee;
  --secondary-fixed-dim:      #ffade3;
  --on-secondary-fixed:       #3a0030;
  --on-secondary-fixed-variant:#752963;

  /* === TERTIARY (LAVENDER / MAUVE) === */
  --tertiary:                 #dabce7;
  --on-tertiary:              #3d284a;
  --tertiary-container:       #a287af;
  --on-tertiary-container:    #362143;
  --tertiary-fixed:           #f5d9ff;
  --tertiary-fixed-dim:       #dabce7;
  --on-tertiary-fixed:        #271234;
  --on-tertiary-fixed-variant:#553e62;

  /* === ERROR === */
  --error:                    #ffb4ab;
  --on-error:                 #690005;
  --error-container:          #93000a;
  --on-error-container:       #ffdad6;

  /* === BACKGROUND === */
  --background:               #16121a;
  --on-background:            #e9dfec;
  --surface-variant:          #38333c;
}
```

### 2.1 Semantic Color Usage

| Role | Variable | Usage |
|---|---|---|
| Page background | `--surface` | All page backgrounds |
| Elevated cards | `--surface-container` | Standard card surfaces |
| Hover state | `--surface-container-high` | Card hover, list item hover |
| Active/selected | `--surface-bright` | Active nav rail item |
| Primary accent | `--primary` | CTAs, highlights, active states, gauge fill |
| Secondary accent | `--secondary` | Secondary CTAs, tag backgrounds, chart series 2 |
| Tertiary accent | `--tertiary` | Decorative elements, chart series 3, badges |
| Danger/Risk | `--error` | Risk flags, anomaly indicators |
| Success/Positive | `#8bc4a8` (custom) | Positive value drivers (not in palette — add this) |
| Borders default | `--outline-variant` | All card borders, dividers |
| Borders emphasis | `--outline` | Focused inputs, active borders |
| Body text | `--on-surface` | Primary readable text |
| Secondary text | `--on-surface-variant` | Labels, captions, metadata |

### 2.2 The Palette Story (for Your Own Understanding)

This palette has a specific warmth that's rare in fintech. The coral-to-pink-to-lavender progression on a near-black purple background creates an atmosphere that reads as both deeply technical and surprisingly alive. Most fintech dashboards are cold (blue/grey). This one is warm without being playful — it's the difference between a luxury private bank and a retail bank.

---

## 3. Typography

### 3.1 Type Scale

| Token | Family | Size | Weight | Line-Height | Letter-Spacing | Usage |
|---|---|---|---|---|---|---|
| `headline-xl` | Space Grotesk | 40px | 600 | 1.2 | 0 | Hero headlines, page titles |
| `headline-lg` | Space Grotesk | 24px | 500 | 1.3 | 0 | Section headers, card titles |
| `headline-md` | Space Grotesk | 20px | 500 | 1.3 | 0 | Sub-section headers |
| `body-base` | Inter | 16px | 400 | 1.6 | 0 | Body copy, descriptions |
| `body-sm` | Inter | 14px | 400 | 1.5 | 0 | Secondary text, labels |
| `data-mono` | IBM Plex Mono | 13px | 450 | 1.4 | 0 | All numeric data outputs |
| `metadata-label` | IBM Plex Mono | 11px | 600 | 1 | 0.08em | Column headers, unit labels |
| `display` | Space Grotesk | 56–72px | 700 | 1.05 | -0.02em | Hero numbers (valuation figure) |

### 3.2 Typography Rules

- **Never** use Inter for headlines or IBM Plex Mono for body copy
- All rupee amounts (₹) always render in IBM Plex Mono at `data-mono` or larger
- Confidence scores (0.00–1.00) always in `data-mono`, always showing 2 decimal places
- Index scores (0–100) always in Space Grotesk `display` or `headline-xl`
- Labels above data panels: `metadata-label` (IBM Plex Mono, 11px, 600, uppercase, 0.08em tracking)
- Percentage ranges: always show as `₹X.XL – ₹X.XL`, never as a single value

### 3.3 Google Fonts Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500&family=IBM+Plex+Mono:wght@400;450;600&display=swap" rel="stylesheet">
```

---

## 4. Spacing & Layout

### 4.1 Grid

| Token | Value | Notes |
|---|---|---|
| `--unit` | 4px | Base unit — all spacing is multiples of 4 |
| `--gutter` | 16px | Column gutter |
| `--margin-page` | 24px | Page edge margin (mobile: 16px) |
| `--rail-collapsed` | 64px | Nav rail width (icon-only mode) |
| `--rail-expanded` | 320px | Nav rail width (full mode, desktop) |
| `--dock-height` | 80px | Bottom dock height (mobile) |

### 4.2 Border Radius

```css
--radius-sm:   0.125rem;  /* 2px  — subtle rounding on tags */
--radius:      0.25rem;   /* 4px  — default */
--radius-md:   0.375rem;  /* 6px  — inputs, small cards */
--radius-lg:   0.5rem;    /* 8px  — standard cards */
--radius-xl:   0.75rem;   /* 12px — modals, large panels */
--radius-full: 9999px;    /* Pill — badge chips, progress bars */
```

### 4.3 Brutalist Override

For specific brutalist elements, `border-radius: 0` is intentional. These include:
- The main hero title block
- The primary valuation output card (Market Value)
- Navigation rail (no rounding on sides)
- Data table headers

### 4.4 Desktop Layout Architecture

```
┌──────────────────────────────────────────────────────────┐
│ NAV RAIL (64px collapsed / 320px expanded)               │
│ ┌──┐ ┌────────────────────────────────────────────────┐  │
│ │  │ │ TOP BAR (56px)                                  │  │
│ │  │ │ Page Title · Breadcrumb · Actions              │  │
│ │N │ ├─────────────────────────────────────────────────┤  │
│ │A │ │                                                 │  │
│ │V │ │   MAIN CONTENT AREA                             │  │
│ │  │ │   12-column grid, 24px gutters                  │  │
│ │R │ │   max-width: 1440px                             │  │
│ │A │ │                                                 │  │
│ │I │ │                                                 │  │
│ │L │ │                                                 │  │
│ │  │ │                                                 │  │
│ └──┘ └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Borders, Texture & Visual Language

### 5.1 The Brutalist Border System

Cards use a 1px solid border — no drop shadows in the traditional sense. Depth is created through background color steps, not shadows.

```css
/* Default card border */
border: 1px solid var(--outline-variant);   /* #584239 */

/* Focused / active card border */
border: 1px solid var(--outline);           /* #a68b80 */

/* Primary accent card (e.g., Market Value) */
border: 1.5px solid var(--primary);         /* #ffb595 */
border-left: 3px solid var(--primary);      /* Accent left rail */

/* Risk/danger card */
border: 1.5px solid var(--error);           /* #ffb4ab */
border-left: 3px solid var(--error);
```

### 5.2 Grain Texture

Every surface gets a subtle noise grain overlay. This is what provides the "human-ness" — the screen feels like it has texture, not like a flat UI.

```css
/* Add this pseudo-element to any container that needs grain */
.surface::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  border-radius: inherit;
  z-index: 0;
}
```

Grain opacity values:
- Page background: `0.04`
- Cards (surface-container): `0.06`
- Highlighted cards: `0.08`

### 5.3 Decorative Grid Lines

The page background has a faint grid — 1px lines at every 80px, `var(--outline-variant)` at 6% opacity. This grid is purely decorative and contributes to the "data terminal" feeling. It's barely visible on dark backgrounds but registers subconsciously.

```css
background-image:
  linear-gradient(to right, rgba(88, 66, 57, 0.06) 1px, transparent 1px),
  linear-gradient(to bottom, rgba(88, 66, 57, 0.06) 1px, transparent 1px);
background-size: 80px 80px;
```

---

## 6. Application Screens

### 6.1 Screen Inventory

| # | Screen | Route | Priority |
|---|---|---|---|
| 1 | Landing / Hero | `/` | P0 |
| 2 | Valuation Input Wizard | `/valuation/new` | P0 |
| 3 | Processing / Analysis Screen | `/valuation/:id/analyzing` | P0 |
| 4 | Results Dashboard | `/valuation/:id/results` | P0 |
| 5 | Portfolio Overview | `/portfolio` | P1 |
| 6 | Property History Detail | `/portfolio/:id` | P1 |
| 7 | Chatbot Interface (Alternative) | `/chat` | P1 |

---

### 6.2 Screen 1 — Landing / Hero

**The Unforgettable Thing**: A massive live-counting rupee number that animates up to a sample valuation (₹1.04Cr) on load, with a confidence score pulsing beside it like a heartbeat.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│ NAV BAR: Logo (left) · "New Valuation" CTA (right)       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   HERO SECTION (full viewport height)                    │
│   ┌────────────────────────────────────────────┐         │
│   │ LABEL: "COLLATERAL INTELLIGENCE LAYER"     │         │
│   │ (IBM Plex Mono · 11px · uppercase)         │         │
│   │                                            │         │
│   │ ₹1,04,00,000                               │         │
│   │ (Space Grotesk · 72px · 700 · primary)     │         │
│   │ Live-counting animation on load             │         │
│   │                                            │         │
│   │ "Real value. Real risk. Real certainty."   │         │
│   │ (Space Grotesk · 24px · 500 · on-surface)  │         │
│   │                                            │         │
│   │ [Start Valuation →]  [View Demo]           │         │
│   │ Primary CTA · Secondary ghost CTA          │         │
│   └────────────────────────────────────────────┘         │
│                                                          │
│   FLOATING PANEL (right side, overlapping grid)          │
│   ┌─────────────────┐                                    │
│   │ Resale Index    │                                    │
│   │     72          │                                    │
│   │  ●●●●●●●○○○     │                                    │
│   │ "MODERATE"      │                                    │
│   │ ─────────────── │                                    │
│   │ Confidence 0.68 │                                    │
│   │ ░░░░░░░░░░░░░░░ │                                    │
│   └─────────────────┘                                    │
│                                                          │
│   SOCIAL PROOF ROW                                       │
│   120+ Valuations · 3 NBFCs piloting · 94% accuracy     │
│                                                          │
├──────────────────────────────────────────────────────────┤
│   FEATURE GRID (3 columns)                               │
│   ┌───────────┐ ┌───────────┐ ┌───────────┐             │
│   │ VALUATION │ │ LIQUIDITY │ │ RISK FLAGS│             │
│   │ RANGE     │ │ ENGINE    │ │           │             │
│   └───────────┘ └───────────┘ └───────────┘             │
│   Each card: 1px border-left in primary/secondary/      │
│   tertiary color. Brief description + icon (line-style) │
│                                                          │
├──────────────────────────────────────────────────────────┤
│   HOW IT WORKS (Pipeline visualization — simplified)     │
│   Input → Feature Extraction → Model Ensemble →         │
│   Uncertainty Calibration → Output                       │
│   Animated with connecting dashed lines drawing in       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Animation Sequence on Load:**
1. (0ms) Background grid fades in
2. (100ms) LABEL tag slides up from below
3. (300ms) Rupee counter begins counting from ₹0 → ₹1,04,00,000 over 1.8s (ease-out)
4. (500ms) Tagline fades in, word by word with 60ms stagger
5. (1200ms) CTAs slide up
6. (1600ms) Floating panel slides in from right with spring easing
7. (2000ms) Feature grid cards stagger in bottom-to-top

---

### 6.3 Screen 2 — Valuation Input Wizard

**The Unforgettable Thing**: The step indicator on the left is a vertical timeline that looks like a circuit board trace — connecting steps with animated electrical pulse when progressing.

**Layout:** Two-column. Left: step indicator + progress. Right: active step form.

**Step Definitions:**

| Step | Title | Fields |
|---|---|---|
| 1 | Location | Address (text + map pin), Lat/Long (auto-filled), Pincode |
| 2 | Property Details | Type (Residential/Commercial/Industrial), Sub-type, Carpet Area (sqft), Built-up Area (sqft), Floor |
| 3 | Property Age & Condition | Vintage selector (New/Mid/Old), Year of construction, Floor count, Lift availability |
| 4 | Legal & Ownership | Freehold / Leasehold toggle, Occupancy status (Self/Rented/Vacant), Rental amount (optional), Legal complexity indicator |
| 5 | Optional Signals | Image upload (drag & drop — exterior, interior, kitchen, bedroom), Notes |

**Step Indicator (Left Panel):**

```
┌─────────────────────────────┐
│  ● LOCATION                  │ ← Active: primary color dot + bold label
│  │                           │   (dot is 10px filled circle)
│  ⊙ PROPERTY DETAILS         │ ← Completed: checkmark
│  │                           │   (circuit trace line connecting dots)
│  ○ AGE & CONDITION          │ ← Upcoming: outline circle
│  │
│  ○ LEGAL & OWNERSHIP
│  │
│  ○ OPTIONAL SIGNALS
│
│  ─────────────────
│  STEP 1 OF 5
│  [████░░░░░░] 20%
└─────────────────────────────┘
```

**Form Field Style:**

```css
.form-input {
  background: var(--surface-container-low);
  border: 1px solid var(--outline-variant);
  border-radius: var(--radius-md);
  color: var(--on-surface);
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  padding: 12px 16px;
  transition: border-color 200ms ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255, 181, 149, 0.12);
}

.form-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--on-surface-variant);
  margin-bottom: 6px;
  display: block;
}
```

**Toggle/Select Style:** Custom pill-group toggles for Type selection. When an option is selected, the pill fills with `var(--primary-container)` background and `var(--primary)` text, with a 2px left border in `var(--primary)`.

**Map Component (Step 1):** Embedded map (Leaflet.js with a dark tile — Stadia Alidade Smooth Dark). The map pin is a custom SVG in `var(--primary)` color. When address is typed, the map pans with a smooth animation.

---

### 6.4 Screen 3 — Processing / Analysis Screen

**The Unforgettable Thing**: A live animated pipeline diagram showing actual stages being processed — each stage lights up as it completes, with a flowing particle animation along the connector lines.

**Layout:** Full-screen. Dark. Centered.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│    ANALYZING COLLATERAL INTELLIGENCE                         │
│    2 Kalindikunj Ext, New Delhi · 1200 sqft · Residential   │
│                                                              │
│    ┌─────────────────────────────────────────────────────┐   │
│    │                                                     │   │
│    │  [GEO] ──●──> [INFRA] ──●──> [PROPERTY]            │   │
│    │                                                     │   │
│    │  [MARKET] ──●──> [LEGAL] ──●──> [VISION]            │   │
│    │                                                     │   │
│    │  [FRAUD CHECKS] ──────────────────────────────●    │   │
│    │                                          ↓          │   │
│    │                                   [VALUATION ENGINE]│   │
│    │                                          ↓          │   │
│    │                                       [OUTPUT]      │   │
│    └─────────────────────────────────────────────────────┘   │
│                                                              │
│    ████████████████████░░░░░░░░  Stage 4 / 9               │
│    Extracting infrastructure proximity features...           │
│                                                              │
│    Completed stages:                                         │
│    ✓ Geocoding & H3 spatial indexing                        │
│    ✓ Location embedding (GraphSAGE)                         │
│    ✓ Property feature extraction                            │
│    ⟳ Infrastructure proximity index (Haversine + KDE)       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Pipeline Node States:**
- **Idle**: `--surface-container` fill, `--outline-variant` border
- **Active**: `--primary-container` fill, `--primary` border, pulsing glow animation
- **Complete**: `--surface-bright` fill, `--tertiary` border, checkmark icon

**Connector Line Animation:** Dashed SVG path with a traveling `stroke-dashoffset` animation — creates the illusion of data "flowing" through the pipeline at ~40px/second.

**Estimated Time Display:** Bottom right corner shows "ETA ~12 seconds" in IBM Plex Mono, counting down.

---

### 6.5 Screen 4 — Results Dashboard (The Main Event)

This is the most important screen. Every design decision here should be evaluated on: *"Would a credit underwriter at an NBFC trust this output?"*

**The Unforgettable Thing**: The Market Value is displayed at 72px with an animated range bar below it — the two endpoints animate in from center, expanding outward to their final positions, with a subtle bounce.

**Overall Layout (Desktop — 12 column grid):**

```
TOP BAR: Address · Date · "New Valuation" · Export PDF · Share
─────────────────────────────────────────────────────────────

ROW 1 (3 columns: 5 + 4 + 3)

┌─────────────────────────┐ ┌──────────────────┐ ┌──────────┐
│ MARKET VALUE            │ │ DISTRESS VALUE   │ │ CONFID.  │
│ PRIMARY CARD            │ │ SECONDARY CARD   │ │ SCORE    │
│                         │ │                  │ │          │
│ ₹95L – ₹1.15Cr         │ │ ₹75L – ₹90L      │ │   0.68   │
│ (72px Space Grotesk)    │ │ (40px)           │ │ [======] │
│                         │ │                  │ │          │
│ ░░░░[===range===]░░░░   │ │ ░░[==range==]░░░ │ │ Moderate │
│                         │ │                  │ │          │
│ ▲ +12% vs circle rate   │ │ 22% discount     │ │          │
└─────────────────────────┘ └──────────────────┘ └──────────┘

ROW 2 (2 columns: 4 + 8)

┌──────────────────┐ ┌──────────────────────────────────────┐
│ RESALE POTENTIAL │ │ TIME TO LIQUIDATE                     │
│ INDEX            │ │                                       │
│                  │ │ ◄──────────────────────────────────► │
│      72          │ │ 45 days              90 days          │
│   ████████░░     │ │                                       │
│   (radial gauge) │ │ [GOOD ZONE]  [LIKELY]  [OUTER BAND]  │
│                  │ │                                       │
│  MODERATE        │ │ Most comparable assets sold in:       │
│  LIQUIDITY       │ │ 58–72 days in this micro-market       │
└──────────────────┘ └──────────────────────────────────────┘

ROW 3 (2 columns: 6 + 6)

┌─────────────────────────────┐ ┌─────────────────────────────┐
│ VALUE DRIVERS               │ │ RISK FLAGS                   │
│ (What's pushing price up)   │ │ (What lenders should flag)   │
│                             │ │                              │
│ ↑ Metro proximity           │ │ ⚠ High micromarket comp.    │
│   (0.82 infra index)        │ │   42 similar listings nearby│
│                             │ │                              │
│ ↑ Standard 2BHK config      │ │ ⚠ Moderate building age     │
│   (high fungibility)        │ │   11 years, mid-age decay   │
│                             │ │                              │
│ ↑ Strong demand density     │ │ ◉ Legal: Title clear (0.78) │
│   (0.72 KDE score)          │ │   No litigation flag        │
│                             │ │                              │
│ ↓ 11yr building age         │ │                              │
│   (age decay: 0.82)         │ │                              │
└─────────────────────────────┘ └─────────────────────────────┘

ROW 4 (3 columns: 4 + 4 + 4)

┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ LOCATION SIGNALS │ │ MARKET DYNAMICS  │ │ PROPERTY DETAILS │
│                  │ │                  │ │                  │
│ Infra Index      │ │ Absorption Rate  │ │ Carpet Area      │
│ 0.65             │ │ 0.42             │ │ 1200 sqft        │
│                  │ │                  │ │                  │
│ Demand Density   │ │ Market Strength  │ │ Built-up         │
│ 0.72             │ │ 0.68             │ │ 1380 sqft        │
│                  │ │                  │ │                  │
│ Location Score   │ │ Inventory Mo.    │ │ Age Decay        │
│ 0.78             │ │ 4.2 months       │ │ 0.82             │
└──────────────────┘ └──────────────────┘ └──────────────────┘

ROW 5 (Full width)
┌────────────────────────────────────────────────────────────┐
│ MAP VIEW                                                    │
│ Dark tile map · Property pin · POI markers                 │
│ Radius circle: 1km, 2km, 5km                               │
│ Layer toggles: [Schools] [Metro] [Hospitals] [Listings]    │
└────────────────────────────────────────────────────────────┘
```

#### 6.5.1 Primary Card — Market Value

This is the flagship card. It occupies 5/12 columns and is the first thing eyes land on.

```
Background: var(--surface-container)
Border-left: 3px solid var(--primary)      ← the brutalist accent
Border: 1px solid var(--outline-variant)
Border-radius: 0 var(--radius-lg) var(--radius-lg) 0   ← square left, rounded right

LABEL:  ESTIMATED MARKET VALUE
        (IBM Plex Mono · 11px · uppercase · var(--on-surface-variant))

VALUE:  ₹95,00,000 – ₹1,15,00,000
        (Space Grotesk · 40px · 600 · var(--primary))
        [animates counting up on mount]

RANGE BAR:
  Background track: var(--surface-container-high)
  Fill: gradient from var(--primary) 30% opacity → var(--primary) at center → 30% opacity
  Endpoints animate outward on mount
  Width: 100% of card

DELTA:  ▲ 12% above circle rate baseline
        (IBM Plex Mono · 13px · #8bc4a8 for positive delta)
```

#### 6.5.2 Resale Potential Index — Radial Gauge

The gauge is an SVG arc that fills from 0 to the score value with a 1-second ease-out animation.

```
Outer ring: 200px × 200px SVG
Track arc (180°): var(--surface-container-high), stroke-width 12
Fill arc: gradient stroke
  0–49:    var(--error)
  50–79:   var(--primary)
  80–100:  #8bc4a8

Center text:
  Score:  72
          (Space Grotesk · 56px · 700 · var(--on-surface))
  Label:  MODERATE
          (IBM Plex Mono · 11px · uppercase · var(--on-surface-variant))

Below gauge:
  5 dots (filled/unfilled) representing liquidity bands
  Current band highlighted in var(--primary)
```

#### 6.5.3 Time-to-Liquidate Visualization

A horizontal range slider visualization (not interactive — display only). Two endpoints with callout labels.

```
Track: 400px wide · 6px tall · background var(--surface-container-high)
Filled range: var(--secondary) at 60% opacity
Left endpoint: 45 days · label above (IBM Plex Mono)
Right endpoint: 90 days · label above
Midpoint marker: dashed vertical line · "~67 days avg" tooltip
```

#### 6.5.4 Value Drivers vs Risk Flags (Side by Side)

Two columns with contrasting visual language:

**Value Drivers:**
- Each row: Up arrow icon (in `--tertiary`), driver name, metric
- Background: `var(--surface-container-low)`
- Positive drivers: left border in `#8bc4a8`
- Negative (deprecating) drivers: left border in `var(--on-surface-variant)` — they're still drivers, just negative ones

**Risk Flags:**
- Each row: Warning triangle icon (in `var(--error)`) or Info circle (in `var(--tertiary)`)
- Background: `var(--surface-container-low)`
- High risk flags: left border in `var(--error)`
- Informational flags: left border in `var(--tertiary)`
- Risk flag text always in IBM Plex Mono

#### 6.5.5 The Three Signal Cards (Row 4)

These are compact data cards, each with 3 metrics displayed as:
```
LABEL (IBM Plex Mono 11px uppercase)
VALUE (IBM Plex Mono 20px · var(--on-surface))
```
Each metric is separated by a 1px `var(--outline-variant)` divider.

---

### 6.6 Screen 5 — Portfolio Overview

A table-primary view of all valuations conducted, with sorting and filtering.

**The Unforgettable Thing**: Each row in the table has a mini "confidence sparkline" — a tiny 40px wide bar that visualizes confidence at a glance with a gradient fill.

**Layout:**

```
TOP SECTION:
  "Portfolio Intelligence" (headline-xl)
  Stats row: Total Properties · Avg Confidence · Avg Resale Index
  [+ New Valuation] [Export CSV]

FILTER BAR:
  [All Types ▾] [Date Range] [Confidence Range] [Search ...]

TABLE COLUMNS:
  Property Address | Type | Market Value | Resale Index | Confidence | TTL | Date | Actions
  Each row animated in with a 30ms stagger on load
  Hover state: row background → var(--surface-container-high)
  Active selected row: left border 2px solid var(--primary)

EMPTY STATE:
  Centered illustration (SVG — a simple line drawing of a building)
  "No valuations yet. Start your first."
  [Begin Valuation →]
```

---

### 6.7 Screen 6 — Chatbot Interface (Alternative Input)

An alternative to the form wizard — users can describe a property in natural language and the system extracts structured data.

**The Unforgettable Thing**: The chat bubbles are not rounded pill-shapes (which is cliché). They are rectangular with a 2px left accent border in primary (user) or tertiary (AI). The AI response renders in stages — first the JSON raw output, then the structured visualization grows in below it.

**Layout:**

```
LEFT PANEL (30% width):
  Chat transcript (scrollable)
  User message: right-aligned · border-right: 2px solid var(--primary)
  AI message: left-aligned · border-left: 2px solid var(--tertiary)

RIGHT PANEL (70% width):
  Live-updating mini Results card
  Shows partial results as they emerge from the response
  Confidence meter fills incrementally
```

**Input Area:**
- Bottom-pinned textarea
- IBM Plex Mono placeholder text: `"Describe the property or paste address..."`
- Send button: `var(--primary)` background, `var(--on-primary)` text, 0 border-radius

**Suggested prompts (shown on empty state):**

```
[ "3BHK apartment, Sector 62, Noida, 12 years old, 1650 sqft" ]
[ "Commercial shop, 400 sqft, Lajpat Nagar, ground floor" ]
[ "Villa, Whitefield Bangalore, 2400 sqft, freehold, 4 years old" ]
```

---

## 7. Component Library

### 7.1 Button System

```
PRIMARY BUTTON
  Background: var(--primary)
  Text: var(--on-primary)
  Border-radius: var(--radius-md)
  Padding: 12px 24px
  Font: Inter · 14px · 500
  Hover: brightness(1.08) + scale(1.02)
  Active: scale(0.97)
  Transition: all 150ms cubic-bezier(0.2, 0, 0, 1)

GHOST BUTTON
  Background: transparent
  Text: var(--primary)
  Border: 1px solid var(--outline)
  Same padding, radius, font

DESTRUCTIVE BUTTON
  Background: var(--error-container)
  Text: var(--on-error-container)

ICON BUTTON
  32px × 32px
  Background: var(--surface-container-high)
  Icon color: var(--on-surface-variant)
  Hover: background → var(--surface-bright)
```

### 7.2 Badge / Chip System

```
STANDARD TAG
  Background: var(--surface-container-high)
  Text: var(--on-surface-variant)
  Border: 1px solid var(--outline-variant)
  Border-radius: var(--radius-sm)  ← deliberately not pill-shaped (brutalist)
  Padding: 2px 8px
  Font: IBM Plex Mono · 11px · 600 · uppercase

RISK TAG (danger)
  Background: rgba(255, 180, 171, 0.1)
  Text: var(--error)
  Border: 1px solid rgba(255, 180, 171, 0.3)

DRIVER TAG (positive)
  Background: rgba(139, 196, 168, 0.1)
  Text: #8bc4a8
  Border: 1px solid rgba(139, 196, 168, 0.3)

CONFIDENCE TAG
  Background: rgba(218, 188, 231, 0.1)
  Text: var(--tertiary)
  Border: 1px solid rgba(218, 188, 231, 0.3)
```

### 7.3 Card System

```
BASE CARD
  Background: var(--surface-container)
  Border: 1px solid var(--outline-variant)
  Border-radius: var(--radius-lg)
  Padding: 20px
  Transition: border-color 200ms ease, background 200ms ease

  Hover state:
    Background: var(--surface-container-high)
    Border-color: var(--outline)

ACCENT CARD (primary)
  + Border-left: 3px solid var(--primary)
  + Border-radius: 0 var(--radius-lg) var(--radius-lg) 0

ACCENT CARD (danger)
  + Border-left: 3px solid var(--error)

ACCENT CARD (info)
  + Border-left: 3px solid var(--tertiary)
```

### 7.4 Navigation Rail

```
COLLAPSED STATE (64px wide)
  Background: var(--surface-container-lowest)
  Border-right: 1px solid var(--outline-variant)

  Items: 48px × 48px icon buttons, centered
  Active: Background var(--surface-bright) · Icon color var(--primary)
  Inactive: Icon color var(--on-surface-variant)
  Hover: Background var(--surface-container-high)

EXPANDED STATE (320px wide)
  Same background + border
  Items: full-width rows
    Icon (24px) + Label (Inter 14px 500) + optional count badge

Nav items:
  ◎ Dashboard
  ⬡ New Valuation
  ⊟ Portfolio
  ◷ History
  ━ ─────── (divider)
  ⚙ Settings
```

### 7.5 Progress / Confidence Bar

```
Track:
  Height: 6px
  Background: var(--surface-container-high)
  Border-radius: var(--radius-full)

Fill:
  Gradient: linear-gradient(to right, var(--primary-container), var(--primary))
  Animated width on mount: 0% → actual% over 800ms ease-out

Label above bar:
  "CONFIDENCE SCORE" — IBM Plex Mono 11px uppercase
  Value: "0.68" — IBM Plex Mono 20px 600 var(--on-surface)
```

### 7.6 Data Metric Cell

The repeating unit for compact data display throughout the dashboard.

```
┌─────────────────────┐
│ LABEL (11px mono)   │
│                     │
│ VALUE               │
│ (20px mono 600)     │
└─────────────────────┘
Border-bottom: 1px solid var(--outline-variant)
Padding: 12px 0
Last-child: border-bottom: none
```

---

## 8. Animation System

### 8.1 Core Easing Curves

```css
--ease-standard:    cubic-bezier(0.2, 0, 0, 1);      /* General UI */
--ease-emphasized:  cubic-bezier(0.05, 0.7, 0.1, 1); /* Large motion */
--ease-decelerate:  cubic-bezier(0, 0, 0, 1);         /* Enter screen */
--ease-accelerate:  cubic-bezier(0.3, 0, 1, 1);       /* Exit screen */
--ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1);/* Bounce/pop */
```

### 8.2 Animation Inventory

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Page entry | Fade + translateY(16px → 0) | 400ms | `--ease-decelerate` |
| Card stagger | Sequential fade-in, 40ms delay each | 300ms | `--ease-standard` |
| Number counter | Count from 0 to value | 1800ms | ease-out cubic |
| Gauge fill | Arc stroke-dashoffset | 1000ms | `--ease-emphasized` |
| Range bar expand | Width from center outward | 800ms | `--ease-spring` |
| Progress bar | Width 0 → value | 800ms | `--ease-emphasized` |
| Pipeline particle | Traveling dot along SVG path | continuous | linear |
| Button hover | scale(1.02) | 150ms | `--ease-standard` |
| Card hover | Background color shift | 200ms | `--ease-standard` |
| Tooltip appear | scale(0.95→1) + fade | 180ms | `--ease-spring` |
| Input focus ring | box-shadow spread | 150ms | `--ease-standard` |
| Nav rail expand | Width 64px → 320px | 250ms | `--ease-emphasized` |

### 8.3 Scroll-Triggered Animations

Elements below the fold use Intersection Observer to trigger:
- Cards: fade-in + translateY(24px → 0) when 30% visible
- Each section staggered by 60ms

### 8.4 The Hero Counter Animation

```javascript
// Pseudo-code for the hero rupee counter
function animateCounter(target, duration) {
  const start = performance.now();
  const update = (time) => {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);
    element.textContent = '₹' + formatINR(current);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
// Triggered when hero section is mounted / visible
```

---

## 9. Micro-Interactions & Details

### 9.1 Hover Tooltips

All data metrics have hover tooltips explaining what the metric means in plain English. This is a core UX choice — it makes the interface approachable for both technical and non-technical users.

Style:
```
Background: var(--surface-container-highest)
Border: 1px solid var(--outline)
Border-radius: var(--radius-md)
Font: Inter · 13px · var(--on-surface)
Max-width: 220px
Padding: 8px 12px
Arrow: 6px triangle pointing toward trigger
```

### 9.2 Loading States

**Skeleton loading** (not spinners) for all data cards while the results load:

```
Background: var(--surface-container-high)
Animated shimmer: linear-gradient moving left-to-right
  from transparent → var(--surface-bright) → transparent
Duration: 1.4s infinite
```

### 9.3 Export to PDF

When the user clicks "Export PDF" on the Results screen:
- A brief toast notification appears: "Generating report..."
- The page's print stylesheet generates a clean, letterhead-style PDF with the TenzorX logo, property address, and all output metrics
- PDF uses white background with dark text for printability

### 9.4 Empty States

All empty states (no portfolio items, no results yet) use:
- A small SVG line-art illustration (building / graph / property pin)
- Headline in Space Grotesk 20px
- Subtext in Inter 14px var(--on-surface-variant)
- Single CTA button

---

## 10. Responsive Behavior

### 10.1 Breakpoints

| Breakpoint | Min-width | Layout |
|---|---|---|
| Mobile S | 320px | 4-column grid, 16px margin |
| Mobile L | 480px | 4-column grid, 16px margin |
| Tablet | 768px | 8-column grid, 20px margin |
| Desktop | 1024px | 12-column grid, 24px margin |
| Wide | 1440px | 12-column, max-width 1440px centered |

### 10.2 Mobile Adaptations

- Nav rail collapses to **bottom dock** (80px tall, icon-only, 5 items)
- Results dashboard becomes **vertical card stack** (single column)
- Market Value card is full-width, font-size steps down to 32px from 40px
- Pipeline animation on processing screen becomes simplified linear list
- Wizard steps become full-screen with swipe navigation
- Map view becomes collapsible accordion

### 10.3 Tablet Adaptations

- Nav rail stays as collapsed side rail (64px)
- Results Row 1: 3 cards become 2 wide, 1 below
- Results Row 3: Value Drivers and Risk Flags stack vertically

---

## 11. Accessibility

- All interactive elements: minimum 44×44px touch target
- Focus styles: `box-shadow: 0 0 0 3px rgba(255, 181, 149, 0.5)` (primary at 50%)
- Color contrast: All text meets WCAG AA (4.5:1 minimum)
- `prefers-reduced-motion`: All animations disabled, static states used
- Screen reader: All chart elements have `aria-label` with spoken equivalent
- Error states: Never rely on color alone — always include icon + text

---

## 12. Technical Implementation Notes

### 12.1 Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React 18 + Vite | Fast build, hot reload |
| Routing | React Router v6 | Standard |
| Styling | Tailwind CSS + CSS custom properties | Utility + theme tokens |
| Animations | Framer Motion | Production-grade springs |
| Charts | Recharts or D3.js | Radial gauge needs D3 |
| Maps | Leaflet.js | Open source, dark tile support |
| Icons | Lucide React | Consistent line-style icons |
| State | Zustand | Lightweight global state |

### 12.2 CSS Custom Properties Setup

All color tokens defined in `:root` (see Section 2). Spacing, radius, and font tokens also in `:root`. This enables theming and ensures consistency across components.

### 12.3 Performance Targets

- First Contentful Paint: < 1.2s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- All animations at 60fps (use `will-change: transform` for animated elements)

### 12.4 Font Loading Strategy

Use `font-display: swap` to prevent FOIT. Preload the three primary font families. Body text falls back to `system-ui` during load — Space Grotesk has no fallback that doesn't cause layout shift, so set explicit `line-height` to prevent reflow.

---

## 13. Brand Voice & Microcopy

### 13.1 Tone

- Confident but not arrogant
- Technical but not inaccessible
- Precise — never vague
- Human — never robotic

### 13.2 Sample Microcopy

| Context | Copy |
|---|---|
| Hero tagline | "Real value. Real risk. Real certainty." |
| Empty portfolio | "Your first valuation is one property away." |
| Processing screen | "Running 9 analytical stages. This takes about 15 seconds." |
| High confidence result | "Strong signal. This estimate carries high confidence." |
| Low confidence result | "Some inputs were proxied. Treat this as directional." |
| Risk flag header | "Watch these before lending." |
| Value driver header | "What's working in this property's favour." |
| Export button | "Export Valuation Report" |
| Confidence tooltip | "How much we trust this estimate. Above 0.70 is reliable. Below 0.50 means treat with caution." |

### 13.3 Number Formatting

- Values in lakhs: `₹95L` or `₹95,00,000` (full form in primary cards)
- Values in crores: `₹1.15Cr` or `₹1,15,00,000`
- Scores: always 2 decimal places (`0.68`, never `0.7`)
- Percentages: `72%` (no decimals unless necessary)
- Index: `72 / 100` (always include /100 for first appearance)
- Days: `45 – 90 days` (em-dash, space-padded)

---

## 14. The Screen-by-Screen "Unforgettable" Summary

| Screen | The One Thing You'll Screenshot |
|---|---|
| Landing | ₹1.04Cr counting up in 72px type as the page loads |
| Input Wizard | Circuit-board step indicator with electrical pulse animation |
| Processing | Real-time pipeline diagram with flowing particle animation |
| Results | Market Value range bar expanding outward from center |
| Portfolio | Confidence sparkline inside each table row |
| Chatbot | Rectangular bordered chat bubbles (not pill-shaped) with AI response building up in real-time |

---

## Appendix A — Asset Checklist

Before final handoff, ensure:

- [ ] All CSS variables match the token values in Section 2 exactly
- [ ] All three fonts loaded: Space Grotesk, Inter, IBM Plex Mono
- [ ] Dark background grid texture implemented (Section 5.3)
- [ ] Grain noise overlay implemented on all major surfaces (Section 5.2)
- [ ] All number values use IBM Plex Mono
- [ ] All headlines use Space Grotesk
- [ ] Navigation rail works in both collapsed and expanded states
- [ ] Mobile bottom dock implemented
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Results dashboard includes all 6 output fields from the problem statement
- [ ] Confidence score displayed on results with interpretive label
- [ ] Risk flags and Value Drivers sections both present
- [ ] Map component integrated with dark tile

---

*DESIGN.md · TenzorX / Team UZUMAKI · Statement 4A · National Hackathon 2025*