import { Elysia } from "elysia";
import { db } from "../db/index";

export const livabilityPlugin = new Elysia({ prefix: "/api/livability" })
  .get("/scores", () => {
    const sqlite = (db as any).$client;

    // Gather per-district metrics
    const districts = sqlite.query(`
      SELECT d.id, d.name_en, d.zone_id, d.area_km_sq,
        (SELECT population FROM population_data pd WHERE pd.district_id = d.id ORDER BY pd.year DESC LIMIT 1) as population
      FROM districts d ORDER BY d.id
    `).all() as any[];

    // Transport counts per district
    const mtrCounts = sqlite.query(`
      SELECT district_id, COUNT(*) as count FROM mtr_stations WHERE district_id IS NOT NULL GROUP BY district_id
    `).all() as any[];
    const busCounts = sqlite.query(`
      SELECT district_id, COUNT(*) as count FROM bus_stops WHERE district_id IS NOT NULL GROUP BY district_id
    `).all() as any[];
    const tramCounts = sqlite.query(`
      SELECT district_id, COUNT(*) as count FROM tram_stops WHERE district_id IS NOT NULL GROUP BY district_id
    `).all() as any[];

    const mtrMap = Object.fromEntries(mtrCounts.map((r: any) => [r.district_id, r.count]));
    const busMap = Object.fromEntries(busCounts.map((r: any) => [r.district_id, r.count]));
    const tramMap = Object.fromEntries(tramCounts.map((r: any) => [r.district_id, r.count]));

    // Amenity counts per district
    let schoolMap: Record<string, number> = {};
    let hospitalMap: Record<string, number> = {};
    try {
      const schoolCounts = sqlite.query(
        "SELECT district_id, COUNT(*) as count FROM schools WHERE district_id IS NOT NULL GROUP BY district_id"
      ).all() as any[];
      schoolMap = Object.fromEntries(schoolCounts.map((r: any) => [r.district_id, r.count]));
    } catch { /* table may not exist */ }
    try {
      const hospitalCounts = sqlite.query(
        "SELECT district_id, COUNT(*) as count FROM hospitals WHERE district_id IS NOT NULL GROUP BY district_id"
      ).all() as any[];
      hospitalMap = Object.fromEntries(hospitalCounts.map((r: any) => [r.district_id, r.count]));
    } catch { /* table may not exist */ }

    // Property stats per district
    const propStats = sqlite.query(`
      SELECT district_id,
        AVG(CASE WHEN price_per_sqft > 0 THEN price_per_sqft END) as avg_psf,
        COUNT(*) as listings
      FROM properties WHERE district_id IS NOT NULL GROUP BY district_id
    `).all() as any[];
    const propMap = Object.fromEntries(propStats.map((r: any) => [r.district_id, r]));

    // Compute raw metrics
    const raw = districts.map((d: any) => {
      const area = d.area_km_sq || 1;
      const pop = d.population || 0;
      const mtr = mtrMap[d.id] || 0;
      const bus = busMap[d.id] || 0;
      const tram = tramMap[d.id] || 0;
      const transportTotal = mtr * 10 + bus + tram * 5; // weighted
      const density = pop / area;
      const avgPsf = propMap[d.id]?.avg_psf || 0;
      const schools = schoolMap[d.id] || 0;
      const hospitalCount = hospitalMap[d.id] || 0;

      return {
        id: d.id,
        name: d.name_en,
        zoneId: d.zone_id,
        area,
        population: pop,
        density: Math.round(density),
        mtrStations: mtr,
        busStops: bus,
        tramStops: tram,
        transportScore: transportTotal,
        schools,
        hospitals: hospitalCount,
        avgPricePerSqft: avgPsf ? Math.round(avgPsf) : null,
        listings: propMap[d.id]?.listings || 0,
      };
    });

    // Normalize scores (0-100 scale)
    const maxTransport = Math.max(...raw.map((r) => r.transportScore), 1);
    const maxDensity = Math.max(...raw.map((r) => r.density), 1);
    const prices = raw.filter((r) => r.avgPricePerSqft).map((r) => r.avgPricePerSqft!);
    const maxPrice = Math.max(...prices, 1);
    const minPrice = Math.min(...prices, 0);
    const maxSchools = Math.max(...raw.map((r) => r.schools), 1);
    const maxHospitals = Math.max(...raw.map((r) => r.hospitals), 1);

    return raw.map((r) => {
      // Transport accessibility: more = better (0-30 points)
      const transportNorm = (r.transportScore / maxTransport) * 30;

      // Affordability: lower price = better (0-25 points)
      const affordability = r.avgPricePerSqft
        ? ((maxPrice - r.avgPricePerSqft) / (maxPrice - minPrice || 1)) * 25
        : 12; // neutral if no data

      // Space: lower density = more livable (0-15 points)
      const spaceScore = ((maxDensity - r.density) / maxDensity) * 15;

      // Amenities: schools + hospitals (0-20 points)
      const schoolScore = (r.schools / maxSchools) * 12;
      const hospitalScore = (r.hospitals / maxHospitals) * 8;
      const amenityScore = schoolScore + hospitalScore;

      // Data availability bonus (0-10 points)
      const dataScore = Math.min(r.listings / 10, 10);

      const total = Math.round(transportNorm + affordability + spaceScore + amenityScore + dataScore);

      return {
        ...r,
        scores: {
          transport: Math.round(transportNorm),
          affordability: Math.round(affordability),
          space: Math.round(spaceScore),
          amenities: Math.round(amenityScore),
          dataAvailability: Math.round(dataScore),
          total,
        },
      };
    }).sort((a, b) => b.scores.total - a.scores.total);
  });
