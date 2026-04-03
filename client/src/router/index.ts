import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "dashboard",
      component: () => import("@/pages/DashboardPage.vue"),
    },
    {
      path: "/map",
      name: "map",
      component: () => import("@/pages/MapPage.vue"),
    },
    {
      path: "/properties",
      name: "properties",
      component: () => import("@/pages/PropertiesPage.vue"),
    },
    {
      path: "/transport",
      name: "transport",
      component: () => import("@/pages/TransportPage.vue"),
    },
    {
      path: "/analytics",
      name: "analytics",
      component: () => import("@/pages/AnalyticsPage.vue"),
    },
    {
      path: "/tools",
      name: "tools",
      component: () => import("@/pages/ToolsPage.vue"),
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("@/pages/AdminPage.vue"),
    },
    {
      path: "/district/:id",
      name: "district",
      component: () => import("@/pages/DistrictDetailPage.vue"),
    },
  ],
});
