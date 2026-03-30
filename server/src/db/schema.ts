import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const zones = sqliteTable("zones", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameZh: text("name_zh").notNull(),
});

export const districts = sqliteTable("districts", {
  id: text("id").primaryKey(),
  zoneId: text("zone_id").notNull().references(() => zones.id),
  nameEn: text("name_en").notNull(),
  nameZh: text("name_zh").notNull(),
  centroidLat: real("centroid_lat"),
  centroidLng: real("centroid_lng"),
  areaKmSq: real("area_km_sq"),
});

export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("external_id"),
  listingType: text("listing_type").notNull(),
  districtId: text("district_id").references(() => districts.id),
  estateName: text("estate_name"),
  address: text("address"),
  price: integer("price"),
  pricePerSqft: real("price_per_sqft"),
  areaBuild: integer("area_build"),
  areaUsable: integer("area_usable"),
  bedrooms: integer("bedrooms"),
  propertyType: text("property_type"),
  sourceUrl: text("source_url"),
  imageUrl: text("image_url"),
  scrapedAt: integer("scraped_at").notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
}, (table) => [
  uniqueIndex("idx_properties_external_id").on(table.externalId),
  index("idx_properties_district").on(table.districtId),
  index("idx_properties_listing_type").on(table.listingType),
  index("idx_properties_price").on(table.price),
]);

export const mtrStations = sqliteTable("mtr_stations", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameZh: text("name_zh").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  districtId: text("district_id").references(() => districts.id),
});

export const mtrLines = sqliteTable("mtr_lines", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameZh: text("name_zh").notNull(),
  color: text("color"),
});

export const mtrLineStations = sqliteTable("mtr_line_stations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lineId: text("line_id").notNull().references(() => mtrLines.id),
  stationId: text("station_id").notNull().references(() => mtrStations.id),
  sequence: integer("sequence").notNull(),
});

export const busStops = sqliteTable("bus_stops", {
  id: text("id").primaryKey(),
  operator: text("operator").notNull(),
  nameEn: text("name_en").notNull(),
  nameZh: text("name_zh").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  districtId: text("district_id").references(() => districts.id),
}, (table) => [
  index("idx_bus_stops_operator").on(table.operator),
  index("idx_bus_stops_district").on(table.districtId),
  index("idx_bus_stops_lat_lng").on(table.lat, table.lng),
]);

export const busRoutes = sqliteTable("bus_routes", {
  id: text("id").primaryKey(),
  operator: text("operator").notNull(),
  route: text("route").notNull(),
  bound: text("bound").notNull(),
  origEn: text("orig_en").notNull(),
  destEn: text("dest_en").notNull(),
  origZh: text("orig_zh"),
  destZh: text("dest_zh"),
});

export const tramStops = sqliteTable("tram_stops", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameZh: text("name_zh"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  districtId: text("district_id").references(() => districts.id),
});

export const populationData = sqliteTable("population_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  districtId: text("district_id").notNull().references(() => districts.id),
  year: integer("year").notNull(),
  population: integer("population").notNull(),
  male: integer("male"),
  female: integer("female"),
}, (table) => [
  index("idx_population_district_year").on(table.districtId, table.year),
]);

export const priceIndices = sqliteTable("price_indices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  period: text("period").notNull(),
  propertyClass: text("property_class"),
  priceIndex: real("price_index"),
}, (table) => [
  index("idx_price_indices_period").on(table.period),
]);
