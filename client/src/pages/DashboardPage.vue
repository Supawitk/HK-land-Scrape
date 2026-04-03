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
const transportSummary = ref<any>(null);

onMounted(async () => {
  await Promise.all([
    districtsStore.fetchAll(),
    propertiesStore.fetchStats(),
    propertiesStore.fetchTrends(),
    api.getScraperStatus().then((d) => (scraperStatus.value = d)),
    api.getBuildingStock("domestic").then((d) => (buildingStock.value = d)),
    api.getBuildingAge().then((d) => (buildingAge.value = d)),
    api.getPopulation().then((d) => (populationRes.value = d)),
    api.getTransportSummary().then((d) => (transportSummary.value = d)),
  ]);
});

const totalListings = computed(() => scraperStatus.value?.counts?.properties || 0);
const hasPopulation = computed(() => populationRes.value?.data?.length > 0);
const population = computed(() => populationRes.value?.data || []);
const totalTransportStops = computed(() => {
  if (!transportSummary.value) return 0;
  const s = transportSummary.value;
  return (s.mtr_stations || 0) + (s.bus_stops || 0) + (s.tram_stops || 0) + (s.light_rail_stops || 0) + (s.ferry_piers || 0);
});

const statCards = computed(() => [
  {
    label: "Districts",
    value: districtsStore.districts.length,
    gradient: "from-blue-500 to-blue-600",
    icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    label: "Listings",
    value: totalListings.value.toLocaleString(),
    gradient: "from-emerald-500 to-teal-600",
    icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    sub: totalListings.value === 0 ? "Run scraper to populate" : undefined,
  },
  {
    label: "Transport Stops",
    value: totalTransportStops.value.toLocaleString(),
    gradient: "from-violet-500 to-purple-600",
    icon: "M8 6v6m7-6v6M2 12h20M6 18h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    label: "Population",
    value: hasPopulation.value
      ? (population.value.reduce((s: number, p: any) => s + p.population, 0) / 1000000).toFixed(2) + "M"
      : "N/A",
    gradient: "from-amber-500 to-orange-600",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197V21",
  },
]);

// Building stock by district (domestic)
const stockChartData = computed(() => {
  const sorted = [...buildingStock.value].sort((a, b) => (b.stock || 0) - (a.stock || 0));
  return {
    labels: sorted.map((s) => s.district_name),
    datasets: [{
      label: "Domestic Units",
      data: sorted.map((s) => s.stock || 0),
      backgroundColor: sorted.map((s) =>
        s.zone_id === "hk_island" ? "#6366f1" : s.zone_id === "kowloon" ? "#f43f5e" : "#10b981"
      ),
      borderRadius: 6,
    }],
  };
});

// Building age doughnut
const ageChartData = computed(() => {
  const latest = buildingAge.value.find((a) => a.category === "Overall");
  if (!latest) return null;
  return {
    labels: ["Pre-1960", "1960-69", "1970-79", "1980-89", "1990-99", "2000-09", "Post 2009"],
    datasets: [{
      data: [latest.pre_1960, latest.y1960_69, latest.y1970_79, latest.y1980_89, latest.y1990_99, latest.y2000_09, latest.post_2009],
      backgroundColor: ["#1e293b", "#475569", "#64748b", "#94a3b8", "#f59e0b", "#10b981", "#6366f1"],
      borderWidth: 0,
    }],
  };
});

// RVD price trends
const priceChartData = computed(() => {
  const trends = propertiesStore.trends;
  if (!trends.length) return null;

  const hkA = trends.filter((t) => t.property_class === "A-Hong Kong");
  const klnA = trends.filter((t) => t.property_class === "A-Kowloon");
  const ntA = trends.filter((t) => t.property_class === "A-New Territories");

  const sample = (arr: any[]) => arr.length > 40 ? arr.filter((_: any, i: number) => i % 4 === 0) : arr;
  const hkSampled = sample(hkA);

  return {
    labels: hkSampled.map((t) => t.period),
    datasets: [
      { label: "HK Island", data: hkSampled.map((t) => t.price_index), borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.1)", tension: 0.4, fill: true, pointRadius: 0 },
      { label: "Kowloon", data: sample(klnA).map((t) => t.price_index), borderColor: "#f43f5e", backgroundColor: "transparent", tension: 0.4, fill: false, pointRadius: 0 },
      { label: "N.T.", data: sample(ntA).map((t) => t.price_index), borderColor: "#10b981", backgroundColor: "transparent", tension: 0.4, fill: false, pointRadius: 0 },
    ],
  };
});

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { labels: { boxWidth: 12, usePointStyle: true, font: { size: 11 } } },
  },
};

const stockOptions = {
  ...chartDefaults,
  indexAxis: "y" as const,
  plugins: { ...chartDefaults.plugins, legend: { display: false }, title: { display: true, text: "Private Domestic Stock by District", font: { size: 13 } } },
  scales: { x: { grid: { display: false } }, y: { grid: { display: false } } },
};

const priceOptions = {
  ...chartDefaults,
  plugins: { ...chartDefaults.plugins, title: { display: true, text: "Price Index Trends (Class A Domestic)", font: { size: 13 } } },
  scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }, y: { grid: { color: "#f1f5f9" } } },
};
</script>

