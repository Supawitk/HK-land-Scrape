import { db } from "../db/index";

// Peak Tram: 6 stops (funicular railway on HK Island)
const PEAK_TRAM_STOPS: { id: string; nameEn: string; nameZh: string; lat: number; lng: number; districtId: string }[] = [
  { id: "PT01", nameEn: "Garden Road (Lower Terminus)", nameZh: "花園道(山下總站)", lat: 22.2770, lng: 114.1620, districtId: "A" },
  { id: "PT02", nameEn: "Kennedy Road", nameZh: "堅尼地道", lat: 22.2740, lng: 114.1600, districtId: "A" },
  { id: "PT03", nameEn: "MacDonnell Road", nameZh: "麥當勞道", lat: 22.2720, lng: 114.1570, districtId: "A" },
  { id: "PT04", nameEn: "May Road", nameZh: "梅道", lat: 22.2690, lng: 114.1545, districtId: "A" },
  { id: "PT05", nameEn: "Barker Road", nameZh: "白加道", lat: 22.2650, lng: 114.1510, districtId: "A" },
  { id: "PT06", nameEn: "The Peak (Upper Terminus)", nameZh: "山頂(山上總站)", lat: 22.2606, lng: 114.1498, districtId: "A" },
];

// Major ferry piers in Hong Kong
const FERRY_PIERS: { id: string; nameEn: string; nameZh: string; lat: number; lng: number; districtId: string; operator: string }[] = [
  // Star Ferry
  { id: "FP01", nameEn: "Central Pier (Star Ferry)", nameZh: "中環碼頭(天星)", lat: 22.2866, lng: 114.1601, districtId: "A", operator: "star_ferry" },
  { id: "FP02", nameEn: "Tsim Sha Tsui Pier (Star Ferry)", nameZh: "尖沙咀碼頭(天星)", lat: 22.2935, lng: 114.1687, districtId: "E", operator: "star_ferry" },
  { id: "FP03", nameEn: "Wan Chai Pier (Star Ferry)", nameZh: "灣仔碼頭(天星)", lat: 22.2834, lng: 114.1749, districtId: "B", operator: "star_ferry" },
  // First Ferry / Sun Ferry (Outlying Islands)
  { id: "FP04", nameEn: "Central Pier 4 (Lamma - Yung Shue Wan)", nameZh: "中環4號碼頭(南丫島-榕樹灣)", lat: 22.2870, lng: 114.1590, districtId: "A", operator: "hkkf" },
  { id: "FP05", nameEn: "Central Pier 5 (Cheung Chau)", nameZh: "中環5號碼頭(長洲)", lat: 22.2872, lng: 114.1585, districtId: "A", operator: "sun_ferry" },
  { id: "FP06", nameEn: "Central Pier 6 (Mui Wo)", nameZh: "中環6號碼頭(梅窩)", lat: 22.2874, lng: 114.1580, districtId: "A", operator: "sun_ferry" },
  { id: "FP07", nameEn: "Central Pier 7 (Discovery Bay)", nameZh: "中環7號碼頭(愉景灣)", lat: 22.2876, lng: 114.1576, districtId: "A", operator: "discovery_bay" },
  { id: "FP08", nameEn: "Central Pier 8 (Park Island)", nameZh: "中環8號碼頭(珀麗灣)", lat: 22.2878, lng: 114.1572, districtId: "A", operator: "park_island" },
  // Lamma Island
  { id: "FP09", nameEn: "Yung Shue Wan Pier", nameZh: "榕樹灣碼頭", lat: 22.2287, lng: 114.1099, districtId: "T", operator: "hkkf" },
  { id: "FP10", nameEn: "Sok Kwu Wan Pier", nameZh: "索罟灣碼頭", lat: 22.2058, lng: 114.1246, districtId: "T", operator: "hkkf" },
  // Cheung Chau
  { id: "FP11", nameEn: "Cheung Chau Pier", nameZh: "長洲碼頭", lat: 22.2100, lng: 114.0280, districtId: "T", operator: "sun_ferry" },
  // Mui Wo (Lantau)
  { id: "FP12", nameEn: "Mui Wo Pier", nameZh: "梅窩碼頭", lat: 22.2648, lng: 114.0029, districtId: "T", operator: "sun_ferry" },
  // Peng Chau
  { id: "FP13", nameEn: "Peng Chau Pier", nameZh: "坪洲碼頭", lat: 22.2896, lng: 114.0401, districtId: "T", operator: "hkkf" },
  // Discovery Bay
  { id: "FP14", nameEn: "Discovery Bay Pier", nameZh: "愉景灣碼頭", lat: 22.2932, lng: 114.0164, districtId: "T", operator: "discovery_bay" },
  // Ma Wan (Park Island)
  { id: "FP15", nameEn: "Ma Wan Pier", nameZh: "馬灣碼頭", lat: 22.3524, lng: 114.0618, districtId: "T", operator: "park_island" },
  // Cross harbour
  { id: "FP16", nameEn: "North Point Pier", nameZh: "北角碼頭", lat: 22.2930, lng: 114.2000, districtId: "C", operator: "sun_ferry" },
  { id: "FP17", nameEn: "Kwun Tong Pier", nameZh: "觀塘碼頭", lat: 22.3080, lng: 114.2250, districtId: "J", operator: "fortune_ferry" },
  // Tuen Mun
  { id: "FP18", nameEn: "Tuen Mun Ferry Pier", nameZh: "屯門碼頭", lat: 22.3717, lng: 113.9657, districtId: "L", operator: "fortune_ferry" },
  // Kai Tak Cruise Terminal
  { id: "FP19", nameEn: "Kai Tak Cruise Terminal", nameZh: "啟德郵輪碼頭", lat: 22.3060, lng: 114.2132, districtId: "J", operator: "cruise" },
  // Hung Hom
  { id: "FP20", nameEn: "Hung Hom Ferry Pier", nameZh: "紅磡碼頭", lat: 22.3035, lng: 114.1870, districtId: "G", operator: "sun_ferry" },
];

export async function ingestPeakTram() {
  console.log("Ingesting Peak Tram data...");
  const sqlite = (db as any).$client;

  // Store in tram_stops with a peak_tram prefix
  const insert = sqlite.prepare(
    "INSERT OR REPLACE INTO tram_stops (id, name_en, name_zh, lat, lng, district_id) VALUES (?, ?, ?, ?, ?, ?)"
  );

  for (const stop of PEAK_TRAM_STOPS) {
    insert.run(stop.id, stop.nameEn, stop.nameZh, stop.lat, stop.lng, stop.districtId);
  }
  console.log(`  Inserted ${PEAK_TRAM_STOPS.length} Peak Tram stops`);
}

export async function ingestFerryPiers() {
  console.log("Ingesting Ferry Pier data...");
  const sqlite = (db as any).$client;

  // Create ferry_piers table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ferry_piers (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_zh TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      district_id TEXT REFERENCES districts(id),
      operator TEXT
    )
  `);

  const insert = sqlite.prepare(
    "INSERT OR REPLACE INTO ferry_piers (id, name_en, name_zh, lat, lng, district_id, operator) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  for (const pier of FERRY_PIERS) {
    insert.run(pier.id, pier.nameEn, pier.nameZh, pier.lat, pier.lng, pier.districtId, pier.operator);
  }
  console.log(`  Inserted ${FERRY_PIERS.length} Ferry Piers`);
}
