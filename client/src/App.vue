<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView, RouterLink, useRoute } from "vue-router";
import { useDistrictsStore } from "@/stores/districts";

const route = useRoute();
const districtsStore = useDistrictsStore();

onMounted(() => { districtsStore.fetchAll(); });

const nav = [
  { path: "/", label: "Dashboard" },
  { path: "/map", label: "Map" },
  { path: "/properties", label: "Properties" },
  { path: "/transport", label: "Transport" },
  { path: "/analytics", label: "Analytics" },
  { path: "/tools", label: "Tools" },
  { path: "/admin", label: "Data" },
];

function isActive(path: string) {
  if (path === "/") return route.path === "/";
  return route.path.startsWith(path);
}
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside class="fixed top-0 left-0 h-full w-[200px] bg-white border-r border-[#e5e7eb] z-40 flex flex-col">
      <!-- Logo -->
      <div class="h-12 flex items-center px-4 border-b border-[#e5e7eb]">
        <RouterLink to="/" class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-md bg-[#111827] flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          </div>
          <span class="text-[13px] font-semibold text-[#111827]">HK Property</span>
        </RouterLink>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-2 py-3 space-y-0.5">
        <RouterLink
          v-for="item in nav" :key="item.path" :to="item.path"
          class="nav-item" :class="{ 'nav-item-active': isActive(item.path) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="px-3 py-3 border-t border-[#e5e7eb]">
        <div class="text-[10px] text-[#9ca3af]">v1.2 &middot; DATA.GOV.HK</div>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 ml-[200px] min-h-screen">
      <RouterView />
    </main>
  </div>
</template>
