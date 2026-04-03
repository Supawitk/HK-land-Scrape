<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApi } from "@/composables/useApi";
import { useDistrictsStore } from "@/stores/districts";
import { Bar, Doughnut } from "vue-chartjs";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const api = useApi();
const ds = useDistrictsStore();
const tab = ref("property");
const stats = ref<any>(null);
const stock = ref<any[]>([]);
const pop = ref<any[]>([]);
const liv = ref<any[]>([]);

onMounted(async () => {
  await Promise.all([
    ds.fetchAll(),
    api.getPropertyStats().then(d => stats.value = d).catch(() => {}),
    api.getBuildingStock().then(d => stock.value = d).catch(() => {}),
    api.getPopulation().then(d => pop.value = d.data || []).catch(() => {}),
    api.getLivabilityScores().then(d => liv.value = d).catch(() => {}),
  ]);
});

const bOpts = { responsive: true, indexAxis: "y" as const, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } } };

const listChart = computed(() => {
  const d = (stats.value?.byDistrict || []).sort((a: any, b: any) => b.total_listings - a.total_listings);
  return { labels: d.map((x: any) => x.district_name), datasets: [{ data: d.map((x: any) => x.total_listings), backgroundColor: d.map((x: any) => x.zone_id === "hk_island" ? "#2563eb" : x.zone_id === "kowloon" ? "#dc2626" : "#059669"), borderRadius: 4 }] };
});
const priceChart = computed(() => {
  const d = (stats.value?.byDistrict || []).filter((x: any) => x.avg_price_per_sqft > 0).sort((a: any, b: any) => b.avg_price_per_sqft - a.avg_price_per_sqft);
  return { labels: d.map((x: any) => x.district_name), datasets: [{ data: d.map((x: any) => Math.round(x.avg_price_per_sqft)), backgroundColor: d.map((x: any) => x.zone_id === "hk_island" ? "rgba(37,99,235,0.6)" : x.zone_id === "kowloon" ? "rgba(220,38,38,0.6)" : "rgba(5,150,105,0.6)"), borderRadius: 4 }] };
});
const popChart = computed(() => {
  if (!pop.value.length) return null;
  const s = [...pop.value].sort((a, b) => b.population - a.population);
  return { labels: s.map(d => d.district_name), datasets: [{ data: s.map(d => d.population), backgroundColor: s.map((d: any) => d.zone_id === "hk_island" ? "#93c5fd" : d.zone_id === "kowloon" ? "#fca5a5" : "#6ee7b7"), borderRadius: 4 }] };
});
const densChart = computed(() => {
  if (!pop.value.length) return null;
  const s = pop.value.filter(d => d.density > 0).sort((a, b) => b.density - a.density);
  return { labels: s.map(d => d.district_name), datasets: [{ data: s.map(d => d.density), backgroundColor: s.map((d: any) => d.zone_id === "hk_island" ? "rgba(37,99,235,0.5)" : d.zone_id === "kowloon" ? "rgba(220,38,38,0.5)" : "rgba(5,150,105,0.5)"), borderRadius: 4 }] };
});

function sColor(s: number) { return s >= 70 ? "#059669" : s >= 50 ? "#d97706" : "#dc2626"; }
</script>

<template>
  <div class="p-6 max-w-[1100px]">
    <h1 class="page-title mb-5">Analytics</h1>

    <div v-if="stats" class="grid grid-cols-4 gap-3 mb-5">
      <div class="card"><div class="label">Total</div><div class="text-[20px] font-semibold">{{ stats.overall?.total?.toLocaleString()||0 }}</div></div>
      <div class="card"><div class="label">For Sale</div><div class="text-[20px] font-semibold text-[#059669]">{{ stats.overall?.buy_count?.toLocaleString()||0 }}</div></div>
      <div class="card"><div class="label">For Rent</div><div class="text-[20px] font-semibold text-[#7c3aed]">{{ stats.overall?.rent_count?.toLocaleString()||0 }}</div></div>
      <div class="card"><div class="label">Avg Price</div><div class="text-[20px] font-semibold">{{ stats.overall?.avg_price ? 'HK$'+Math.round(stats.overall.avg_price/1e6)+'M' : 'N/A' }}</div></div>
    </div>

    <div class="tab-bar">
      <div v-for="t in [{id:'property',l:'Property'},{id:'population',l:'Population'},{id:'livability',l:'Livability'}]" :key="t.id" @click="tab=t.id" class="tab-item" :class="{'tab-item-active':tab===t.id}">{{ t.l }}</div>
    </div>

    <div v-if="tab==='property'" class="grid grid-cols-2 gap-4">
      <div class="chart-container"><div class="section-title mb-3">Listings by District</div><Bar v-if="stats?.byDistrict?.length" :data="listChart" :options="bOpts" /><div v-else class="py-12 text-center text-[13px] text-[#9ca3af]">No data</div></div>
      <div class="chart-container"><div class="section-title mb-3">Avg $/sqft</div><Bar v-if="stats?.byDistrict?.some((d:any)=>d.avg_price_per_sqft>0)" :data="priceChart" :options="bOpts" /><div v-else class="py-12 text-center text-[13px] text-[#9ca3af]">No data</div></div>
    </div>

    <div v-if="tab==='population'" class="grid grid-cols-2 gap-4">
      <div class="chart-container"><div class="section-title mb-3">Population</div><Bar v-if="popChart" :data="popChart" :options="bOpts" /><div v-else class="py-12 text-center text-[13px] text-[#9ca3af]">Run population ingestion first</div></div>
      <div class="chart-container"><div class="section-title mb-3">Density (people/km&sup2;)</div><Bar v-if="densChart" :data="densChart" :options="bOpts" /><div v-else class="py-12 text-center text-[13px] text-[#9ca3af]">No data</div></div>
    </div>

    <div v-if="tab==='livability'">
      <p class="text-[12px] text-[#9ca3af] mb-4">Composite score: transport (30) + affordability (25) + space (15) + amenities (20) + data (10)</p>
      <div v-if="liv.length" class="space-y-2">
        <div v-for="(d,i) in liv" :key="d.id" class="card flex items-center gap-3">
          <div class="w-7 h-7 rounded-md flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" :style="{background:sColor(d.scores.total)}">{{ i+1 }}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2"><span class="text-[13px] font-medium">{{ d.name }}</span><span class="text-[18px] font-semibold" :style="{color:sColor(d.scores.total)}">{{ d.scores.total }}</span><span class="text-[11px] text-[#9ca3af]">/100</span></div>
            <div class="flex gap-3 text-[11px] text-[#9ca3af] mt-0.5">
              <span>Transport {{ d.scores.transport }}/30</span><span>Afford {{ d.scores.affordability }}/25</span><span>Space {{ d.scores.space }}/15</span><span>Amenities {{ d.scores.amenities }}/20</span>
            </div>
          </div>
          <div class="text-[11px] text-[#9ca3af] text-right flex-shrink-0"><div>{{ d.mtrStations }} MTR</div><div>{{ d.schools }} schools</div></div>
        </div>
      </div>
      <div v-else class="text-center py-12 text-[13px] text-[#9ca3af]">Run population & amenities ingestion first</div>
    </div>
  </div>
</template>
