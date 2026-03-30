<script setup lang="ts">
import { onMounted, watch } from "vue";
import { usePropertiesStore } from "@/stores/properties";
import { useDistrictsStore } from "@/stores/districts";

const propertiesStore = usePropertiesStore();
const districtsStore = useDistrictsStore();

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

function formatPrice(price: number | null, type: string): string {
  if (!price) return "N/A";
  if (type === "buy") {
    if (price >= 10000000) return `$${(price / 10000000).toFixed(1)}M`;
    if (price >= 10000) return `$${(price / 10000).toFixed(0)}万`;
    return `$${price.toLocaleString()}`;
  }
  return `$${price.toLocaleString()}/mo`;
}
</script>

<template>
  <div class="max-w-screen-2xl mx-auto p-4">
    <!-- Filters -->
    <div class="bg-white rounded-lg p-4 shadow-sm border mb-4">
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div>
          <label class="text-xs text-gray-500 block mb-1">Type</label>
          <select v-model="propertiesStore.filters.listingType" @change="applyFilters" class="w-full border rounded px-2 py-1.5 text-sm">
            <option value="">All</option>
            <option value="buy">Buy</option>
            <option value="rent">Rent</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 block mb-1">Zone</label>
          <select v-model="propertiesStore.filters.zoneId" @change="propertiesStore.filters.districtId = ''; applyFilters()" class="w-full border rounded px-2 py-1.5 text-sm">
            <option value="">All Zones</option>
            <option v-for="z in districtsStore.zones" :key="z.id" :value="z.id">{{ z.name_en }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 block mb-1">District</label>
          <select v-model="propertiesStore.filters.districtId" @change="applyFilters" class="w-full border rounded px-2 py-1.5 text-sm">
            <option value="">All Districts</option>
            <option
              v-for="d in propertiesStore.filters.zoneId ? districtsStore.getDistrictsByZone(propertiesStore.filters.zoneId) : districtsStore.districts"
              :key="d.id"
              :value="d.id"
            >
              {{ d.name_en }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 block mb-1">Min Price</label>
          <input v-model="propertiesStore.filters.priceMin" @change="applyFilters" type="number" placeholder="Min" class="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label class="text-xs text-gray-500 block mb-1">Max Price</label>
          <input v-model="propertiesStore.filters.priceMax" @change="applyFilters" type="number" placeholder="Max" class="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label class="text-xs text-gray-500 block mb-1">Sort</label>
          <select v-model="propertiesStore.filters.sortBy" @change="applyFilters" class="w-full border rounded px-2 py-1.5 text-sm">
            <option value="date">Latest</option>
            <option value="price">Price</option>
            <option value="area">Area</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Results count -->
    <div class="text-sm text-gray-500 mb-3">
      {{ propertiesStore.total.toLocaleString() }} properties found
      <span v-if="propertiesStore.total === 0" class="ml-2 text-amber-600">
        (Run the scraper to populate data)
      </span>
    </div>

    <!-- Property list -->
    <div class="space-y-3">
      <div
        v-for="p in propertiesStore.properties"
        :key="p.id"
        class="bg-white rounded-lg p-4 shadow-sm border flex gap-4 hover:shadow-md transition-shadow"
      >
        <div class="flex-1">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-semibold text-gray-800">{{ p.estate_name || 'Property' }}</h3>
              <p class="text-sm text-gray-500">{{ p.district_name }} ({{ p.district_name_zh }})</p>
            </div>
            <div class="text-right">
              <div class="font-bold text-lg text-blue-700">
                {{ formatPrice(p.price, p.listing_type) }}
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full" :class="p.listing_type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'">
                {{ p.listing_type === 'buy' ? 'For Sale' : 'For Rent' }}
              </span>
            </div>
          </div>
          <div class="mt-2 flex gap-4 text-sm text-gray-600">
            <span v-if="p.area_usable">📐 {{ p.area_usable }} sq ft</span>
            <span v-if="p.bedrooms !== null">🛏️ {{ p.bedrooms }} bed</span>
            <span v-if="p.price_per_sqft">💰 ${{ Math.round(p.price_per_sqft).toLocaleString() }}/sqft</span>
          </div>
          <a v-if="p.source_url" :href="p.source_url" target="_blank" class="text-xs text-blue-500 hover:underline mt-1 inline-block">
            View on 28Hse →
          </a>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="propertiesStore.totalPages > 1" class="mt-4 flex justify-center gap-2">
      <button
        v-for="p in Math.min(propertiesStore.totalPages, 10)"
        :key="p"
        @click="goToPage(p)"
        class="px-3 py-1 text-sm rounded border"
        :class="p === propertiesStore.page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'"
      >
        {{ p }}
      </button>
    </div>
  </div>
</template>
