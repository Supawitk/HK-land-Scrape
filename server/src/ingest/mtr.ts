import { db } from "../db/index";

const MTR_CSV_URL = "https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv";

// Static MTR station coordinates (stable, rarely changes)
const STATION_COORDS: Record<string, { lat: number; lng: number; districtId: string }> = {
  // Airport Express
  HOK: { lat: 22.2849, lng: 114.1584, districtId: "A" },
  KOW: { lat: 22.3050, lng: 114.1616, districtId: "E" },
  TSY: { lat: 22.3584, lng: 114.1077, districtId: "S" },
  AIR: { lat: 22.3160, lng: 113.9365, districtId: "T" },
  AWE: { lat: 22.3220, lng: 113.9426, districtId: "T" },
  // Island Line
  KET: { lat: 22.2814, lng: 114.1107, districtId: "A" },
  HKU: { lat: 22.2840, lng: 114.1347, districtId: "A" },
  SYP: { lat: 22.2854, lng: 114.1425, districtId: "A" },
  SHW: { lat: 22.2866, lng: 114.1516, districtId: "A" },
  CEN: { lat: 22.2819, lng: 114.1580, districtId: "A" },
  ADM: { lat: 22.2791, lng: 114.1654, districtId: "A" },
  WAC: { lat: 22.2776, lng: 114.1732, districtId: "B" },
  CAB: { lat: 22.2798, lng: 114.1841, districtId: "B" },
  TIH: { lat: 22.2825, lng: 114.1918, districtId: "C" },
  FOH: { lat: 22.2914, lng: 114.2018, districtId: "C" },
  NOP: { lat: 22.2912, lng: 114.2096, districtId: "C" },
  QUB: { lat: 22.2884, lng: 114.2171, districtId: "C" },
  TAK: { lat: 22.2849, lng: 114.2261, districtId: "C" },
  SWH: { lat: 22.2790, lng: 114.2366, districtId: "C" },
  SKW: { lat: 22.2796, lng: 114.2487, districtId: "C" },
  HFC: { lat: 22.2764, lng: 114.2539, districtId: "C" },
  CHW: { lat: 22.2647, lng: 114.2567, districtId: "C" },
  // Kwun Tong Line
  WHA: { lat: 22.3070, lng: 114.1750, districtId: "G" },
  MOK: { lat: 22.3170, lng: 114.1764, districtId: "G" },
  PRE: { lat: 22.3265, lng: 114.1723, districtId: "G" },
  SKM: { lat: 22.3362, lng: 114.1743, districtId: "F" },
  LOF: { lat: 22.3382, lng: 114.1881, districtId: "H" },
  WTS: { lat: 22.3416, lng: 114.1951, districtId: "H" },
  DIH: { lat: 22.3393, lng: 114.2024, districtId: "H" },
  CHH: { lat: 22.3354, lng: 114.2089, districtId: "H" },
  KOB: { lat: 22.3232, lng: 114.2140, districtId: "J" },
  NTK: { lat: 22.3158, lng: 114.2193, districtId: "J" },
  KWT: { lat: 22.3124, lng: 114.2263, districtId: "J" },
  LAT: { lat: 22.3072, lng: 114.2337, districtId: "J" },
  YAT: { lat: 22.2972, lng: 114.2365, districtId: "J" },
  TIK: { lat: 22.3041, lng: 114.2530, districtId: "J" },
  // Tsuen Wan Line
  TSW: { lat: 22.3736, lng: 114.1177, districtId: "K" },
  TWH: { lat: 22.3709, lng: 114.1244, districtId: "K" },
  KWH: { lat: 22.3695, lng: 114.1283, districtId: "S" },
  KWF: { lat: 22.3632, lng: 114.1310, districtId: "S" },
  LAK: { lat: 22.3367, lng: 114.1480, districtId: "F" },
  MEF: { lat: 22.3366, lng: 114.1545, districtId: "F" },
  CSW: { lat: 22.3357, lng: 114.1632, districtId: "F" },
  SSP: { lat: 22.3310, lng: 114.1710, districtId: "F" },
  YMT: { lat: 22.3132, lng: 114.1726, districtId: "E" },
  JOR: { lat: 22.3050, lng: 114.1717, districtId: "E" },
  TST: { lat: 22.2977, lng: 114.1725, districtId: "E" },
  // Tung Chung Line
  TUC: { lat: 22.2893, lng: 113.9414, districtId: "T" },
  SUN: { lat: 22.3317, lng: 114.0293, districtId: "T" },
  OLY: { lat: 22.3188, lng: 114.1600, districtId: "E" },
  NAC: { lat: 22.3268, lng: 114.1589, districtId: "E" },
  // Tseung Kwan O Line
  POA: { lat: 22.3225, lng: 114.2579, districtId: "Q" },
  HAH: { lat: 22.3156, lng: 114.2264, districtId: "Q" },
  TKO: { lat: 22.3047, lng: 114.2600, districtId: "Q" },
  LHP: { lat: 22.2956, lng: 114.2688, districtId: "Q" },
  // South Island Line
  OCP: { lat: 22.2479, lng: 114.1692, districtId: "D" },
  WCH: { lat: 22.2474, lng: 114.1740, districtId: "D" },
  LET: { lat: 22.2425, lng: 114.1561, districtId: "D" },
  SOH: { lat: 22.2485, lng: 114.1746, districtId: "D" },
  // East Rail Line
  HUH: { lat: 22.3026, lng: 114.1822, districtId: "G" },
  MKK: { lat: 22.3073, lng: 114.1800, districtId: "G" },
  ETS: { lat: 22.2949, lng: 114.1738, districtId: "E" },
  KOT: { lat: 22.3370, lng: 114.1875, districtId: "G" },
  TAW: { lat: 22.3728, lng: 114.1786, districtId: "R" },
  SHT: { lat: 22.3818, lng: 114.1876, districtId: "R" },
  FOT: { lat: 22.3952, lng: 114.1983, districtId: "R" },
  RAC: { lat: 22.4013, lng: 114.1881, districtId: "R" },
  UNI: { lat: 22.4134, lng: 114.2099, districtId: "R" },
  TAP: { lat: 22.4445, lng: 114.1687, districtId: "P" },
  TWO: { lat: 22.4510, lng: 114.1613, districtId: "P" },
  FAN: { lat: 22.4920, lng: 114.1387, districtId: "N" },
  SHS: { lat: 22.5012, lng: 114.1284, districtId: "N" },
  LOW: { lat: 22.5285, lng: 114.1137, districtId: "N" },
  LMC: { lat: 22.5151, lng: 114.0751, districtId: "N" },
  // Tuen Ma Line (west section: Tuen Mun to Hung Hom)
  TUM: { lat: 22.3951, lng: 113.9732, districtId: "L" },
  SIH: { lat: 22.4119, lng: 113.9788, districtId: "L" },
  TIS: { lat: 22.4483, lng: 114.0047, districtId: "M" },
  LOP: { lat: 22.4481, lng: 114.0257, districtId: "M" },
  YUL: { lat: 22.4459, lng: 114.0351, districtId: "M" },
  KSR: { lat: 22.4346, lng: 114.0681, districtId: "M" },
  TWW: { lat: 22.3712, lng: 114.1141, districtId: "K" },
  AUS: { lat: 22.3240, lng: 114.1666, districtId: "E" },
  // Tuen Ma Line (east section: Ho Man Tin to Wu Kai Sha)
  HOM: { lat: 22.3096, lng: 114.1826, districtId: "G" },
  TKW: { lat: 22.3169, lng: 114.1920, districtId: "G" },
  SUW: { lat: 22.3259, lng: 114.1913, districtId: "G" },
  KAT: { lat: 22.3305, lng: 114.1993, districtId: "J" },
  HIK: { lat: 22.3639, lng: 114.1711, districtId: "R" },
  CKT: { lat: 22.3746, lng: 114.1862, districtId: "R" },
  STW: { lat: 22.3765, lng: 114.1951, districtId: "R" },
  CIO: { lat: 22.3829, lng: 114.2038, districtId: "R" },
  SHM: { lat: 22.3877, lng: 114.2083, districtId: "R" },
  TSH: { lat: 22.4086, lng: 114.2228, districtId: "R" },
  HEO: { lat: 22.4175, lng: 114.2258, districtId: "R" },
  MOS: { lat: 22.4248, lng: 114.2316, districtId: "R" },
  WKS: { lat: 22.4295, lng: 114.2436, districtId: "R" },
  EXC: { lat: 22.2948, lng: 114.1748, districtId: "B" },
  // Disneyland Resort Line
  DIS: { lat: 22.3130, lng: 114.0454, districtId: "T" },
};

