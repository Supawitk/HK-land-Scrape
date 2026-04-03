<script setup lang="ts">
import { onMounted, computed } from "vue";
import { usePropertiesStore } from "@/stores/properties";
import { useDistrictsStore } from "@/stores/districts";

const ps = usePropertiesStore();
const ds = useDistrictsStore();

onMounted(async () => { await ds.fetchAll(); await ps.fetchProperties(); });

function apply() { ps.fetchProperties(1); }
function goPage(p: number) { ps.fetchProperties(p); }
function reset() {
  Object.assign(ps.filters, { listingType:"",districtId:"",zoneId:"",priceMin:"",priceMax:"",areaMin:"",areaMax:"",bedrooms:"",sortBy:"date",sortOrder:"desc" });
  apply();
}

function fmtPrice(p: number|null, t: string) {
  if (!p) return "N/A";
  if (t==="buy") return p>=1e6 ? `HK$${(p/1e6).toFixed(1)}M` : `HK$${p.toLocaleString()}`;
  return `HK$${p.toLocaleString()}/mo`;
}

const hasFilter = computed(() => { const f=ps.filters; return f.listingType||f.districtId||f.zoneId||f.priceMin||f.priceMax||f.bedrooms; });
const pages = computed(() => { const r=[]; const s=Math.max(1,ps.page-3); const e=Math.min(ps.totalPages,s+6); for(let i=s;i<=e;i++) r.push(i); return r; });
</script>

<template>
  <div class="px-5 py-5 max-w-[1400px]">
    <h1 class="page-title mb-1">Properties</h1>
    <p class="text-[12px] text-[#9ca3af] mb-5">Scraped from 28Hse.com</p>

    <!-- Filters -->
    <div class="card mb-4">
      <div class="grid grid-cols-7 gap-2">
        <div><div class="label mb-1">Type</div><select v-model="ps.filters.listingType" @change="apply" class="select"><option value="">All</option><option value="buy">Buy</option><option value="rent">Rent</option></select></div>
        <div><div class="label mb-1">Zone</div><select v-model="ps.filters.zoneId" @change="ps.filters.districtId='';apply()" class="select"><option value="">All</option><option v-for="z in ds.zones" :key="z.id" :value="z.id">{{ z.name_en }}</option></select></div>
        <div><div class="label mb-1">District</div><select v-model="ps.filters.districtId" @change="apply" class="select"><option value="">All</option><option v-for="d in ps.filters.zoneId?ds.getDistrictsByZone(ps.filters.zoneId):ds.districts" :key="d.id" :value="d.id">{{ d.name_en }}</option></select></div>
        <div><div class="label mb-1">Min Price</div><input v-model="ps.filters.priceMin" @change="apply" type="number" placeholder="Min" class="input" /></div>
        <div><div class="label mb-1">Max Price</div><input v-model="ps.filters.priceMax" @change="apply" type="number" placeholder="Max" class="input" /></div>
        <div><div class="label mb-1">Beds</div><select v-model="ps.filters.bedrooms" @change="apply" class="select"><option value="">Any</option><option value="0">Studio</option><option v-for="n in 4" :key="n" :value="n">{{ n }}</option></select></div>
        <div><div class="label mb-1">Sort</div><select v-model="ps.filters.sortBy" @change="apply" class="select"><option value="date">Latest</option><option value="price">Price</option><option value="area">Area</option></select></div>
      </div>
      <div v-if="hasFilter" class="mt-2 pt-2 border-t border-[#e5e7eb]"><button @click="reset" class="text-[12px] text-[#2563eb] font-medium">Clear filters</button></div>
    </div>

    <div class="text-[12px] text-[#6b7280] mb-3"><span class="font-semibold text-[#111827]">{{ ps.total.toLocaleString() }}</span> properties</div>

    <!-- List -->
    <div class="space-y-2">
      <div v-for="p in ps.properties" :key="p.id" class="card flex items-start justify-between gap-4 hover:border-[#d1d5db] transition-colors">
        <div class="min-w-0">
          <div class="text-[13px] font-medium text-[#111827] truncate">{{ p.estate_name || 'Property' }}</div>
          <div class="text-[12px] text-[#9ca3af]">{{ p.district_name }}</div>
          <div class="flex gap-3 mt-1 text-[12px] text-[#6b7280]">
            <span v-if="p.area_usable">{{ p.area_usable }} sqft</span>
            <span v-if="p.bedrooms!==null">{{ p.bedrooms }} bed</span>
            <span v-if="p.price_per_sqft">${{ Math.round(p.price_per_sqft).toLocaleString() }}/sqft</span>
          </div>
          <a v-if="p.source_url" :href="p.source_url" target="_blank" rel="noopener" class="text-[11px] text-[#2563eb] mt-1 inline-block">View source &rarr;</a>
        </div>
        <div class="text-right flex-shrink-0">
          <div class="text-[15px] font-semibold text-[#111827]">{{ fmtPrice(p.price,p.listing_type) }}</div>
          <span class="badge" :class="p.listing_type==='buy'?'badge-green':'badge-purple'">{{ p.listing_type==='buy'?'Sale':'Rent' }}</span>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-if="!ps.loading && !ps.properties.length" class="text-center py-16 text-[#9ca3af] text-[13px]">No properties found. Run the scraper to populate data.</div>

    <!-- Pagination -->
    <div v-if="ps.totalPages>1" class="flex justify-center gap-1 mt-5">
      <button v-for="p in pages" :key="p" @click="goPage(p)" class="btn btn-sm" :class="p===ps.page?'btn-primary':'btn-secondary'">{{ p }}</button>
    </div>
  </div>
</template>
