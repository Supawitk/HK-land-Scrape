<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApi } from "@/composables/useApi";
import { useDistrictsStore } from "@/stores/districts";
import { Bar, Doughnut } from "vue-chartjs";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const api = useApi();
const districtsStore = useDistrictsStore();
const activeTab = ref("property");
const propertyStats = ref<any>(null);
const buildingStock = ref<any[]>([]);
const population = ref<any[]>([]);
const livability = ref<any[]>([]);

onMounted(async () => {
  await Promise.all([
    districtsStore.fetchAll(),
    api.getPropertyStats().then((d) => (propertyStats.value = d)).catch(() => {}),
    api.getBuildingStock().then((d) => (buildingStock.value = d)).catch(() => {}),
    api.getPopulation().then((d) => (population.value = d.data || [])).catch(() => {}),
    api.getLivabilityScores().then((d) => (livability.value = d)).catch(() => {}),
  ]);
});

const barOptions = {
  responsive: true, indexAxis: "y" as const,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false } }, y: { grid: { display: false } } },
};

// Property charts
const listingsByDistrict = computed(() => {
  const data = propertyStats.value?.byDistrict || [];
  const sorted = [...data].sort((a, b) => b.total_listings - a.total_listings);
  return {
    labels: sorted.map((d: any) => d.district_name),
    datasets: [{ label: "Listings", data: sorted.map((d: any) => d.total_listings), backgroundColor: sorted.map((d: any) => d.zone_id === "hk_island" ? "#6366f1" : d.zone_id === "kowloon" ? "#f43f5e" : "#10b981"), borderRadius: 6 }],
  };
});

const priceComparison = computed(() => {
  const data = (propertyStats.value?.byDistrict || []).filter((d: any) => d.avg_price_per_sqft > 0);
  const sorted = [...data].sort((a, b) => b.avg_price_per_sqft - a.avg_price_per_sqft);
  return {
    labels: sorted.map((d: any) => d.district_name),
    datasets: [{ label: "$/sqft", data: sorted.map((d: any) => Math.round(d.avg_price_per_sqft)), backgroundColor: sorted.map((d: any) => d.zone_id === "hk_island" ? "rgba(99,102,241,0.7)" : d.zone_id === "kowloon" ? "rgba(244,63,94,0.7)" : "rgba(16,185,129,0.7)"), borderRadius: 6 }],
  };
});

// Population charts
const populationChart = computed(() => {
  if (!population.value.length) return null;
  const sorted = [...population.value].sort((a, b) => b.population - a.population);
  return {
    labels: sorted.map((d) => d.district_name),
    datasets: [{ label: "Population", data: sorted.map((d) => d.population), backgroundColor: sorted.map((d: any) => d.zone_id === "hk_island" ? "#818cf8" : d.zone_id === "kowloon" ? "#fb7185" : "#34d399"), borderRadius: 6 }],
  };
});

const densityChart = computed(() => {
  if (!population.value.length) return null;
  const withDensity = population.value.filter((d) => d.density && d.density > 0);
  const sorted = [...withDensity].sort((a, b) => b.density - a.density);
  return {
    labels: sorted.map((d) => d.district_name),
    datasets: [{ label: "People/km\u00B2", data: sorted.map((d) => d.density), backgroundColor: sorted.map((d: any) => d.zone_id === "hk_island" ? "rgba(99,102,241,0.6)" : d.zone_id === "kowloon" ? "rgba(244,63,94,0.6)" : "rgba(16,185,129,0.6)"), borderRadius: 6 }],
  };
});

