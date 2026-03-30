<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView, RouterLink, useRoute } from "vue-router";
import { useDistrictsStore } from "@/stores/districts";

const route = useRoute();
const districtsStore = useDistrictsStore();

onMounted(() => {
  districtsStore.fetchAll();
});

const navItems = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/map", label: "Map", icon: "🗺️" },
  { path: "/properties", label: "Properties", icon: "🏠" },
];
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <RouterLink to="/" class="flex items-center gap-2 font-bold text-lg text-gray-800">
          <span>🏘️</span>
          <span>HK Property Dashboard</span>
        </RouterLink>
        <nav class="flex items-center gap-1">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            :class="route.path === item.path ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
          >
            {{ item.icon }} {{ item.label }}
          </RouterLink>
        </nav>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 py-3 text-center text-xs text-gray-500">
      HK Property Dashboard &mdash; Data from 28Hse, DATA.GOV.HK, MTR, KMB, Citybus
    </footer>
  </div>
</template>
