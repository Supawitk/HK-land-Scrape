import { Elysia, t } from "elysia";
import { db } from "../db/index";

export const amenitiesPlugin = new Elysia({ prefix: "/api/amenities" })
  .get("/schools", ({ query }) => {
    const sqlite = (db as any).$client;
    let sql = "SELECT * FROM schools WHERE 1=1";
    const params: any[] = [];

    if (query.level) {
      sql += " AND level = ?";
      params.push(query.level);
    }
    if (query.districtId) {
      sql += " AND district_id = ?";
      params.push(query.districtId);
    }
    if (query.minLat && query.maxLat && query.minLng && query.maxLng) {
      sql += " AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?";
      params.push(parseFloat(query.minLat), parseFloat(query.maxLat), parseFloat(query.minLng), parseFloat(query.maxLng));
    }
    sql += " ORDER BY name_en LIMIT 500";
    return sqlite.query(sql).all(...params);
  }, {
    query: t.Object({
      level: t.Optional(t.String()),
      districtId: t.Optional(t.String()),
      minLat: t.Optional(t.String()),
      maxLat: t.Optional(t.String()),
      minLng: t.Optional(t.String()),
      maxLng: t.Optional(t.String()),
    }),
  })
  .get("/hospitals", ({ query }) => {
    const sqlite = (db as any).$client;
    let sql = "SELECT * FROM hospitals WHERE 1=1";
    const params: any[] = [];

    if (query.districtId) {
      sql += " AND district_id = ?";
      params.push(query.districtId);
    }
    if (query.hasAE === "true") {
      sql += " AND has_ae = 1";
    }
    if (query.minLat && query.maxLat && query.minLng && query.maxLng) {
      sql += " AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?";
      params.push(parseFloat(query.minLat), parseFloat(query.maxLat), parseFloat(query.minLng), parseFloat(query.maxLng));
    }
    sql += " ORDER BY name_en";
    return sqlite.query(sql).all(...params);
  }, {
    query: t.Object({
      districtId: t.Optional(t.String()),
      hasAE: t.Optional(t.String()),
      minLat: t.Optional(t.String()),
      maxLat: t.Optional(t.String()),
      minLng: t.Optional(t.String()),
      maxLng: t.Optional(t.String()),
    }),
  })
  .get("/nearby", ({ query }) => {
    const sqlite = (db as any).$client;
    const lat = parseFloat(query.lat);
    const lng = parseFloat(query.lng);
    const radiusKm = parseFloat(query.radius || "1");
    const offset = radiusKm / 111;

    const schools = sqlite.query(`
      SELECT *, 'school' as type FROM schools
      WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
    `).all(lat - offset, lat + offset, lng - offset, lng + offset);

    const hospitals = sqlite.query(`
      SELECT *, 'hospital' as type FROM hospitals
      WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
    `).all(lat - offset, lat + offset, lng - offset, lng + offset);

    return { schools, hospitals };
  }, {
    query: t.Object({
      lat: t.String(),
      lng: t.String(),
      radius: t.Optional(t.String()),
    }),
  })
  .get("/summary", () => {
    const sqlite = (db as any).$client;

    const schoolsByDistrict = sqlite.query(`
      SELECT district_id, level, COUNT(*) as count
      FROM schools WHERE district_id IS NOT NULL
      GROUP BY district_id, level
    `).all();

    const hospitalsByDistrict = sqlite.query(`
      SELECT district_id, COUNT(*) as total,
        SUM(CASE WHEN has_ae = 1 THEN 1 ELSE 0 END) as with_ae
      FROM hospitals WHERE district_id IS NOT NULL
      GROUP BY district_id
    `).all();

    const totalSchools = sqlite.query("SELECT COUNT(*) as count FROM schools").get() as any;
    const totalHospitals = sqlite.query("SELECT COUNT(*) as count FROM hospitals").get() as any;

    return {
      totalSchools: totalSchools?.count || 0,
      totalHospitals: totalHospitals?.count || 0,
      schoolsByDistrict,
      hospitalsByDistrict,
    };
  });
