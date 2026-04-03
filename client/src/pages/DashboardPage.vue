<script setup lang="ts">
import { onMounted, computed, ref } from "vue";
import { useDistrictsStore } from "@/stores/districts";
import { usePropertiesStore } from "@/stores/properties";
import { useApi } from "@/composables/useApi";
import { Bar, Line, Doughnut } from "vue-chartjs";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const ds = useDistrictsStore();
const ps = usePropertiesStore();
const api = useApi();
const tab = ref("overview");
const status = ref<any>(null);
const stock = ref<any[]>([]);
const age = ref<any[]>([]);
const transport = ref<any>(null);
const weather = ref<any>(null);
const aqhi = ref<any>(null);

onMounted(async () => {
  await Promise.all([
    ds.fetchAll(), ps.fetchStats(), ps.fetchTrends(),
    api.getScraperStatus().then(d => status.value = d).catch(() => {}),
    api.getBuildingStock("domestic").then(d => stock.value = d).catch(() => {}),
    api.getBuildingAge().then(d => age.value = d).catch(() => {}),
    api.getTransportSummary().then(d => transport.value = d).catch(() => {}),
    api.getCurrentWeather().then(d => weather.value = d).catch(() => {}),
    api.getAqhi().then(d => aqhi.value = d).catch(() => {}),
  ]);
});

const listings = computed(() => status.value?.counts?.properties || 0);
const temp = computed(() => {
  if (!weather.value?.temperature?.length) return null;
  const hko = weather.value.temperature.find((t: any) => t.place === "Hong Kong Observatory");
  return hko?.value || weather.value.temperature[0]?.value;
});
const aqhiInfo = computed(() => {
  if (!aqhi.value?.averageAqhi) return null;
  const v = aqhi.value.averageAqhi;
  return { value: v, label: v <= 3 ? "Low" : v <= 6 ? "Moderate" : v <= 7 ? "High" : "Very High", color: v <= 3 ? "#059669" : v <= 6 ? "#d97706" : "#dc2626" };
});

const priceChart = computed(() => {
  const t = ps.trends; if (!t.length) return null;
  const s = (a: any[]) => a.length > 40 ? a.filter((_: any, i: number) => i % 4 === 0) : a;
  const hk = s(t.filter(x => x.property_class === "A-Hong Kong"));
  return { labels: hk.map(x => x.period), datasets: [
    { label: "HK Island", data: hk.map(x => x.price_index), borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.06)", tension: 0.4, fill: true, pointRadius: 0, borderWidth: 1.5 },
    { label: "Kowloon", data: s(t.filter(x => x.property_class === "A-Kowloon")).map(x => x.price_index), borderColor: "#dc2626", backgroundColor: "transparent", tension: 0.4, fill: false, pointRadius: 0, borderWidth: 1.5 },
    { label: "N.T.", data: s(t.filter(x => x.property_class === "A-New Territories")).map(x => x.price_index), borderColor: "#059669", backgroundColor: "transparent", tension: 0.4, fill: false, pointRadius: 0, borderWidth: 1.5 },
  ]};
});
const stockChart = computed(() => {
  const sorted = [...stock.value].sort((a, b) => (b.stock || 0) - (a.stock || 0));
  return { labels: sorted.map(s => s.district_name), datasets: [{ data: sorted.map(s => s.stock || 0), backgroundColor: sorted.map(s => s.zone_id === "hk_island" ? "#2563eb" : s.zone_id === "kowloon" ? "#dc2626" : "#059669"), borderRadius: 4, barThickness: 14 }] };
});
const ageChart = computed(() => {
  const l = age.value.find(a => a.category === "Overall"); if (!l) return null;
  return { labels: ["Pre-60", "60s", "70s", "80s", "90s", "00s", "10s+"], datasets: [{ data: [l.pre_1960, l.y1960_69, l.y1970_79, l.y1980_89, l.y1990_99, l.y2000_09, l.post_2009], backgroundColor: ["#1e293b","#475569","#64748b","#94a3b8","#d97706","#059669","#2563eb"], borderWidth: 0 }] };
});
const chartOpts = { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: "#f3f4f6" }, ticks: { font: { size: 10 } } } } };
</script>

