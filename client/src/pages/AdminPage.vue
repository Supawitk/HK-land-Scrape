<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApi } from "@/composables/useApi";

const api = useApi();
const status = ref<any>(null);
const transportSummary = ref<any>(null);
const scraping = ref(false);
const ingesting = ref(false);
const scrapeResult = ref<any>(null);
const ingestResult = ref<any>(null);
const scrapeType = ref("buy");
const logs = ref<string[]>([]);

onMounted(refreshStatus);

async function refreshStatus() {
  const [s, t] = await Promise.all([
    api.getScraperStatus(),
    api.getTransportSummary(),
  ]);
  status.value = s;
  transportSummary.value = t;
}

async function runScraper() {
  scraping.value = true;
  scrapeResult.value = null;
  addLog(`Starting ${scrapeType.value} scrape...`);
  try {
    scrapeResult.value = await api.runScraper(scrapeType.value);
    addLog(`Scrape complete: ${scrapeResult.value.count || 0} listings scraped`);
    await refreshStatus();
  } catch (err: any) {
    addLog(`Scrape error: ${err.message}`);
    scrapeResult.value = { error: err.message };
  } finally {
    scraping.value = false;
  }
}

async function runIngestion() {
  ingesting.value = true;
  ingestResult.value = null;
  addLog("Starting transport data ingestion...");
  try {
    ingestResult.value = await api.ingestTransport();
    addLog("Transport ingestion complete!");
    await refreshStatus();
  } catch (err: any) {
    addLog(`Ingestion error: ${err.message}`);
    ingestResult.value = { error: err.message };
  } finally {
    ingesting.value = false;
  }
}

function addLog(msg: string) {
  const time = new Date().toLocaleTimeString();
  logs.value.unshift(`[${time}] ${msg}`);
  if (logs.value.length > 50) logs.value.pop();
}

const dataCounts = computed(() => {
  if (!status.value?.counts) return [];
  const c = status.value.counts;
  return [
    { label: "Properties", value: c.properties || 0, icon: "home" },
    { label: "MTR Stations", value: c.mtr_stations || 0, icon: "train" },
    { label: "Bus Stops", value: c.bus_stops || 0, icon: "bus" },
    { label: "Tram Stops", value: c.tram_stops || 0, icon: "tram" },
    { label: "Light Rail", value: c.light_rail_stops || 0, icon: "rail" },
    { label: "Ferry Piers", value: c.ferry_piers || 0, icon: "ferry" },
  ];
});

const busBreakdown = computed(() => {
  return status.value?.counts?.bus_by_operator || [];
});
</script>

