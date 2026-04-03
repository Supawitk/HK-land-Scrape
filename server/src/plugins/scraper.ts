import { Elysia, t } from "elysia";
import { db } from "../db/index";
import { scrape28hse } from "../scrapers/hse28/index";
import { ingestMtr } from "../ingest/mtr";
import { ingestKmb } from "../ingest/kmb";
import { ingestTram } from "../ingest/tram";
import { ingestCitybus } from "../ingest/citybus";
import { ingestNlb } from "../ingest/nlb";
import { ingestMtrBus } from "../ingest/mtr-bus";
import { ingestLightRail } from "../ingest/light-rail";
import { ingestPeakTram, ingestFerryPiers } from "../ingest/peak-tram";
import { ingestPopulation } from "../ingest/population";
import { ingestSchools } from "../ingest/schools";
import { ingestHospitals } from "../ingest/hospitals";

let scrapeStatus = { running: false, lastRun: null as string | null, lastCount: 0 };

export const scraperPlugin = new Elysia({ prefix: "/api/scraper" })
  .get("/status", () => {
    const sqlite = (db as any).$client;
    const counts: any = {};
    counts.properties = sqlite.query("SELECT COUNT(*) as count FROM properties").get()?.count || 0;
    counts.mtr_stations = sqlite.query("SELECT COUNT(*) as count FROM mtr_stations").get()?.count || 0;
    counts.bus_stops = sqlite.query("SELECT COUNT(*) as count FROM bus_stops").get()?.count || 0;
    counts.tram_stops = sqlite.query("SELECT COUNT(*) as count FROM tram_stops").get()?.count || 0;

    try {
      counts.light_rail_stops = sqlite.query("SELECT COUNT(*) as count FROM light_rail_stops").get()?.count || 0;
    } catch { counts.light_rail_stops = 0; }
    try {
      counts.ferry_piers = sqlite.query("SELECT COUNT(*) as count FROM ferry_piers").get()?.count || 0;
    } catch { counts.ferry_piers = 0; }

    // Bus breakdown by operator
    try {
      counts.bus_by_operator = sqlite.query("SELECT operator, COUNT(*) as count FROM bus_stops GROUP BY operator").all();
    } catch { counts.bus_by_operator = []; }

    try {
      counts.schools = sqlite.query("SELECT COUNT(*) as count FROM schools").get()?.count || 0;
    } catch { counts.schools = 0; }
    try {
      counts.hospitals = sqlite.query("SELECT COUNT(*) as count FROM hospitals").get()?.count || 0;
    } catch { counts.hospitals = 0; }
    try {
      counts.population_records = sqlite.query("SELECT COUNT(*) as count FROM population_data").get()?.count || 0;
    } catch { counts.population_records = 0; }

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
      await ingestCitybus();
      await ingestNlb();
      await ingestMtrBus();
      await ingestLightRail();
      await ingestPeakTram();
      await ingestFerryPiers();
      return { success: true };
    } catch (err: any) {
      return { error: err.message };
    }
  })
  .post("/ingest/population", async () => {
    try {
      await ingestPopulation();
      return { success: true };
    } catch (err: any) {
      return { error: err.message };
    }
  })
  .post("/ingest/amenities", async () => {
    try {
      await ingestSchools();
      await ingestHospitals();
      return { success: true };
    } catch (err: any) {
      return { error: err.message };
    }
  });
