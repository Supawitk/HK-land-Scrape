import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "@/composables/useApi";

export const useDistrictsStore = defineStore("districts", () => {
  const api = useApi();
  const zones = ref<any[]>([]);
  const districts = ref<any[]>([]);
  const loading = ref(false);
  const selectedDistrictId = ref<string | null>(null);

  async function fetchAll() {
    loading.value = true;
    try {
      const [z, d] = await Promise.all([api.getZones(), api.getDistricts()]);
      zones.value = z;
      districts.value = d;
    } finally {
      loading.value = false;
    }
  }

  function getDistrictsByZone(zoneId: string) {
    return districts.value.filter((d) => d.zone_id === zoneId);
  }

  function getDistrictById(id: string) {
    return districts.value.find((d) => d.id === id);
  }

  return { zones, districts, loading, selectedDistrictId, fetchAll, getDistrictsByZone, getDistrictById };
});
