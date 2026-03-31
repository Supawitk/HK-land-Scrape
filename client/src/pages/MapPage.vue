<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useTransportStore } from "@/stores/transport";
import { useDistrictsStore } from "@/stores/districts";
import { useApi } from "@/composables/useApi";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const router = useRouter();
const transportStore = useTransportStore();
const districtsStore = useDistrictsStore();
const api = useApi();

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

const heatmapMetric = ref("none");
const heatmapData = ref<any[]>([]);

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

function getHeatColor(value: number, min: number, max: number): string {
  if (max === min) return "#fef3c7";
  const t = (value - min) / (max - min);
  // Yellow to orange to red
  const r = 255;
  const g = Math.round(255 * (1 - t * 0.8));
  const b = Math.round(60 * (1 - t));
  return `rgb(${r},${g},${b})`;
}

function getHeatmapValue(districtId: string): number | null {
  const d = heatmapData.value.find((h: any) => h.id === districtId);
  if (!d) return null;
  switch (heatmapMetric.value) {
    case "stock": return d.domestic_stock || 0;
    case "office": return d.office_stock || 0;
    case "vacancy": return d.domestic_vacancy || 0;
    case "price": return d.avg_price_per_sqft || 0;
    default: return null;
  }
}

async function loadHeatmap() {
  if (heatmapMetric.value === "none") {
    heatmapData.value = [];
    updateDistrictStyles();
    return;
  }
  const metricMap: Record<string, string> = {
    stock: "stock", office: "stock", vacancy: "vacancy", price: "price",
  };
  const apiMetric = metricMap[heatmapMetric.value] || heatmapMetric.value;
  heatmapData.value = await api.getHeatmap(apiMetric);
  updateDistrictStyles();
}

function updateDistrictStyles() {
  if (!districtLayer) return;
  districtLayer.eachLayer((layer: any) => {
    const code = layer.feature?.properties?.["地區號碼"];
    if (!code) return;

    if (heatmapMetric.value === "none") {
      layer.setStyle({
        color: getDistrictColor(code),
        weight: 2,
        fillColor: getDistrictColor(code),
        fillOpacity: 0.15,
      });
    } else {
      const val = getHeatmapValue(code);
      const allVals = heatmapData.value
        .map((d: any) => getHeatmapValue(d.id))
        .filter((v): v is number => v !== null && v > 0);
      const min = Math.min(...allVals);
      const max = Math.max(...allVals);
      const color = val && val > 0 ? getHeatColor(val, min, max) : "#e5e7eb";
      layer.setStyle({
        color: "#666",
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.6,
      });
    }
  });
}

watch(heatmapMetric, loadHeatmap);

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

      layer.on("click", () => router.push(`/district/${code}`));
      layer.on("mouseover", (e: any) => {
        const val = getHeatmapValue(code);
        let tooltip = `<strong>${name}</strong> (${nameZh})`;
        if (district?.listing_count) tooltip += `<br>Listings: ${district.listing_count}`;
        if (val !== null && heatmapMetric.value !== "none") {
          const label: Record<string, string> = {
            stock: "Domestic Units", office: "Office Units",
            vacancy: "Vacancy %", price: "Avg $/sqft",
          };
          tooltip += `<br>${label[heatmapMetric.value] || ""}: ${typeof val === 'number' ? val.toLocaleString() : val}`;
        }
        layer.bindPopup(tooltip).openPopup();
        (layer as any).setStyle({ weight: 3, fillOpacity: heatmapMetric.value === "none" ? 0.4 : 0.75 });
      });
      layer.on("mouseout", () => {
        updateDistrictStyles();
        layer.closePopup();
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

  map.on("moveend", () => {
    if (layers.value.bus) loadBusStops();
  });
}

function renderMtr() {
  mtrLayer.clearLayers();
  for (const line of transportStore.mtrLines) {
    const coords = (line.stations || [])
      .filter((s: any) => s.lat && s.lng)
      .map((s: any) => [s.lat, s.lng] as [number, number]);

    if (coords.length > 1) {
      L.polyline(coords, { color: line.color || "#666", weight: 3, opacity: 0.8 }).addTo(mtrLayer);
    }

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
    const color = stop.operator === "gmb" ? "#8b5cf6" : "#f59e0b";
    L.circleMarker([stop.lat, stop.lng], {
      radius: 2,
      color,
      fillColor: color,
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
    <div class="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-md p-3 space-y-3 text-sm w-48">
      <div class="font-semibold text-gray-700 text-xs uppercase">Layers</div>
      <label v-for="(val, key) in layers" :key="key" class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" :checked="val" @change="toggleLayer(key as any)" class="rounded" />
        <span class="capitalize">{{ key === "mtr" ? "MTR" : key === "bus" ? "Bus (KMB/CTB/GMB)" : key }}</span>
      </label>

      <div class="border-t pt-2">
        <div class="font-semibold text-gray-700 text-xs uppercase mb-1">Heatmap</div>
        <select v-model="heatmapMetric" class="w-full border rounded px-2 py-1 text-xs">
          <option value="none">None (zone colors)</option>
          <option value="stock">Domestic Units</option>
          <option value="office">Office Units</option>
          <option value="vacancy">Vacancy Rate</option>
          <option value="price">Avg Price/sqft</option>
        </select>
      </div>
    </div>

    <!-- Legend -->
    <div class="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-md p-3 text-xs space-y-1">
      <div class="font-semibold text-gray-700">Legend</div>
      <template v-if="heatmapMetric === 'none'">
        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-blue-500"></span> HK Island</div>
        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-red-500"></span> Kowloon</div>
        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-green-500"></span> New Territories</div>
      </template>
      <template v-else>
        <div class="flex items-center gap-2"><span class="w-8 h-3 rounded" style="background: linear-gradient(to right, #fef3c7, #f59e0b, #dc2626)"></span> Low → High</div>
        <div class="text-gray-400">{{ { stock: "Domestic units", office: "Office sqft", vacancy: "Vacancy %", price: "HKD/sqft" }[heatmapMetric] }}</div>
      </template>
      <div class="border-t mt-1 pt-1">
        <div class="flex items-center gap-2"><span class="w-3 h-0.5 bg-emerald-600"></span> Tram</div>
        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-amber-500"></span> KMB/CTB Bus</div>
        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-violet-500"></span> GMB Minibus</div>
      </div>
    </div>
  </div>
</template>
