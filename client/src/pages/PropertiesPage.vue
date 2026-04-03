<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { usePropertiesStore } from "@/stores/properties";
import { useDistrictsStore } from "@/stores/districts";

const propertiesStore = usePropertiesStore();
const districtsStore = useDistrictsStore();
const viewMode = ref<"list" | "grid">("list");

onMounted(async () => {
  await districtsStore.fetchAll();
  await propertiesStore.fetchProperties();
});

function applyFilters() {
  propertiesStore.fetchProperties(1);
}

function goToPage(p: number) {
  propertiesStore.fetchProperties(p);
}

function resetFilters() {
  Object.assign(propertiesStore.filters, {
    listingType: "", districtId: "", zoneId: "", priceMin: "", priceMax: "", areaMin: "", areaMax: "", bedrooms: "", sortBy: "date", sortOrder: "desc",
  });
  applyFilters();
}

function formatPrice(price: number | null, type: string): string {
  if (!price) return "N/A";
  if (type === "buy") {
    if (price >= 10000000) return `HK$${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000000) return `HK$${(price / 1000000).toFixed(2)}M`;
    return `HK$${price.toLocaleString()}`;
  }
  return `HK$${price.toLocaleString()}/mo`;
}

const hasFilters = computed(() => {
  const f = propertiesStore.filters;
  return f.listingType || f.districtId || f.zoneId || f.priceMin || f.priceMax || f.areaMin || f.areaMax || f.bedrooms;
});

const pageRange = computed(() => {
  const total = propertiesStore.totalPages;
  const current = propertiesStore.page;
  const range: number[] = [];
  const start = Math.max(1, current - 3);
  const end = Math.min(total, start + 6);
  for (let i = start; i <= end; i++) range.push(i);
  return range;
});
</script>

<template>
  <div class="p-6 max-w-screen-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="page-title">Properties</h1>
        <p class="text-sm text-slate-500 mt-1">Browse scraped property listings from 28Hse</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="viewMode = 'list'" class="btn btn-sm" :class="viewMode === 'list' ? 'btn-primary' : 'btn-secondary'">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
        </button>
        <button @click="viewMode = 'grid'" class="btn btn-sm" :class="viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="stat-card mb-5">
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div>
          <label class="text-[10px] font-medium text-slate-400 uppercase block mb-1">Type</label>
          <select v-model="propertiesStore.filters.listingType" @change="applyFilters" class="select">
            <option value="">All</option>
            <option value="buy">Buy</option>
            <option value="rent">Rent</option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-medium text-slate-400 uppercase block mb-1">Zone</label>
          <select v-model="propertiesStore.filters.zoneId" @change="propertiesStore.filters.districtId = ''; applyFilters()" class="select">
            <option value="">All Zones</option>
            <option v-for="z in districtsStore.zones" :key="z.id" :value="z.id">{{ z.name_en }}</option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-medium text-slate-400 uppercase block mb-1">District</label>
          <select v-model="propertiesStore.filters.districtId" @change="applyFilters" class="select">
            <option value="">All</option>
            <option v-for="d in propertiesStore.filters.zoneId ? districtsStore.getDistrictsByZone(propertiesStore.filters.zoneId) : districtsStore.districts" :key="d.id" :value="d.id">
              {{ d.name_en }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-medium text-slate-400 uppercase block mb-1">Min Price</label>
          <input v-model="propertiesStore.filters.priceMin" @change="applyFilters" type="number" placeholder="Min" class="input" />
        </div>
        <div>
          <label class="text-[10px] font-medium text-slate-400 uppercase block mb-1">Max Price</label>
          <input v-model="propertiesStore.filters.priceMax" @change="applyFilters" type="number" placeholder="Max" class="input" />
        </div>
        <div>
          <label class="text-[10px] font-medium text-slate-400 uppercase block mb-1">Bedrooms</label>
          <select v-model="propertiesStore.filters.bedrooms" @change="applyFilters" class="select">
            <option value="">Any</option>
            <option value="0">Studio</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4+</option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-medium text-slate-400 uppercase block mb-1">Sort</label>
          <select v-model="propertiesStore.filters.sortBy" @change="applyFilters" class="select">
            <option value="date">Latest</option>
            <option value="price">Price</option>
            <option value="area">Area</option>
          </select>
        </div>
      </div>
      <div v-if="hasFilters" class="mt-3 pt-3 border-t border-slate-100">
        <button @click="resetFilters" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Clear all filters</button>
      </div>
    </div>

    <!-- Results count -->
    <div class="flex items-center justify-between mb-4">
      <p class="text-sm text-slate-500">
        <span class="font-semibold text-slate-700">{{ propertiesStore.total.toLocaleString() }}</span> properties found
      </p>
      <p v-if="propertiesStore.total === 0" class="text-sm text-amber-600">
        Run the scraper in Data Manager to populate listings
      </p>
    </div>

    <!-- List View -->
    <div v-if="viewMode === 'list'" class="space-y-3">
      <div
        v-for="p in propertiesStore.properties"
        :key="p.id"
        class="stat-card flex gap-4 hover:shadow-md transition-all duration-200"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h3 class="font-semibold text-slate-800 truncate">{{ p.estate_name || 'Property' }}</h3>
              <p class="text-sm text-slate-400">{{ p.district_name }} {{ p.district_name_zh }}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <div class="text-lg font-bold text-indigo-600">{{ formatPrice(p.price, p.listing_type) }}</div>
              <span class="badge" :class="p.listing_type === 'buy' ? 'badge-green' : 'badge-purple'">
                {{ p.listing_type === 'buy' ? 'Sale' : 'Rent' }}
              </span>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
            <span v-if="p.area_usable" class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
              {{ p.area_usable }} sqft
            </span>
            <span v-if="p.bedrooms !== null" class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v11m0-4h18m0-3v7M7 11V7h10v4" /></svg>
              {{ p.bedrooms }} bed
            </span>
            <span v-if="p.price_per_sqft" class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20m5-17H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H7" /></svg>
              ${{ Math.round(p.price_per_sqft).toLocaleString() }}/sqft
            </span>
          </div>
          <a v-if="p.source_url" :href="p.source_url" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-2">
            View on 28Hse
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3" /></svg>
          </a>
        </div>
      </div>
    </div>

    <!-- Grid View -->
    <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="p in propertiesStore.properties"
        :key="p.id"
        class="stat-card hover:shadow-md transition-all duration-200"
      >
        <div class="flex items-start justify-between mb-3">
          <span class="badge" :class="p.listing_type === 'buy' ? 'badge-green' : 'badge-purple'">
            {{ p.listing_type === 'buy' ? 'Sale' : 'Rent' }}
          </span>
          <span class="text-lg font-bold text-indigo-600">{{ formatPrice(p.price, p.listing_type) }}</span>
        </div>
        <h3 class="font-semibold text-slate-800 truncate">{{ p.estate_name || 'Property' }}</h3>
        <p class="text-xs text-slate-400 mb-3">{{ p.district_name }}</p>
        <div class="flex gap-3 text-xs text-slate-500">
          <span v-if="p.area_usable">{{ p.area_usable }} sqft</span>
          <span v-if="p.bedrooms !== null">{{ p.bedrooms }} bed</span>
          <span v-if="p.price_per_sqft">${{ Math.round(p.price_per_sqft).toLocaleString() }}/sqft</span>
        </div>
        <a v-if="p.source_url" :href="p.source_url" target="_blank" rel="noopener" class="text-xs text-indigo-500 hover:text-indigo-700 mt-2 inline-block">
          View on 28Hse &rarr;
        </a>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!propertiesStore.loading && propertiesStore.properties.length === 0" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <p class="text-slate-400 mt-4">No properties found</p>
      <p class="text-sm text-slate-300">Try adjusting your filters or run the scraper</p>
    </div>

    <!-- Pagination -->
    <div v-if="propertiesStore.totalPages > 1" class="mt-6 flex justify-center items-center gap-1">
      <button @click="goToPage(propertiesStore.page - 1)" :disabled="propertiesStore.page <= 1" class="btn btn-sm btn-secondary" :class="{ 'opacity-50 cursor-not-allowed': propertiesStore.page <= 1 }">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <button
        v-for="p in pageRange"
        :key="p"
        @click="goToPage(p)"
        class="btn btn-sm"
        :class="p === propertiesStore.page ? 'btn-primary' : 'btn-secondary'"
      >
        {{ p }}
      </button>
      <button @click="goToPage(propertiesStore.page + 1)" :disabled="propertiesStore.page >= propertiesStore.totalPages" class="btn btn-sm btn-secondary" :class="{ 'opacity-50 cursor-not-allowed': propertiesStore.page >= propertiesStore.totalPages }">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  </div>
</template>
