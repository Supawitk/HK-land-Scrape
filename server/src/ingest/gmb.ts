import { db } from "../db/index";
import { createRateLimiter } from "../lib/rate-limiter";

const GMB_ROUTE_URL = "https://data.etagmb.gov.hk/route";
const GMB_ROUTE_DETAIL_URL = "https://data.etagmb.gov.hk/route";
const GMB_ROUTE_STOP_URL = "https://data.etagmb.gov.hk/route-stop";
const GMB_STOP_URL = "https://data.etagmb.gov.hk/stop";

const REGIONS = ["HKI", "KLN", "NT"];
const rateLimiter = createRateLimiter(200);

export async function ingestGmb() {
  console.log("Ingesting GMB (Green Minibus) data...");
  const sqlite = (db as any).$client;

  const insertStop = sqlite.prepare(
    "INSERT OR REPLACE INTO bus_stops (id, operator, name_en, name_zh, lat, lng) VALUES (?, 'gmb', ?, ?, ?, ?)"
  );
  const insertRoute = sqlite.prepare(
    "INSERT OR REPLACE INTO bus_routes (id, operator, route, bound, orig_en, dest_en, orig_zh, dest_zh) VALUES (?, 'gmb', ?, ?, ?, ?, ?, ?)"
  );

  let totalRoutes = 0;
  const allStopIds = new Set<string>();

  for (const region of REGIONS) {
    console.log(`  Region: ${region}`);
    // Get route list for region
    await rateLimiter();
    const routeListRes = await fetch(`${GMB_ROUTE_URL}/${region}`);
    const routeListJson = (await routeListRes.json()) as any;
    const routeCodes = routeListJson.data?.routes || [];

    for (const routeCode of routeCodes) {
      try {
        await rateLimiter();
        const detailRes = await fetch(`${GMB_ROUTE_DETAIL_URL}/${region}/${routeCode}`);
        const detailJson = (await detailRes.json()) as any;
        const variants = detailJson.data || [];

        for (const variant of variants) {
          const routeId = variant.route_id;
          const directions = variant.directions || [];

          for (const dir of directions) {
            const routeKey = `gmb-${routeId}-${dir.route_seq}`;
            insertRoute.run(
              routeKey, routeCode, dir.route_seq === 1 ? "O" : "I",
              dir.orig_en || "", dir.dest_en || "",
              dir.orig_tc || null, dir.dest_tc || null
            );
            totalRoutes++;

            // Get stops for this direction
            try {
              await rateLimiter();
              const stopsRes = await fetch(`${GMB_ROUTE_STOP_URL}/${routeId}/${dir.route_seq}`);
              const stopsJson = (await stopsRes.json()) as any;
              const stops = stopsJson.data?.route_stops || [];
              for (const stop of stops) {
                allStopIds.add(String(stop.stop_id));
              }
            } catch { /* skip */ }
          }
        }
      } catch { /* skip */ }
    }
    console.log(`    ${routeCodes.length} routes processed`);
  }

  console.log(`  Found ${allStopIds.size} unique GMB stop IDs`);
  console.log(`  Fetching stop coordinates (this may take a while)...`);

  let stopCount = 0;
  let batchCount = 0;
  for (const stopId of allStopIds) {
    try {
      await rateLimiter();
      const stopRes = await fetch(`${GMB_STOP_URL}/${stopId}`);
      const stopJson = (await stopRes.json()) as any;
      const coords = stopJson.data?.coordinates?.wgs84;
      if (coords) {
        insertStop.run(
          `gmb-${stopId}`,
          stopJson.data?.remarks_en || `GMB Stop ${stopId}`,
          stopJson.data?.remarks_tc || `小巴站 ${stopId}`,
          coords.latitude,
          coords.longitude
        );
        stopCount++;
      }
    } catch { /* skip */ }
    batchCount++;
    if (batchCount % 500 === 0) {
      console.log(`    Fetched ${batchCount}/${allStopIds.size} stops (${stopCount} with coords)...`);
    }
  }

  console.log(`  Inserted ${totalRoutes} GMB routes, ${stopCount} GMB stops`);
}