<template>
  <div class="p-6 max-w-[1100px]">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <h1 class="page-title">Dashboard</h1>
      <div class="flex items-center gap-2 text-[12px] text-[#6b7280]">
        <span v-if="temp">{{ temp }}&deg;C</span>
        <span v-if="aqhiInfo" class="badge" :style="{ background: aqhiInfo.color + '12', color: aqhiInfo.color }">AQHI {{ aqhiInfo.value }}</span>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-4 gap-3 mb-5">
      <div class="card"><div class="label">Districts</div><div class="kpi-number">{{ ds.districts.length }}</div></div>
      <div class="card"><div class="label">Listings</div><div class="kpi-number">{{ listings.toLocaleString() }}</div></div>
      <div class="card"><div class="label">Transport Stops</div><div class="kpi-number">{{ ((transport?.mtr_stations||0)+(transport?.bus_stops||0)+(transport?.tram_stops||0)).toLocaleString() }}</div></div>
      <div class="card"><div class="label">Schools</div><div class="kpi-number">{{ status?.counts?.schools?.toLocaleString() || 0 }}</div></div>
    </div>

    <!-- Tabs -->
    <div class="tab-bar">
      <div v-for="t in [{id:'overview',l:'Overview'},{id:'market',l:'Market'},{id:'buildings',l:'Buildings'}]" :key="t.id" @click="tab=t.id" class="tab-item" :class="{'tab-item-active':tab===t.id}">{{ t.l }}</div>
    </div>

    <!-- Overview -->
    <div v-if="tab==='overview'" class="space-y-5">
      <div v-if="transport" class="grid grid-cols-6 gap-3">
        <div class="card text-center" v-for="s in [{l:'MTR',v:transport.mtr_stations},{l:'Bus',v:transport.bus_stops},{l:'Routes',v:transport.bus_routes},{l:'Tram',v:transport.tram_stops},{l:'LRT',v:transport.light_rail_stops},{l:'Ferry',v:transport.ferry_piers}]" :key="s.l">
          <div class="text-[11px] text-[#9ca3af]">{{ s.l }}</div>
          <div class="text-[16px] font-semibold">{{ s.v?.toLocaleString() }}</div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div v-for="zone in ds.zones" :key="zone.id" class="card">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-2 h-2 rounded-full" :style="{background: zone.id==='hk_island'?'#2563eb':zone.id==='kowloon'?'#dc2626':'#059669'}"></div>
            <span class="text-[13px] font-medium">{{ zone.name_en }}</span>
            <span class="text-[11px] text-[#9ca3af]">{{ zone.name_zh }}</span>
          </div>
          <div class="space-y-px">
            <RouterLink v-for="d in ds.getDistrictsByZone(zone.id)" :key="d.id" :to="`/district/${d.id}`" class="flex items-center justify-between py-1 px-1.5 -mx-1.5 rounded hover:bg-[#f9fafb] text-[13px]">
              <span class="text-[#374151]">{{ d.name_en }} <span class="text-[#9ca3af]">{{ d.name_zh }}</span></span>
              <span class="text-[11px] text-[#9ca3af]">{{ d.listing_count||0 }}</span>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Market -->
    <div v-if="tab==='market'" class="space-y-5">
      <div class="chart-container">
        <div class="section-title mb-3">Price Index (Class A Domestic)</div>
        <Line v-if="priceChart" :data="priceChart" :options="{...chartOpts, plugins:{legend:{labels:{boxWidth:8,usePointStyle:true,font:{size:11}},display:true}}}" />
        <div v-else class="text-center py-12 text-[#9ca3af] text-[13px]">Loading...</div>
      </div>
      <div class="chart-container">
        <div class="section-title mb-3">Vacancy Rate</div>
        <div v-if="stock.length" class="space-y-1.5">
          <div v-for="s in [...stock].sort((a,b)=>(b.vacancy_rate||0)-(a.vacancy_rate||0))" :key="s.district_id" class="flex items-center gap-2">
            <span class="w-24 text-[12px] text-[#6b7280] truncate">{{ s.district_name }}</span>
            <div class="flex-1 bg-[#f3f4f6] rounded-full h-1.5"><div class="h-1.5 rounded-full" :class="(s.vacancy_rate||0)>5?'bg-red-500':(s.vacancy_rate||0)>2?'bg-amber-500':'bg-emerald-500'" :style="{width:Math.min((s.vacancy_rate||0)*10,100)+'%'}"></div></div>
            <span class="text-[11px] text-[#9ca3af] w-10 text-right font-mono">{{ s.vacancy_rate||'-' }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Buildings -->
    <div v-if="tab==='buildings'" class="grid grid-cols-2 gap-4">
      <div class="chart-container">
        <div class="section-title mb-3">Domestic Stock</div>
        <Bar v-if="stock.length" :data="stockChart" :options="{...chartOpts, indexAxis:'y' as const}" />
      </div>
      <div class="chart-container">
        <div class="section-title mb-3">Age Distribution</div>
        <div v-if="ageChart" class="max-w-[220px] mx-auto"><Doughnut :data="ageChart" :options="{responsive:true,cutout:'60%',plugins:{legend:{position:'bottom' as const,labels:{boxWidth:8,font:{size:10},padding:8}}}}" /></div>
      </div>
    </div>
  </div>
</template>
