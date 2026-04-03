import { db } from "../db/index";

const KMB_STOPS_URL = "https://data.etabus.gov.hk/v1/transport/kmb/stop";
const KMB_ROUTES_URL = "https://data.etabus.gov.hk/v1/transport/kmb/route/";
const KMB_ROUTE_STOP_URL = "https://data.etabus.gov.hk/v1/transport/kmb/route-stop";

export async function ingestKmb() {
  console.log("Ingesting KMB bus data...");
  const sqlite = (db as any).$client;

  // Fetch ALL stops from the stop endpoint
  const stopsRes = await fetch(KMB_STOPS_URL);
  const stopsJson = await stopsRes.json() as any;
  const stops = stopsJson.data || [];

  const insertStop = sqlite.prepare(
    "INSERT OR REPLACE INTO bus_stops (id, operator, name_en, name_zh, lat, lng) VALUES (?, 'kmb', ?, ?, ?, ?)"
  );

  let count = 0;
  let skipped = 0;
  for (const stop of stops) {
    const lat = parseFloat(stop.lat);
    const lng = parseFloat(stop.long);
    // Skip stops with invalid coordinates
    if (!stop.stop || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      skipped++;
      continue;
    }
    insertStop.run(
      stop.stop,
      stop.name_en || "Unknown",
      stop.name_tc || "未知",
      lat,
      lng
    );
    count++;
  }
  console.log(`  Inserted ${count} KMB bus stops (${skipped} skipped, ${stops.length} total from API)`);

  // Fetch routes
  const routesRes = await fetch(KMB_ROUTES_URL);
  const routesJson = await routesRes.json() as any;
  const routes = routesJson.data || [];

  const insertRoute = sqlite.prepare(
    "INSERT OR REPLACE INTO bus_routes (id, operator, route, bound, orig_en, dest_en, orig_zh, dest_zh) VALUES (?, 'kmb', ?, ?, ?, ?, ?, ?)"
  );

  let routeCount = 0;
  for (const r of routes) {
    const id = `kmb-${r.route}-${r.bound}-${r.service_type}`;
    insertRoute.run(id, r.route, r.bound, r.orig_en, r.dest_en, r.orig_tc || null, r.dest_tc || null);
    routeCount++;
  }
  console.log(`  Inserted ${routeCount} KMB routes`);

  console.log(`  KMB ingestion complete: ${count} stops, ${routeCount} routes`);
}
