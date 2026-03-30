import { db, schema } from "./index";

const ZONES = [
  { id: "hk_island", nameEn: "Hong Kong Island", nameZh: "香港島" },
  { id: "kowloon", nameEn: "Kowloon", nameZh: "九龍" },
  { id: "new_territories", nameEn: "New Territories", nameZh: "新界" },
];

const DISTRICTS = [
  { id: "A", zoneId: "hk_island", nameEn: "Central & Western", nameZh: "中西區", lat: 22.286, lng: 114.150, area: 12.44 },
  { id: "B", zoneId: "hk_island", nameEn: "Wan Chai", nameZh: "灣仔區", lat: 22.279, lng: 114.172, area: 9.83 },
  { id: "C", zoneId: "hk_island", nameEn: "Eastern", nameZh: "東區", lat: 22.284, lng: 114.224, area: 18.56 },
  { id: "D", zoneId: "hk_island", nameEn: "Southern", nameZh: "南區", lat: 22.247, lng: 114.160, area: 38.85 },
  { id: "E", zoneId: "kowloon", nameEn: "Yau Tsim Mong", nameZh: "油尖旺區", lat: 22.313, lng: 114.172, area: 6.99 },
  { id: "F", zoneId: "kowloon", nameEn: "Sham Shui Po", nameZh: "深水埗區", lat: 22.332, lng: 114.160, area: 9.36 },
  { id: "G", zoneId: "kowloon", nameEn: "Kowloon City", nameZh: "九龍城區", lat: 22.328, lng: 114.192, area: 10.02 },
  { id: "H", zoneId: "kowloon", nameEn: "Wong Tai Sin", nameZh: "黃大仙區", lat: 22.342, lng: 114.196, area: 9.30 },
  { id: "J", zoneId: "kowloon", nameEn: "Kwun Tong", nameZh: "觀塘區", lat: 22.311, lng: 114.226, area: 11.27 },
  { id: "K", zoneId: "new_territories", nameEn: "Tsuen Wan", nameZh: "荃灣區", lat: 22.372, lng: 114.112, area: 61.71 },
  { id: "L", zoneId: "new_territories", nameEn: "Tuen Mun", nameZh: "屯門區", lat: 22.391, lng: 113.977, area: 82.89 },
  { id: "M", zoneId: "new_territories", nameEn: "Yuen Long", nameZh: "元朗區", lat: 22.445, lng: 114.022, area: 138.46 },
  { id: "N", zoneId: "new_territories", nameEn: "North", nameZh: "北區", lat: 22.494, lng: 114.138, area: 136.61 },
  { id: "P", zoneId: "new_territories", nameEn: "Tai Po", nameZh: "大埔區", lat: 22.451, lng: 114.168, area: 136.15 },
  { id: "Q", zoneId: "new_territories", nameEn: "Sai Kung", nameZh: "西貢區", lat: 22.381, lng: 114.270, area: 129.65 },
  { id: "R", zoneId: "new_territories", nameEn: "Sha Tin", nameZh: "沙田區", lat: 22.382, lng: 114.195, area: 68.71 },
  { id: "S", zoneId: "new_territories", nameEn: "Kwai Tsing", nameZh: "葵青區", lat: 22.354, lng: 114.130, area: 23.34 },
  { id: "T", zoneId: "new_territories", nameEn: "Islands", nameZh: "離島區", lat: 22.261, lng: 113.946, area: 175.12 },
];

// 2023 mid-year population estimates by district (thousands -> actual)
const POPULATION = [
  { districtId: "A", year: 2023, population: 237000, male: 108000, female: 129000 },
  { districtId: "B", year: 2023, population: 166000, male: 75000, female: 91000 },
  { districtId: "C", year: 2023, population: 529000, male: 243000, female: 286000 },
  { districtId: "D", year: 2023, population: 263000, male: 121000, female: 142000 },
  { districtId: "E", year: 2023, population: 318000, male: 158000, female: 160000 },
  { districtId: "F", year: 2023, population: 415000, male: 204000, female: 211000 },
  { districtId: "G", year: 2023, population: 418000, male: 195000, female: 223000 },
  { districtId: "H", year: 2023, population: 413000, male: 193000, female: 220000 },
  { districtId: "J", year: 2023, population: 694000, male: 331000, female: 363000 },
  { districtId: "K", year: 2023, population: 320000, male: 153000, female: 167000 },
  { districtId: "L", year: 2023, population: 495000, male: 231000, female: 264000 },
  { districtId: "M", year: 2023, population: 668000, male: 326000, female: 342000 },
  { districtId: "N", year: 2023, population: 304000, male: 146000, female: 158000 },
  { districtId: "P", year: 2023, population: 316000, male: 150000, female: 166000 },
  { districtId: "Q", year: 2023, population: 489000, male: 240000, female: 249000 },
  { districtId: "R", year: 2023, population: 692000, male: 329000, female: 363000 },
  { districtId: "S", year: 2023, population: 507000, male: 248000, female: 259000 },
  { districtId: "T", year: 2023, population: 186000, male: 91000, female: 95000 },
];