const MTR_LINES: { id: string; nameEn: string; nameZh: string; color: string }[] = [
  { id: "AEL", nameEn: "Airport Express", nameZh: "機場快綫", color: "#007078" },
  { id: "TCL", nameEn: "Tung Chung Line", nameZh: "東涌綫", color: "#F7943E" },
  { id: "TML", nameEn: "Tuen Ma Line", nameZh: "屯馬綫", color: "#9A3B26" },
  { id: "TKL", nameEn: "Tseung Kwan O Line", nameZh: "將軍澳綫", color: "#7D499D" },
  { id: "EAL", nameEn: "East Rail Line", nameZh: "東鐵綫", color: "#5EB6E4" },
  { id: "SIL", nameEn: "South Island Line", nameZh: "南港島綫", color: "#BAC429" },
  { id: "TWL", nameEn: "Tsuen Wan Line", nameZh: "荃灣綫", color: "#ED1D24" },
  { id: "ISL", nameEn: "Island Line", nameZh: "港島綫", color: "#0076C0" },
  { id: "KTL", nameEn: "Kwun Tong Line", nameZh: "觀塘綫", color: "#1A9431" },
  { id: "DRL", nameEn: "Disneyland Resort Line", nameZh: "迪士尼綫", color: "#F550A6" },
];

