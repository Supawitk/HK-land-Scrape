import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { useApi } from "@/composables/useApi";

export const usePropertiesStore = defineStore("properties", () => {
  const api = useApi();
  const properties = ref<any[]>([]);
  const stats = ref<any>(null);
  const trends = ref<any[]>([]);
  const total = ref(0);
  const page = ref(1);
  const totalPages = ref(0);
  const loading = ref(false);

  const filters = reactive({
    listingType: "" as string,
    districtId: "" as string,
    zoneId: "" as string,
    priceMin: "" as string,
    priceMax: "" as string,
    areaMin: "" as string,
    areaMax: "" as string,
    bedrooms: "" as string,
    sortBy: "date" as string,
    sortOrder: "desc" as string,
  });

  async function fetchProperties(p = 1) {
    loading.value = true;
    try {
      const res = await api.getProperties({
        ...filters,
        page: p,
        limit: 20,
      });
      properties.value = res.data;
      total.value = res.total;
      page.value = res.page;
      totalPages.value = res.totalPages;
    } finally {
      loading.value = false;
    }
  }

  async function fetchStats() {
    stats.value = await api.getPropertyStats();
  }

  async function fetchTrends() {
    trends.value = await api.getPropertyTrends();
  }

  return { properties, stats, trends, total, page, totalPages, loading, filters, fetchProperties, fetchStats, fetchTrends };
});
