import { Elysia, t } from "elysia";
import { db } from "../db/index";

export const districtsPlugin = new Elysia({ prefix: "/api" })
  .get("/zones", () => {
    const sqlite = (db as any).$client;
    const zones = sqlite.query("SELECT * FROM zones").all();
    const districts = sqlite.query("SELECT id, zone_id, name_en FROM districts").all() as any[];
    return zones.map((z: any) => ({
      ...z,
      districtCount: districts.filter((d) => d.zone_id === z.id).length,
    }));
  })
  .get("/districts", ({ query }) => {
    const sqlite = (db as any).$client;
    let sql = `
      SELECT d.*, z.name_en as zone_name, z.name_zh as zone_name_zh,
        (SELECT COUNT(*) FROM properties p WHERE p.district_id = d.id) as listing_count,
        (SELECT AVG(p.price) FROM properties p WHERE p.district_id = d.id AND p.price > 0) as avg_price,
        (SELECT population FROM population_data pd WHERE pd.district_id = d.id ORDER BY pd.year DESC LIMIT 1) as population
      FROM districts d
      JOIN zones z ON d.zone_id = z.id
    `;
    if (query.zoneId) {
      sql += ` WHERE d.zone_id = '${query.zoneId}'`;
    }
    sql += " ORDER BY d.id";
    return sqlite.query(sql).all();
  }, {
    query: t.Object({
      zoneId: t.Optional(t.String()),
    }),
  })
  .get("/districts/:id", ({ params }) => {
    const sqlite = (db as any).$client;
    const district = sqlite.query(`
      SELECT d.*, z.name_en as zone_name, z.name_zh as zone_name_zh
      FROM districts d
      JOIN zones z ON d.zone_id = z.id
      WHERE d.id = ?
    `).get(params.id);

    if (!district) return { error: "District not found" };

    const stats = sqlite.query(`
      SELECT
        COUNT(*) as total_listings,
        AVG(CASE WHEN price > 0 THEN price END) as avg_price,
        AVG(CASE WHEN price_per_sqft > 0 THEN price_per_sqft END) as avg_price_per_sqft,
        AVG(CASE WHEN area_usable > 0 THEN area_usable END) as avg_area,
        COUNT(CASE WHEN listing_type = 'buy' THEN 1 END) as buy_count,
        COUNT(CASE WHEN listing_type = 'rent' THEN 1 END) as rent_count
      FROM properties WHERE district_id = ?
    `).get(params.id);

    const population = sqlite.query(
      "SELECT * FROM population_data WHERE district_id = ? ORDER BY year DESC LIMIT 1"
    ).get(params.id);

    return { ...district, stats, population };
  }, {
    params: t.Object({ id: t.String() }),
  });
