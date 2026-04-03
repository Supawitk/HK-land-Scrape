import { Elysia, t } from "elysia";
import { db } from "../db/index";

export const transportPlugin = new Elysia({ prefix: "/api/transport" })
  .get("/mtr/stations", () => {
    const sqlite = (db as any).$client;
    return sqlite.query("SELECT * FROM mtr_stations ORDER BY name_en").all();
  })
  .get("/mtr/lines", () => {
    const sqlite = (db as any).$client;
    const lines = sqlite.query("SELECT * FROM mtr_lines ORDER BY id").all() as any[];
    return lines.map((line: any) => {
      const stations = sqlite.query(`
        SELECT ms.*, mls.sequence
        FROM mtr_line_stations mls
        JOIN mtr_stations ms ON mls.station_id = ms.id
        WHERE mls.line_id = ?
        ORDER BY mls.sequence
      `).all(line.id);
      return { ...line, stations };
    });
  })
  .get("/bus/stops", ({ query }) => {
    const sqlite = (db as any).$client;
    let sql = "SELECT * FROM bus_stops WHERE 1=1";
    const params: any[] = [];

    if (query.operator) {
      sql += " AND operator = ?";
      params.push(query.operator);
    }
    if (query.minLat && query.maxLat && query.minLng && query.maxLng) {
      sql += " AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?";
      params.push(parseFloat(query.minLat), parseFloat(query.maxLat), parseFloat(query.minLng), parseFloat(query.maxLng));
    }
    if (query.districtId) {
      sql += " AND district_id = ?";
      params.push(query.districtId);
    }

    const limit = Math.min(parseInt(query.limit || "2000"), 5000);
    sql += ` LIMIT ${limit}`;
    return sqlite.query(sql).all(...params);
  }, {
    query: t.Object({
      operator: t.Optional(t.String()),
      districtId: t.Optional(t.String()),
      minLat: t.Optional(t.String()),
      maxLat: t.Optional(t.String()),
      minLng: t.Optional(t.String()),
      maxLng: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  })
  .get("/bus/routes", ({ query }) => {
    const sqlite = (db as any).$client;
    let sql = "SELECT * FROM bus_routes WHERE 1=1";
    const params: any[] = [];
    if (query.operator) {
      sql += " AND operator = ?";
      params.push(query.operator);
    }
    if (query.route) {
      sql += " AND route LIKE ?";
      params.push(`%${query.route}%`);
    }
    const limit = Math.min(parseInt(query.limit || "200"), 1000);
    sql += ` ORDER BY route LIMIT ${limit}`;
    return sqlite.query(sql).all(...params);
  }, {
    query: t.Object({
      operator: t.Optional(t.String()),
      route: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  })
  .get("/tram/stops", () => {
    const sqlite = (db as any).$client;
    return sqlite.query("SELECT * FROM tram_stops ORDER BY id").all();
  })
  .get("/light-rail/stops", () => {
    const sqlite = (db as any).$client;
    try {
      return sqlite.query("SELECT * FROM light_rail_stops ORDER BY id").all();
    } catch {
      return [];
    }
  })
  .get("/ferry/piers", () => {
    const sqlite = (db as any).$client;
    try {
      return sqlite.query("SELECT * FROM ferry_piers ORDER BY id").all();
    } catch {
      return [];
    }
  })
  .get("/nearby", ({ query }) => {
    const sqlite = (db as any).$client;
    const lat = parseFloat(query.lat);
    const lng = parseFloat(query.lng);
    const radiusKm = parseFloat(query.radius || "0.5");
    const offset = radiusKm / 111;

    const mtrStations = sqlite.query(`
      SELECT * FROM mtr_stations
      WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
    `).all(lat - offset, lat + offset, lng - offset, lng + offset);

    const busStops = sqlite.query(`
      SELECT * FROM bus_stops
      WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
      LIMIT 100
    `).all(lat - offset, lat + offset, lng - offset, lng + offset);

    const tramStops = sqlite.query(`
      SELECT * FROM tram_stops
      WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
    `).all(lat - offset, lat + offset, lng - offset, lng + offset);

    let lightRailStops: any[] = [];
    try {
      lightRailStops = sqlite.query(`
        SELECT * FROM light_rail_stops
        WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
      `).all(lat - offset, lat + offset, lng - offset, lng + offset);
    } catch { /* table may not exist yet */ }

    let ferryPiers: any[] = [];
    try {
      ferryPiers = sqlite.query(`
        SELECT * FROM ferry_piers
        WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
      `).all(lat - offset, lat + offset, lng - offset, lng + offset);
    } catch { /* table may not exist yet */ }

    return { mtrStations, busStops, tramStops, lightRailStops, ferryPiers };
  }, {
    query: t.Object({
      lat: t.String(),
      lng: t.String(),
      radius: t.Optional(t.String()),
    }),
  })
  .get("/summary", () => {
    const sqlite = (db as any).$client;
    const result: any = {};
    result.mtr_stations = sqlite.query("SELECT COUNT(*) as count FROM mtr_stations").get()?.count || 0;
    result.mtr_lines = sqlite.query("SELECT COUNT(*) as count FROM mtr_lines").get()?.count || 0;
    result.bus_stops = sqlite.query("SELECT COUNT(*) as count FROM bus_stops").get()?.count || 0;
    result.bus_routes = sqlite.query("SELECT COUNT(*) as count FROM bus_routes").get()?.count || 0;
    result.tram_stops = sqlite.query("SELECT COUNT(*) as count FROM tram_stops").get()?.count || 0;

    // Operator breakdown
    try {
      const operators = sqlite.query("SELECT operator, COUNT(*) as count FROM bus_stops GROUP BY operator").all();
      result.bus_by_operator = operators;
    } catch { result.bus_by_operator = []; }

    try {
      result.light_rail_stops = sqlite.query("SELECT COUNT(*) as count FROM light_rail_stops").get()?.count || 0;
    } catch { result.light_rail_stops = 0; }

    try {
      result.ferry_piers = sqlite.query("SELECT COUNT(*) as count FROM ferry_piers").get()?.count || 0;
    } catch { result.ferry_piers = 0; }

    return result;
  })
  .get("/route/:operator/:route", ({ params }) => {
    const sqlite = (db as any).$client;
    const routes = sqlite.query(
      "SELECT * FROM bus_routes WHERE operator = ? AND route = ? ORDER BY bound"
    ).all(params.operator, params.route);
    return routes;
  }, {
    params: t.Object({ operator: t.String(), route: t.String() }),
  });
