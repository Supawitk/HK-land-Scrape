<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useDistrictsStore } from "@/stores/districts";
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
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
      label: "Units/sqft",
      data: buildingStock.value.map((s) => s.stock || 0),
      backgroundColor: ["#3b82f6", "#f59e0b", "#22c55e", "#8b5cf6"],
    }],
  };
});

function formatPrice(price: number | null, type: string): string {
  if (!price) return "N/A";
  if (type === "buy") {
    if (price >= 10000000) return `$${(price / 10000000).toFixed(1)}M`;
    return `$${price.toLocaleString()}`;
  }
  return `$${price.toLocaleString()}/mo`;
}
</script>

<template>
  <div class="max-w-screen-xl mx-auto p-4">
    <button @click="router.back()" class="text-sm text-blue-600 hover:underline mb-4">&larr; Back</button>

    <div v-if="loading" class="text-center py-12 text-gray-400">Loading...</div>

    <template v-else-if="district">
      <div class="bg-white rounded-lg p-6 shadow-sm border mb-6">
        <h1 class="text-2xl font-bold text-gray-800">{{ district.name_en }}</h1>
        <p class="text-lg text-gray-500">{{ district.name_zh }} &mdash; {{ district.zone_name }}</p>
        <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div class="text-xs text-gray-500">Area</div>
            <div class="text-lg font-semibold">{{ district.area_km_sq ? district.area_km_sq + ' km²' : 'N/A' }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Listings</div>
            <div class="text-lg font-semibold">{{ district.stats?.total_listings || 0 }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Avg Price (Buy)</div>
            <div class="text-lg font-semibold">
              {{ district.stats?.avg_price ? '$' + Math.round(district.stats.avg_price).toLocaleString() : 'No data' }}
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Avg $/sqft</div>
            <div class="text-lg font-semibold">
              {{ district.stats?.avg_price_per_sqft ? '$' + Math.round(district.stats.avg_price_per_sqft).toLocaleString() : 'No data' }}
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Building stock -->
        <div class="bg-white rounded-lg p-4 shadow-sm border">
          <h2 class="font-semibold text-gray-700 mb-3">Building Stock (RVD 2024)</h2>
          <Bar v-if="stockChart" :data="stockChart" :options="{ responsive: true, plugins: { legend: { display: false } } }" />
          <div v-if="buildingStock.length" class="mt-3 space-y-1 text-sm">
            <div v-for="s in buildingStock" :key="s.property_type" class="flex justify-between">
              <span class="text-gray-600 capitalize">{{ s.property_type }}</span>
              <span>
                {{ s.stock?.toLocaleString() || 'N/A' }} units
                <span v-if="s.vacancy_rate" class="text-gray-400">({{ s.vacancy_rate }}% vacant)</span>
              </span>
            </div>
          </div>
          <p v-else class="text-gray-400 text-sm">No building stock data for this district.</p>
        </div>

        <!-- Nearby transport -->
        <div class="bg-white rounded-lg p-4 shadow-sm border">
          <h2 class="font-semibold text-gray-700 mb-3">Nearby Transport</h2>
          <div v-if="nearby" class="space-y-3">
            <div v-if="nearby.mtrStations?.length">
              <div class="text-xs text-gray-500 uppercase">MTR Stations</div>
              <div v-for="s in nearby.mtrStations" :key="s.id" class="text-sm">
                🚇 {{ s.name_en }} ({{ s.name_zh }})
              </div>
            </div>
            <div v-if="nearby.tramStops?.length">
              <div class="text-xs text-gray-500 uppercase mt-2">Tram Stops</div>
              <div v-for="s in nearby.tramStops" :key="s.id" class="text-sm">
                🚃 {{ s.name_en }}
              </div>
            </div>
            <div v-if="nearby.busStops?.length">
              <div class="text-xs text-gray-500 uppercase mt-2">Bus Stops (within 2km)</div>
              <div class="text-sm text-gray-600">{{ nearby.busStops.length }} stops</div>
            </div>
            <div v-if="!nearby.mtrStations?.length && !nearby.tramStops?.length && !nearby.busStops?.length">
              <p class="text-gray-400 text-sm">No transport data ingested yet.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent properties -->
      <div class="bg-white rounded-lg p-4 shadow-sm border mt-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-gray-700">Recent Properties</h2>
          <RouterLink :to="{ path: '/properties', query: { districtId: district.id } }" class="text-sm text-blue-600 hover:underline">
            View all →
          </RouterLink>
        </div>
        <div v-if="properties.length" class="space-y-2">
          <div v-for="p in properties" :key="p.id" class="flex justify-between items-center py-2 border-b last:border-0">
            <div>
              <div class="font-medium text-sm">{{ p.estate_name || 'Property' }}</div>
              <div class="text-xs text-gray-500">
                {{ p.area_usable ? p.area_usable + ' sqft' : '' }}
                {{ p.bedrooms !== null ? '· ' + p.bedrooms + ' bed' : '' }}
              </div>
            </div>
            <div class="text-sm font-semibold text-blue-700">
              {{ formatPrice(p.price, p.listing_type) }}
            </div>
          </div>
        </div>
        <p v-else class="text-gray-400 text-sm">No properties scraped yet. Run the scraper to populate data.</p>
      </div>
    </template>
  </div>
</template>
