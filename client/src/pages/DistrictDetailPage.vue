<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useDistrictsStore } from "@/stores/districts";
import { Bar } from "vue-chartjs";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const route = useRoute();
const router = useRouter();
const api = useApi();
const ds = useDistrictsStore();
const district = ref<any>(null);
const properties = ref<any[]>([]);
const nearby = ref<any>(null);
const stock = ref<any[]>([]);
const livScore = ref<any>(null);
const amenities = ref<any>(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  const id = route.params.id as string;
  try {
    await ds.fetchAll();
    const [d, props, st] = await Promise.all([
      api.getDistrict(id),
      api.getProperties({ districtId: id, limit: 8 }),
      api.getBuildingStock().then(a => a.filter((s: any) => s.district_id === id)),
    ]);
    district.value = d; properties.value = props.data; stock.value = st;
    api.getLivabilityScores().then(s => livScore.value = s.find((x: any) => x.id === id)).catch(() => {});
    if (d.centroid_lat && d.centroid_lng) {
      nearby.value = await api.getNearbyTransport(d.centroid_lat, d.centroid_lng, 2);
      api.getNearbyAmenities(d.centroid_lat, d.centroid_lng, 2).then(a => amenities.value = a).catch(() => {});
    }
  } finally { loading.value = false; }
}
watch(() => route.params.id, load); onMounted(load);

const stockChart = computed(() => {
  if (!stock.value.length) return null;
  return { labels: stock.value.map(s => s.property_type.charAt(0).toUpperCase() + s.property_type.slice(1)), datasets: [{ data: stock.value.map(s => s.stock || 0), backgroundColor: ["#2563eb", "#d97706", "#059669", "#7c3aed"], borderRadius: 6 }] };
});

function fmt(p: number | null, t: string) { if (!p) return "N/A"; if (t === "buy") return p >= 1e6 ? `HK$${(p / 1e6).toFixed(1)}M` : `HK$${p.toLocaleString()}`; return `HK$${p.toLocaleString()}/mo`; }
function sColor(s: number) { return s >= 70 ? "#059669" : s >= 50 ? "#d97706" : "#dc2626"; }
</script>

