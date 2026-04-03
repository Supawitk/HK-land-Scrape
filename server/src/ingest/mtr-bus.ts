import { db } from "../db/index";
import { createRateLimiter } from "../lib/rate-limiter";

// MTR Bus / Feeder Bus CSV data from opendata.mtr.com.hk
const MTR_BUS_STOPS_CSV = "https://opendata.mtr.com.hk/data/mtr_bus_stops.csv";
const MTR_BUS_ROUTES_CSV = "https://opendata.mtr.com.hk/data/mtr_bus_routes.csv";

export async function ingestMtrBus() {
  console.log("Ingesting MTR Bus / Feeder Bus data...");
  const sqlite = (db as any).$client;

  const insertStop = sqlite.prepare(
    "INSERT OR REPLACE INTO bus_stops (id, operator, name_en, name_zh, lat, lng) VALUES (?, 'mtr_bus', ?, ?, ?, ?)"
  );
  const insertRoute = sqlite.prepare(
    "INSERT OR REPLACE INTO bus_routes (id, operator, route, bound, orig_en, dest_en, orig_zh, dest_zh) VALUES (?, 'mtr_bus', ?, ?, ?, ?, ?, ?)"
  );

  // Fetch and parse stops CSV
  let stopCount = 0;
  try {
    const stopsRes = await fetch(MTR_BUS_STOPS_CSV);
    const stopsCsv = await stopsRes.text();
    const stopLines = stopsCsv.trim().split("\n").slice(1); // skip header

    const seenStops = new Set<string>();
    for (const line of stopLines) {
      const parts = line.split(",").map((s) => s.replace(/"/g, "").trim());
      // CSV format: route, direction, seq, stopId, lat, lng, nameEn, nameZh
      if (parts.length < 8) continue;
      const [_route, _dir, _seq, stopId, lat, lng, nameEn, nameZh] = parts;

      if (!stopId || !lat || !lng || seenStops.has(stopId)) continue;
      seenStops.add(stopId);

      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (isNaN(latNum) || isNaN(lngNum) || latNum === 0) continue;

      insertStop.run(
        `mtrbus-${stopId}`,
        nameEn || `MTR Bus Stop ${stopId}`,
        nameZh || `港鐵巴士站 ${stopId}`,
        latNum,
        lngNum
      );
      stopCount++;
    }
  } catch (err) {
    console.warn("  Could not fetch MTR Bus stops CSV:", err);
  }

  // Fetch and parse routes CSV
  let routeCount = 0;
  try {
    const routesRes = await fetch(MTR_BUS_ROUTES_CSV);
    const routesCsv = await routesRes.text();
    const routeLines = routesCsv.trim().split("\n").slice(1);

    const seenRoutes = new Set<string>();
    for (const line of routeLines) {
      const parts = line.split(",").map((s) => s.replace(/"/g, "").trim());
      if (parts.length < 4) continue;
      const [routeNo, nameEn, nameZh] = parts;
      const key = routeNo;
      if (!key || seenRoutes.has(key)) continue;
      seenRoutes.add(key);

      insertRoute.run(
        `mtrbus-${key}`,
        routeNo,
        "O",
        nameEn || "",
        "",
        nameZh || null,
        null
      );
      routeCount++;
    }
  } catch (err) {
    console.warn("  Could not fetch MTR Bus routes CSV:", err);
  }

  console.log(`  Inserted ${routeCount} MTR Bus routes, ${stopCount} MTR Bus stops`);
}
