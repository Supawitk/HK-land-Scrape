const BASE_URL = "/api";

async function apiFetch<T>(path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    });
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useApi() {
  return {
    getZones: () => apiFetch<any[]>(`${BASE_URL}/zones`),
    getDistricts: (zoneId?: string) => apiFetch<any[]>(`${BASE_URL}/districts`, { zoneId }),
    getDistrict: (id: string) => apiFetch<any>(`${BASE_URL}/districts/${id}`),
    getProperties: (params?: Record<string, any>) => apiFetch<any>(`${BASE_URL}/properties`, params),
    getPropertyStats: () => apiFetch<any>(`${BASE_URL}/properties/stats`),
    getPropertyTrends: () => apiFetch<any[]>(`${BASE_URL}/properties/trends`),
    getMtrStations: () => apiFetch<any[]>(`${BASE_URL}/transport/mtr/stations`),
    getMtrLines: () => apiFetch<any[]>(`${BASE_URL}/transport/mtr/lines`),
    getBusStops: (params?: Record<string, any>) => apiFetch<any[]>(`${BASE_URL}/transport/bus/stops`, params),
    getTramStops: () => apiFetch<any[]>(`${BASE_URL}/transport/tram/stops`),
    getNearbyTransport: (lat: number, lng: number, radius?: number) =>
      apiFetch<any>(`${BASE_URL}/transport/nearby`, { lat, lng, radius }),
    getPopulation: () => apiFetch<any[]>(`${BASE_URL}/population`),
    getPopulationByDistrict: (id: string) => apiFetch<any[]>(`${BASE_URL}/population/${id}`),
    getScraperStatus: () => apiFetch<any>(`${BASE_URL}/scraper/status`),
    runScraper: (listingType?: string) =>
      fetch(`${BASE_URL}/scraper/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingType }),
      }).then((r) => r.json()),
    ingestTransport: () =>
      fetch(`${BASE_URL}/scraper/ingest/transport`, { method: "POST" }).then((r) => r.json()),
  };
}