<template>
  <div class="p-6 max-w-screen-xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <h1 class="page-title">Data Manager</h1>
      <p class="text-sm text-slate-500 mt-1">Manage data ingestion and scraping</p>
    </div>

    <!-- Data Counts -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div v-for="item in dataCounts" :key="item.label" class="stat-card text-center">
        <div class="text-xs text-slate-400 mb-1">{{ item.label }}</div>
        <div class="text-xl font-bold text-slate-800">{{ item.value.toLocaleString() }}</div>
      </div>
    </div>

    <!-- Bus Operator Breakdown -->
    <div v-if="busBreakdown.length" class="stat-card">
      <h2 class="section-title mb-3">Bus Stops by Operator</h2>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div v-for="op in busBreakdown" :key="op.operator" class="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" :style="{
            backgroundColor: op.operator === 'kmb' ? '#f59e0b' : op.operator === 'ctb' ? '#3b82f6' : op.operator === 'gmb' ? '#8b5cf6' : op.operator === 'nlb' ? '#14b8a6' : '#f43f5e'
          }">
            {{ op.operator.slice(0, 3).toUpperCase() }}
          </div>
          <div>
            <div class="text-sm font-semibold text-slate-800">{{ op.count?.toLocaleString() }}</div>
            <div class="text-xs text-slate-400">{{ op.operator.toUpperCase() }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Scraper -->
      <div class="stat-card">
        <h2 class="section-title mb-1">Property Scraper</h2>
        <p class="text-xs text-slate-400 mb-4">Scrape property listings from 28Hse.com</p>

        <div class="flex items-center gap-3 mb-4">
          <select v-model="scrapeType" class="select w-32" :disabled="scraping">
            <option value="buy">Buy</option>
            <option value="rent">Rent</option>
          </select>
          <button @click="runScraper" :disabled="scraping" class="btn btn-primary" :class="{ 'opacity-50 cursor-not-allowed': scraping }">
            <svg v-if="scraping" class="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            {{ scraping ? 'Scraping...' : 'Run Scraper' }}
          </button>
        </div>

        <div v-if="scrapeResult" class="p-3 rounded-xl text-sm" :class="scrapeResult.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'">
          {{ scrapeResult.error || `Scraped ${scrapeResult.count || 0} listings` }}
        </div>

        <div v-if="status?.lastRun" class="mt-3 text-xs text-slate-400">
          Last run: {{ new Date(status.lastRun).toLocaleString() }}
        </div>
      </div>

      <!-- Transport Ingestion -->
      <div class="stat-card">
        <h2 class="section-title mb-1">Transport Data Ingestion</h2>
        <p class="text-xs text-slate-400 mb-4">Fetch latest data from MTR, KMB, CityBus, GMB, NLB, Light Rail, Ferry</p>

        <button @click="runIngestion" :disabled="ingesting" class="btn btn-primary" :class="{ 'opacity-50 cursor-not-allowed': ingesting }">
          <svg v-if="ingesting" class="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          {{ ingesting ? 'Ingesting...' : 'Refresh Transport Data' }}
        </button>

        <div v-if="ingestResult" class="mt-3 p-3 rounded-xl text-sm" :class="ingestResult.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'">
          {{ ingestResult.error || 'Transport data refreshed successfully!' }}
        </div>

        <div class="mt-3 text-xs text-slate-400">
          This fetches from official DATA.GOV.HK and MTR open data APIs.
          <br>KMB, CityBus, GMB, NLB stops and routes will be updated.
        </div>
      </div>
    </div>

    <!-- Activity Log -->
    <div class="stat-card">
      <h2 class="section-title mb-3">Activity Log</h2>
      <div v-if="logs.length" class="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-60 overflow-y-auto space-y-1">
        <div v-for="(log, i) in logs" :key="i" class="leading-relaxed">{{ log }}</div>
      </div>
      <div v-else class="text-sm text-slate-400 text-center py-6">No recent activity</div>
    </div>

    <!-- Data Sources -->
    <div class="stat-card">
      <h2 class="section-title mb-3">Data Sources</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div class="space-y-2">
          <div class="flex items-start gap-2">
            <span class="badge badge-green">Live</span>
            <div>
              <div class="font-medium text-slate-700">KMB Open Data</div>
              <div class="text-xs text-slate-400">data.etabus.gov.hk - Stops, routes, route-stop mapping</div>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <span class="badge badge-green">Live</span>
            <div>
              <div class="font-medium text-slate-700">CityBus / NWFB</div>
              <div class="text-xs text-slate-400">rt.data.gov.hk - CityBus stops and routes</div>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <span class="badge badge-green">Live</span>
            <div>
              <div class="font-medium text-slate-700">GMB Open Data</div>
              <div class="text-xs text-slate-400">data.etagmb.gov.hk - Green Minibus routes and stops</div>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <span class="badge badge-green">Live</span>
            <div>
              <div class="font-medium text-slate-700">MTR Open Data</div>
              <div class="text-xs text-slate-400">opendata.mtr.com.hk - Lines, stations, MTR Bus</div>
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <div class="flex items-start gap-2">
            <span class="badge badge-green">Live</span>
            <div>
              <div class="font-medium text-slate-700">NLB Open Data</div>
              <div class="text-xs text-slate-400">rt.data.gov.hk - New Lantao Bus routes and stops</div>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <span class="badge badge-blue">RVD</span>
            <div>
              <div class="font-medium text-slate-700">Rating & Valuation Dept</div>
              <div class="text-xs text-slate-400">rvd.gov.hk - Price indices, building stock, age data</div>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <span class="badge badge-amber">Scrape</span>
            <div>
              <div class="font-medium text-slate-700">28Hse.com</div>
              <div class="text-xs text-slate-400">Property listings (buy & rent)</div>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <span class="badge badge-slate">Static</span>
            <div>
              <div class="font-medium text-slate-700">Light Rail, Tram, Ferry</div>
              <div class="text-xs text-slate-400">Static data from official sources</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