// RVD overall private domestic price index (1999=100)
const PRICE_INDICES = [
  { period: "2015", propertyClass: "All", priceIndex: 306.1 },
  { period: "2016", propertyClass: "All", priceIndex: 296.8 },
  { period: "2017", propertyClass: "All", priceIndex: 333.9 },
  { period: "2018", propertyClass: "All", priceIndex: 358.4 },
  { period: "2019", propertyClass: "All", priceIndex: 339.0 },
  { period: "2020", propertyClass: "All", priceIndex: 333.9 },
  { period: "2021", propertyClass: "All", priceIndex: 338.7 },
  { period: "2022", propertyClass: "All", priceIndex: 321.7 },
  { period: "2023", propertyClass: "All", priceIndex: 286.4 },
  { period: "2024", propertyClass: "All", priceIndex: 265.1 },
];

async function seed() {
  console.log("Seeding database...");

  // Create tables if not exist
  const sqlite = (db as any).$client;
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_zh TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS districts (
      id TEXT PRIMARY KEY,
      zone_id TEXT NOT NULL REFERENCES zones(id),
      name_en TEXT NOT NULL,
      name_zh TEXT NOT NULL,
      centroid_lat REAL,
      centroid_lng REAL,
      area_km_sq REAL
    );
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      listing_type TEXT NOT NULL,
      district_id TEXT REFERENCES districts(id),
      estate_name TEXT,
      address TEXT,
      price INTEGER,
      price_per_sqft REAL,
      area_build INTEGER,
      area_usable INTEGER,
      bedrooms INTEGER,
      property_type TEXT,
      source_url TEXT,
      image_url TEXT,
      scraped_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_external_id ON properties(external_id);
    CREATE INDEX IF NOT EXISTS idx_properties_district ON properties(district_id);
    CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);
    CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
    CREATE TABLE IF NOT EXISTS mtr_stations (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_zh TEXT NOT NULL,
      lat REAL,
      lng REAL,
      district_id TEXT REFERENCES districts(id)
    );
    CREATE TABLE IF NOT EXISTS mtr_lines (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_zh TEXT NOT NULL,
      color TEXT
    );
    CREATE TABLE IF NOT EXISTS mtr_line_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      line_id TEXT NOT NULL REFERENCES mtr_lines(id),
      station_id TEXT NOT NULL REFERENCES mtr_stations(id),
      sequence INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bus_stops (
      id TEXT PRIMARY KEY,
      operator TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_zh TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      district_id TEXT REFERENCES districts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_bus_stops_operator ON bus_stops(operator);
    CREATE INDEX IF NOT EXISTS idx_bus_stops_district ON bus_stops(district_id);
    CREATE INDEX IF NOT EXISTS idx_bus_stops_lat_lng ON bus_stops(lat, lng);
    CREATE TABLE IF NOT EXISTS bus_routes (
      id TEXT PRIMARY KEY,
      operator TEXT NOT NULL,
      route TEXT NOT NULL,
      bound TEXT NOT NULL,
      orig_en TEXT NOT NULL,
      dest_en TEXT NOT NULL,
      orig_zh TEXT,
      dest_zh TEXT
    );
    CREATE TABLE IF NOT EXISTS tram_stops (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_zh TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      district_id TEXT REFERENCES districts(id)
    );
    CREATE TABLE IF NOT EXISTS population_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district_id TEXT NOT NULL REFERENCES districts(id),
      year INTEGER NOT NULL,
      population INTEGER NOT NULL,
      male INTEGER,
      female INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_population_district_year ON population_data(district_id, year);
    CREATE TABLE IF NOT EXISTS price_indices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period TEXT NOT NULL,
      property_class TEXT,
      price_index REAL
    );
    CREATE INDEX IF NOT EXISTS idx_price_indices_period ON price_indices(period);
  `);

  // Seed zones
  for (const zone of ZONES) {
    sqlite.exec(`INSERT OR REPLACE INTO zones (id, name_en, name_zh) VALUES ('${zone.id}', '${zone.nameEn}', '${zone.nameZh}')`);
  }
  console.log(`  Seeded ${ZONES.length} zones`);

  // Seed districts
  for (const d of DISTRICTS) {
    sqlite.exec(`INSERT OR REPLACE INTO districts (id, zone_id, name_en, name_zh, centroid_lat, centroid_lng, area_km_sq) VALUES ('${d.id}', '${d.zoneId}', '${d.nameEn}', '${d.nameZh}', ${d.lat}, ${d.lng}, ${d.area})`);
  }
  console.log(`  Seeded ${DISTRICTS.length} districts`);

  // Seed population
  sqlite.exec("DELETE FROM population_data");
  for (const p of POPULATION) {
    sqlite.exec(`INSERT INTO population_data (district_id, year, population, male, female) VALUES ('${p.districtId}', ${p.year}, ${p.population}, ${p.male}, ${p.female})`);
  }
  console.log(`  Seeded ${POPULATION.length} population records`);

  // Seed price indices
  sqlite.exec("DELETE FROM price_indices");
  for (const p of PRICE_INDICES) {
    sqlite.exec(`INSERT INTO price_indices (period, property_class, price_index) VALUES ('${p.period}', '${p.propertyClass}', ${p.priceIndex})`);
  }
  console.log(`  Seeded ${PRICE_INDICES.length} price index records`);

  console.log("Seed complete!");
}

seed().catch(console.error);
