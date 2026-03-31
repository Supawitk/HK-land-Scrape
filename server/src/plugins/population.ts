import { Elysia, t } from "elysia";
import { db } from "../db/index";

export const populationPlugin = new Elysia({ prefix: "/api/population" })
  .get("/", () => {
    const sqlite = (db as any).$client;
    const data = sqlite.query(`
      SELECT pd.*, d.name_en as district_name, d.name_zh as district_name_zh, d.zone_id,
        d.area_km_sq,
        CASE WHEN d.area_km_sq > 0 THEN ROUND(pd.population * 1.0 / d.area_km_sq) ELSE NULL END as density
      FROM population_data pd
      JOIN districts d ON pd.district_id = d.id
      WHERE pd.year = (SELECT MAX(year) FROM population_data)
      ORDER BY pd.population DESC
    `).all();

    if (data.length === 0) {
      return { data: [], message: "No population data available. Census API requires browser session - data not yet ingested." };
    }
    return { data };
  })
  .get("/:districtId", ({ params }) => {
    const sqlite = (db as any).$client;
    const data = sqlite.query(`
      SELECT pd.*, d.name_en as district_name, d.area_km_sq
      FROM population_data pd
      JOIN districts d ON pd.district_id = d.id
      WHERE pd.district_id = ?
      ORDER BY pd.year DESC
    `).all(params.districtId);

    if (data.length === 0) {
      return { data: [], message: "No population data available for this district." };
    }
    return { data };
  }, {
    params: t.Object({ districtId: t.String() }),
  })
  .get("/compare", ({ query }) => {
    const sqlite = (db as any).$client;
    const ids = query.districts?.split(",") || [];
    if (ids.length === 0) return { data: [] };
    const placeholders = ids.map(() => "?").join(",");
    const data = sqlite.query(`
      SELECT pd.*, d.name_en as district_name, d.area_km_sq,
        CASE WHEN d.area_km_sq > 0 THEN ROUND(pd.population * 1.0 / d.area_km_sq) ELSE NULL END as density
      FROM population_data pd
      JOIN districts d ON pd.district_id = d.id
      WHERE pd.district_id IN (${placeholders})
      AND pd.year = (SELECT MAX(year) FROM population_data)
    `).all(...ids);
    return { data };
  }, {
    query: t.Object({
      districts: t.Optional(t.String()),
    }),
  });
