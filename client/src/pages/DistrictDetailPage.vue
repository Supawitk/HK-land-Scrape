<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useDistrictsStore } from "@/stores/districts";
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const route = useRoute();
const router = useRouter();
const api = useApi();
const districtsStore = useDistrictsStore();

const district = ref<any>(null);
const properties = ref<any[]>([]);
const nearby = ref<any>(null);
const buildingStock = ref<any[]>([]);
const loading = ref(true);

async function loadDistrict() {
  loading.value = true;
  const id = route.params.id as string;
  try {
    await districtsStore.fetchAll();
    const [d, props, stock] = await Promise.all([
      api.getDistrict(id),
      api.getProperties({ districtId: id, limit: 10 }),
      api.getBuildingStock().then((all) => all.filter((s: any) => s.district_id === id)),
    ]);
    district.value = d;
    properties.value = props.data;
    buildingStock.value = stock;

    if (d.centroid_lat && d.centroid_lng) {
      nearby.value = await api.getNearbyTransport(d.centroid_lat, d.centroid_lng, 2);
    }
  } finally {
    loading.value = false;
  }
}

watch(() => route.params.id, loadDistrict);
onMounted(loadDistrict);

const stockChart = computed(() => {
  if (!buildingStock.value.length) return null;
  return {
    labels: buildingStock.value.map((s) => s.property_type.charAt(0).toUpperCase() + s.property_type.slice(1)),
    datasets: [{
      label: "Units",
      data: buildingStock.value.map((s) => s.stock || 0),
      backgroundColor: ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6"],
      borderRadius: 8,
    }],
  };
});

const zoneColor = computed(() => {
  if (!district.value) return "bg-slate-500";
  const z = district.value.zone_id || districtsStore.getDistrictById(route.params.id as string)?.zone_id;
  return z === "hk_island" ? "bg-indigo-500" : z === "kowloon" ? "bg-rose-500" : "bg-emerald-500";
});

function formatPrice(price: number | null, type: string): string {
  if (!price) return "N/A";
  if (type === "buy") {
    if (price >= 10000000) return `HK$${(price / 1000000).toFixed(1)}M`;
    return `HK$${price.toLocaleString()}`;
  }
  return `HK$${price.toLocaleString()}/mo`;
}
</script>