export async function ingestMtr() {
  console.log("Ingesting MTR data...");

  const sqlite = (db as any).$client;

  // Insert lines
  const insertLine = sqlite.prepare(
    "INSERT OR REPLACE INTO mtr_lines (id, name_en, name_zh, color) VALUES (?, ?, ?, ?)"
  );
  for (const line of MTR_LINES) {
    insertLine.run(line.id, line.nameEn, line.nameZh, line.color);
  }
  console.log(`  Inserted ${MTR_LINES.length} MTR lines`);

  // Fetch CSV for line-station relationships
  const res = await fetch(MTR_CSV_URL);
  const csv = await res.text();
  const lines = csv.trim().split("\n").slice(1); // skip header

  const stationsInserted = new Set<string>();
  let lineStationCount = 0;

  // Clear old line-station data
  sqlite.exec("DELETE FROM mtr_line_stations");

  const insertStation = sqlite.prepare(
    "INSERT OR REPLACE INTO mtr_stations (id, name_en, name_zh, lat, lng, district_id) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertLineStation = sqlite.prepare(
    "INSERT INTO mtr_line_stations (line_id, station_id, sequence) VALUES (?, ?, ?)"
  );

  for (const line of lines) {
    const parts = line.split(",").map((s) => s.replace(/"/g, "").trim());
    const [lineCode, direction, stationCode, _stationId, nameZh, nameEn, seq] = parts;

    // Only process one direction to avoid duplicates
    if (direction !== "DT") continue;

    const coords = STATION_COORDS[stationCode];
    if (!coords) continue;

    // Insert station if not yet inserted
    if (!stationsInserted.has(stationCode)) {
      insertStation.run(stationCode, nameEn, nameZh, coords.lat, coords.lng, coords.districtId);
      stationsInserted.add(stationCode);
    }

    // Insert line-station relationship
    insertLineStation.run(lineCode, stationCode, parseInt(seq));
    lineStationCount++;
  }

  console.log(`  Inserted ${stationsInserted.size} MTR stations, ${lineStationCount} line-station links`);
}
