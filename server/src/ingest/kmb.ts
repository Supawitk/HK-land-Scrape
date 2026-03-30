import { db } from "../db/index";

const KMB_STOPS_URL = "https://data.etabus.gov.hk/v1/transport/kmb/stop";
const KMB_ROUTES_URL = "https://data.etabus.gov.hk/v1/transport/kmb/route/";

export async function ingestKmb() {
  console.log("Ingesting KMB bus data...");
  const sqlite = (db as any).$client;

  // Fetch stops
  const stopsRes = await fetch(KMB_STOPS_URL);
  const stopsJson = await stopsRes.json() as any;
  const stops = stopsJson.data;

  const insertStop = sqlite.prepare(
    "INSERT OR REPLACE INTO bus_stops (id, operator, name_en, name_zh, lat, lng) VALUES (?, 'kmb', ?, ?, ?, ?)"
  );

  let count = 0;
  for (const stop of stops) {
    insertStop.run(
      stop.stop,
      stop.name_en || "Unknown",
      stop.name_tc || "未知",
      parseFloat(stop.lat),
      parseFloat(stop.long)
    );
    count++;
  }
  console.log(`  Inserted ${count} KMB bus stops`);

  // Fetch routes
  const routesRes = await fetch(KMB_ROUTES_URL);
  const routesJson = await routesRes.json() as any;
  const routes = routesJson.data;

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
}
