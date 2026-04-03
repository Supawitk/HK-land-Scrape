<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApi } from "@/composables/useApi";

const api = useApi();
const status = ref<any>(null);
const transport = ref<any>(null);
const scraping = ref(false);
const ingesting = ref(false);
const ingestingPop = ref(false);
const ingestingAmen = ref(false);
const scrapeResult = ref<any>(null);
const ingestResult = ref<any>(null);
const popResult = ref<any>(null);
const amenResult = ref<any>(null);
const scrapeType = ref("buy");
const logs = ref<string[]>([]);

onMounted(refresh);

async function refresh() {
  [status.value, transport.value] = await Promise.all([api.getScraperStatus(), api.getTransportSummary()]);
}

function log(msg: string) { logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`); if (logs.value.length > 50) logs.value.pop(); }

async function runScrape() { scraping.value = true; scrapeResult.value = null; log(`Scraping ${scrapeType.value}...`); try { scrapeResult.value = await api.runScraper(scrapeType.value); log(`Done: ${scrapeResult.value.count||0} listings`); await refresh(); } catch (e: any) { log(`Error: ${e.message}`); scrapeResult.value = { error: e.message }; } finally { scraping.value = false; } }
async function runIngest() { ingesting.value = true; ingestResult.value = null; log("Ingesting transport..."); try { ingestResult.value = await api.ingestTransport(); log("Transport done!"); await refresh(); } catch (e: any) { log(`Error: ${e.message}`); ingestResult.value = { error: e.message }; } finally { ingesting.value = false; } }
async function runPop() { ingestingPop.value = true; popResult.value = null; log("Loading population..."); try { popResult.value = await api.ingestPopulation(); log("Population done!"); await refresh(); } catch (e: any) { log(`Error: ${e.message}`); popResult.value = { error: e.message }; } finally { ingestingPop.value = false; } }
async function runAmen() { ingestingAmen.value = true; amenResult.value = null; log("Loading schools & hospitals..."); try { amenResult.value = await api.ingestAmenities(); log("Amenities done!"); await refresh(); } catch (e: any) { log(`Error: ${e.message}`); amenResult.value = { error: e.message }; } finally { ingestingAmen.value = false; } }

const counts = computed(() => {
  if (!status.value?.counts) return [];
  const c = status.value.counts;
  return [{ l: "Properties", v: c.properties }, { l: "MTR", v: c.mtr_stations }, { l: "Bus", v: c.bus_stops }, { l: "Tram", v: c.tram_stops }, { l: "LRT", v: c.light_rail_stops }, { l: "Ferry", v: c.ferry_piers }, { l: "Schools", v: c.schools }, { l: "Hospitals", v: c.hospitals }, { l: "Population", v: c.population_records }];
});
const busOps = computed(() => status.value?.counts?.bus_by_operator || []);
</script>

<template>
  <div class="p-6 max-w-[1100px]">
    <h1 class="page-title mb-5">Data Manager</h1>

    <!-- Counts -->
    <div class="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 mb-5">
      <div v-for="c in counts" :key="c.l" class="card text-center"><div class="text-[10px] text-[#9ca3af]">{{ c.l }}</div><div class="text-[16px] font-semibold">{{ (c.v||0).toLocaleString() }}</div></div>
    </div>

    <!-- Bus operators -->
    <div v-if="busOps.length" class="card mb-5">
      <div class="section-title mb-2">Bus by Operator</div>
      <div class="flex gap-3">
        <div v-for="op in busOps" :key="op.operator" class="text-[12px]"><span class="font-medium text-[#374151]">{{ op.operator.toUpperCase() }}</span> <span class="text-[#9ca3af]">{{ op.count?.toLocaleString() }}</span></div>
      </div>
    </div>

    <!-- Actions -->
    <div class="grid grid-cols-2 gap-4 mb-5">
      <div class="card">
        <div class="section-title mb-1">Property Scraper</div>
        <div class="text-[11px] text-[#9ca3af] mb-3">Scrape listings from 28Hse.com</div>
        <div class="flex gap-2">
          <select v-model="scrapeType" class="select w-20" :disabled="scraping"><option value="buy">Buy</option><option value="rent">Rent</option></select>
          <button @click="runScrape" :disabled="scraping" class="btn btn-primary" :class="{'opacity-50':scraping}">{{ scraping?'Running...':'Run' }}</button>
        </div>
        <div v-if="scrapeResult" class="mt-2 text-[12px] p-2 rounded-md" :class="scrapeResult.error?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'">{{ scrapeResult.error||`${scrapeResult.count||0} listings` }}</div>
      </div>
      <div class="card">
        <div class="section-title mb-1">Transport Data</div>
        <div class="text-[11px] text-[#9ca3af] mb-3">MTR, KMB, CityBus, GMB, NLB, LRT, Ferry</div>
        <button @click="runIngest" :disabled="ingesting" class="btn btn-primary" :class="{'opacity-50':ingesting}">{{ ingesting?'Running...':'Refresh' }}</button>
        <div v-if="ingestResult" class="mt-2 text-[12px] p-2 rounded-md" :class="ingestResult.error?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'">{{ ingestResult.error||'Done!' }}</div>
      </div>
      <div class="card">
        <div class="section-title mb-1">Population</div>
        <div class="text-[11px] text-[#9ca3af] mb-3">2021 census + 2025 mid-year estimates</div>
        <button @click="runPop" :disabled="ingestingPop" class="btn btn-primary" :class="{'opacity-50':ingestingPop}">{{ ingestingPop?'Loading...':'Load' }}</button>
        <div v-if="popResult" class="mt-2 text-[12px] p-2 rounded-md" :class="popResult.error?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'">{{ popResult.error||'Done!' }}</div>
      </div>
      <div class="card">
        <div class="section-title mb-1">Schools & Hospitals</div>
        <div class="text-[11px] text-[#9ca3af] mb-3">EDB schools + HA hospitals/clinics</div>
        <button @click="runAmen" :disabled="ingestingAmen" class="btn btn-primary" :class="{'opacity-50':ingestingAmen}">{{ ingestingAmen?'Loading...':'Load' }}</button>
        <div v-if="amenResult" class="mt-2 text-[12px] p-2 rounded-md" :class="amenResult.error?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'">{{ amenResult.error||'Done!' }}</div>
      </div>
    </div>

    <!-- Log -->
    <div class="card">
      <div class="section-title mb-2">Log</div>
      <div v-if="logs.length" class="bg-[#111827] rounded-md p-3 font-mono text-[11px] text-[#d1d5db] max-h-48 overflow-y-auto space-y-0.5"><div v-for="(l,i) in logs" :key="i">{{ l }}</div></div>
      <div v-else class="text-[12px] text-[#9ca3af] text-center py-6">No activity</div>
    </div>
  </div>
</template>
