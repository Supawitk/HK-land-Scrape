import { db } from "../db/index";

// Static tram stop data - Hong Kong Tramways (HK Island only, Kennedy Town to Shau Kei Wan)
const TRAM_STOPS: { id: string; nameEn: string; nameZh: string; lat: number; lng: number; districtId: string }[] = [
  { id: "T01", nameEn: "Kennedy Town", nameZh: "堅尼地城", lat: 22.2816, lng: 114.1128, districtId: "A" },
  { id: "T02", nameEn: "Forbes Street", nameZh: "科士街", lat: 22.2836, lng: 114.1181, districtId: "A" },
  { id: "T03", nameEn: "Belcher's Street", nameZh: "卑路乍街", lat: 22.2854, lng: 114.1242, districtId: "A" },
  { id: "T04", nameEn: "Whitty Street", nameZh: "屈地街", lat: 22.2867, lng: 114.1347, districtId: "A" },
  { id: "T05", nameEn: "Hill Road", nameZh: "山道", lat: 22.2868, lng: 114.1378, districtId: "A" },
  { id: "T06", nameEn: "Western Market", nameZh: "西港城", lat: 22.2876, lng: 114.1501, districtId: "A" },
  { id: "T07", nameEn: "Des Voeux Road Central", nameZh: "德輔道中", lat: 22.2842, lng: 114.1559, districtId: "A" },
  { id: "T08", nameEn: "Pedder Street", nameZh: "畢打街", lat: 22.2822, lng: 114.1590, districtId: "A" },
  { id: "T09", nameEn: "Queensway", nameZh: "金鐘道", lat: 22.2792, lng: 114.1651, districtId: "A" },
  { id: "T10", nameEn: "Fleming Road", nameZh: "菲林明道", lat: 22.2779, lng: 114.1720, districtId: "B" },
  { id: "T11", nameEn: "Wan Chai", nameZh: "灣仔", lat: 22.2778, lng: 114.1735, districtId: "B" },
  { id: "T12", nameEn: "O'Brien Road", nameZh: "柯布連道", lat: 22.2783, lng: 114.1770, districtId: "B" },
  { id: "T13", nameEn: "Canal Road", nameZh: "堅拿道", lat: 22.2790, lng: 114.1806, districtId: "B" },
  { id: "T14", nameEn: "Percival Street", nameZh: "波斯富街", lat: 22.2800, lng: 114.1839, districtId: "B" },
  { id: "T15", nameEn: "Paterson Street", nameZh: "百德新街", lat: 22.2803, lng: 114.1873, districtId: "B" },
  { id: "T16", nameEn: "Tin Chiu Street", nameZh: "天后", lat: 22.2819, lng: 114.1923, districtId: "C" },
  { id: "T17", nameEn: "Fortress Hill", nameZh: "炮台山", lat: 22.2878, lng: 114.1958, districtId: "C" },
  { id: "T18", nameEn: "North Point", nameZh: "北角", lat: 22.2917, lng: 114.2000, districtId: "C" },
  { id: "T19", nameEn: "Quarry Bay", nameZh: "鰂魚涌", lat: 22.2880, lng: 114.2124, districtId: "C" },
  { id: "T20", nameEn: "Tai Koo", nameZh: "太古", lat: 22.2852, lng: 114.2197, districtId: "C" },
  { id: "T21", nameEn: "Sai Wan Ho", nameZh: "西灣河", lat: 22.2816, lng: 114.2270, districtId: "C" },
  { id: "T22", nameEn: "Shau Kei Wan", nameZh: "筲箕灣", lat: 22.2790, lng: 114.2365, districtId: "C" },
  // Happy Valley branch
  { id: "T30", nameEn: "Happy Valley", nameZh: "跑馬地", lat: 22.2720, lng: 114.1830, districtId: "B" },
  { id: "T31", nameEn: "Wong Nai Chung Road", nameZh: "黃泥涌道", lat: 22.2740, lng: 114.1808, districtId: "B" },
];

export async function ingestTram() {
  console.log("Ingesting tram data...");
  const sqlite = (db as any).$client;

  const insert = sqlite.prepare(
    "INSERT OR REPLACE INTO tram_stops (id, name_en, name_zh, lat, lng, district_id) VALUES (?, ?, ?, ?, ?, ?)"
  );

  for (const stop of TRAM_STOPS) {
    insert.run(stop.id, stop.nameEn, stop.nameZh, stop.lat, stop.lng, stop.districtId);
  }
  console.log(`  Inserted ${TRAM_STOPS.length} tram stops`);
}