<template>
  <div class="p-6 space-y-6 max-w-screen-2xl mx-auto">
    <!-- Header -->
    <div>
      <h1 class="page-title">Dashboard</h1>
      <p class="text-sm text-slate-500 mt-1">Hong Kong property market overview</p>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="card in statCards" :key="card.label" class="gradient-card" :class="`bg-gradient-to-br ${card.gradient}`">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-medium text-white/70 uppercase tracking-wider">{{ card.label }}</p>
            <p class="text-2xl font-bold mt-1">{{ card.value }}</p>
            <p v-if="card.sub" class="text-xs text-white/60 mt-1">{{ card.sub }}</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path :d="card.icon" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Transport breakdown -->
    <div v-if="transportSummary" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div class="stat-card text-center">
        <div class="text-xs text-slate-500">MTR Stations</div>
        <div class="text-lg font-bold text-slate-800">{{ transportSummary.mtr_stations }}</div>
      </div>
      <div class="stat-card text-center">
        <div class="text-xs text-slate-500">Bus Stops</div>
        <div class="text-lg font-bold text-slate-800">{{ transportSummary.bus_stops?.toLocaleString() }}</div>
      </div>
      <div class="stat-card text-center">
        <div class="text-xs text-slate-500">Bus Routes</div>
        <div class="text-lg font-bold text-slate-800">{{ transportSummary.bus_routes?.toLocaleString() }}</div>
      </div>
      <div class="stat-card text-center">
        <div class="text-xs text-slate-500">Tram Stops</div>
        <div class="text-lg font-bold text-slate-800">{{ transportSummary.tram_stops }}</div>
      </div>
      <div class="stat-card text-center">
        <div class="text-xs text-slate-500">Light Rail</div>
        <div class="text-lg font-bold text-slate-800">{{ transportSummary.light_rail_stops }}</div>
      </div>
      <div class="stat-card text-center">
        <div class="text-xs text-slate-500">Ferry Piers</div>
        <div class="text-lg font-bold text-slate-800">{{ transportSummary.ferry_piers }}</div>
      </div>
    </div>

    <!-- Zone Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="zone in districtsStore.zones" :key="zone.id" class="stat-card">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-3 h-3 rounded-full" :class="{
            'bg-indigo-500': zone.id === 'hk_island',
            'bg-rose-500': zone.id === 'kowloon',
            'bg-emerald-500': zone.id === 'new_territories',
          }"></div>
          <h3 class="font-semibold text-slate-800">{{ zone.name_en }}</h3>
          <span class="text-xs text-slate-400">{{ zone.name_zh }}</span>
        </div>
        <div class="space-y-1.5">
          <RouterLink
            v-for="d in districtsStore.getDistrictsByZone(zone.id)"
            :key="d.id"
            :to="`/district/${d.id}`"
            class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <span class="text-sm text-slate-600 group-hover:text-slate-900">{{ d.name_en }} <span class="text-slate-400">{{ d.name_zh }}</span></span>
            <span class="text-xs text-slate-400">{{ d.listing_count || 0 }}</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Charts Row 1 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="chart-container">
        <Line v-if="priceChartData" :data="priceChartData" :options="priceOptions" />
        <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">Loading price data...</div>
      </div>
      <div class="chart-container">
        <Bar v-if="buildingStock.length" :data="stockChartData" :options="stockOptions" />
        <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">Loading building stock...</div>
      </div>
    </div>

    <!-- Charts Row 2 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="chart-container">
        <h3 class="section-title mb-4">Building Age Distribution</h3>
        <div v-if="ageChartData" class="max-w-[280px] mx-auto">
          <Doughnut :data="ageChartData" :options="{
            responsive: true,
            cutout: '55%',
            plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 10 }, padding: 12 } } }
          }" />
        </div>
        <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
      </div>

      <div class="chart-container">
        <h3 class="section-title mb-4">Vacancy Rate by District</h3>
        <div v-if="buildingStock.length" class="space-y-2 max-h-80 overflow-y-auto">
          <div v-for="s in [...buildingStock].sort((a, b) => (b.vacancy_rate || 0) - (a.vacancy_rate || 0))" :key="s.district_id" class="flex items-center gap-3">
            <span class="w-28 text-xs text-slate-600 truncate flex-shrink-0">{{ s.district_name }}</span>
            <div class="flex-1 bg-slate-100 rounded-full h-2.5">
              <div
                class="h-2.5 rounded-full transition-all duration-500"
                :class="(s.vacancy_rate || 0) > 5 ? 'bg-rose-400' : (s.vacancy_rate || 0) > 2 ? 'bg-amber-400' : 'bg-emerald-400'"
                :style="{ width: Math.min((s.vacancy_rate || 0) * 8, 100) + '%' }"
              ></div>
            </div>
            <span class="text-xs font-mono w-12 text-right text-slate-500">{{ s.vacancy_rate || '-' }}%</span>
          </div>
        </div>
        <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-xs text-slate-400 text-center pt-4 border-t border-slate-100">
      Data from HK Rating & Valuation Department (RVD), DATA.GOV.HK, KMB, CityBus, MTR, NLB
    </div>
  </div>
</template>
