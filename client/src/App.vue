<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { RouterView, RouterLink, useRoute } from "vue-router";
import { useDistrictsStore } from "@/stores/districts";

const route = useRoute();
const districtsStore = useDistrictsStore();
const sidebarOpen = ref(true);

onMounted(() => {
  districtsStore.fetchAll();
});

const navItems = [
  { path: "/", label: "Dashboard", icon: "dashboard" },
  { path: "/map", label: "Map Explorer", icon: "map" },
  { path: "/properties", label: "Properties", icon: "properties" },
  { path: "/transport", label: "Transport", icon: "transport" },
  { path: "/analytics", label: "Analytics", icon: "analytics" },
  { path: "/admin", label: "Data Manager", icon: "admin" },
];

function isActive(path: string) {
  if (path === "/") return route.path === "/";
  return route.path.startsWith(path);
}
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside
      class="fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-40 flex flex-col transition-all duration-300 shadow-sm"
      :style="{ width: sidebarOpen ? '240px' : '64px' }"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center px-4 border-b border-slate-100">
        <RouterLink to="/" class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div v-if="sidebarOpen" class="min-w-0">
            <div class="text-sm font-bold text-slate-800 truncate">HK Property</div>
            <div class="text-[10px] text-slate-400 font-medium">Dashboard</div>
          </div>
        </RouterLink>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="isActive(item.path) ? 'nav-link-active' : 'nav-link-inactive'"
        >
          <!-- Dashboard -->
          <svg v-if="item.icon === 'dashboard'" class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <!-- Map -->
          <svg v-else-if="item.icon === 'map'" class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <!-- Properties -->
          <svg v-else-if="item.icon === 'properties'" class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <!-- Transport -->
          <svg v-else-if="item.icon === 'transport'" class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M8 6v6m7-6v6M2 12h20M6 18h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2zm1 0l-1 3m12-3l1 3" />
          </svg>
          <!-- Analytics -->
          <svg v-else-if="item.icon === 'analytics'" class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 20V10M12 20V4M6 20v-6" stroke-linecap="round" />
          </svg>
          <!-- Admin -->
          <svg v-else-if="item.icon === 'admin'" class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2m0 18v2m-9-11h2m18 0h2m-3.3-6.7l-1.4 1.4M6.7 17.3l-1.4 1.4m0-13.4l1.4 1.4m10.6 10.6l1.4 1.4" />
          </svg>
          <span v-if="sidebarOpen" class="truncate">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- Collapse toggle -->
      <div class="p-3 border-t border-slate-100">
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <svg class="w-5 h-5 transition-transform" :class="{ 'rotate-180': !sidebarOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main
      class="flex-1 min-h-screen transition-all duration-300"
      :style="{ marginLeft: sidebarOpen ? '240px' : '64px' }"
    >
      <RouterView />
    </main>
  </div>
</template>
