import { db } from "../db/index";
import { createRateLimiter } from "../lib/rate-limiter";

const CTB_ROUTES_URL = "https://rt.data.gov.hk/v2/transport/citybus/route/ctb";
const CTB_ROUTE_STOP_URL = "https://rt.data.gov.hk/v2/transport/citybus/route-stop/ctb";
const CTB_STOP_URL = "https://rt.data.gov.hk/v2/transport/citybus/stop";

const rateLimiter = createRateLimiter(300);

export async function ingestCitybus() {
  console.log("Ingesting Citybus data...");
  const sqlite = (db as any).$client;

  // Fetch routes
  const routesRes = await fetch(CTB_ROUTES_URL);
  const routesJson = await routesRes.json() as any;
  const routes = routesJson.data;

  const insertRoute = sqlite.prepare(
    "INSERT OR REPLACE INTO bus_routes (id, operator, route, bound, orig_en, dest_en, orig_zh, dest_zh) VALUES (?, 'ctb', ?, ?, ?, ?, ?, ?)"
  );

  let routeCount = 0;
  for (const r of routes) {
    insertRoute.run(`ctb-${r.route}-outbound`, r.route, "O", r.orig_en, r.dest_en, r.orig_tc || null, r.dest_tc || null);
    routeCount++;
  }
  console.log(`  Inserted ${routeCount} Citybus routes`);

  // Collect unique stop IDs from ALL route-stop mappings
  const stopIds = new Set<string>();
  const sampleRoutes = routes;

  for (const r of sampleRoutes) {
    try {
      await rateLimiter();
      const rsRes = await fetch(`${CTB_ROUTE_STOP_URL}/${r.route}/outbound`);
      const rsJson = await rsRes.json() as any;
      for (const rs of rsJson.data || []) {
        stopIds.add(rs.stop);
      }
    } catch {
      // skip on error
    }
  }
  console.log(`  Found ${stopIds.size} unique Citybus stop IDs from ${sampleRoutes.length} routes`);

  // Fetch individual stops
  const insertStop = sqlite.prepare(
    "INSERT OR REPLACE INTO bus_stops (id, operator, name_en, name_zh, lat, lng) VALUES (?, 'ctb', ?, ?, ?, ?)"
  );

  let stopCount = 0;
  for (const stopId of stopIds) {
    try {
      await rateLimiter();
      const stopRes = await fetch(`${CTB_STOP_URL}/${stopId}`);
      const stopJson = await stopRes.json() as any;
      const s = stopJson.data;
      if (s && s.lat && s.long) {
        insertStop.run(
          `ctb-${s.stop}`,
          s.name_en || "Unknown",
          s.name_tc || "未知",
          parseFloat(s.lat),
          parseFloat(s.long)
        );
        stopCount++;
      }
    } catch {
      // skip on error
    }
  }
  console.log(`  Inserted ${stopCount} Citybus stops`);
}
