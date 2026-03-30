import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { districtsPlugin } from "./plugins/districts";
import { propertiesPlugin } from "./plugins/properties";
import { transportPlugin } from "./plugins/transport";
import { populationPlugin } from "./plugins/population";
import { scraperPlugin } from "./plugins/scraper";

const PORT = parseInt(process.env.PORT || "3000");

const app = new Elysia()
  .use(cors({ origin: true }))
  .use(swagger({
    path: "/docs",
    documentation: {
      info: {
        title: "HK Property Dashboard API",
        version: "1.0.0",
        description: "Hong Kong property data analysis API with transport, population, and price data",
      },
    },
  }))
  .get("/", () => ({
    name: "HK Property Dashboard API",
    version: "1.0.0",
    docs: "/docs",
  }))
  .use(districtsPlugin)
  .use(propertiesPlugin)
  .use(transportPlugin)
  .use(populationPlugin)
  .use(scraperPlugin)
  .listen(PORT);

console.log(`🏠 HK Property Dashboard API running at http://localhost:${PORT}`);
console.log(`📚 Swagger docs at http://localhost:${PORT}/docs`);
