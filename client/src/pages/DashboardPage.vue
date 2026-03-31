<script setup lang="ts">
import { onMounted, computed, ref } from "vue";
import { useDistrictsStore } from "@/stores/districts";
import { usePropertiesStore } from "@/stores/properties";
import { useApi } from "@/composables/useApi";
import { Bar, Line, Doughnut } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const districtsStore = useDistrictsStore();
const propertiesStore = usePropertiesStore();
const api = useApi();
const scraperStatus = ref<any>(null);
const buildingStock = ref<any[]>([]);
const buildingAge = ref<any[]>([]);
const populationRes = ref<any>(null);

onMounted(async () => {
  await Promise.all([
    districtsStore.fetchAll(),
    propertiesStore.fetchStats(),
    propertiesStore.fetchTrends(),
    api.getScraperStatus().then((d) => (scraperStatus.value = d)),
    api.getBuildingStock("domestic").then((d) => (buildingStock.value = d)),
    api.getBuildingAge().then((d) => (buildingAge.value = d)),
    api.getPopulation().then((d) => (populationRes.value = d)),
  ]);
});

const totalListings = computed(() => scraperStatus.value?.counts?.properties || 0);
const hasPopulation = computed(() => populationRes.value?.data?.length > 0);
const population = computed(() => populationRes.value?.data || []);

// Building stock by district (domestic)
const stockChartData = computed(() => {
  const sorted = [...buildingStock.value].sort((a, b) => (b.stock || 0) - (a.stock || 0));
  return {
    labels: sorted.map((s) => s.district_name),
    datasets: [
      {
        label: "Domestic Units",
        data: sorted.map((s) => s.stock || 0),
        backgroundColor: sorted.map((s) =>
          s.zone_id === "hk_island" ? "#3b82f6" : s.zone_id === "kowloon" ? "#ef4444" : "#22c55e"
        ),
      },
    ],
  };
});

// Building age doughnut (latest year)
const ageChartData = computed(() => {
  const latest = buildingAge.value.find((a) => a.category === "Overall");
  if (!latest) return null;
  return {
    labels: ["Pre-1960", "1960-69", "1970-79", "1980-89", "1990-99", "2000-09", "Post 2009"],
    datasets: [{
      data: [latest.pre_1960, latest.y1960_69, latest.y1970_79, latest.y1980_89, latest.y1990_99, latest.y2000_09, latest.post_2009],
      backgroundColor: ["#1e293b", "#475569", "#64748b", "#94a3b8", "#f59e0b", "#22c55e", "#3b82f6"],
    }],
  };
});

// Price trend from REAL RVD data
const priceChartData = computed(() => {
  const trends = propertiesStore.trends;
  if (!trends.length) return null;
  // Group by quarter, show HK Island Class A as primary line
  const hkA = trends.filter((t) => t.property_class === "A-Hong Kong");
  const klnA = trends.filter((t) => t.property_class === "A-Kowloon");
  const ntA = trends.filter((t) => t.property_class === "A-New Territories");

  // Use every 4th point (yearly) if too many
  const sample = (arr: any[]) => arr.length > 40 ? arr.filter((_: any, i: number) => i % 4 === 0) : arr;

  const hkSampled = sample(hkA);
  return {
    labels: hkSampled.map((t) => t.period),
    datasets: [
      { label: "HK Island (Class A)", data: hkSampled.map((t) => t.price_index), borderColor: "#3b82f6", tension: 0.3, fill: false, pointRadius: 0 },
      { label: "Kowloon (Class A)", data: sample(klnA).map((t) => t.price_index), borderColor: "#ef4444", tension: 0.3, fill: false, pointRadius: 0 },
      { label: "NT (Class A)", data: sample(ntA).map((t) => t.price_index), borderColor: "#22c55e", tension: 0.3, fill: false, pointRadius: 0 },
    ],
  };
});

const stockOptions = {
  responsive: true,
  indexAxis: "y" as const,
  plugins: { legend: { display: false }, title: { display: true, text: "Private Domestic Stock by District (RVD 2024)" } },
};

