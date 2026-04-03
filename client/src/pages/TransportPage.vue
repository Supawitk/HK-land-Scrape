<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApi } from "@/composables/useApi";

const api = useApi();
const summary = ref<any>(null);
const busRoutes = ref<any[]>([]);
const selectedOperator = ref("kmb");
const searchRoute = ref("");
const loading = ref(false);
const mtrLines = ref<any[]>([]);
const lightRailStops = ref<any[]>([]);
const ferryPiers = ref<any[]>([]);

const operators = [
  { id: "kmb", name: "KMB", color: "#f59e0b", desc: "Kowloon Motor Bus" },
  { id: "ctb", name: "CityBus", color: "#3b82f6", desc: "CityBus" },
  { id: "gmb", name: "GMB", color: "#8b5cf6", desc: "Green Minibus" },
  { id: "nlb", name: "NLB", color: "#14b8a6", desc: "New Lantao Bus" },
  { id: "mtr_bus", name: "MTR Bus", color: "#f43f5e", desc: "MTR Feeder Bus" },
];

onMounted(async () => {
  await Promise.all([
    api.getTransportSummary().then((d) => (summary.value = d)),
    api.getMtrLines().then((d) => (mtrLines.value = d)),
    api.getLightRailStops().then((d) => (lightRailStops.value = d)),
    api.getFerryPiers().then((d) => (ferryPiers.value = d)),
    searchBusRoutes(),
  ]);
});

async function searchBusRoutes() {
  loading.value = true;
  try {
    busRoutes.value = await api.getBusRoutes({
      operator: selectedOperator.value,
      route: searchRoute.value || undefined,
      limit: 100,
    });
  } finally {
    loading.value = false;
  }
}

function onOperatorChange(op: string) {
  selectedOperator.value = op;
  searchRoute.value = "";
  searchBusRoutes();
}

const operatorStats = computed(() => {
  if (!summary.value?.bus_by_operator) return [];
  return summary.value.bus_by_operator;
});

const activeOperator = computed(() => operators.find((o) => o.id === selectedOperator.value));
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <h1 class="page-title">Transport Network</h1>
      <p class="text-sm text-slate-500 mt-1">Explore Hong Kong's public transport system</p>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div class="stat-card text-center">
        <div class="text-xs text-slate-400 mb-1">MTR Lines</div>
        <div class="text-xl font-bold text-slate-800">{{ summary?.mtr_lines || 0 }}</div>
      </div>
      <div class="stat-card text-center">
        <div class="text-xs text-slate-400 mb-1">MTR Stations</div>
        <div class="text-xl font-bold text-slate-800">{{ summary?.mtr_stations || 0 }}</div>
      </div>
      <div class="stat-card text-center">
        <div class="text-xs text-slate-400 mb-1">Bus Stops</div>
        <div class="text-xl font-bold text-slate-800">{{ summary?.bus_stops?.toLocaleString() || 0 }}</div>
      </div>
      <div class="stat-card text-center">
        <div class="text-xs text-slate-400 mb-1">Bus Routes</div>
        <div class="text-xl font-bold text-slate-800">{{ summary?.bus_routes?.toLocaleString() || 0 }}</div>
      </div>
      <div class="stat-card text-center">
        <div class="text-xs text-slate-400 mb-1">Light Rail</div>
        <div class="text-xl font-bold text-slate-800">{{ summary?.light_rail_stops || 0 }}</div>
      </div>
      <div class="stat-card text-center">
        <div class="text-xs text-slate-400 mb-1">Ferry Piers</div>
        <div class="text-xl font-bold text-slate-800">{{ summary?.ferry_piers || 0 }}</div>
      </div>
    </div>

    <!-- MTR Lines -->
    <div class="stat-card">
      <h2 class="section-title mb-4">MTR Lines</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="line in mtrLines" :key="line.id" class="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" :style="{ backgroundColor: line.color }">
            <span class="text-white text-xs font-bold">{{ line.id }}</span>
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-slate-800 truncate">{{ line.name_en }}</div>
            <div class="text-xs text-slate-400">{{ line.name_zh }} &middot; {{ line.stations?.length || 0 }} stations</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bus Routes Explorer -->
    <div class="stat-card">
      <h2 class="section-title mb-4">Bus Routes Explorer</h2>

      <!-- Operator tabs -->
      <div class="flex flex-wrap gap-2 mb-4">
        <button
          v-for="op in operators"
          :key="op.id"
          @click="onOperatorChange(op.id)"
          class="btn btn-sm transition-all"
          :class="selectedOperator === op.id ? '' : 'btn-secondary'"
          :style="selectedOperator === op.id ? { backgroundColor: op.color, color: 'white', borderColor: op.color } : {}"
        >
          {{ op.name }}
          <span v-if="operatorStats.find((s: any) => s.operator === op.id)" class="ml-1 opacity-70">
            ({{ operatorStats.find((s: any) => s.operator === op.id)?.count?.toLocaleString() }} stops)
          </span>
        </button>
      </div>

      <!-- Search -->
      <div class="flex gap-3 mb-4">
        <input
          v-model="searchRoute"
          @keyup.enter="searchBusRoutes"
          type="text"
          :placeholder="`Search ${activeOperator?.name || ''} routes...`"
          class="input max-w-xs"
        />
        <button @click="searchBusRoutes" class="btn btn-primary btn-sm">Search</button>
      </div>

      <!-- Routes table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="text-left py-2 px-3 text-[10px] font-semibold text-slate-400 uppercase">Route</th>
              <th class="text-left py-2 px-3 text-[10px] font-semibold text-slate-400 uppercase">Direction</th>
              <th class="text-left py-2 px-3 text-[10px] font-semibold text-slate-400 uppercase">Origin</th>
              <th class="text-left py-2 px-3 text-[10px] font-semibold text-slate-400 uppercase">Destination</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in busRoutes" :key="r.id" class="border-b border-slate-50 hover:bg-slate-25 transition-colors">
              <td class="py-2.5 px-3">
                <span class="inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 rounded-lg text-xs font-bold text-white" :style="{ backgroundColor: activeOperator?.color || '#94a3b8' }">
                  {{ r.route }}
                </span>
              </td>
              <td class="py-2.5 px-3 text-slate-400 text-xs">{{ r.bound === 'O' ? 'Outbound' : r.bound === 'I' ? 'Inbound' : r.bound }}</td>
              <td class="py-2.5 px-3 text-slate-700">{{ r.orig_en || r.orig_zh || '-' }}</td>
              <td class="py-2.5 px-3 text-slate-700">{{ r.dest_en || r.dest_zh || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="loading" class="text-center py-8 text-slate-400 text-sm">Loading routes...</div>
        <div v-else-if="busRoutes.length === 0" class="text-center py-8 text-slate-400 text-sm">No routes found</div>
      </div>
    </div>

    <!-- Ferry Piers -->
    <div v-if="ferryPiers.length" class="stat-card">
      <h2 class="section-title mb-4">Ferry Piers</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="pier in ferryPiers" :key="pier.id" class="flex items-center gap-3 p-3 rounded-xl bg-sky-50/50">
          <div class="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20M4 16l2-8h12l2 8" /></svg>
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-slate-800 truncate">{{ pier.name_en }}</div>
            <div class="text-xs text-slate-400">{{ pier.name_zh }} &middot; {{ pier.operator?.replace(/_/g, ' ') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
