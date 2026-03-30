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
      path: "/district/:id",
      name: "district",
      component: () => import("@/pages/DistrictDetailPage.vue"),
    },
  ],
});
