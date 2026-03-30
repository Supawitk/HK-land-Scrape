import { Elysia, t } from "elysia";
import { db } from "../db/index";
import { scrape28hse } from "../scrapers/hse28/index";
import { ingestMtr } from "../ingest/mtr";
import { ingestKmb } from "../ingest/kmb";
import { ingestTram } from "../ingest/tram";

let scrapeStatus = { running: false, lastRun: null as string | null, lastCount: 0 };

export const scraperPlugin = new Elysia({ prefix: "/api/scraper" })
  .get("/status", () => {
    const sqlite = (db as any).$client;
    const counts = sqlite.query(`
      SELECT
        (SELECT COUNT(*) FROM properties) as properties,
        (SELECT COUNT(*) FROM mtr_stations) as mtr_stations,
        (SELECT COUNT(*) FROM bus_stops) as bus_stops,
        (SELECT COUNT(*) FROM tram_stops) as tram_stops
    `).get();
    return { ...scrapeStatus, counts };
  })
  .post("/run", async ({ body }) => {
    if (scrapeStatus.running) {
      return { error: "Scrape already in progress" };
    }
    scrapeStatus.running = true;
    try {
      const count = await scrape28hse(
        body.listingType || "buy",
        body.districts?.split(",")
      );
      scrapeStatus.lastRun = new Date().toISOString();
      scrapeStatus.lastCount = count;
      return { success: true, count };
    } catch (err: any) {
      return { error: err.message };
    } finally {
      scrapeStatus.running = false;
    }
  }, {
    body: t.Object({
      listingType: t.Optional(t.String()),
      districts: t.Optional(t.String()),
    }),
  })
  .post("/ingest/transport", async () => {
    try {
      await ingestMtr();
      await ingestKmb();
      await ingestTram();
      return { success: true };
    } catch (err: any) {
      return { error: err.message };
    }
  });
