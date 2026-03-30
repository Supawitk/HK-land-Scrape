import { Elysia, t } from "elysia";
import { db } from "../db/index";

export const propertiesPlugin = new Elysia({ prefix: "/api" })
  .get("/properties", ({ query }) => {
    const sqlite = (db as any).$client;
    const page = parseInt(query.page || "1");
    const limit = Math.min(parseInt(query.limit || "20"), 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.listingType) {
      conditions.push("p.listing_type = ?");
      params.push(query.listingType);
    }
    if (query.districtId) {
      conditions.push("p.district_id = ?");
      params.push(query.districtId);
    }
    if (query.zoneId) {
      conditions.push("p.district_id IN (SELECT id FROM districts WHERE zone_id = ?)");
      params.push(query.zoneId);
    }
    if (query.priceMin) {
      conditions.push("p.price >= ?");
      params.push(parseInt(query.priceMin));
    }
    if (query.priceMax) {
      conditions.push("p.price <= ?");
      params.push(parseInt(query.priceMax));
    }
    if (query.areaMin) {
      conditions.push("p.area_usable >= ?");
      params.push(parseInt(query.areaMin));
    }
    if (query.areaMax) {
      conditions.push("p.area_usable <= ?");
      params.push(parseInt(query.areaMax));
    }
    if (query.bedrooms) {
      conditions.push("p.bedrooms = ?");
      params.push(parseInt(query.bedrooms));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sortCol = query.sortBy === "price" ? "p.price" : query.sortBy === "area" ? "p.area_usable" : "p.scraped_at";
    const sortDir = query.sortOrder === "asc" ? "ASC" : "DESC";

    const countResult = sqlite.query(`SELECT COUNT(*) as total FROM properties p ${where}`).get(...params) as any;
    const total = countResult.total;

    const data = sqlite.query(`
      SELECT p.*, d.name_en as district_name, d.name_zh as district_name_zh
      FROM properties p
      LEFT JOIN districts d ON p.district_id = d.id
      ${where}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }, {
    query: t.Object({
      listingType: t.Optional(t.String()),
      districtId: t.Optional(t.String()),
      zoneId: t.Optional(t.String()),
      priceMin: t.Optional(t.String()),
      priceMax: t.Optional(t.String()),
      areaMin: t.Optional(t.String()),
      areaMax: t.Optional(t.String()),
      bedrooms: t.Optional(t.String()),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      sortBy: t.Optional(t.String()),
      sortOrder: t.Optional(t.String()),
    }),
  })
  .get("/properties/stats", () => {
    const sqlite = (db as any).$client;
    const byDistrict = sqlite.query(`
      SELECT
        d.id as district_id,
        d.name_en as district_name,
        d.zone_id,
        COUNT(*) as total_listings,
        AVG(CASE WHEN p.price > 0 THEN p.price END) as avg_price,
        AVG(CASE WHEN p.price_per_sqft > 0 THEN p.price_per_sqft END) as avg_price_per_sqft,
        AVG(CASE WHEN p.area_usable > 0 THEN p.area_usable END) as avg_area,
        COUNT(CASE WHEN p.listing_type = 'buy' THEN 1 END) as buy_count,
        COUNT(CASE WHEN p.listing_type = 'rent' THEN 1 END) as rent_count
      FROM properties p
      JOIN districts d ON p.district_id = d.id
      GROUP BY d.id
      ORDER BY d.id
    `).all();

    const overall = sqlite.query(`
      SELECT
        COUNT(*) as total,
        AVG(CASE WHEN price > 0 THEN price END) as avg_price,
        COUNT(CASE WHEN listing_type = 'buy' THEN 1 END) as buy_count,
        COUNT(CASE WHEN listing_type = 'rent' THEN 1 END) as rent_count
    FROM properties
    `).get();

    return { byDistrict, overall };
  })
  .get("/properties/trends", () => {
    const sqlite = (db as any).$client;
    return sqlite.query("SELECT * FROM price_indices ORDER BY period ASC").all();
  });
