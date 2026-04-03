<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApi } from "@/composables/useApi";

const api = useApi();
const summary = ref<any>(null);
const routes = ref<any[]>([]);
const routeStops = ref<any[]>([]);
const selectedOp = ref("kmb");
const search = ref("");
const loading = ref(false);
const loadingStops = ref(false);
const mtrLines = ref<any[]>([]);
const ferryPiers = ref<any[]>([]);
const selectedRoute = ref<any>(null);

const ops = [
  { id: "kmb", name: "KMB", color: "#d97706" },
  { id: "ctb", name: "CityBus", color: "#2563eb" },
  { id: "gmb", name: "GMB", color: "#7c3aed" },
  { id: "nlb", name: "NLB", color: "#059669" },
  { id: "mtr_bus", name: "MTR Bus", color: "#dc2626" },
];

onMounted(async () => {
  await Promise.all([
    api.getTransportSummary().then(d => summary.value = d),
    api.getMtrLines().then(d => mtrLines.value = d),
    api.getFerryPiers().then(d => ferryPiers.value = d),
    searchRoutes(),
  ]);
});

async function searchRoutes() {
  loading.value = true;
  try { routes.value = await api.getBusRoutes({ operator: selectedOp.value, route: search.value || undefined, limit: 100 }); } finally { loading.value = false; }
}

function switchOp(op: string) { selectedOp.value = op; search.value = ""; selectedRoute.value = null; routeStops.value = []; searchRoutes(); }

async function viewRouteStops(r: any) {
  selectedRoute.value = r;
  loadingStops.value = true;
  routeStops.value = [];
  try {
    const dir = r.bound === "I" ? "inbound" : "outbound";
    routeStops.value = await api.getRouteStops(r.operator, r.route, dir);
  } catch { routeStops.value = []; }
  finally { loadingStops.value = false; }
}

const activeOp = computed(() => ops.find(o => o.id === selectedOp.value));
</script>

<template>
  <div class="p-6 max-w-[1100px]">
    <h1 class="page-title mb-5">Transport</h1>

    <!-- Summary -->
    <div v-if="summary" class="grid grid-cols-6 gap-3 mb-5">
      <div class="card text-center" v-for="s in [{l:'MTR',v:summary.mtr_stations},{l:'Bus Stops',v:summary.bus_stops},{l:'Routes',v:summary.bus_routes},{l:'Tram',v:summary.tram_stops},{l:'LRT',v:summary.light_rail_stops},{l:'Ferry',v:summary.ferry_piers}]" :key="s.l">
        <div class="text-[11px] text-[#9ca3af]">{{ s.l }}</div>
        <div class="text-[16px] font-semibold">{{ s.v?.toLocaleString() }}</div>
      </div>
    </div>

    <!-- MTR Lines -->
    <div class="card mb-5">
      <div class="section-title mb-3">MTR Lines</div>
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <div v-for="line in mtrLines" :key="line.id" class="flex items-center gap-2 p-2 rounded-md bg-[#f9fafb]">
          <div class="w-3 h-3 rounded-sm flex-shrink-0" :style="{background:line.color}"></div>
          <div class="min-w-0">
            <div class="text-[12px] font-medium truncate">{{ line.name_en }}</div>
            <div class="text-[10px] text-[#9ca3af]">{{ line.stations?.length }} stations</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bus Routes -->
    <div class="card mb-5">
      <div class="section-title mb-3">Bus Routes</div>
      <div class="flex gap-1.5 mb-3">
        <button v-for="op in ops" :key="op.id" @click="switchOp(op.id)" class="btn btn-sm" :class="selectedOp===op.id?'':'btn-secondary'" :style="selectedOp===op.id?{background:op.color,color:'white',borderColor:op.color}:{}">
          {{ op.name }}
        </button>
      </div>
      <div class="flex gap-2 mb-3">
        <input v-model="search" @keyup.enter="searchRoutes" placeholder="Search route..." class="input max-w-[200px]" />
        <button @click="searchRoutes" class="btn btn-primary btn-sm">Search</button>
      </div>

      <div class="flex gap-4">
        <!-- Routes table -->
        <div class="flex-1 min-w-0">
          <table class="w-full text-[13px]">
            <thead><tr class="text-left border-b border-[#e5e7eb]"><th class="py-1.5 px-2 label">Route</th><th class="py-1.5 px-2 label">Dir</th><th class="py-1.5 px-2 label">Origin</th><th class="py-1.5 px-2 label">Dest</th><th class="py-1.5 px-2 label"></th></tr></thead>
            <tbody>
              <tr v-for="r in routes" :key="r.id" class="border-b border-[#f3f4f6] hover:bg-[#f9fafb] cursor-pointer" @click="viewRouteStops(r)" :class="{'bg-[#f9fafb]':selectedRoute?.id===r.id}">
                <td class="py-1.5 px-2"><span class="inline-block min-w-[40px] text-center text-[11px] font-bold text-white rounded px-1.5 py-0.5" :style="{background:activeOp?.color}">{{ r.route }}</span></td>
                <td class="py-1.5 px-2 text-[#9ca3af] text-[11px]">{{ r.bound==='O'?'Out':'In' }}</td>
                <td class="py-1.5 px-2 text-[#374151]">{{ r.orig_en||r.orig_zh||'-' }}</td>
                <td class="py-1.5 px-2 text-[#374151]">{{ r.dest_en||r.dest_zh||'-' }}</td>
                <td class="py-1.5 px-2 text-[11px] text-[#2563eb]">Stops</td>
              </tr>
            </tbody>
          </table>
          <div v-if="loading" class="text-center py-6 text-[#9ca3af] text-[12px]">Loading...</div>
          <div v-else-if="!routes.length" class="text-center py-6 text-[#9ca3af] text-[12px]">No routes found</div>
        </div>

        <!-- Route stops panel -->
        <div v-if="selectedRoute" class="w-[260px] flex-shrink-0 border-l border-[#e5e7eb] pl-4">
          <div class="text-[13px] font-medium mb-1">Route {{ selectedRoute.route }} stops</div>
          <div class="text-[11px] text-[#9ca3af] mb-3">{{ selectedRoute.orig_en }} → {{ selectedRoute.dest_en }}</div>
          <div v-if="loadingStops" class="text-[12px] text-[#9ca3af]">Loading stops...</div>
          <div v-else-if="routeStops.length" class="space-y-0.5 max-h-[400px] overflow-y-auto">
            <div v-for="(s,i) in routeStops" :key="s.id||i" class="flex items-start gap-2 py-1">
              <div class="w-5 h-5 rounded-full border-2 border-[#d1d5db] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span class="text-[8px] font-bold text-[#6b7280]">{{ i+1 }}</span>
              </div>
              <div class="min-w-0">
                <div class="text-[12px] text-[#374151] truncate">{{ s.name_en }}</div>
                <div class="text-[10px] text-[#9ca3af]">{{ s.name_zh||'' }}</div>
              </div>
            </div>
          </div>
          <div v-else class="text-[12px] text-[#9ca3af]">No stop data available</div>
        </div>
      </div>
    </div>

    <!-- Ferry -->
    <div v-if="ferryPiers.length" class="card">
      <div class="section-title mb-3">Ferry Piers</div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div v-for="p in ferryPiers" :key="p.id" class="p-2 rounded-md bg-[#f9fafb] text-[12px]">
          <div class="font-medium text-[#374151]">{{ p.name_en }}</div>
          <div class="text-[10px] text-[#9ca3af]">{{ p.operator?.replace(/_/g,' ') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
