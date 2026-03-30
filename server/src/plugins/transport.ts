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

    sql += " LIMIT 500";
    return sqlite.query(sql).all(...params);
  }, {
    query: t.Object({
      operator: t.Optional(t.String()),
      districtId: t.Optional(t.String()),
      minLat: t.Optional(t.String()),
      maxLat: t.Optional(t.String()),
      minLng: t.Optional(t.String()),
      maxLng: t.Optional(t.String()),
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
    sql += " ORDER BY route LIMIT 200";
    return sqlite.query(sql).all(...params);
  }, {
    query: t.Object({
      operator: t.Optional(t.String()),
    }),
  })
  .get("/tram/stops", () => {
    const sqlite = (db as any).$client;
    return sqlite.query("SELECT * FROM tram_stops ORDER BY id").all();
  })
  .get("/nearby", ({ query }) => {
    const sqlite = (db as any).$client;
    const lat = parseFloat(query.lat);
    const lng = parseFloat(query.lng);
    const radiusKm = parseFloat(query.radius || "0.5");
    // Approximate degree offset for radius (1 degree ~ 111km)
    const offset = radiusKm / 111;

    const mtrStations = sqlite.query(`
      SELECT * FROM mtr_stations
      WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
    `).all(lat - offset, lat + offset, lng - offset, lng + offset);

    const busStops = sqlite.query(`
      SELECT * FROM bus_stops
      WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
      LIMIT 50
    `).all(lat - offset, lat + offset, lng - offset, lng + offset);

    const tramStops = sqlite.query(`
      SELECT * FROM tram_stops
      WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
    `).all(lat - offset, lat + offset, lng - offset, lng + offset);

    return { mtrStations, busStops, tramStops };
  }, {
    query: t.Object({
      lat: t.String(),
      lng: t.String(),
      radius: t.Optional(t.String()),
    }),
  });
