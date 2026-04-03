import { Elysia } from "elysia";

const HKO_BASE = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php";
const AQHI_RSS_URL = "https://www.aqhi.gov.hk/epd/ddata/html/out/aqhi_ind_rss_Eng.xml";

// Simple in-memory cache to avoid hammering external APIs
let weatherCache: { data: any; fetchedAt: number } | null = null;
let forecastCache: { data: any; fetchedAt: number } | null = null;
let aqhiCache: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function isCacheValid(cache: { fetchedAt: number } | null): boolean {
  return cache !== null && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

async function fetchHkoWeather(dataType: string): Promise<any> {
  const res = await fetch(`${HKO_BASE}?dataType=${dataType}&lang=en`);
  if (!res.ok) throw new Error(`HKO API error: ${res.status}`);
  return res.json();
}

function parseAqhiXml(xml: string): any[] {
  const stations: any[] = [];
  // Parse RSS items with regex (lightweight, no XML dependency needed)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = item.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const desc = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "").replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

    // Parse description: "Central/Western - General Stations: 3 Low - Sat, 04 Apr 2026 04:30"
    // Strip CDATA wrappers
    const cleanDesc = desc.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
    const descMatch = cleanDesc.match(/^(.+?)\s*-\s*(General|Roadside)\s+Stations?:\s*(\d+)\s+(\w+)/);
    if (descMatch) {
      stations.push({
        station: descMatch[1].trim().replace(/<!\[CDATA\[/g, ""),
        type: descMatch[2].toLowerCase(),
        aqhi: parseInt(descMatch[3]),
        riskLevel: descMatch[4],
        updatedAt: pubDate,
      });
    }
  }
  return stations;
}

export const weatherPlugin = new Elysia({ prefix: "/api/weather" })
  .get("/current", async () => {
    if (isCacheValid(weatherCache)) return weatherCache!.data;

    try {
      const data = await fetchHkoWeather("rhrread");
      const result = {
        updateTime: data.updateTime,
        temperature: data.temperature?.data?.map((t: any) => ({
          place: t.place,
          value: t.value,
          unit: t.unit,
        })) || [],
        humidity: data.humidity?.data?.map((h: any) => ({
          place: h.place,
          value: h.value,
          unit: h.unit,
        })) || [],
        rainfall: data.rainfall?.data?.map((r: any) => ({
          place: r.place,
          max: r.max,
          unit: r.unit,
        })) || [],
        uvindex: data.uvindex?.data || [],
        icon: data.icon || [],
        warningMessage: data.warningMessage || [],
      };
      weatherCache = { data: result, fetchedAt: Date.now() };
      return result;
    } catch (err: any) {
      return { error: err.message };
    }
  })
  .get("/forecast", async () => {
    if (isCacheValid(forecastCache)) return forecastCache!.data;

    try {
      const data = await fetchHkoWeather("fnd");
      const result = {
        updateTime: data.updateTime,
        generalSituation: data.generalSituation,
        forecasts: data.weatherForecast?.map((f: any) => ({
          date: f.forecastDate,
          week: f.week,
          weather: f.forecastWeather,
          wind: f.forecastWind,
          minTemp: f.forecastMintemp?.value,
          maxTemp: f.forecastMaxtemp?.value,
          minHumidity: f.forecastMinrh?.value,
          maxHumidity: f.forecastMaxrh?.value,
          rainChance: f.PSR,
          icon: f.ForecastIcon,
        })) || [],
      };
      forecastCache = { data: result, fetchedAt: Date.now() };
      return result;
    } catch (err: any) {
      return { error: err.message };
    }
  })
  .get("/aqhi", async () => {
    if (isCacheValid(aqhiCache)) return aqhiCache!.data;

    try {
      const res = await fetch(AQHI_RSS_URL);
      if (!res.ok) throw new Error(`AQHI RSS error: ${res.status}`);
      const xml = await res.text();
      const stations = parseAqhiXml(xml);

      const general = stations.filter((s) => s.type === "general");
      const roadside = stations.filter((s) => s.type === "roadside");
      const avgAqhi = general.length > 0
        ? Math.round(general.reduce((sum, s) => sum + s.aqhi, 0) / general.length * 10) / 10
        : null;

      const result = {
        averageAqhi: avgAqhi,
        stations,
        generalStations: general.length,
        roadsideStations: roadside.length,
        fetchedAt: new Date().toISOString(),
      };
      aqhiCache = { data: result, fetchedAt: Date.now() };
      return result;
    } catch (err: any) {
      return { error: err.message, stations: [] };
    }
  });
