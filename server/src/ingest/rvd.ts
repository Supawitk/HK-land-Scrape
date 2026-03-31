import { db } from "../db/index";

// RVD CSV URLs (real government data from Rating & Valuation Department)
const URLS = {
  domesticPrices: "http://www.rvd.gov.hk/datagovhk/1.2Q(from_99).csv",
  domesticStockByDistrict: "https://www.rvd.gov.hk/datagovhk/Dom_Stock_Completions_and_Vacancy_by_District_Eng.csv",
  domesticStockByAge: "https://www.rvd.gov.hk/datagovhk/Private_Dom_Stock_by_Age_Eng.csv",
  officeStockByDistrict: "https://www.rvd.gov.hk/datagovhk/Off_Stock_Completions_and_Vacancy_by_District_Eng.csv",
  commercialStockByDistrict: "https://www.rvd.gov.hk/datagovhk/Com_Stock_Completions_and_Vacancy_by_District_Eng.csv",
  factoryStockByDistrict: "https://www.rvd.gov.hk/datagovhk/FF_Stock_Completions_and_Vacancy_by_District_Eng.csv",
};

// District name -> district ID mapping
const DISTRICT_NAME_MAP: Record<string, string> = {
  "Central and Western": "A",
  "Wan Chai": "B",
  "Eastern": "C",
  "Southern": "D",
  "Yau Tsim Mong": "E",
  "Sham Shui Po": "F",
  "Kowloon City": "G",
  "Wong Tai Sin": "H",
  "Kwun Tong": "J",
  "Tsuen Wan": "K",
  "Tuen Mun": "L",
  "Yuen Long": "M",
  "North": "N",
  "Tai Po": "P",
  "Sai Kung": "Q",
  "Sha Tin": "R",
  "Kwai Tsing": "S",
  "Islands": "T",
};

