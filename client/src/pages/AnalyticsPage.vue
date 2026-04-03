<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApi } from "@/composables/useApi";
import { useDistrictsStore } from "@/stores/districts";
import { Bar, Line, Doughnut } from "vue-chartjs";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const api = useApi();
const districtsStore = useDistrictsStore();
const propertyStats = ref<any>(null);
const buildingStock = ref<any[]>([]);
const buildingAge = ref<any[]>([]);
const population = ref<any[]>([]);
const selectedZone = ref("");
const comparisonDistricts = ref<string[]>([]);

onMounted(async () => {
  await Promise.all([
    districtsStore.fetchAll(),
    api.getPropertyStats().then((d) => (propertyStats.value = d)),
    api.getBuildingStock().then((d) => (buildingStock.value = d)),
    api.getBuildingAge().then((d) => (buildingAge.value = d)),
    api.getPopulation().then((d) => (population.value = d.data || [])),
  ]);
});

// Listings by district
const listingsByDistrict = computed(() => {
  const data = propertyStats.value?.byDistrict || [];
  const sorted = [...data].sort((a, b) => b.total_listings - a.total_listings);
  return {
    labels: sorted.map((d: any) => d.district_name),
    datasets: [{
      label: "Listings",
      data: sorted.map((d: any) => d.total_listings),
      backgroundColor: sorted.map((d: any) =>
        d.zone_id === "hk_island" ? "#6366f1" : d.zone_id === "kowloon" ? "#f43f5e" : "#10b981"
      ),
      borderRadius: 6,
    }],
  };
});

// Price comparison
const priceComparison = computed(() => {
  const data = propertyStats.value?.byDistrict || [];
  const filtered = data.filter((d: any) => d.avg_price_per_sqft > 0);
  const sorted = [...filtered].sort((a, b) => b.avg_price_per_sqft - a.avg_price_per_sqft);
  return {
    labels: sorted.map((d: any) => d.district_name),
    datasets: [{
      label: "Avg $/sqft",
      data: sorted.map((d: any) => Math.round(d.avg_price_per_sqft)),
      backgroundColor: sorted.map((d: any) =>
        d.zone_id === "hk_island" ? "rgba(99,102,241,0.7)" : d.zone_id === "kowloon" ? "rgba(244,63,94,0.7)" : "rgba(16,185,129,0.7)"
      ),
      borderRadius: 6,
    }],
  };
});

// Population by district
const populationChart = computed(() => {
  if (!population.value.length) return null;
  const sorted = [...population.value].sort((a, b) => b.population - a.population);
  return {
    labels: sorted.map((d) => d.district_name),
    datasets: [{
      label: "Population",
      data: sorted.map((d) => d.population),
      backgroundColor: sorted.map((d: any) =>
        d.zone_id === "hk_island" ? "#818cf8" : d.zone_id === "kowloon" ? "#fb7185" : "#34d399"
      ),
      borderRadius: 6,
    }],
  };
});

// Population density
const densityChart = computed(() => {
  if (!population.value.length) return null;
  const withDensity = population.value.filter((d) => d.density && d.density > 0);
  const sorted = [...withDensity].sort((a, b) => b.density - a.density);
  return {
    labels: sorted.map((d) => d.district_name),
    datasets: [{
      label: "People/km\u00B2",
      data: sorted.map((d) => d.density),
      backgroundColor: sorted.map((d: any) =>
        d.zone_id === "hk_island" ? "rgba(99,102,241,0.6)" : d.zone_id === "kowloon" ? "rgba(244,63,94,0.6)" : "rgba(16,185,129,0.6)"
      ),
      borderRadius: 6,
    }],
  };
});

// Stock by type across all districts
const stockByType = computed(() => {
  const types = ["domestic", "office", "commercial", "factory"];
  const totals = types.map((t) => {
    return buildingStock.value
      .filter((s) => s.property_type === t)
      .reduce((sum, s) => sum + (s.stock || 0), 0);
  });
  return {
    labels: ["Domestic", "Office", "Commercial", "Factory"],
    datasets: [{
      data: totals,
      backgroundColor: ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6"],
      borderWidth: 0,
    }],
  };
});

