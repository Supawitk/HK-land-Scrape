import { Elysia, t } from "elysia";
import { db } from "../db/index";

export const buildingsPlugin = new Elysia({ prefix: "/api/buildings" })
  .get("/stock", ({ query }) => {
    const sqlite = (db as any).$client;
    let sql = `
      SELECT bs.*, d.name_en as district_name, d.zone_id
      FROM building_stock bs
      JOIN districts d ON bs.district_id = d.id
    `;
    if (query.type) {
      sql += ` WHERE bs.property_type = '${query.type}'`;
    }
    sql += " ORDER BY bs.district_id";
    return sqlite.query(sql).all();
  }, {
    query: t.Object({
      type: t.Optional(t.String()),
    }),
  })
  .get("/age", () => {
    const sqlite = (db as any).$client;
    return sqlite.query("SELECT * FROM building_age ORDER BY year DESC, category").all();
  })
  .get("/heatmap", ({ query }) => {
    const sqlite = (db as any).$client;
    const metric = query.metric || "stock";

    // Return per-district data for heatmap coloring
    if (metric === "stock") {
      return sqlite.query(`
        SELECT d.id, d.name_en, d.zone_id,
          SUM(CASE WHEN bs.property_type = 'domestic' THEN bs.stock ELSE 0 END) as domestic_stock,
          SUM(CASE WHEN bs.property_type = 'office' THEN bs.stock ELSE 0 END) as office_stock,
          SUM(CASE WHEN bs.property_type = 'commercial' THEN bs.stock ELSE 0 END) as commercial_stock,
          SUM(CASE WHEN bs.property_type = 'factory' THEN bs.stock ELSE 0 END) as factory_stock
        FROM districts d
        LEFT JOIN building_stock bs ON d.id = bs.district_id
        GROUP BY d.id
      `).all();
    }

    if (metric === "vacancy") {
      return sqlite.query(`
        SELECT d.id, d.name_en, d.zone_id,
          MAX(CASE WHEN bs.property_type = 'domestic' THEN bs.vacancy_rate END) as domestic_vacancy,
          MAX(CASE WHEN bs.property_type = 'office' THEN bs.vacancy_rate END) as office_vacancy
        FROM districts d
        LEFT JOIN building_stock bs ON d.id = bs.district_id
        GROUP BY d.id
      `).all();
    }

    if (metric === "price") {
      return sqlite.query(`
        SELECT d.id, d.name_en, d.zone_id,
          AVG(CASE WHEN p.price > 0 AND p.listing_type = 'buy' THEN p.price END) as avg_buy_price,
          AVG(CASE WHEN p.price > 0 AND p.listing_type = 'rent' THEN p.price END) as avg_rent_price,
          AVG(CASE WHEN p.price_per_sqft > 0 THEN p.price_per_sqft END) as avg_price_per_sqft,
          COUNT(*) as listing_count
        FROM districts d
        LEFT JOIN properties p ON d.id = p.district_id
        GROUP BY d.id
      `).all();
    }

    if (metric === "rooms") {
      return sqlite.query(`
        SELECT d.id, d.name_en, d.zone_id,
          COUNT(CASE WHEN p.bedrooms = 0 THEN 1 END) as studio,
          COUNT(CASE WHEN p.bedrooms = 1 THEN 1 END) as one_bed,
          COUNT(CASE WHEN p.bedrooms = 2 THEN 1 END) as two_bed,
          COUNT(CASE WHEN p.bedrooms = 3 THEN 1 END) as three_bed,
          COUNT(CASE WHEN p.bedrooms >= 4 THEN 1 END) as four_plus_bed,
          COUNT(*) as total
        FROM districts d
        LEFT JOIN properties p ON d.id = p.district_id
        GROUP BY d.id
      `).all();
    }

    return [];
  }, {
    query: t.Object({
      metric: t.Optional(t.String()),
    }),
  });