function parseNum(s: string): number | null {
  if (!s || s === "-" || s.trim() === "") return null;
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

async function fetchCsv(url: string): Promise<string[][]> {
  const res = await fetch(url);
  const text = await res.text();
  // Remove BOM and parse CSV
  const clean = text.replace(/^\uFEFF/, "");
  return clean
    .split("\n")
    .map((line) => {
      // Handle quoted CSV fields
      const fields: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          fields.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      fields.push(current.trim());
      return fields;
    })
    .filter((row) => row.length > 1);
}

export async function ingestRvdPrices() {
  console.log("Ingesting RVD price data...");
  const sqlite = (db as any).$client;
  sqlite.exec("DELETE FROM price_indices");

  const rows = await fetchCsv(URLS.domesticPrices);
  // Skip header rows
  const dataRows = rows.slice(2);

  const insert = sqlite.prepare(
    "INSERT INTO price_indices (period, property_class, price_index) VALUES (?, ?, ?)"
  );

  let count = 0;
  for (const row of dataRows) {
    const quarter = row[0]; // e.g. "1/3/1999"
    if (!quarter || !quarter.match(/\d+\/\d+\/\d+/)) continue;

    // Parse quarter into YYYY-QN format
    const parts = quarter.split("/");
    const year = parts[2];
    const month = parseInt(parts[1]);
    const q = month <= 3 ? "Q1" : month <= 6 ? "Q2" : month <= 9 ? "Q3" : "Q4";
    const period = `${year}-${q}`;

    // Class A = col 1, Class B = col 7, Class C = col 13 (HK Island values)
    // We store HK, KLN, NT for each class
    const zones = ["Hong Kong", "Kowloon", "New Territories"];
    const classes = ["A", "B", "C", "D", "E"];

    for (let ci = 0; ci < classes.length; ci++) {
      for (let zi = 0; zi < zones.length; zi++) {
        const colIdx = 1 + ci * 6 + zi * 2; // skip remarks columns
        const val = parseNum(row[colIdx]);
        if (val !== null) {
          insert.run(`${period}`, `${classes[ci]}-${zones[zi]}`, val);
          count++;
        }
      }
    }
  }
  console.log(`  Inserted ${count} price records`);
}

export async function ingestRvdStock() {
  console.log("Ingesting RVD building stock data...");
  const sqlite = (db as any).$client;

  // Create building_stock table if not exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS building_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district_id TEXT REFERENCES districts(id),
      property_type TEXT NOT NULL,
      stock INTEGER,
      completions INTEGER,
      vacancy INTEGER,
      vacancy_rate REAL
    );
    CREATE INDEX IF NOT EXISTS idx_building_stock_district ON building_stock(district_id);
    CREATE INDEX IF NOT EXISTS idx_building_stock_type ON building_stock(property_type);
  `);
  sqlite.exec("DELETE FROM building_stock");

  const insert = sqlite.prepare(
    "INSERT INTO building_stock (district_id, property_type, stock, completions, vacancy, vacancy_rate) VALUES (?, ?, ?, ?, ?, ?)"
  );

  // Domestic stock
  const domRows = await fetchCsv(URLS.domesticStockByDistrict);
  let count = 0;
  for (const row of domRows.slice(2)) {
    const name = row[0]?.replace(/"/g, "");
    const districtId = DISTRICT_NAME_MAP[name];
    if (!districtId) continue;
    const stock = parseNum(row[5]); // 2024 year-end stock
    const completions = parseNum(row[2]);
    const vacancy = parseNum(row[6]);
    const vacancyRate = parseNum(row[7]);
    insert.run(districtId, "domestic", stock, completions, vacancy, vacancyRate);
    count++;
  }

  // Office stock (has extra "Remarks" column at index 1)
  const offRows = await fetchCsv(URLS.officeStockByDistrict);
  for (const row of offRows.slice(2)) {
    const name = row[0]?.replace(/"/g, "");
    const districtId = DISTRICT_NAME_MAP[name];
    if (!districtId) continue;
    // Cols: 0=District, 1=Remarks, 2=Stock2023, 3=Completions, 4=Comp%, 5=Stock2024, 6=Vacant, 7=Vacant%
    const stock = parseNum(row[5]);
    const completions = parseNum(row[3]);
    const vacancy = parseNum(row[6]);
    const vacancyRate = parseNum(row[7]);
    insert.run(districtId, "office", stock, completions, vacancy, vacancyRate);
    count++;
  }

  // Commercial stock (same layout as domestic)
  try {
    const comRows = await fetchCsv(URLS.commercialStockByDistrict);
    for (const row of comRows.slice(2)) {
      const name = row[0]?.replace(/"/g, "");
      const districtId = DISTRICT_NAME_MAP[name];
      if (!districtId) continue;
      insert.run(districtId, "commercial", parseNum(row[4]), parseNum(row[2]), parseNum(row[5]), parseNum(row[6]));
      count++;
    }
  } catch { /* skip if unavailable */ }

  // Factory stock (same layout as domestic)
  try {
    const ffRows = await fetchCsv(URLS.factoryStockByDistrict);
    for (const row of ffRows.slice(2)) {
      const name = row[0]?.replace(/"/g, "");
      const districtId = DISTRICT_NAME_MAP[name];
      if (!districtId) continue;
      insert.run(districtId, "factory", parseNum(row[4]), parseNum(row[2]), parseNum(row[5]), parseNum(row[6]));
      count++;
    }
  } catch { /* skip if unavailable */ }

  console.log(`  Inserted ${count} building stock records`);
}

export async function ingestRvdAge() {
  console.log("Ingesting RVD building age data...");
  const sqlite = (db as any).$client;

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS building_age (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      category TEXT NOT NULL,
      pre_1960 REAL,
      y1960_69 REAL,
      y1970_79 REAL,
      y1980_89 REAL,
      y1990_99 REAL,
      y2000_09 REAL,
      post_2009 REAL,
      total_units INTEGER
    );
  `);
  sqlite.exec("DELETE FROM building_age");

  const rows = await fetchCsv(URLS.domesticStockByAge);
  const insert = sqlite.prepare(
    "INSERT INTO building_age (year, category, pre_1960, y1960_69, y1970_79, y1980_89, y1990_99, y2000_09, post_2009, total_units) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  let count = 0;
  for (const row of rows.slice(2)) {
    const year = parseNum(row[0]);
    if (!year) continue;
    const category = row[1]; // "Overall", "Small/Medium", "Large"
    insert.run(
      year, category,
      parseNum(row[2]), parseNum(row[3]), parseNum(row[4]),
      parseNum(row[5]), parseNum(row[6]), parseNum(row[7]),
      parseNum(row[8]), parseNum(row[9])
    );
    count++;
  }
  console.log(`  Inserted ${count} building age records`);
}
