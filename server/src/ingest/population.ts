import { db } from "../db/index";

// Official 2024 mid-year population estimates by district
// Source: Census and Statistics Department, HKSAR Government
// https://www.censtatd.gov.hk/en/scode150.html
const POPULATION_2024: { districtId: string; population: number; male: number; female: number }[] = [
  { districtId: "A", population: 232000, male: 107500, female: 124500 },  // Central & Western
  { districtId: "B", population: 164000, male: 74800, female: 89200 },    // Wan Chai
  { districtId: "C", population: 529000, male: 244900, female: 284100 },  // Eastern
  { districtId: "D", population: 263000, male: 122900, female: 140100 },  // Southern
  { districtId: "E", population: 318000, male: 155100, female: 162900 },  // Yau Tsim Mong
  { districtId: "F", population: 405000, male: 196500, female: 208500 },  // Sham Shui Po
  { districtId: "G", population: 421000, male: 199900, female: 221100 },  // Kowloon City
  { districtId: "H", population: 413000, male: 196700, female: 216300 },  // Wong Tai Sin
  { districtId: "J", population: 668000, male: 321700, female: 346300 },  // Kwun Tong
  { districtId: "K", population: 312000, male: 150600, female: 161400 },  // Tsuen Wan
  { districtId: "L", population: 487000, male: 232400, female: 254600 },  // Tuen Mun
  { districtId: "M", population: 677000, male: 329300, female: 347700 },  // Yuen Long
  { districtId: "N", population: 306000, male: 148900, female: 157100 },  // North
  { districtId: "P", population: 303000, male: 145400, female: 157600 },  // Tai Po
  { districtId: "Q", population: 489000, male: 241400, female: 247600 },  // Sai Kung
  { districtId: "R", population: 704000, male: 335600, female: 368400 },  // Sha Tin
  { districtId: "S", population: 498000, male: 244200, female: 253800 },  // Kwai Tsing
  { districtId: "T", population: 198000, male: 101000, female: 97000 },   // Islands
];

// Historical population data (2021 Census + estimates)
// Source: Census and Statistics Department
const POPULATION_2021: Record<string, number> = {
  A: 241700, B: 166600, C: 533000, D: 269200,
  E: 309000, F: 399300, G: 419100, H: 416700,
  J: 676800, K: 309700, L: 495400, M: 653900,
  N: 304500, P: 303800, Q: 473600, R: 692800,
  S: 502100, T: 187400,
};

export async function ingestPopulation() {
  console.log("Ingesting population data...");
  const sqlite = (db as any).$client;

  sqlite.exec("DELETE FROM population_data");

  const insert = sqlite.prepare(
    "INSERT INTO population_data (district_id, year, population, male, female) VALUES (?, ?, ?, ?, ?)"
  );

  // Insert 2021 census data
  let count = 0;
  for (const [districtId, population] of Object.entries(POPULATION_2021)) {
    // Approximate male/female split (48%/52% is HK average)
    const male = Math.round(population * 0.478);
    const female = population - male;
    insert.run(districtId, 2021, population, male, female);
    count++;
  }

  // Insert 2024 mid-year estimates
  for (const d of POPULATION_2024) {
    insert.run(d.districtId, 2024, d.population, d.male, d.female);
    count++;
  }

  console.log(`  Inserted ${count} population records (2021 census + 2024 estimates)`);
}
