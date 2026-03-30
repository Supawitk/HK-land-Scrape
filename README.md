# HK Property Dashboard

A full-stack Hong Kong property data analysis dashboard with interactive map, transport network overlay, and population data.

## Features

- **Property Listings** - Scraped from 28Hse.com (buy & rent), organized by 18 districts across 3 zones
- **Interactive Map** - Leaflet + OpenStreetMap with district boundaries (GeoJSON), MTR lines, bus stops, tram stops
- **Transport Data** - MTR stations/lines, KMB & Citybus bus stops/routes, HK Tramways stops
- **Population Data** - 2023 census data by district with density calculations
- **Price Trends** - Historical private domestic price index from Rating & Valuation Department
- **Dashboard** - Charts for population, price trends, and district comparisons

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Vite, TailwindCSS, Leaflet, Chart.js |
| Backend | Bun, Elysia.js, TypeScript |
| Database | SQLite via Drizzle ORM |
| Scraping | Cheerio (HTML parsing) |

## Data Sources

- [28Hse](https://www.28hse.com) - Property listings
- [DATA.GOV.HK](https://data.gov.hk) - Government open data (transport, population)
- [KMB Open Data](https://data.etabus.gov.hk) - Bus stops & routes
- [Citybus Open Data](https://rt.data.gov.hk) - Bus stops & routes
- [MTR Open Data](https://opendata.mtr.com.hk) - Station & line data
- HK Census & Statistics Department - Population by district

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) (v1.0+)

### Setup

```bash
# Install dependencies
bun install

# Seed the database (zones, districts, population, price indices)
bun run server/src/db/seed.ts

# Ingest transport data (MTR, KMB, Citybus, Tram)
bun run server/src/ingest/runner.ts

# (Optional) Scrape property listings from 28Hse
bun run server/src/scrapers/hse28/index.ts        # buy listings
bun run server/src/scrapers/hse28/index.ts rent    # rent listings
```

### Run

```bash
# Start backend (port 3000)
bun run dev:server

# Start frontend (port 5173, proxies /api to backend)
bun run dev:client

# Open http://localhost:5173
```

### API Docs

Swagger UI available at `http://localhost:3000/docs` when the server is running.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/zones` | 3 zones (HK Island, Kowloon, NT) |
| `GET /api/districts` | 18 districts with stats |
| `GET /api/districts/:id` | District detail |
| `GET /api/properties` | Filtered property listings |
| `GET /api/properties/stats` | Aggregate stats by district |
| `GET /api/properties/trends` | Price index history |
| `GET /api/transport/mtr/stations` | MTR stations |
| `GET /api/transport/mtr/lines` | MTR lines with stations |
| `GET /api/transport/bus/stops` | Bus stops (bbox filter) |
| `GET /api/transport/tram/stops` | Tram stops |
| `GET /api/transport/nearby` | Nearby transport by lat/lng |
| `GET /api/population` | Population by district |
| `POST /api/scraper/run` | Trigger 28Hse scrape |
| `POST /api/scraper/ingest/transport` | Refresh transport data |

## Project Structure

```
HK-land-Scrape/
├── client/          # Vue 3 frontend
│   └── src/
│       ├── pages/   # Dashboard, Map, Properties, District Detail
│       ├── stores/  # Pinia stores
│       └── composables/
├── server/          # Elysia.js backend
│   └── src/
│       ├── db/      # Drizzle schema + seed
│       ├── plugins/ # API route groups
│       ├── scrapers/# 28Hse scraper
│       └── ingest/  # Transport data ingestion
└── shared/          # Shared TypeScript types
```

## License

MIT
