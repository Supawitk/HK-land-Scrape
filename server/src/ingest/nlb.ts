import { db } from "../db/index";
import { createRateLimiter } from "../lib/rate-limiter";

const NLB_ROUTES_URL = "https://rt.data.gov.hk/v2/transport/nlb/route.php?action=list";
const NLB_STOPS_URL = "https://rt.data.gov.hk/v2/transport/nlb/stop.php?action=list&routeId=";

const rateLimiter = createRateLimiter(300);

export async function ingestNlb() {
  console.log("Ingesting NLB (New Lantao Bus) data...");
  const sqlite = (db as any).$client;

  const insertStop = sqlite.prepare(
    "INSERT OR REPLACE INTO bus_stops (id, operator, name_en, name_zh, lat, lng) VALUES (?, 'nlb', ?, ?, ?, ?)"
  );
  const insertRoute = sqlite.prepare(
    "INSERT OR REPLACE INTO bus_routes (id, operator, route, bound, orig_en, dest_en, orig_zh, dest_zh) VALUES (?, 'nlb', ?, ?, ?, ?, ?, ?)"
  );

  // Fetch all NLB routes
  const routesRes = await fetch(NLB_ROUTES_URL);
  const routesJson = (await routesRes.json()) as any;
  const routes = routesJson.routes || [];

  let routeCount = 0;
  const allStops = new Map<string, any>();

  for (const route of routes) {
    const routeNo = route.routeNo;
    const routeId = route.routeId;
    insertRoute.run(
      `nlb-${routeNo}-${routeId}`,
      routeNo,
      "O",
      route.routeName_e || "",
      "",
      route.routeName_c || null,
      null
    );
    routeCount++;

    // Fetch stops for this route
    try {
      await rateLimiter();
      const stopsRes = await fetch(`${NLB_STOPS_URL}${routeId}`);
      const stopsJson = (await stopsRes.json()) as any;
      const stops = stopsJson.stops || [];

      for (const stop of stops) {
        if (stop.latitude && stop.longitude && !allStops.has(stop.stopId)) {
          allStops.set(stop.stopId, {
            id: `nlb-${stop.stopId}`,
            nameEn: stop.stopName_e || `NLB Stop ${stop.stopId}`,
            nameZh: stop.stopName_c || `新大嶼山巴士站 ${stop.stopId}`,
            lat: parseFloat(stop.latitude),
            lng: parseFloat(stop.longitude),
          });
        }
      }
    } catch {
      // skip on error
    }
  }

  // Insert all unique stops
  let stopCount = 0;
  for (const stop of allStops.values()) {
    insertStop.run(stop.id, stop.nameEn, stop.nameZh, stop.lat, stop.lng);
    stopCount++;
  }

  console.log(`  Inserted ${routeCount} NLB routes, ${stopCount} NLB stops`);
}
