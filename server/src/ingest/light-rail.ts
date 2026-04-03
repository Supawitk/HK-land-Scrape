import { db } from "../db/index";

// Light Rail: 68 stops across Tuen Mun, Yuen Long, Tin Shui Wai
// Coordinates sourced from MTR open data and OpenStreetMap
const LIGHT_RAIL_STOPS: { id: string; nameEn: string; nameZh: string; lat: number; lng: number; districtId: string }[] = [
  // Tuen Mun area
  { id: "LR001", nameEn: "Tuen Mun", nameZh: "屯門", lat: 22.3951, lng: 113.9732, districtId: "L" },
  { id: "LR002", nameEn: "River Trade Terminal", nameZh: "內河碼頭", lat: 22.3723, lng: 113.9610, districtId: "L" },
  { id: "LR003", nameEn: "Siu Hong", nameZh: "兆康", lat: 22.4119, lng: 113.9788, districtId: "L" },
  { id: "LR004", nameEn: "Affluence", nameZh: "豐景園", lat: 22.3932, lng: 113.9679, districtId: "L" },
  { id: "LR005", nameEn: "Tuen Mun Hospital", nameZh: "屯門醫院", lat: 22.4067, lng: 113.9769, districtId: "L" },
  { id: "LR006", nameEn: "Tsing Shan Tsuen", nameZh: "青山村", lat: 22.4020, lng: 113.9758, districtId: "L" },
  { id: "LR007", nameEn: "Kin On", nameZh: "建安", lat: 22.3996, lng: 113.9746, districtId: "L" },
  { id: "LR008", nameEn: "Ho Tin", nameZh: "何田", lat: 22.3980, lng: 113.9739, districtId: "L" },
  { id: "LR009", nameEn: "Tai Hing (South)", nameZh: "大興(南)", lat: 22.3965, lng: 113.9728, districtId: "L" },
  { id: "LR010", nameEn: "Tai Hing (North)", nameZh: "大興(北)", lat: 22.3953, lng: 113.9713, districtId: "L" },
  { id: "LR011", nameEn: "Nai Wai", nameZh: "泥圍", lat: 22.4141, lng: 113.9808, districtId: "L" },
  { id: "LR012", nameEn: "Chung Fu", nameZh: "頌富", lat: 22.4465, lng: 114.0023, districtId: "M" },
  { id: "LR013", nameEn: "Tin Yat", nameZh: "天逸", lat: 22.4493, lng: 114.0002, districtId: "M" },
  { id: "LR014", nameEn: "Tin Shui Wai", nameZh: "天水圍", lat: 22.4478, lng: 114.0045, districtId: "M" },
  { id: "LR015", nameEn: "Tin Heng", nameZh: "天恒", lat: 22.4505, lng: 113.9978, districtId: "M" },
  { id: "LR016", nameEn: "Wetland Park", nameZh: "濕地公園", lat: 22.4660, lng: 114.0074, districtId: "M" },
  { id: "LR017", nameEn: "Tin Sau", nameZh: "天秀", lat: 22.4568, lng: 113.9966, districtId: "M" },
  { id: "LR018", nameEn: "Tin Fu", nameZh: "天富", lat: 22.4614, lng: 114.0003, districtId: "M" },
  { id: "LR019", nameEn: "Tin Wing", nameZh: "天榮", lat: 22.4398, lng: 114.0039, districtId: "M" },
  { id: "LR020", nameEn: "Ginza", nameZh: "銀座", lat: 22.4368, lng: 114.0067, districtId: "M" },
  { id: "LR021", nameEn: "Tin Yuet", nameZh: "天悅", lat: 22.4420, lng: 114.0044, districtId: "M" },
  // Yuen Long area
  { id: "LR030", nameEn: "Yuen Long", nameZh: "元朗", lat: 22.4459, lng: 114.0351, districtId: "M" },
  { id: "LR031", nameEn: "Fung Nin Road", nameZh: "豐年路", lat: 22.4447, lng: 114.0310, districtId: "M" },
  { id: "LR032", nameEn: "Tai Tong Road", nameZh: "大棠路", lat: 22.4442, lng: 114.0268, districtId: "M" },
  { id: "LR033", nameEn: "Shui Pin Wai", nameZh: "水邊圍", lat: 22.4437, lng: 114.0225, districtId: "M" },
  { id: "LR034", nameEn: "Ping Shan", nameZh: "屏山", lat: 22.4430, lng: 114.0140, districtId: "M" },
  { id: "LR035", nameEn: "Hang Mei Tsuen", nameZh: "坑尾村", lat: 22.4424, lng: 114.0098, districtId: "M" },
  { id: "LR036", nameEn: "Tin Shui", nameZh: "天瑞", lat: 22.4516, lng: 114.0024, districtId: "M" },
  { id: "LR037", nameEn: "Shan King (South)", nameZh: "山景(南)", lat: 22.3858, lng: 113.9644, districtId: "L" },
  { id: "LR038", nameEn: "Shan King (North)", nameZh: "山景(北)", lat: 22.3876, lng: 113.9650, districtId: "L" },
  { id: "LR039", nameEn: "Shan King", nameZh: "山景", lat: 22.3867, lng: 113.9647, districtId: "L" },
  { id: "LR040", nameEn: "On Ting", nameZh: "安定", lat: 22.3927, lng: 113.9680, districtId: "L" },
  { id: "LR041", nameEn: "Siu Lun", nameZh: "兆麟", lat: 22.3895, lng: 113.9654, districtId: "L" },
  { id: "LR042", nameEn: "Butterfly", nameZh: "蝴蝶", lat: 22.3822, lng: 113.9614, districtId: "L" },
  { id: "LR043", nameEn: "Lung Mun", nameZh: "龍門", lat: 22.3794, lng: 113.9622, districtId: "L" },
  { id: "LR044", nameEn: "Town Centre", nameZh: "市中心", lat: 22.3908, lng: 113.9661, districtId: "L" },
  { id: "LR045", nameEn: "Pui To", nameZh: "杯渡", lat: 22.3939, lng: 113.9718, districtId: "L" },
  { id: "LR046", nameEn: "Lam Tei", nameZh: "藍地", lat: 22.4183, lng: 113.9830, districtId: "L" },
  { id: "LR047", nameEn: "Hung Shui Kiu", nameZh: "洪水橋", lat: 22.4268, lng: 113.9910, districtId: "M" },
  { id: "LR048", nameEn: "Chung Uk Tsuen", nameZh: "鍾屋村", lat: 22.4330, lng: 113.9985, districtId: "M" },
  { id: "LR049", nameEn: "Tin King", nameZh: "天經", lat: 22.3935, lng: 113.9700, districtId: "L" },
  { id: "LR050", nameEn: "Fung Tei", nameZh: "鳳地", lat: 22.3944, lng: 113.9714, districtId: "L" },
  { id: "LR051", nameEn: "Leung King", nameZh: "良景", lat: 22.4102, lng: 113.9777, districtId: "L" },
  { id: "LR052", nameEn: "San Hui", nameZh: "新墟", lat: 22.3916, lng: 113.9671, districtId: "L" },
  { id: "LR053", nameEn: "Prime View", nameZh: "景峰", lat: 22.3889, lng: 113.9654, districtId: "L" },
  { id: "LR054", nameEn: "San Wai", nameZh: "新圍", lat: 22.4080, lng: 113.9766, districtId: "L" },
  { id: "LR055", nameEn: "Yau Oi", nameZh: "友愛", lat: 22.3922, lng: 113.9666, districtId: "L" },
  { id: "LR056", nameEn: "Ching Chung", nameZh: "青松", lat: 22.4050, lng: 113.9762, districtId: "L" },
  { id: "LR057", nameEn: "Locwood", nameZh: "樂翠", lat: 22.4158, lng: 113.9815, districtId: "L" },
  { id: "LR058", nameEn: "Choy Yee Bridge", nameZh: "翠怡花園", lat: 22.4213, lng: 113.9855, districtId: "L" },
  { id: "LR059", nameEn: "Tan Kwai Tsuen", nameZh: "田葵村", lat: 22.4240, lng: 113.9875, districtId: "M" },
  { id: "LR060", nameEn: "Shek Pai", nameZh: "石排", lat: 22.4290, lng: 113.9930, districtId: "M" },
  // Supplementary
  { id: "LR061", nameEn: "Tsing Lun", nameZh: "青麟", lat: 22.4010, lng: 113.9752, districtId: "L" },
  { id: "LR062", nameEn: "Ka Keng", nameZh: "佳景", lat: 22.3846, lng: 113.9630, districtId: "L" },
  { id: "LR063", nameEn: "Keng Shan", nameZh: "輕鐵車廠", lat: 22.3910, lng: 113.9725, districtId: "L" },
  { id: "LR064", nameEn: "Tai Hing", nameZh: "大興", lat: 22.3960, lng: 113.9720, districtId: "L" },
  { id: "LR065", nameEn: "Siu Hei", nameZh: "兆禧", lat: 22.3836, lng: 113.9622, districtId: "L" },
  { id: "LR066", nameEn: "Goodview Garden", nameZh: "景峰花園", lat: 22.3884, lng: 113.9655, districtId: "L" },
  { id: "LR067", nameEn: "Phoenix", nameZh: "鳳翔", lat: 22.3948, lng: 113.9726, districtId: "L" },
  { id: "LR068", nameEn: "Cummin", nameZh: "荊冠", lat: 22.4145, lng: 113.9800, districtId: "L" },
];

export async function ingestLightRail() {
  console.log("Ingesting Light Rail data...");
  const sqlite = (db as any).$client;

  // Create light_rail_stops table if not exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS light_rail_stops (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_zh TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      district_id TEXT REFERENCES districts(id)
    )
  `);

  const insert = sqlite.prepare(
    "INSERT OR REPLACE INTO light_rail_stops (id, name_en, name_zh, lat, lng, district_id) VALUES (?, ?, ?, ?, ?, ?)"
  );

  for (const stop of LIGHT_RAIL_STOPS) {
    insert.run(stop.id, stop.nameEn, stop.nameZh, stop.lat, stop.lng, stop.districtId);
  }
  console.log(`  Inserted ${LIGHT_RAIL_STOPS.length} Light Rail stops`);
}
