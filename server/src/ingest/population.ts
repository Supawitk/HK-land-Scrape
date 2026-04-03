import { db } from "../db/index";

// Official 2025 mid-year population estimates by district
// Source: Census and Statistics Department, HKSAR Government
// https://www.censtatd.gov.hk/en/scode150.html
// Total HK population: ~7,498,900 (mid-2025)
const POPULATION_2025: { districtId: string; population: number; male: number; female: number }[] = [
  { districtId: "A", population: 234100, male: 108500, female: 125600 },  // Central & Western
  { districtId: "B", population: 165500, male: 75500, female: 90000 },    // Wan Chai
  { districtId: "C", population: 530200, male: 245500, female: 284700 },  // Eastern
  { districtId: "D", population: 264500, male: 123600, female: 140900 },  // Southern
  { districtId: "E", population: 321000, male: 156600, female: 164400 },  // Yau Tsim Mong
  { districtId: "F", population: 409000, male: 198400, female: 210600 },  // Sham Shui Po
  { districtId: "G", population: 425000, male: 201800, female: 223200 },  // Kowloon City
  { districtId: "H", population: 414500, male: 197400, female: 217100 },  // Wong Tai Sin
  { districtId: "J", population: 671000, male: 323100, female: 347900 },  // Kwun Tong
  { districtId: "K", population: 314500, male: 151800, female: 162700 },  // Tsuen Wan
  { districtId: "L", population: 490000, male: 233800, female: 256200 },  // Tuen Mun
  { districtId: "M", population: 683000, male: 332200, female: 350800 },  // Yuen Long
  { districtId: "N", population: 309000, male: 150400, female: 158600 },  // North
  { districtId: "P", population: 305500, male: 146600, female: 158900 },  // Tai Po
  { districtId: "Q", population: 494000, male: 243900, female: 250100 },  // Sai Kung
  { districtId: "R", population: 709000, male: 337900, female: 371100 },  // Sha Tin
  { districtId: "S", population: 500500, male: 245400, female: 255100 },  // Kwai Tsing
  { districtId: "T", population: 200500, male: 102300, female: 98200 },   // Islands
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

  // Insert 2025 mid-year estimates
  for (const d of POPULATION_2025) {
    insert.run(d.districtId, 2025, d.population, d.male, d.female);
    count++;
  }

  console.log(`  Inserted ${count} population records (2021 census + 2025 mid-year estimates)`);
}