<template>
  <div class="px-5 py-5 max-w-[1400px]">
    <button @click="router.back()" class="text-[12px] text-[#6b7280] hover:text-[#374151] mb-4 inline-flex items-center gap-1">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg> Back
    </button>

    <div v-if="loading" class="text-center py-20 text-[#9ca3af] text-[13px]">Loading...</div>

    <template v-else-if="district">
      <!-- Header -->
      <div class="card mb-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-[20px] font-semibold">{{ district.name_en }}</h1>
            <div class="text-[13px] text-[#9ca3af]">{{ district.name_zh }} &middot; {{ district.zone_name }}</div>
          </div>
          <div v-if="livScore" class="text-center">
            <div class="w-11 h-11 rounded-lg flex items-center justify-center text-white text-[16px] font-bold" :style="{background:sColor(livScore.scores.total)}">{{ livScore.scores.total }}</div>
            <div class="text-[9px] text-[#9ca3af] mt-0.5">Livability</div>
          </div>
        </div>
        <div class="grid grid-cols-5 gap-3">
          <div><div class="label">Area</div><div class="text-[15px] font-medium">{{ district.area_km_sq ? district.area_km_sq+' km\u00B2' : 'N/A' }}</div></div>
          <div><div class="label">Listings</div><div class="text-[15px] font-medium">{{ district.stats?.total_listings||0 }}</div></div>
          <div><div class="label">Sale</div><div class="text-[15px] font-medium text-[#059669]">{{ district.stats?.buy_count||0 }}</div></div>
          <div><div class="label">Rent</div><div class="text-[15px] font-medium text-[#7c3aed]">{{ district.stats?.rent_count||0 }}</div></div>
          <div><div class="label">Avg $/sqft</div><div class="text-[15px] font-medium text-[#2563eb]">{{ district.stats?.avg_price_per_sqft ? '$'+Math.round(district.stats.avg_price_per_sqft).toLocaleString() : 'N/A' }}</div></div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-5">
        <!-- Building Stock -->
        <div class="chart-container">
          <div class="section-title mb-3">Building Stock</div>
          <Bar v-if="stockChart" :data="stockChart" :options="{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } } }" />
          <div v-if="stock.length" class="mt-3 space-y-1">
            <div v-for="s in stock" :key="s.property_type" class="flex justify-between text-[12px]">
              <span class="text-[#6b7280] capitalize">{{ s.property_type }}</span>
              <span>{{ s.stock?.toLocaleString()||'N/A' }} <span v-if="s.vacancy_rate" class="text-[#9ca3af]">({{ s.vacancy_rate }}% vacant)</span></span>
            </div>
          </div>
          <div v-else class="text-[12px] text-[#9ca3af] py-8 text-center">No data</div>
        </div>

        <!-- Transport -->
        <div class="card">
          <div class="section-title mb-3">Nearby Transport</div>
          <div v-if="nearby" class="space-y-3">
            <div v-if="nearby.mtrStations?.length"><div class="label mb-1">MTR</div><div v-for="s in nearby.mtrStations" :key="s.id" class="text-[12px] text-[#374151] py-0.5">{{ s.name_en }} <span class="text-[#9ca3af]">{{ s.name_zh }}</span></div></div>
            <div v-if="nearby.tramStops?.length"><div class="label mb-1">Tram</div><div v-for="s in nearby.tramStops" :key="s.id" class="text-[12px] text-[#374151] py-0.5">{{ s.name_en }}</div></div>
            <div v-if="nearby.lightRailStops?.length"><div class="label mb-1">Light Rail</div><div v-for="s in nearby.lightRailStops" :key="s.id" class="text-[12px] text-[#374151] py-0.5">{{ s.name_en }}</div></div>
            <div v-if="nearby.ferryPiers?.length"><div class="label mb-1">Ferry</div><div v-for="s in nearby.ferryPiers" :key="s.id" class="text-[12px] text-[#374151] py-0.5">{{ s.name_en }}</div></div>
            <div v-if="nearby.busStops?.length"><div class="label mb-1">Bus</div><div class="text-[12px] text-[#6b7280]">{{ nearby.busStops.length }} stops nearby</div></div>
          </div>
        </div>
      </div>

      <!-- Amenities -->
      <div v-if="amenities && (amenities.schools?.length || amenities.hospitals?.length)" class="grid grid-cols-2 gap-4 mb-5">
        <div v-if="amenities.schools?.length" class="card">
          <div class="section-title mb-2">Schools ({{ amenities.schools.length }})</div>
          <div class="space-y-0.5 max-h-40 overflow-y-auto">
            <div v-for="s in amenities.schools.slice(0,12)" :key="s.id" class="text-[12px] py-0.5"><span class="text-[#374151]">{{ s.name_en }}</span> <span class="text-[10px] text-[#9ca3af]">{{ s.level }}</span></div>
          </div>
        </div>
        <div v-if="amenities.hospitals?.length" class="card">
          <div class="section-title mb-2">Healthcare ({{ amenities.hospitals.length }})</div>
          <div class="space-y-0.5 max-h-40 overflow-y-auto">
            <div v-for="h in amenities.hospitals" :key="h.name_en" class="text-[12px] py-0.5"><span class="text-[#374151]">{{ h.name_en }}</span> <span v-if="h.has_ae" class="text-[10px] text-[#dc2626] font-medium">A&E</span></div>
          </div>
        </div>
      </div>

      <!-- Properties -->
      <div class="card">
        <div class="flex justify-between mb-3"><div class="section-title">Recent Properties</div><RouterLink :to="{path:'/properties',query:{districtId:district.id}}" class="text-[12px] text-[#2563eb]">View all &rarr;</RouterLink></div>
        <div v-if="properties.length" class="space-y-0">
          <div v-for="p in properties" :key="p.id" class="flex justify-between py-2 border-b border-[#f3f4f6] last:border-0">
            <div><div class="text-[13px] font-medium">{{ p.estate_name||'Property' }}</div><div class="text-[11px] text-[#9ca3af]">{{ p.area_usable ? p.area_usable+' sqft' : '' }} {{ p.bedrooms!==null ? p.bedrooms+' bed' : '' }}</div></div>
            <div class="text-right"><div class="text-[13px] font-medium">{{ fmt(p.price,p.listing_type) }}</div><span class="badge" :class="p.listing_type==='buy'?'badge-green':'badge-purple'">{{ p.listing_type==='buy'?'Sale':'Rent' }}</span></div>
          </div>
        </div>
        <div v-else class="text-[12px] text-[#9ca3af] text-center py-8">No listings. Run scraper.</div>
      </div>
    </template>
  </div>
</template>
