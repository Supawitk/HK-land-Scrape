import { db } from "../db/index";

const HOSPITALS_URL = "https://www.ha.org.hk/opendata/facility-hosp.json";
const CLINICS_URL = "https://www.ha.org.hk/opendata/facility-sop.json";

// Map hospital clusters to approximate district IDs (by area)
function findDistrictByCoords(lat: number, lng: number, districts: any[]): string | null {
  let closest: string | null = null;
  let minDist = Infinity;
  for (const d of districts) {
    if (!d.centroid_lat || !d.centroid_lng) continue;
    const dx = lat - d.centroid_lat;
    const dy = lng - d.centroid_lng;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closest = d.id;
    }
  }
  return closest;
}

export async function ingestHospitals() {
  console.log("Ingesting hospital data from HA...");
  const sqlite = (db as any).$client;

  // Get districts for coordinate matching
  const districts = sqlite.query("SELECT id, centroid_lat, centroid_lng FROM districts").all();

  sqlite.exec("DELETE FROM hospitals");

  const insert = sqlite.prepare(
    "INSERT INTO hospitals (name_en, name_zh, cluster, address, lat, lng, has_ae, district_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  // Fetch hospitals
  let count = 0;
  try {
    const res = await fetch(HOSPITALS_URL);
    if (!res.ok) throw new Error(`HA hospitals API error: ${res.status}`);
    const hospitals = await res.json() as any[];

    for (const h of hospitals) {
      const lat = parseFloat(h.latitude);
      const lng = parseFloat(h.longitude);
      if (isNaN(lat) || isNaN(lng)) continue;

      const districtId = findDistrictByCoords(lat, lng, districts);
      insert.run(
        h.institution_eng || "Unknown",
        h.institution_tc || null,
        h.cluster_eng || null,
        h.address_eng || null,
        lat,
        lng,
        h.with_AE_service_eng === "Yes" ? 1 : 0,
        districtId
      );
      count++;
    }
    console.log(`  Inserted ${count} hospitals`);
  } catch (err: any) {
    console.error(`  Hospital fetch error: ${err.message}`);
  }

  // Fetch specialist outpatient clinics
  try {
    const res = await fetch(CLINICS_URL);
    if (!res.ok) throw new Error(`HA clinics API error: ${res.status}`);
    const clinics = await res.json() as any[];

    let clinicCount = 0;
    for (const c of clinics) {
      const lat = parseFloat(c.latitude);
      const lng = parseFloat(c.longitude);
      if (isNaN(lat) || isNaN(lng)) continue;

      const districtId = findDistrictByCoords(lat, lng, districts);
      insert.run(
        c.institution_eng || "Unknown",
        c.institution_tc || null,
        c.cluster_eng || null,
        c.address_eng || null,
        lat,
        lng,
        0,
        districtId
      );
      clinicCount++;
    }
    console.log(`  Inserted ${clinicCount} specialist clinics`);
    count += clinicCount;
  } catch (err: any) {
    console.error(`  Clinics fetch error: ${err.message}`);
  }

  console.log(`  Total healthcare facilities: ${count}`);
}
