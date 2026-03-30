<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useTransportStore } from "@/stores/transport";
import { useDistrictsStore } from "@/stores/districts";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const router = useRouter();
const transportStore = useTransportStore();
const districtsStore = useDistrictsStore();

const mapContainer = ref<HTMLDivElement>();
let map: L.Map;
let districtLayer: L.GeoJSON;
let mtrLayer: L.LayerGroup;
let busLayer: L.LayerGroup;
let tramLayer: L.LayerGroup;

const layers = ref({
  districts: true,
  mtr: true,
  bus: false,
  tram: true,
});

const ZONE_COLORS: Record<string, string> = {
  hk_island: "#3b82f6",
  kowloon: "#ef4444",
  new_territories: "#22c55e",
};

const districtZoneMap: Record<string, string> = {
  A: "hk_island", B: "hk_island", C: "hk_island", D: "hk_island",
  E: "kowloon", F: "kowloon", G: "kowloon", H: "kowloon", J: "kowloon",
  K: "new_territories", L: "new_territories", M: "new_territories", N: "new_territories",
  P: "new_territories", Q: "new_territories", R: "new_territories", S: "new_territories", T: "new_territories",
};

function getDistrictColor(id: string) {
  return ZONE_COLORS[districtZoneMap[id]] || "#999";
}

async function initMap() {
  if (!mapContainer.value) return;

  map = L.map(mapContainer.value).setView([22.35, 114.15], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  // Load GeoJSON districts
  const res = await fetch("/geojson/hk-districts.geo.json");
  const geojson = await res.json();

  districtLayer = L.geoJSON(geojson, {
    style: (feature) => {
      const code = feature?.properties?.["地區號碼"] || "";
      return {
        color: getDistrictColor(code),
        weight: 2,
        fillColor: getDistrictColor(code),
        fillOpacity: 0.15,
      };
    },
    onEachFeature: (feature, layer) => {
      const code = feature.properties["地區號碼"];
      const name = feature.properties["District"];
      const nameZh = feature.properties["地區"];
      const district = districtsStore.getDistrictById(code);
      const pop = district?.population ? `<br>Pop: ${(district.population / 1000).toFixed(0)}k` : "";

      layer.bindPopup(`<strong>${name}</strong> (${nameZh})${pop}`);
      layer.on("click", () => router.push(`/district/${code}`));
      layer.on("mouseover", () => {
        (layer as any).setStyle({ fillOpacity: 0.4, weight: 3 });
      });
      layer.on("mouseout", () => {
        districtLayer.resetStyle(layer);
      });
    },
  }).addTo(map);

  // Init layer groups
  mtrLayer = L.layerGroup().addTo(map);
  busLayer = L.layerGroup();
  tramLayer = L.layerGroup().addTo(map);

  await transportStore.fetchAll();
  renderMtr();
  renderTram();

  // Load bus on demand
  map.on("moveend", () => {
    if (layers.value.bus) loadBusStops();
  });
}

function renderMtr() {
  mtrLayer.clearLayers();
  for (const line of transportStore.mtrLines) {
    // Draw line between stations
    const coords = (line.stations || [])
      .filter((s: any) => s.lat && s.lng)
      .map((s: any) => [s.lat, s.lng] as [number, number]);

    if (coords.length > 1) {
      L.polyline(coords, { color: line.color || "#666", weight: 3, opacity: 0.8 }).addTo(mtrLayer);
    }

    // Station markers
    for (const station of line.stations || []) {
      if (!station.lat || !station.lng) continue;
      L.circleMarker([station.lat, station.lng], {
        radius: 5,
        color: "#fff",
        weight: 2,
        fillColor: line.color || "#666",
        fillOpacity: 1,
      })
        .bindPopup(`<strong>${station.name_en}</strong><br>${station.name_zh}<br><small>${line.name_en}</small>`)
        .addTo(mtrLayer);
    }
  }
}

function renderTram() {
  tramLayer.clearLayers();
  const coords: [number, number][] = [];
  for (const stop of transportStore.tramStops) {
    coords.push([stop.lat, stop.lng]);
    L.circleMarker([stop.lat, stop.lng], {
      radius: 3,
      color: "#059669",
      weight: 1,
      fillColor: "#10b981",
      fillOpacity: 1,
    })
      .bindPopup(`<strong>${stop.name_en}</strong><br>${stop.name_zh}<br><small>Tram Stop</small>`)
      .addTo(tramLayer);
  }
  // Connect tram stops with a line (exclude Happy Valley branch for simplicity)
  const mainLine = coords.filter((_, i) => i < 22);
  if (mainLine.length > 1) {
    L.polyline(mainLine, { color: "#059669", weight: 2, opacity: 0.6, dashArray: "4 4" }).addTo(tramLayer);
  }
}

async function loadBusStops() {
  if (!map) return;
  const bounds = map.getBounds();
  await transportStore.fetchBusStops({
    minLat: bounds.getSouth(),
    maxLat: bounds.getNorth(),
    minLng: bounds.getWest(),
    maxLng: bounds.getEast(),
  });
  busLayer.clearLayers();
  for (const stop of transportStore.busStops) {
    L.circleMarker([stop.lat, stop.lng], {
      radius: 2,
      color: "#f59e0b",
      fillColor: "#f59e0b",
      fillOpacity: 0.6,
    })
      .bindPopup(`<strong>${stop.name_en}</strong><br>${stop.name_zh}<br><small>${stop.operator.toUpperCase()}</small>`)
      .addTo(busLayer);
  }
}

function toggleLayer(key: keyof typeof layers.value) {
  layers.value[key] = !layers.value[key];
  if (!map) return;

  const layerMap: Record<string, L.LayerGroup | L.GeoJSON> = {
    districts: districtLayer,
    mtr: mtrLayer,
    bus: busLayer,
    tram: tramLayer,
  };

  const layer = layerMap[key];
  if (!layer) return;

  if (layers.value[key]) {
    map.addLayer(layer);
    if (key === "bus") loadBusStops();
  } else {
    map.removeLayer(layer);
  }
}

onMounted(initMap);
</script>

<template>
  <div class="relative h-[calc(100vh-7rem)]">
    <div ref="mapContainer" class="absolute inset-0"></div>

    <!-- Layer controls -->
    <div class="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-md p-3 space-y-2 text-sm">
      <div class="font-semibold text-gray-700 text-xs uppercase">Layers</div>
      <label v-for="(val, key) in layers" :key="key" class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" :checked="val" @change="toggleLayer(key as any)" class="rounded" />
        <span class="capitalize">{{ key === "mtr" ? "MTR" : key }}</span>
      </label>
    </div>

    <!-- Legend -->
    <div class="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-md p-3 text-xs space-y-1">
      <div class="font-semibold text-gray-700">Legend</div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-blue-500"></span> HK Island
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-red-500"></span> Kowloon
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-green-500"></span> New Territories
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-0.5 bg-emerald-600"></span> Tram Line
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-amber-500 border border-amber-600"></span> Bus Stops
      </div>
    </div>
  </div>
</template>