// Stock by type
const stockByType = computed(() => {
  const types = ["domestic", "office", "commercial", "factory"];
  const totals = types.map((t) => buildingStock.value.filter((s) => s.property_type === t).reduce((sum, s) => sum + (s.stock || 0), 0));
  return { labels: ["Domestic", "Office", "Commercial", "Factory"], datasets: [{ data: totals, backgroundColor: ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6"], borderWidth: 0 }] };
});

const tabs = [
  { id: "property", label: "Property" },
  { id: "population", label: "Population" },
  { id: "livability", label: "Livability" },
];

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

function scoreBg(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto">
    <div class="mb-6">
      <h1 class="page-title">Analytics</h1>
      <p class="text-sm text-slate-500 mt-1">Detailed analysis of Hong Kong property market</p>
    </div>

    <!-- Overall Stats -->
    <div v-if="propertyStats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="stat-card"><div class="text-[10px] font-medium text-slate-400 uppercase">Total Listings</div><div class="text-xl font-bold text-slate-800">{{ propertyStats.overall?.total?.toLocaleString() || 0 }}</div></div>
      <div class="stat-card"><div class="text-[10px] font-medium text-slate-400 uppercase">For Sale</div><div class="text-xl font-bold text-emerald-600">{{ propertyStats.overall?.buy_count?.toLocaleString() || 0 }}</div></div>
      <div class="stat-card"><div class="text-[10px] font-medium text-slate-400 uppercase">For Rent</div><div class="text-xl font-bold text-purple-600">{{ propertyStats.overall?.rent_count?.toLocaleString() || 0 }}</div></div>
      <div class="stat-card"><div class="text-[10px] font-medium text-slate-400 uppercase">Avg Price</div><div class="text-xl font-bold text-indigo-600">{{ propertyStats.overall?.avg_price ? 'HK$' + Math.round(propertyStats.overall.avg_price / 1000000) + 'M' : 'N/A' }}</div></div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 border-b border-slate-200">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
        class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
        :class="activeTab === tab.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'">
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab: Property -->
    <div v-if="activeTab === 'property'" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="chart-container">
          <h3 class="section-title mb-3">Listings by District</h3>
          <Bar v-if="propertyStats?.byDistrict?.length" :data="listingsByDistrict" :options="barOptions" />
          <div v-else class="flex items-center justify-center h-48 text-slate-400 text-sm">No data. Run scraper first.</div>
        </div>
        <div class="chart-container">
          <h3 class="section-title mb-3">Avg Price/sqft by District</h3>
          <Bar v-if="propertyStats?.byDistrict?.some((d: any) => d.avg_price_per_sqft > 0)" :data="priceComparison" :options="barOptions" />
          <div v-else class="flex items-center justify-center h-48 text-slate-400 text-sm">No price data</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="chart-container">
          <h3 class="section-title mb-3">Building Stock by Type</h3>
          <div class="max-w-[260px] mx-auto">
            <Doughnut v-if="buildingStock.length" :data="stockByType" :options="{ responsive: true, cutout: '55%', plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 11 }, padding: 12 } } } }" />
          </div>
        </div>
        <div class="chart-container">
          <h3 class="section-title mb-3">Buy vs Rent by District</h3>
          <div v-if="propertyStats?.byDistrict?.length" class="space-y-2 max-h-72 overflow-y-auto pr-2">
            <div v-for="d in propertyStats.byDistrict" :key="d.district_id" class="flex items-center gap-2">
              <span class="w-24 text-xs text-slate-600 truncate flex-shrink-0">{{ d.district_name }}</span>
              <div class="flex-1 flex h-4 rounded-lg overflow-hidden bg-slate-100">
                <div class="bg-emerald-400" :style="{ width: (d.buy_count / (d.total_listings || 1) * 100) + '%' }"></div>
                <div class="bg-purple-400" :style="{ width: (d.rent_count / (d.total_listings || 1) * 100) + '%' }"></div>
              </div>
              <span class="text-xs text-slate-400 w-16 text-right">{{ d.total_listings }}</span>
            </div>
          </div>
          <div v-else class="flex items-center justify-center h-48 text-slate-400 text-sm">No data</div>
        </div>
      </div>
    </div>

    <!-- Tab: Population -->
    <div v-if="activeTab === 'population'" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="chart-container">
          <h3 class="section-title mb-3">Population by District</h3>
          <Bar v-if="populationChart" :data="populationChart" :options="barOptions" />
          <div v-else class="flex items-center justify-center h-48 text-slate-400 text-sm">No population data. Run ingestion.</div>
        </div>
        <div class="chart-container">
          <h3 class="section-title mb-3">Population Density (People/km&sup2;)</h3>
          <Bar v-if="densityChart" :data="densityChart" :options="barOptions" />
          <div v-else class="flex items-center justify-center h-48 text-slate-400 text-sm">No data</div>
        </div>
      </div>
    </div>

    <!-- Tab: Livability -->
    <div v-if="activeTab === 'livability'" class="space-y-6">
      <p class="text-sm text-slate-500">Composite livability score based on transport accessibility, affordability, space, and amenities (schools & hospitals).</p>

      <div v-if="livability.length" class="space-y-3">
        <div v-for="(d, i) in livability" :key="d.id" class="stat-card flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" :class="scoreBg(d.scores.total)">
            {{ i + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-slate-800">{{ d.name }}</span>
              <span class="text-2xl font-bold" :class="scoreColor(d.scores.total)">{{ d.scores.total }}</span>
              <span class="text-xs text-slate-400">/100</span>
            </div>
            <div class="flex gap-4 mt-1.5 text-xs text-slate-500">
              <span>Transport: {{ d.scores.transport }}/30</span>
              <span>Afford: {{ d.scores.affordability }}/25</span>
              <span>Space: {{ d.scores.space }}/15</span>
              <span>Amenities: {{ d.scores.amenities }}/20</span>
            </div>
            <!-- Score bar -->
            <div class="flex h-1.5 rounded-full overflow-hidden mt-2 bg-slate-100">
              <div class="bg-indigo-500" :style="{ width: (d.scores.transport / 100 * 100) + '%' }"></div>
              <div class="bg-emerald-500" :style="{ width: (d.scores.affordability / 100 * 100) + '%' }"></div>
              <div class="bg-sky-500" :style="{ width: (d.scores.space / 100 * 100) + '%' }"></div>
              <div class="bg-amber-500" :style="{ width: (d.scores.amenities / 100 * 100) + '%' }"></div>
            </div>
          </div>
          <div class="text-right text-xs text-slate-400 flex-shrink-0">
            <div>{{ d.mtrStations }} MTR</div>
            <div>{{ d.schools }} schools</div>
            <div>{{ d.hospitals }} hospitals</div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-12 text-slate-400 text-sm">No livability data. Run population & amenities ingestion first.</div>

      <div class="flex items-center justify-center gap-4 text-xs text-slate-400 pt-4">
        <span class="flex items-center gap-1"><span class="w-3 h-1.5 rounded bg-indigo-500"></span> Transport</span>
        <span class="flex items-center gap-1"><span class="w-3 h-1.5 rounded bg-emerald-500"></span> Affordability</span>
        <span class="flex items-center gap-1"><span class="w-3 h-1.5 rounded bg-sky-500"></span> Space</span>
        <span class="flex items-center gap-1"><span class="w-3 h-1.5 rounded bg-amber-500"></span> Amenities</span>
      </div>
    </div>
  </div>
</template>
