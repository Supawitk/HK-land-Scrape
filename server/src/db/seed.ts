import { db } from "./index";
import { readFileSync } from "fs";
import { resolve } from "path";

const ZONES = [
  { id: "hk_island", nameEn: "Hong Kong Island", nameZh: "香港島" },
  { id: "kowloon", nameEn: "Kowloon", nameZh: "九龍" },
  { id: "new_territories", nameEn: "New Territories", nameZh: "新界" },
];

// District centroids are approximate for map centering only
const DISTRICTS = [
  { id: "A", zoneId: "hk_island", nameEn: "Central & Western", nameZh: "中西區", lat: 22.286, lng: 114.150 },
  { id: "B", zoneId: "hk_island", nameEn: "Wan Chai", nameZh: "灣仔區", lat: 22.279, lng: 114.172 },
  { id: "C", zoneId: "hk_island", nameEn: "Eastern", nameZh: "東區", lat: 22.284, lng: 114.224 },
  { id: "D", zoneId: "hk_island", nameEn: "Southern", nameZh: "南區", lat: 22.247, lng: 114.160 },
  { id: "E", zoneId: "kowloon", nameEn: "Yau Tsim Mong", nameZh: "油尖旺區", lat: 22.313, lng: 114.172 },
  { id: "F", zoneId: "kowloon", nameEn: "Sham Shui Po", nameZh: "深水埗區", lat: 22.332, lng: 114.160 },
  { id: "G", zoneId: "kowloon", nameEn: "Kowloon City", nameZh: "九龍城區", lat: 22.328, lng: 114.192 },
  { id: "H", zoneId: "kowloon", nameEn: "Wong Tai Sin", nameZh: "黃大仙區", lat: 22.342, lng: 114.196 },
  { id: "J", zoneId: "kowloon", nameEn: "Kwun Tong", nameZh: "觀塘區", lat: 22.311, lng: 114.226 },
  { id: "K", zoneId: "new_territories", nameEn: "Tsuen Wan", nameZh: "荃灣區", lat: 22.372, lng: 114.112 },
  { id: "L", zoneId: "new_territories", nameEn: "Tuen Mun", nameZh: "屯門區", lat: 22.391, lng: 113.977 },
  { id: "M", zoneId: "new_territories", nameEn: "Yuen Long", nameZh: "元朗區", lat: 22.445, lng: 114.022 },
  { id: "N", zoneId: "new_territories", nameEn: "North", nameZh: "北區", lat: 22.494, lng: 114.138 },
  { id: "P", zoneId: "new_territories", nameEn: "Tai Po", nameZh: "大埔區", lat: 22.451, lng: 114.168 },
  { id: "Q", zoneId: "new_territories", nameEn: "Sai Kung", nameZh: "西貢區", lat: 22.381, lng: 114.270 },
  { id: "R", zoneId: "new_territories", nameEn: "Sha Tin", nameZh: "沙田區", lat: 22.382, lng: 114.195 },
  { id: "S", zoneId: "new_territories", nameEn: "Kwai Tsing", nameZh: "葵青區", lat: 22.354, lng: 114.130 },
  { id: "T", zoneId: "new_territories", nameEn: "Islands", nameZh: "離島區", lat: 22.261, lng: 113.946 },
];

// Compute area from GeoJSON using the Shoelace formula (approximate km²)
function computePolygonArea(coords: number[][]): number {
  // Approximate using equirectangular projection at HK latitude
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const midLat = 22.35;
  const cosLat = Math.cos(toRad(midLat));

  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const xi = coords[i][0] * cosLat;
    const yi = coords[i][1];
    const xj = coords[j][0] * cosLat;
    const yj = coords[j][1];
    area += xi * yj - xj * yi;
  }
  area = Math.abs(area) / 2;
  // Convert from degree² to km²
  const degToKm = (Math.PI / 180) * R;
  return area * degToKm * degToKm;
}

function computeGeoJsonArea(geometry: any): number {
  if (geometry.type === "Polygon") {
    return computePolygonArea(geometry.coordinates[0]);
  } else if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.reduce(
      (sum: number, poly: number[][][]) => sum + computePolygonArea(poly[0]),
      0
    );
  }
  return 0;
}

