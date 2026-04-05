# Farm Carbon Footprint Estimator

Try it out: [https://farmcarbonfootprint.netlify.app](https://farmcarbonfootprint.netlify.app)

A bilingual (EN/UA) web app for estimating farm greenhouse gas emissions (tCO2e) across crops, livestock, inputs, and field practices. The goal is fast, practical decision support you can actually use on a real farm.

---

## Highlights

- **EN/UA localization** throughout the UI
- **Dark/Light theme**, **high-contrast** mode, and **font size** controls
- **Wizard mode** (step‑by‑step) and **Advanced mode** (full form)
- **Validation** for crop area consistency and livestock‑only farms
- **Practice impact** options (tillage, irrigation method/energy, residue, precision, cover crops)
- **Equipment tracking** (fuel/electricity inputs)
- **What‑if calculator** (nitrogen, tillage, irrigation, cover crops)
- **Projections** and **benchmarks**
- **Recommendations** with editable status, notes, and action plan
- **History** with comparison table and export
- **Batch mode** (CSV import/export)
- **Crop rotation planner** (with TXT export)
- **Charts** (pie, trend, crop comparison, practice heat map) with **PNG download**
- **PWA install** support (Install button + installation guide)

---

## What It Calculates

Emissions from:
- Fertilizer (N, P, K)
- Manure
- Fuel (diesel)
- Irrigation
- Pesticides
- Livestock and poultry

Outputs include:
- Total emissions (tCO2e)
- Per‑hectare emissions (tCO2e/ha)
- Category breakdown
- Crop‑level totals
- Impact level and recommendations

---

## Exports

- **CSV** (results + comparison tables)
- **TXT** (reports, rotation plan, action plan)
- **PNG** (charts)

PDF export has been removed to avoid rendering/encoding issues.

---

## Data & Privacy

- All calculations are stored **locally** in the browser (no backend required)
- Privacy Policy and Terms of Use are built into the app

---

## PWA Install

The app is installable (desktop and mobile) once served over **HTTPS** or **localhost** and when the browser deems it installable. The UI includes an **Installation Guide** and an **Install app** button.

If install isn’t available, check:
- HTTPS/localhost
- Service worker registered
- Manifest present
- Browser not in incognito

---

## Repository Structure

```text
.
├── frontend/                      # React + Vite client app
│   ├── public/                    # Icons, PWA assets
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   └── package.json
├── shared/
│   └── calculation-core/          # Shared calculation logic and data
│       └── src/
│           ├── calculate.ts
│           ├── constants.ts
│           ├── data.ts
│           ├── index.ts
│           ├── types.ts
│           └── validation.ts
├── package.json
└── README.md
```

---

## Requirements

- Node.js 18+
- npm 9+

---

## Getting Started

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Build for production:

```bash
npm --workspace frontend run build
```

Build output: `frontend/dist`

---

## Available Scripts

From repo root:

- `npm run dev` → run frontend dev server
- `npm run build` → build all workspaces

---

## Units & Inputs

- Area: `ha`
- Nitrogen/Phosphorus/Potassium: `kg/ha`
- Diesel: `L/ha`
- Irrigation: `mm`
- Pesticide rate: `kg active ingredient / ha`
- Manure (UI): `t/ha`

Internal conversion:

```text
manure_kg_ha = manure_t_ha * 1000
```

---

## Livestock‑Only Farms

If `Total farm area = 0`:
- All crop areas must be `0`
- At least one animal count (cows, pigs, chickens) must be non‑zero
- Results are calculated from animal emissions only
- Per‑hectare emissions are `0`

---

## Deployment

Static client‑side app; deploy to any static host (for example Netlify).

1. Build:
```bash
npm --workspace frontend run build
```
2. Deploy `frontend/dist`.

---

## Notes & Limits

- Validator currently supports up to **10 crop entries** per calculation (`num_crops <= 10`).

---

## License

See [LICENSE](LICENSE).
