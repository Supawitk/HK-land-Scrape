<script setup lang="ts">
import { onMounted, computed, ref } from "vue";
import { useDistrictsStore } from "@/stores/districts";
import { usePropertiesStore } from "@/stores/properties";
import { useApi } from "@/composables/useApi";
import { Bar, Line, Doughnut } from "vue-chartjs";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const districtsStore = useDistrictsStore();
const propertiesStore = usePropertiesStore();
const api = useApi();

const activeTab = ref("overview");
const scraperStatus = ref<any>(null);
const buildingStock = ref<any[]>([]);
const buildingAge = ref<any[]>([]);
const transportSummary = ref<any>(null);
const weather = ref<any>(null);
const aqhi = ref<any>(null);

onMounted(async () => {
  await Promise.all([
    districtsStore.fetchAll(),
    propertiesStore.fetchStats(),
    propertiesStore.fetchTrends(),
    api.getScraperStatus().then((d) => (scraperStatus.value = d)).catch(() => {}),
    api.getBuildingStock("domestic").then((d) => (buildingStock.value = d)).catch(() => {}),
    api.getBuildingAge().then((d) => (buildingAge.value = d)).catch(() => {}),
    api.getTransportSummary().then((d) => (transportSummary.value = d)).catch(() => {}),
    api.getCurrentWeather().then((d) => (weather.value = d)).catch(() => {}),
    api.getAqhi().then((d) => (aqhi.value = d)).catch(() => {}),
  ]);
});

const totalListings = computed(() => scraperStatus.value?.counts?.properties || 0);
const totalTransport = computed(() => {
  if (!transportSummary.value) return 0;
  const s = transportSummary.value;
  return (s.mtr_stations || 0) + (s.bus_stops || 0) + (s.tram_stops || 0) + (s.light_rail_stops || 0) + (s.ferry_piers || 0);
});

// Current temp
const currentTemp = computed(() => {
  if (!weather.value?.temperature?.length) return null;
  const hko = weather.value.temperature.find((t: any) => t.place === "Hong Kong Observatory");
  return hko?.value || weather.value.temperature[0]?.value;
});