async function seed() {
  console.log("Seeding database...");
  const sqlite = (db as any).$client;

  // Create all tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS zones (id TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_zh TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS districts (id TEXT PRIMARY KEY, zone_id TEXT NOT NULL REFERENCES zones(id), name_en TEXT NOT NULL, name_zh TEXT NOT NULL, centroid_lat REAL, centroid_lng REAL, area_km_sq REAL);
    CREATE TABLE IF NOT EXISTS properties (id INTEGER PRIMARY KEY AUTOINCREMENT, external_id TEXT, listing_type TEXT NOT NULL, district_id TEXT REFERENCES districts(id), estate_name TEXT, address TEXT, price INTEGER, price_per_sqft REAL, area_build INTEGER, area_usable INTEGER, bedrooms INTEGER, property_type TEXT, source_url TEXT, image_url TEXT, scraped_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_external_id ON properties(external_id);
    CREATE INDEX IF NOT EXISTS idx_properties_district ON properties(district_id);
    CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);
    CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
    CREATE TABLE IF NOT EXISTS mtr_stations (id TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_zh TEXT NOT NULL, lat REAL, lng REAL, district_id TEXT REFERENCES districts(id));
    CREATE TABLE IF NOT EXISTS mtr_lines (id TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_zh TEXT NOT NULL, color TEXT);
    CREATE TABLE IF NOT EXISTS mtr_line_stations (id INTEGER PRIMARY KEY AUTOINCREMENT, line_id TEXT NOT NULL REFERENCES mtr_lines(id), station_id TEXT NOT NULL REFERENCES mtr_stations(id), sequence INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS bus_stops (id TEXT PRIMARY KEY, operator TEXT NOT NULL, name_en TEXT NOT NULL, name_zh TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, district_id TEXT REFERENCES districts(id));
    CREATE INDEX IF NOT EXISTS idx_bus_stops_operator ON bus_stops(operator);
    CREATE INDEX IF NOT EXISTS idx_bus_stops_district ON bus_stops(district_id);
    CREATE INDEX IF NOT EXISTS idx_bus_stops_lat_lng ON bus_stops(lat, lng);
    CREATE TABLE IF NOT EXISTS bus_routes (id TEXT PRIMARY KEY, operator TEXT NOT NULL, route TEXT NOT NULL, bound TEXT NOT NULL, orig_en TEXT NOT NULL, dest_en TEXT NOT NULL, orig_zh TEXT, dest_zh TEXT);
    CREATE TABLE IF NOT EXISTS tram_stops (id TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_zh TEXT, lat REAL NOT NULL, lng REAL NOT NULL, district_id TEXT REFERENCES districts(id));
    CREATE TABLE IF NOT EXISTS population_data (id INTEGER PRIMARY KEY AUTOINCREMENT, district_id TEXT NOT NULL REFERENCES districts(id), year INTEGER NOT NULL, population INTEGER NOT NULL, male INTEGER, female INTEGER);
    CREATE INDEX IF NOT EXISTS idx_population_district_year ON population_data(district_id, year);
    CREATE TABLE IF NOT EXISTS price_indices (id INTEGER PRIMARY KEY AUTOINCREMENT, period TEXT NOT NULL, property_class TEXT, price_index REAL);
    CREATE INDEX IF NOT EXISTS idx_price_indices_period ON price_indices(period);
    CREATE TABLE IF NOT EXISTS building_stock (id INTEGER PRIMARY KEY AUTOINCREMENT, district_id TEXT REFERENCES districts(id), property_type TEXT NOT NULL, stock INTEGER, completions INTEGER, vacancy INTEGER, vacancy_rate REAL);
    CREATE INDEX IF NOT EXISTS idx_building_stock_district ON building_stock(district_id);
    CREATE INDEX IF NOT EXISTS idx_building_stock_type ON building_stock(property_type);
    CREATE TABLE IF NOT EXISTS building_age (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL, category TEXT NOT NULL, pre_1960 REAL, y1960_69 REAL, y1970_79 REAL, y1980_89 REAL, y1990_99 REAL, y2000_09 REAL, post_2009 REAL, total_units INTEGER);
  `);

  // Seed zones
  for (const zone of ZONES) {
    sqlite.exec(`INSERT OR REPLACE INTO zones (id, name_en, name_zh) VALUES ('${zone.id}', '${zone.nameEn}', '${zone.nameZh}')`);
  }
  console.log(`  Seeded ${ZONES.length} zones`);

  // Compute areas from GeoJSON
  const geojsonPath = resolve(__dirname, "../../../client/public/geojson/hk-districts.geo.json");
  let areaMap: Record<string, number> = {};
  try {
    const geojson = JSON.parse(readFileSync(geojsonPath, "utf-8"));
    for (const feature of geojson.features) {
      const code = feature.properties["地區號碼"];
      const area = computeGeoJsonArea(feature.geometry);
      areaMap[code] = Math.round(area * 100) / 100;
    }
    console.log("  Computed district areas from GeoJSON");
  } catch (err) {
    console.warn("  Could not compute areas from GeoJSON:", err);
  }

  // Seed districts (no mock population or area - area comes from GeoJSON)
  for (const d of DISTRICTS) {
    const area = areaMap[d.id] || null;
    sqlite.exec(`INSERT OR REPLACE INTO districts (id, zone_id, name_en, name_zh, centroid_lat, centroid_lng, area_km_sq) VALUES ('${d.id}', '${d.zoneId}', '${d.nameEn}', '${d.nameZh}', ${d.lat}, ${d.lng}, ${area ?? "NULL"})`);
  }
  console.log(`  Seeded ${DISTRICTS.length} districts`);

  // NO mock population data - population_data table stays empty until real source is available
  // NO mock price indices - price_indices table populated by ingest/rvd.ts from real RVD CSVs

  console.log("Seed complete! (No mock data added - run ingest scripts for real data)");
}

seed().catch(console.error);
