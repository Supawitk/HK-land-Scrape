import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "@/composables/useApi";

export const useTransportStore = defineStore("transport", () => {
  const api = useApi();
  const mtrStations = ref<any[]>([]);
  const mtrLines = ref<any[]>([]);
  const busStops = ref<any[]>([]);
  const tramStops = ref<any[]>([]);
  const lightRailStops = ref<any[]>([]);
  const ferryPiers = ref<any[]>([]);
  const summary = ref<any>(null);
  const loading = ref(false);

  async function fetchMtr() {
    const [stations, lines] = await Promise.all([api.getMtrStations(), api.getMtrLines()]);
    mtrStations.value = stations;
    mtrLines.value = lines;
  }

  async function fetchBusStops(bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
    busStops.value = await api.getBusStops({ ...bounds, limit: 2000 });
  }

  async function fetchTram() {
    tramStops.value = await api.getTramStops();
  }

  async function fetchLightRail() {
    lightRailStops.value = await api.getLightRailStops();
  }

  async function fetchFerry() {
    ferryPiers.value = await api.getFerryPiers();
  }

  async function fetchSummary() {
    summary.value = await api.getTransportSummary();
  }

  async function fetchAll() {
    loading.value = true;
    try {
      await Promise.all([fetchMtr(), fetchTram(), fetchLightRail(), fetchFerry(), fetchSummary()]);
    } finally {
      loading.value = false;
    }
  }

  return {
    mtrStations, mtrLines, busStops, tramStops, lightRailStops, ferryPiers,
    summary, loading,
    fetchMtr, fetchBusStops, fetchTram, fetchLightRail, fetchFerry, fetchSummary, fetchAll,
  };
});
