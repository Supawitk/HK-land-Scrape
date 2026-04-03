import { db } from "../db/index";

const SCHOOLS_URL = "https://www.edb.gov.hk/attachment/en/student-parents/sch-info/sch-search/sch-location-info/SCH_LOC_EDB.json";

// Map EDB district names to our district IDs
const DISTRICT_MAP: Record<string, string> = {
  "CENTRAL AND WESTERN": "A",
  "WAN CHAI": "B",
  "EASTERN": "C",
  "SOUTHERN": "D",
  "YAU TSIM MONG": "E",
  "SHAM SHUI PO": "F",
  "KOWLOON CITY": "G",
  "WONG TAI SIN": "H",
  "KWUN TONG": "J",
  "TSUEN WAN": "K",
  "TUEN MUN": "L",
  "YUEN LONG": "M",
  "NORTH": "N",
  "TAI PO": "P",
  "SAI KUNG": "Q",
  "SHA TIN": "R",
  "KWAI TSING": "S",
  "ISLANDS": "T",
};

export async function ingestSchools() {
  console.log("Ingesting school data from EDB...");
  const sqlite = (db as any).$client;

  const res = await fetch(SCHOOLS_URL);
  if (!res.ok) throw new Error(`EDB API error: ${res.status}`);
  const schools = await res.json() as any[];

  sqlite.exec("DELETE FROM schools");

  const insert = sqlite.prepare(
    "INSERT OR REPLACE INTO schools (id, name_en, name_zh, level, category, district, district_id, address, lat, lng, session, gender, religion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  let count = 0;
  for (const s of schools) {
    const id = s["SCHOOL NO."];
    const lat = parseFloat(s["LATITUDE"] || s["緯度"]);
    const lng = parseFloat(s["LONGITUDE"] || s["經度"]);
    if (!id || isNaN(lat) || isNaN(lng) || lat === 0) continue;

    const district = (s["DISTRICT"] || "").toUpperCase().trim();
    const districtId = DISTRICT_MAP[district] || null;

    insert.run(
      id,
      s["ENGLISH NAME"] || "Unknown",
      s["中文名稱"] || null,
      s["SCHOOL LEVEL"] || null,
      s["ENGLISH CATEGORY"] || null,
      s["DISTRICT"] || null,
      districtId,
      s["ENGLISH ADDRESS"] || null,
      lat,
      lng,
      s["SESSION"] || null,
      s["STUDENTS GENDER"] || null,
      s["RELIGION"] || null
    );
    count++;
  }

  console.log(`  Inserted ${count} schools (${schools.length} total from API)`);
}