<template>
  <div class="p-6 max-w-screen-xl mx-auto">
    <!-- Back -->
    <button @click="router.back()" class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
      Back
    </button>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <div class="text-slate-400 text-sm">Loading district data...</div>
    </div>

    <template v-else-if="district">
      <!-- District Header -->
      <div class="stat-card mb-6">
        <div class="flex items-start gap-4">
          <div :class="zoneColor" class="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span class="text-white font-bold text-lg">{{ district.id }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold text-slate-800">{{ district.name_en }}</h1>
            <p class="text-slate-500">{{ district.name_zh }} &mdash; {{ district.zone_name }}</p>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div class="text-[10px] font-medium text-slate-400 uppercase">Area</div>
            <div class="text-lg font-semibold text-slate-800">{{ district.area_km_sq ? district.area_km_sq + ' km\u00B2' : 'N/A' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-medium text-slate-400 uppercase">Listings</div>
            <div class="text-lg font-semibold text-slate-800">{{ district.stats?.total_listings || 0 }}</div>
          </div>
          <div>
            <div class="text-[10px] font-medium text-slate-400 uppercase">For Sale</div>
            <div class="text-lg font-semibold text-emerald-600">{{ district.stats?.buy_count || 0 }}</div>
          </div>
          <div>
            <div class="text-[10px] font-medium text-slate-400 uppercase">For Rent</div>
            <div class="text-lg font-semibold text-purple-600">{{ district.stats?.rent_count || 0 }}</div>
          </div>
          <div>
            <div class="text-[10px] font-medium text-slate-400 uppercase">Avg $/sqft</div>
            <div class="text-lg font-semibold text-indigo-600">
              {{ district.stats?.avg_price_per_sqft ? '$' + Math.round(district.stats.avg_price_per_sqft).toLocaleString() : 'N/A' }}
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Building Stock Chart -->
        <div class="chart-container">
          <h2 class="section-title mb-4">Building Stock (RVD)</h2>
          <Bar v-if="stockChart" :data="stockChart" :options="{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' } } } }" />
          <div v-if="buildingStock.length" class="mt-4 space-y-2">
            <div v-for="s in buildingStock" :key="s.property_type" class="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
              <span class="text-sm text-slate-600 capitalize">{{ s.property_type }}</span>
              <span class="text-sm">
                <span class="font-medium text-slate-800">{{ s.stock?.toLocaleString() || 'N/A' }}</span> units
                <span v-if="s.vacancy_rate" class="text-slate-400 ml-1">({{ s.vacancy_rate }}% vacant)</span>
              </span>
            </div>
          </div>
          <p v-else class="text-slate-400 text-sm py-8 text-center">No building stock data</p>
        </div>

        <!-- Nearby Transport -->
        <div class="stat-card">
          <h2 class="section-title mb-4">Nearby Transport</h2>
          <div v-if="nearby" class="space-y-4">
            <div v-if="nearby.mtrStations?.length">
              <div class="text-[10px] font-medium text-slate-400 uppercase mb-1.5">MTR Stations</div>
              <div v-for="s in nearby.mtrStations" :key="s.id" class="flex items-center gap-2 py-1.5">
                <div class="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <svg class="w-3.5 h-3.5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6v6m7-6v6M2 12h20M6 18h12" /></svg>
                </div>
                <span class="text-sm text-slate-700">{{ s.name_en }}</span>
                <span class="text-xs text-slate-400">{{ s.name_zh }}</span>
              </div>
            </div>

            <div v-if="nearby.tramStops?.length">
              <div class="text-[10px] font-medium text-slate-400 uppercase mb-1.5">Tram Stops</div>
              <div v-for="s in nearby.tramStops" :key="s.id" class="flex items-center gap-2 py-1.5">
                <div class="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg class="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="16" rx="2" /><path d="M8 22h8m-4-3v3" /></svg>
                </div>
                <span class="text-sm text-slate-700">{{ s.name_en }}</span>
              </div>
            </div>

            <div v-if="nearby.lightRailStops?.length">
              <div class="text-[10px] font-medium text-slate-400 uppercase mb-1.5">Light Rail</div>
              <div v-for="s in nearby.lightRailStops" :key="s.id" class="flex items-center gap-2 py-1.5">
                <div class="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                  <svg class="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="16" rx="2" /></svg>
                </div>
                <span class="text-sm text-slate-700">{{ s.name_en }}</span>
              </div>
            </div>

            <div v-if="nearby.ferryPiers?.length">
              <div class="text-[10px] font-medium text-slate-400 uppercase mb-1.5">Ferry Piers</div>
              <div v-for="s in nearby.ferryPiers" :key="s.id" class="flex items-center gap-2 py-1.5">
                <div class="w-6 h-6 rounded-lg bg-sky-100 flex items-center justify-center">
                  <svg class="w-3.5 h-3.5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20M4 16l2-8h12l2 8" /></svg>
                </div>
                <span class="text-sm text-slate-700">{{ s.name_en }}</span>
              </div>
            </div>

            <div v-if="nearby.busStops?.length">
              <div class="text-[10px] font-medium text-slate-400 uppercase mb-1.5">Bus Stops (within 2km)</div>
              <p class="text-sm text-slate-600">{{ nearby.busStops.length }} stops nearby</p>
            </div>

            <div v-if="!nearby.mtrStations?.length && !nearby.tramStops?.length && !nearby.busStops?.length && !nearby.lightRailStops?.length && !nearby.ferryPiers?.length">
              <p class="text-slate-400 text-sm">No transport data. Run ingestion first.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Properties -->
      <div class="stat-card mt-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="section-title">Recent Properties</h2>
          <RouterLink :to="{ path: '/properties', query: { districtId: district.id } }" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            View all &rarr;
          </RouterLink>
        </div>
        <div v-if="properties.length" class="divide-y divide-slate-50">
          <div v-for="p in properties" :key="p.id" class="flex justify-between items-center py-3">
            <div class="min-w-0">
              <div class="font-medium text-sm text-slate-800 truncate">{{ p.estate_name || 'Property' }}</div>
              <div class="text-xs text-slate-400 flex gap-2 mt-0.5">
                <span v-if="p.area_usable">{{ p.area_usable }} sqft</span>
                <span v-if="p.bedrooms !== null">{{ p.bedrooms }} bed</span>
              </div>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <span class="badge" :class="p.listing_type === 'buy' ? 'badge-green' : 'badge-purple'">
                {{ p.listing_type === 'buy' ? 'Sale' : 'Rent' }}
              </span>
              <span class="text-sm font-semibold text-indigo-600">{{ formatPrice(p.price, p.listing_type) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-slate-400 text-sm text-center py-8">No properties scraped yet.</p>
      </div>
    </template>
  </div>
</template>