const aqhiLevel = computed(() => {
  if (!aqhi.value?.averageAqhi) return null;
  const v = aqhi.value.averageAqhi;
  if (v <= 3) return { value: v, label: "Low", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (v <= 6) return { value: v, label: "Moderate", color: "text-amber-600", bg: "bg-amber-50" };
  if (v <= 7) return { value: v, label: "High", color: "text-orange-600", bg: "bg-orange-50" };
  return { value: v, label: "Very High", color: "text-rose-600", bg: "bg-rose-50" };
});

// Charts
const stockChartData = computed(() => {
  const sorted = [...buildingStock.value].sort((a, b) => (b.stock || 0) - (a.stock || 0));
  return {
    labels: sorted.map((s) => s.district_name),
    datasets: [{ label: "Domestic Units", data: sorted.map((s) => s.stock || 0), backgroundColor: sorted.map((s) => s.zone_id === "hk_island" ? "#6366f1" : s.zone_id === "kowloon" ? "#f43f5e" : "#10b981"), borderRadius: 6 }],
  };
});

const ageChartData = computed(() => {
  const latest = buildingAge.value.find((a) => a.category === "Overall");
  if (!latest) return null;
  return {
    labels: ["Pre-1960", "1960-69", "1970-79", "1980-89", "1990-99", "2000-09", "Post 2009"],
    datasets: [{ data: [latest.pre_1960, latest.y1960_69, latest.y1970_79, latest.y1980_89, latest.y1990_99, latest.y2000_09, latest.post_2009], backgroundColor: ["#1e293b", "#475569", "#64748b", "#94a3b8", "#f59e0b", "#10b981", "#6366f1"], borderWidth: 0 }],
  };
});

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
      { label: "HK Island", data: hkSampled.map((t) => t.price_index), borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)", tension: 0.4, fill: true, pointRadius: 0 },
      { label: "Kowloon", data: sample(klnA).map((t) => t.price_index), borderColor: "#f43f5e", backgroundColor: "transparent", tension: 0.4, fill: false, pointRadius: 0 },
      { label: "N.T.", data: sample(ntA).map((t) => t.price_index), borderColor: "#10b981", backgroundColor: "transparent", tension: 0.4, fill: false, pointRadius: 0 },
    ],
  };
});

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "market", label: "Market Data" },
  { id: "buildings", label: "Buildings" },
];
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto">
    <!-- Header row with weather -->
    <div class="flex items-start justify-between mb-6">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="text-sm text-slate-500 mt-1">Hong Kong property market overview</p>
      </div>
      <!-- Weather + AQHI mini widget -->
      <div class="flex items-center gap-3">
        <div v-if="currentTemp" class="stat-card !p-3 flex items-center gap-2">
          <span class="text-lg">{{ currentTemp }}&deg;C</span>
          <span class="text-xs text-slate-400">HK</span>
        </div>
        <div v-if="aqhiLevel" class="stat-card !p-3 flex items-center gap-2" :class="aqhiLevel.bg">
          <span class="text-sm font-semibold" :class="aqhiLevel.color">AQHI {{ aqhiLevel.value }}</span>
          <span class="text-xs" :class="aqhiLevel.color">{{ aqhiLevel.label }}</span>
        </div>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div class="gradient-card bg-gradient-to-br from-blue-500 to-blue-600">
        <p class="text-xs text-white/70 uppercase tracking-wider">Districts</p>
        <p class="text-2xl font-bold mt-1">{{ districtsStore.districts.length }}</p>
      </div>
      <div class="gradient-card bg-gradient-to-br from-emerald-500 to-teal-600">
        <p class="text-xs text-white/70 uppercase tracking-wider">Listings</p>
        <p class="text-2xl font-bold mt-1">{{ totalListings.toLocaleString() }}</p>
        <p v-if="totalListings === 0" class="text-xs text-white/60 mt-0.5">Run scraper</p>
      </div>
      <div class="gradient-card bg-gradient-to-br from-violet-500 to-purple-600">
        <p class="text-xs text-white/70 uppercase tracking-wider">Transport</p>
        <p class="text-2xl font-bold mt-1">{{ totalTransport.toLocaleString() }}</p>
      </div>
      <div class="gradient-card bg-gradient-to-br from-amber-500 to-orange-600">
        <p class="text-xs text-white/70 uppercase tracking-wider">Schools</p>
        <p class="text-2xl font-bold mt-1">{{ scraperStatus?.counts?.schools?.toLocaleString() || 0 }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 border-b border-slate-200">
      <button
        v-for="tab in tabs" :key="tab.id"
        @click="activeTab = tab.id"
        class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
        :class="activeTab === tab.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab: Overview -->
    <div v-if="activeTab === 'overview'" class="space-y-6">
      <!-- Transport breakdown -->
      <div v-if="transportSummary" class="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <div class="stat-card text-center"><div class="text-xs text-slate-400">MTR</div><div class="text-lg font-bold text-slate-800">{{ transportSummary.mtr_stations }}</div></div>
        <div class="stat-card text-center"><div class="text-xs text-slate-400">Bus Stops</div><div class="text-lg font-bold text-slate-800">{{ transportSummary.bus_stops?.toLocaleString() }}</div></div>
        <div class="stat-card text-center"><div class="text-xs text-slate-400">Routes</div><div class="text-lg font-bold text-slate-800">{{ transportSummary.bus_routes?.toLocaleString() }}</div></div>
        <div class="stat-card text-center"><div class="text-xs text-slate-400">Tram</div><div class="text-lg font-bold text-slate-800">{{ transportSummary.tram_stops }}</div></div>
        <div class="stat-card text-center"><div class="text-xs text-slate-400">Light Rail</div><div class="text-lg font-bold text-slate-800">{{ transportSummary.light_rail_stops }}</div></div>
        <div class="stat-card text-center"><div class="text-xs text-slate-400">Ferry</div><div class="text-lg font-bold text-slate-800">{{ transportSummary.ferry_piers }}</div></div>
      </div>

      <!-- Zone Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="zone in districtsStore.zones" :key="zone.id" class="stat-card">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-3 h-3 rounded-full" :class="{ 'bg-indigo-500': zone.id === 'hk_island', 'bg-rose-500': zone.id === 'kowloon', 'bg-emerald-500': zone.id === 'new_territories' }"></div>
            <h3 class="font-semibold text-slate-800">{{ zone.name_en }}</h3>
            <span class="text-xs text-slate-400">{{ zone.name_zh }}</span>
          </div>
          <div class="space-y-1">
            <RouterLink v-for="d in districtsStore.getDistrictsByZone(zone.id)" :key="d.id" :to="`/district/${d.id}`" class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors group">
              <span class="text-sm text-slate-600 group-hover:text-slate-900">{{ d.name_en }} <span class="text-slate-400">{{ d.name_zh }}</span></span>
              <span class="text-xs text-slate-400">{{ d.listing_count || 0 }}</span>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Market Data -->
    <div v-if="activeTab === 'market'" class="space-y-6">
      <div class="chart-container">
        <h3 class="section-title mb-3">Price Index Trends (Class A Domestic - RVD)</h3>
        <Line v-if="priceChartData" :data="priceChartData" :options="{
          responsive: true, plugins: { legend: { labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } } },
          scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }, y: { grid: { color: '#f1f5f9' } } }
        }" />
        <div v-else class="flex items-center justify-center h-48 text-slate-400 text-sm">Loading price data...</div>
      </div>

      <div class="chart-container">
        <h3 class="section-title mb-3">Vacancy Rate by District (RVD)</h3>
        <div v-if="buildingStock.length" class="space-y-2 max-h-72 overflow-y-auto pr-2">
          <div v-for="s in [...buildingStock].sort((a, b) => (b.vacancy_rate || 0) - (a.vacancy_rate || 0))" :key="s.district_id" class="flex items-center gap-3">
            <span class="w-28 text-xs text-slate-600 truncate flex-shrink-0">{{ s.district_name }}</span>
            <div class="flex-1 bg-slate-100 rounded-full h-2.5">
              <div class="h-2.5 rounded-full transition-all duration-500" :class="(s.vacancy_rate || 0) > 5 ? 'bg-rose-400' : (s.vacancy_rate || 0) > 2 ? 'bg-amber-400' : 'bg-emerald-400'" :style="{ width: Math.min((s.vacancy_rate || 0) * 8, 100) + '%' }"></div>
            </div>
            <span class="text-xs font-mono w-12 text-right text-slate-500">{{ s.vacancy_rate || '-' }}%</span>
          </div>
        </div>
        <div v-else class="flex items-center justify-center h-48 text-slate-400 text-sm">Loading...</div>
      </div>
    </div>

    <!-- Tab: Buildings -->
    <div v-if="activeTab === 'buildings'" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="chart-container">
          <h3 class="section-title mb-3">Domestic Stock by District</h3>
          <Bar v-if="buildingStock.length" :data="stockChartData" :options="{
            responsive: true, indexAxis: 'y' as const,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { grid: { display: false } } }
          }" />
          <div v-else class="flex items-center justify-center h-48 text-slate-400 text-sm">Loading...</div>
        </div>

        <div class="chart-container">
          <h3 class="section-title mb-3">Building Age Distribution</h3>
          <div v-if="ageChartData" class="max-w-[260px] mx-auto">
            <Doughnut :data="ageChartData" :options="{ responsive: true, cutout: '55%', plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 10 }, padding: 10 } } } }" />
          </div>
          <div v-else class="flex items-center justify-center h-48 text-slate-400 text-sm">Loading...</div>
        </div>
      </div>
    </div>

    <div class="text-xs text-slate-400 text-center pt-6 border-t border-slate-100 mt-6">
      Data: HK Rating & Valuation Dept, DATA.GOV.HK, HK Observatory, EPD AQHI
    </div>
  </div>
</template>