const priceOptions = {
  responsive: true,
  plugins: { title: { display: true, text: "Avg Price $/sqft by Zone - Class A Domestic (RVD)" } },
  scales: { y: { ticks: { callback: (v: any) => `$${(v / 1000).toFixed(0)}k` } } },
};
</script>

<template>
  <div class="max-w-screen-2xl mx-auto p-4 space-y-6">
    <!-- Stats cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <div class="text-xs text-gray-500 uppercase">Districts</div>
        <div class="text-2xl font-bold text-gray-800">{{ districtsStore.districts.length }}</div>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <div class="text-xs text-gray-500 uppercase">Scraped Listings</div>
        <div class="text-2xl font-bold text-gray-800">{{ totalListings.toLocaleString() }}</div>
        <div v-if="totalListings === 0" class="text-xs text-amber-600">Run scraper to populate</div>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <div class="text-xs text-gray-500 uppercase">Transport Stops</div>
        <div class="text-2xl font-bold text-gray-800">
          {{ ((scraperStatus?.counts?.mtr_stations || 0) + (scraperStatus?.counts?.bus_stops || 0) + (scraperStatus?.counts?.tram_stops || 0)).toLocaleString() }}
        </div>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <div class="text-xs text-gray-500 uppercase">Population</div>
        <div v-if="hasPopulation" class="text-2xl font-bold text-gray-800">
          {{ (population.reduce((s: number, p: any) => s + p.population, 0) / 1000000).toFixed(2) }}M
        </div>
        <div v-else class="text-sm text-gray-400">No data (census API needs browser)</div>
      </div>
    </div>

    <!-- Zone cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="zone in districtsStore.zones" :key="zone.id" class="bg-white rounded-lg p-4 shadow-sm border">
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
            <span class="text-gray-400 ml-1">{{ d.listing_count || 0 }} listings</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <Line v-if="priceChartData" :data="priceChartData" :options="priceOptions" />
        <p v-else class="text-gray-400 text-center py-8">Loading RVD price data...</p>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <Bar v-if="buildingStock.length" :data="stockChartData" :options="stockOptions" />
        <p v-else class="text-gray-400 text-center py-8">Loading building stock data...</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <h3 class="font-semibold text-gray-700 mb-2">Building Age Distribution (RVD)</h3>
        <div v-if="ageChartData" class="max-w-xs mx-auto">
          <Doughnut :data="ageChartData" :options="{ responsive: true, plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 10 } } } } }" />
        </div>
        <p v-else class="text-gray-400 text-center py-8">Loading building age data...</p>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-sm border">
        <h3 class="font-semibold text-gray-700 mb-2">Vacancy Rate by District (RVD 2024)</h3>
        <div v-if="buildingStock.length" class="space-y-1">
          <div v-for="s in [...buildingStock].sort((a, b) => (b.vacancy_rate || 0) - (a.vacancy_rate || 0))" :key="s.district_id" class="flex items-center gap-2">
            <span class="w-24 text-xs text-gray-600 truncate">{{ s.district_name }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-3">
              <div
                class="h-3 rounded-full"
                :class="(s.vacancy_rate || 0) > 5 ? 'bg-red-400' : (s.vacancy_rate || 0) > 2 ? 'bg-amber-400' : 'bg-green-400'"
                :style="{ width: Math.min((s.vacancy_rate || 0) * 8, 100) + '%' }"
              ></div>
            </div>
            <span class="text-xs font-mono w-10 text-right">{{ s.vacancy_rate || '-' }}%</span>
          </div>
        </div>
        <p v-else class="text-gray-400 text-center py-8">Loading...</p>
      </div>
    </div>

    <!-- Data source note -->
    <div class="text-xs text-gray-400 text-center">
      Building & price data from HK Rating & Valuation Department (RVD). Transport data from DATA.GOV.HK APIs.
      <span v-if="!hasPopulation"> Population data not available (census API requires browser session).</span>
    </div>
  </div>
</template>
