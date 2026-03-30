<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useDistrictsStore } from "@/stores/districts";
import { usePropertiesStore } from "@/stores/properties";
import { useApi } from "@/composables/useApi";
import { ref } from "vue";
import { Bar, Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const districtsStore = useDistrictsStore();
const propertiesStore = usePropertiesStore();
const api = useApi();
const population = ref<any[]>([]);
const scraperStatus = ref<any>(null);

onMounted(async () => {
  await Promise.all([
    districtsStore.fetchAll(),
    propertiesStore.fetchStats(),
    propertiesStore.fetchTrends(),
    api.getPopulation().then((d) => (population.value = d)),
    api.getScraperStatus().then((d) => (scraperStatus.value = d)),
  ]);
});

const totalPop = computed(() => population.value.reduce((s, p) => s + p.population, 0));
const totalListings = computed(() => scraperStatus.value?.counts?.properties || 0);

const populationChartData = computed(() => ({
  labels: population.value.map((p) => p.district_name),
  datasets: [
    {
      label: "Population",
      data: population.value.map((p) => p.population),
      backgroundColor: population.value.map((p) =>
        p.zone_id === "hk_island" ? "#3b82f6" : p.zone_id === "kowloon" ? "#ef4444" : "#22c55e"
      ),
    },
  ],
}));

const populationChartOptions = {
  responsive: true,
  indexAxis: "y" as const,
  plugins: { legend: { display: false }, title: { display: true, text: "Population by District (2023)" } },
  scales: { x: { ticks: { callback: (v: any) => `${(v / 1000).toFixed(0)}k` } } },
};

const priceChartData = computed(() => ({
  labels: propertiesStore.trends.map((t) => t.period),
  datasets: [
    {
      label: "Price Index (1999=100)",
      data: propertiesStore.trends.map((t) => t.price_index),
      borderColor: "#3b82f6",
      backgroundColor: "#3b82f620",
      fill: true,
      tension: 0.3,
    },
  ],
}));

const priceChartOptions = {
  responsive: true,
  plugins: { title: { display: true, text: "HK Private Domestic Price Index" } },
};

const districtStatsChart = computed(() => {
  const stats = propertiesStore.stats?.byDistrict || [];
  return {
    labels: stats.map((s: any) => s.district_name),
    datasets: [
      {
        label: "Total Listings",
        data: stats.map((s: any) => s.total_listings),
        backgroundColor: stats.map((s: any) =>
          s.zone_id === "hk_island" ? "#3b82f6" : s.zone_id === "kowloon" ? "#ef4444" : "#22c55e"
        ),
      },
    ],
  };
});

const districtStatsOptions = {
  responsive: true,
  plugins: { legend: { display: false }, title: { display: true, text: "Listings by District" } },
};
</script>

<template>
  <div class="max-w-screen-2xl mx-auto p-4 space-y-6">
    <!-- Stats cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <div class="text-xs text-gray-500 uppercase">Total Population</div>
        <div class="text-2xl font-bold text-gray-800">{{ (totalPop / 1000000).toFixed(2) }}M</div>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <div class="text-xs text-gray-500 uppercase">Districts</div>
        <div class="text-2xl font-bold text-gray-800">{{ districtsStore.districts.length }}</div>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <div class="text-xs text-gray-500 uppercase">Property Listings</div>
        <div class="text-2xl font-bold text-gray-800">{{ totalListings.toLocaleString() }}</div>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <div class="text-xs text-gray-500 uppercase">Transport Stops</div>
        <div class="text-2xl font-bold text-gray-800">
          {{ ((scraperStatus?.counts?.mtr_stations || 0) + (scraperStatus?.counts?.bus_stops || 0) + (scraperStatus?.counts?.tram_stops || 0)).toLocaleString() }}
        </div>
      </div>
    </div>

    <!-- Zone cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="zone in districtsStore.zones"
        :key="zone.id"
        class="bg-white rounded-lg p-4 shadow-sm border"
      >
        <h3 class="font-semibold text-gray-800">{{ zone.name_en }}</h3>
        <p class="text-sm text-gray-500">{{ zone.name_zh }} &mdash; {{ zone.districtCount }} districts</p>
        <div class="mt-2 space-y-1">
          <RouterLink
            v-for="d in districtsStore.getDistrictsByZone(zone.id)"
            :key="d.id"
            :to="`/district/${d.id}`"
            class="block text-sm text-blue-600 hover:text-blue-800"
          >
            {{ d.name_en }} ({{ d.name_zh }})
            <span v-if="d.population" class="text-gray-400 ml-1">{{ (d.population / 1000).toFixed(0) }}k</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <Line v-if="propertiesStore.trends.length" :data="priceChartData" :options="priceChartOptions" />
        <p v-else class="text-gray-400 text-center py-8">Loading price trends...</p>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <Bar v-if="population.length" :data="populationChartData" :options="populationChartOptions" />
        <p v-else class="text-gray-400 text-center py-8">Loading population data...</p>
      </div>
    </div>

    <div class="bg-white rounded-lg p-4 shadow-sm border">
      <Bar
        v-if="propertiesStore.stats?.byDistrict?.length"
        :data="districtStatsChart"
        :options="districtStatsOptions"
      />
      <p v-else class="text-gray-400 text-center py-8">
        No property data yet. Run the scraper to populate listings.
      </p>
    </div>

    <!-- Legend -->
    <div class="flex gap-6 justify-center text-sm text-gray-600">
      <span><span class="inline-block w-3 h-3 rounded bg-blue-500 mr-1"></span> HK Island</span>
      <span><span class="inline-block w-3 h-3 rounded bg-red-500 mr-1"></span> Kowloon</span>
      <span><span class="inline-block w-3 h-3 rounded bg-green-500 mr-1"></span> New Territories</span>
    </div>
  </div>
</template>
