import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "@/composables/useApi";

export const useTransportStore = defineStore("transport", () => {
  const api = useApi();
  const mtrStations = ref<any[]>([]);
  const mtrLines = ref<any[]>([]);
  const busStops = ref<any[]>([]);
  const tramStops = ref<any[]>([]);
  const loading = ref(false);

  async function fetchMtr() {
    const [stations, lines] = await Promise.all([api.getMtrStations(), api.getMtrLines()]);
    mtrStations.value = stations;
    mtrLines.value = lines;
  }

  async function fetchBusStops(bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
    busStops.value = await api.getBusStops(bounds);
  }

  async function fetchTram() {
    tramStops.value = await api.getTramStops();
  }

  async function fetchAll() {
    loading.value = true;
    try {
      await Promise.all([fetchMtr(), fetchTram()]);
    } finally {
      loading.value = false;
    }
  }

  return { mtrStations, mtrLines, busStops, tramStops, loading, fetchMtr, fetchBusStops, fetchTram, fetchAll };
});
