const BASE_URL = "/api";
const DEFAULT_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(`Request timeout after ${DEFAULT_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function apiFetch<T>(path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    });
  }
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

async function apiPost<T>(path: string, body?: any): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export function useApi() {
  return {
    // Districts
    getZones: () => apiFetch<any[]>(`${BASE_URL}/zones`),
    getDistricts: (zoneId?: string) => apiFetch<any[]>(`${BASE_URL}/districts`, { zoneId }),
    getDistrict: (id: string) => apiFetch<any>(`${BASE_URL}/districts/${id}`),

    // Properties
    getProperties: (params?: Record<string, any>) => apiFetch<any>(`${BASE_URL}/properties`, params),
    getPropertyStats: () => apiFetch<any>(`${BASE_URL}/properties/stats`),
    getPropertyTrends: () => apiFetch<any[]>(`${BASE_URL}/properties/trends`),

    // Transport
    getMtrStations: () => apiFetch<any[]>(`${BASE_URL}/transport/mtr/stations`),
    getMtrLines: () => apiFetch<any[]>(`${BASE_URL}/transport/mtr/lines`),
    getBusStops: (params?: Record<string, any>) => apiFetch<any[]>(`${BASE_URL}/transport/bus/stops`, params),
    getBusRoutes: (params?: Record<string, any>) => apiFetch<any[]>(`${BASE_URL}/transport/bus/routes`, params),
    getTramStops: () => apiFetch<any[]>(`${BASE_URL}/transport/tram/stops`),
    getLightRailStops: () => apiFetch<any[]>(`${BASE_URL}/transport/light-rail/stops`),
    getFerryPiers: () => apiFetch<any[]>(`${BASE_URL}/transport/ferry/piers`),
    getNearbyTransport: (lat: number, lng: number, radius?: number) =>
      apiFetch<any>(`${BASE_URL}/transport/nearby`, { lat, lng, radius }),
    getTransportSummary: () => apiFetch<any>(`${BASE_URL}/transport/summary`),
    getRouteDetail: (operator: string, route: string) =>
      apiFetch<any[]>(`${BASE_URL}/transport/route/${operator}/${route}`),
    getRouteStops: (operator: string, route: string, direction: string) =>
      apiFetch<any[]>(`${BASE_URL}/transport/route-stops/${operator}/${route}/${direction}`),

    // Population
    getPopulation: () => apiFetch<any>(`${BASE_URL}/population`),
    getPopulationByDistrict: (id: string) => apiFetch<any>(`${BASE_URL}/population/${id}`),
    getPopulationCompare: (ids: string[]) =>
      apiFetch<any>(`${BASE_URL}/population/compare`, { districts: ids.join(",") }),

    // Buildings
    getBuildingStock: (type?: string) => apiFetch<any[]>(`${BASE_URL}/buildings/stock`, { type }),
    getBuildingAge: () => apiFetch<any[]>(`${BASE_URL}/buildings/age`),
    getHeatmap: (metric: string) => apiFetch<any[]>(`${BASE_URL}/buildings/heatmap`, { metric }),

    // Weather & Air Quality
    getCurrentWeather: () => apiFetch<any>(`${BASE_URL}/weather/current`),
    getWeatherForecast: () => apiFetch<any>(`${BASE_URL}/weather/forecast`),
    getAqhi: () => apiFetch<any>(`${BASE_URL}/weather/aqhi`),

    // Livability
    getLivabilityScores: () => apiFetch<any[]>(`${BASE_URL}/livability/scores`),

    // Amenities (Schools & Hospitals)
    getSchools: (params?: Record<string, any>) => apiFetch<any[]>(`${BASE_URL}/amenities/schools`, params),
    getHospitals: (params?: Record<string, any>) => apiFetch<any[]>(`${BASE_URL}/amenities/hospitals`, params),
    getNearbyAmenities: (lat: number, lng: number, radius?: number) =>
      apiFetch<any>(`${BASE_URL}/amenities/nearby`, { lat, lng, radius }),
    getAmenitiesSummary: () => apiFetch<any>(`${BASE_URL}/amenities/summary`),

    // Scraper / Admin
    getScraperStatus: () => apiFetch<any>(`${BASE_URL}/scraper/status`),
    runScraper: (listingType?: string, districts?: string) =>
      apiPost<any>("/scraper/run", { listingType, districts }),
    ingestTransport: () => apiPost<any>("/scraper/ingest/transport"),
    ingestPopulation: () => apiPost<any>("/scraper/ingest/population"),
    ingestAmenities: () => apiPost<any>("/scraper/ingest/amenities"),
  };
}