// Age distribution over time
const ageOverTime = computed(() => {
  const overall = buildingAge.value.filter((a) => a.category === "Overall").sort((a, b) => a.year - b.year);
  if (!overall.length) return null;
  const recent = overall.slice(-10);
  return {
    labels: recent.map((a) => String(a.year)),
    datasets: [
      { label: "Pre-1960", data: recent.map((a) => a.pre_1960), borderColor: "#1e293b", backgroundColor: "transparent", tension: 0.3, pointRadius: 2 },
      { label: "1980-89", data: recent.map((a) => a.y1980_89), borderColor: "#94a3b8", backgroundColor: "transparent", tension: 0.3, pointRadius: 2 },
      { label: "2000-09", data: recent.map((a) => a.y2000_09), borderColor: "#10b981", backgroundColor: "transparent", tension: 0.3, pointRadius: 2 },
      { label: "Post 2009", data: recent.map((a) => a.post_2009), borderColor: "#6366f1", backgroundColor: "transparent", tension: 0.3, pointRadius: 2 },
    ],
  };
});

const barOptions = {
  responsive: true,
  indexAxis: "y" as const,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false } }, y: { grid: { display: false } } },
};

const lineOptions = {
  responsive: true,
  plugins: { legend: { labels: { boxWidth: 10, usePointStyle: true, font: { size: 10 } } } },
  scales: { x: { grid: { display: false } }, y: { grid: { color: "#f1f5f9" } } },
};
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <h1 class="page-title">Analytics</h1>
      <p class="text-sm text-slate-500 mt-1">Detailed analysis of Hong Kong property market data</p>
    </div>

    <!-- Overall Stats -->
    <div v-if="propertyStats" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="text-[10px] font-medium text-slate-400 uppercase">Total Listings</div>
        <div class="text-xl font-bold text-slate-800">{{ propertyStats.overall?.total?.toLocaleString() || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="text-[10px] font-medium text-slate-400 uppercase">For Sale</div>
        <div class="text-xl font-bold text-emerald-600">{{ propertyStats.overall?.buy_count?.toLocaleString() || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="text-[10px] font-medium text-slate-400 uppercase">For Rent</div>
        <div class="text-xl font-bold text-purple-600">{{ propertyStats.overall?.rent_count?.toLocaleString() || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="text-[10px] font-medium text-slate-400 uppercase">Avg Price</div>
        <div class="text-xl font-bold text-indigo-600">
          {{ propertyStats.overall?.avg_price ? 'HK$' + Math.round(propertyStats.overall.avg_price / 1000000).toLocaleString() + 'M' : 'N/A' }}
        </div>
      </div>
    </div>

    <!-- Charts Row 1: Listings & Price -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="chart-container">
        <h3 class="section-title mb-4">Listings by District</h3>
        <Bar v-if="propertyStats?.byDistrict?.length" :data="listingsByDistrict" :options="barOptions" />
        <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">No listing data. Run scraper first.</div>
      </div>
      <div class="chart-container">
        <h3 class="section-title mb-4">Avg Price per sqft by District</h3>
        <Bar v-if="propertyStats?.byDistrict?.some((d: any) => d.avg_price_per_sqft > 0)" :data="priceComparison" :options="barOptions" />
        <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">No price data available</div>
      </div>
    </div>

    <!-- Charts Row 2: Population -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="chart-container">
        <h3 class="section-title mb-4">Population by District</h3>
        <Bar v-if="populationChart" :data="populationChart" :options="barOptions" />
        <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">No population data available</div>
      </div>
      <div class="chart-container">
        <h3 class="section-title mb-4">Population Density (People/km²)</h3>
        <Bar v-if="densityChart" :data="densityChart" :options="barOptions" />
        <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">No population data available</div>
      </div>
    </div>

    <!-- Charts Row 3: Building Data -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="chart-container">
        <h3 class="section-title mb-4">Building Stock by Type</h3>
        <div class="max-w-[280px] mx-auto">
          <Doughnut v-if="buildingStock.length" :data="stockByType" :options="{
            responsive: true,
            cutout: '55%',
            plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 11 }, padding: 12 } } }
          }" />
        </div>
        <div v-if="!buildingStock.length" class="flex items-center justify-center h-64 text-slate-400 text-sm">Loading...</div>
      </div>
      <div class="chart-container">
        <h3 class="section-title mb-4">Building Age Trend</h3>
        <Line v-if="ageOverTime" :data="ageOverTime" :options="lineOptions" />
        <div v-else class="flex items-center justify-center h-64 text-slate-400 text-sm">No building age data</div>
      </div>
    </div>

    <!-- Zone Legend -->
    <div class="flex items-center justify-center gap-6 text-xs text-slate-400">
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-indigo-500"></span> HK Island</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-rose-500"></span> Kowloon</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-emerald-500"></span> New Territories</span>
    </div>
  </div>
</template>
