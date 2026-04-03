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
let lightRailLayer: L.LayerGroup;
let ferryLayer: L.LayerGroup;
let schoolLayer: L.LayerGroup;
let hospitalLayer: L.LayerGroup;
let lightTileLayer: L.TileLayer;
let darkTileLayer: L.TileLayer;

const darkMode = ref(false);

const layers = ref({
  districts: true,
  mtr: true,
  bus: false,
  tram: true,
  lightRail: false,
  ferry: true,
  schools: false,
  hospitals: false,
});

const heatmapMetric = ref("none");
const heatmapData = ref<any[]>([]);
const controlsOpen = ref(true);

const ZONE_COLORS: Record<string, string> = {
  hk_island: "#2563eb",
  kowloon: "#dc2626",
  new_territories: "#059669",
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
  const metricMap: Record<string, string> = { stock: "stock", office: "stock", vacancy: "vacancy", price: "price" };
  heatmapData.value = await api.getHeatmap(metricMap[heatmapMetric.value] || heatmapMetric.value);
  updateDistrictStyles();
}

function updateDistrictStyles() {
  if (!districtLayer) return;
  districtLayer.eachLayer((layer: any) => {
    const code = layer.feature?.properties?.["地區號碼"];
    if (!code) return;

    if (heatmapMetric.value === "none") {
      layer.setStyle({
        color: getDistrictColor(code), weight: 2,
        fillColor: getDistrictColor(code), fillOpacity: 0.12,
      });
    } else {
      const val = getHeatmapValue(code);
      const allVals = heatmapData.value.map((d: any) => getHeatmapValue(d.id)).filter((v): v is number => v !== null && v > 0);
      const min = Math.min(...allVals);
      const max = Math.max(...allVals);
      const color = val && val > 0 ? getHeatColor(val, min, max) : "#e5e7eb";
      layer.setStyle({ color: "#666", weight: 1.5, fillColor: color, fillOpacity: 0.55 });
    }
  });
}

watch(heatmapMetric, loadHeatmap);

async function initMap() {
  if (!mapContainer.value) return;

  map = L.map(mapContainer.value).setView([22.35, 114.15], 11);
  const attr = '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';
  lightTileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: attr, maxZoom: 19 });
  darkTileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: attr, maxZoom: 19 });
  lightTileLayer.addTo(map);

  // Load GeoJSON districts
  const res = await fetch("/geojson/hk-districts.geo.json");
  const geojson = await res.json();

  districtLayer = L.geoJSON(geojson, {
    style: (feature) => {
      const code = feature?.properties?.["地區號碼"] || "";
      return { color: getDistrictColor(code), weight: 2, fillColor: getDistrictColor(code), fillOpacity: 0.12 };
    },
    onEachFeature: (feature, layer) => {
      const code = feature.properties["地區號碼"];
      const name = feature.properties["District"];
      const nameZh = feature.properties["地區"];
      const district = districtsStore.getDistrictById(code);

      layer.on("click", () => router.push(`/district/${code}`));
      layer.on("mouseover", (e: any) => {
        const val = getHeatmapValue(code);
        let tooltip = `<div style="font-family:Inter,system-ui,sans-serif"><strong>${name}</strong> <span style="color:#94a3b8">${nameZh}</span>`;
        if (district?.listing_count) tooltip += `<br><span style="color:#6366f1">${district.listing_count} listings</span>`;
        if (val !== null && heatmapMetric.value !== "none") {
          const label: Record<string, string> = { stock: "Domestic Units", office: "Office Units", vacancy: "Vacancy %", price: "Avg $/sqft" };
          tooltip += `<br>${label[heatmapMetric.value]}: <strong>${typeof val === 'number' ? val.toLocaleString() : val}</strong>`;
        }
        tooltip += "</div>";
        layer.bindPopup(tooltip).openPopup();
        (layer as any).setStyle({ weight: 3, fillOpacity: heatmapMetric.value === "none" ? 0.35 : 0.7 });
      });
      layer.on("mouseout", () => { updateDistrictStyles(); layer.closePopup(); });
    },
  }).addTo(map);

  // Init all layer groups
  mtrLayer = L.layerGroup().addTo(map);
  busLayer = L.layerGroup();
  tramLayer = L.layerGroup().addTo(map);
  lightRailLayer = L.layerGroup();
  ferryLayer = L.layerGroup().addTo(map);
  schoolLayer = L.layerGroup();
  hospitalLayer = L.layerGroup();

  await transportStore.fetchAll();
  renderMtr();
  renderTram();
  renderLightRail();
  renderFerry();

  map.on("moveend", () => { if (layers.value.bus) loadBusStops(); });
}

function renderMtr() {
  mtrLayer.clearLayers();
  for (const line of transportStore.mtrLines) {
    const coords = (line.stations || []).filter((s: any) => s.lat && s.lng).map((s: any) => [s.lat, s.lng] as [number, number]);
    if (coords.length > 1) {
      L.polyline(coords, { color: line.color || "#666", weight: 3.5, opacity: 0.85 }).addTo(mtrLayer);
    }
    for (const station of line.stations || []) {
      if (!station.lat || !station.lng) continue;
      L.circleMarker([station.lat, station.lng], {
        radius: 5, color: "#fff", weight: 2, fillColor: line.color || "#666", fillOpacity: 1,
      }).bindPopup(`<div style="font-family:Inter,sans-serif"><strong>${station.name_en}</strong><br><span style="color:#94a3b8">${station.name_zh}</span><br><span class="badge" style="background:${line.color};color:white;padding:2px 6px;border-radius:4px;font-size:10px">${line.name_en}</span></div>`)
        .addTo(mtrLayer);
    }
  }
}

function renderTram() {
  tramLayer.clearLayers();
  const stops = transportStore.tramStops.filter(s => !s.id.startsWith("PT"));
  const peakStops = transportStore.tramStops.filter(s => s.id.startsWith("PT"));

  // Main tram line
  const coords: [number, number][] = stops.filter(s => !s.id.startsWith("T3")).map(s => [s.lat, s.lng]);
  if (coords.length > 1) L.polyline(coords, { color: "#059669", weight: 2.5, opacity: 0.7, dashArray: "6 4" }).addTo(tramLayer);

  for (const stop of stops) {
    L.circleMarker([stop.lat, stop.lng], { radius: 3, color: "#059669", weight: 1, fillColor: "#10b981", fillOpacity: 1 })
      .bindPopup(`<strong>${stop.name_en}</strong><br>${stop.name_zh || ""}<br><small style="color:#059669">Tram</small>`)
      .addTo(tramLayer);
  }

  // Peak Tram
  if (peakStops.length > 1) {
    L.polyline(peakStops.map(s => [s.lat, s.lng] as [number, number]), { color: "#dc2626", weight: 2.5, opacity: 0.7 }).addTo(tramLayer);
  }
  for (const stop of peakStops) {
    L.circleMarker([stop.lat, stop.lng], { radius: 3, color: "#dc2626", weight: 1, fillColor: "#ef4444", fillOpacity: 1 })
      .bindPopup(`<strong>${stop.name_en}</strong><br>${stop.name_zh || ""}<br><small style="color:#dc2626">Peak Tram</small>`)
      .addTo(tramLayer);
  }
}

function renderLightRail() {
  lightRailLayer.clearLayers();
  for (const stop of transportStore.lightRailStops) {
    L.circleMarker([stop.lat, stop.lng], { radius: 3.5, color: "#d97706", weight: 1, fillColor: "#f59e0b", fillOpacity: 1 })
      .bindPopup(`<strong>${stop.name_en}</strong><br>${stop.name_zh || ""}<br><small style="color:#d97706">Light Rail</small>`)
      .addTo(lightRailLayer);
  }
}

function renderFerry() {
  ferryLayer.clearLayers();
  for (const pier of transportStore.ferryPiers) {
    L.circleMarker([pier.lat, pier.lng], { radius: 5, color: "#0284c7", weight: 2, fillColor: "#38bdf8", fillOpacity: 0.9 })
      .bindPopup(`<strong>${pier.name_en}</strong><br>${pier.name_zh || ""}<br><small style="color:#0284c7">${pier.operator?.replace(/_/g, " ") || "Ferry"}</small>`)
      .addTo(ferryLayer);
  }
}

async function loadBusStops() {
  if (!map) return;
  const bounds = map.getBounds();
  await transportStore.fetchBusStops({
    minLat: bounds.getSouth(), maxLat: bounds.getNorth(),
    minLng: bounds.getWest(), maxLng: bounds.getEast(),
  });
  busLayer.clearLayers();
  for (const stop of transportStore.busStops) {
    const colors: Record<string, string> = { kmb: "#f59e0b", ctb: "#3b82f6", gmb: "#8b5cf6", nlb: "#14b8a6", mtr_bus: "#f43f5e" };
    const color = colors[stop.operator] || "#94a3b8";
    L.circleMarker([stop.lat, stop.lng], { radius: 2.5, color, fillColor: color, fillOpacity: 0.7, weight: 0 })
      .bindPopup(`<strong>${stop.name_en}</strong><br>${stop.name_zh}<br><small style="color:${color}">${stop.operator.toUpperCase()}</small>`)
      .addTo(busLayer);
  }
}

async function loadSchools() {
  if (!map) return;
  schoolLayer.clearLayers();
  try {
    const bounds = map.getBounds();
    const schools = await api.getSchools({
      minLat: String(bounds.getSouth()), maxLat: String(bounds.getNorth()),
      minLng: String(bounds.getWest()), maxLng: String(bounds.getEast()),
    });
    for (const s of schools) {
      if (!s.lat || !s.lng) continue;
      L.circleMarker([s.lat, s.lng], { radius: 3, color: "#f97316", weight: 1, fillColor: "#fb923c", fillOpacity: 0.8 })
        .bindPopup(`<strong>${s.name_en}</strong><br><span style="color:#94a3b8">${s.name_zh || ""}</span><br><small style="color:#f97316">${s.level || "School"} &middot; ${s.category || ""}</small>`)
        .addTo(schoolLayer);
    }
  } catch {}
}

async function loadHospitals() {
  if (!map) return;
  hospitalLayer.clearLayers();
  try {
    const hospitals = await api.getHospitals({});
    for (const h of hospitals) {
      if (!h.lat || !h.lng) continue;
      const icon = h.has_ae ? "#dc2626" : "#f43f5e";
      L.circleMarker([h.lat, h.lng], { radius: 4.5, color: "#fff", weight: 2, fillColor: icon, fillOpacity: 1 })
        .bindPopup(`<strong>${h.name_en}</strong><br><span style="color:#94a3b8">${h.name_zh || ""}</span><br><small>${h.cluster || ""}</small>${h.has_ae ? '<br><span style="color:#dc2626;font-weight:bold">A&E Available</span>' : ""}`)
        .addTo(hospitalLayer);
    }
  } catch {}
}

function toggleDarkMode() {
  darkMode.value = !darkMode.value;
  if (darkMode.value) {
    map.removeLayer(lightTileLayer);
    darkTileLayer.addTo(map);
  } else {
    map.removeLayer(darkTileLayer);
    lightTileLayer.addTo(map);
  }
}

function toggleLayer(key: keyof typeof layers.value) {
  layers.value[key] = !layers.value[key];
  if (!map) return;
  const layerMap: Record<string, L.LayerGroup | L.GeoJSON> = {
    districts: districtLayer, mtr: mtrLayer, bus: busLayer, tram: tramLayer,
    lightRail: lightRailLayer, ferry: ferryLayer, schools: schoolLayer, hospitals: hospitalLayer,
  };
  const layer = layerMap[key];
  if (!layer) return;
  if (layers.value[key]) {
    map.addLayer(layer);
    if (key === "bus") loadBusStops();
    if (key === "lightRail") renderLightRail();
    if (key === "schools") loadSchools();
    if (key === "hospitals") loadHospitals();
  } else {
    map.removeLayer(layer);
  }
}

onMounted(initMap);
</script>

<template>
  <div class="relative h-screen">
    <div ref="mapContainer" class="absolute inset-0"></div>

    <!-- Controls -->
    <div class="absolute top-3 right-3 z-[1000] bg-white border border-[#e5e7eb] rounded-lg p-3 w-[180px] text-[12px] space-y-3">
      <div class="flex items-center justify-between">
        <span class="label">Theme</span>
        <button @click="toggleDarkMode" class="btn btn-sm" :class="darkMode?'btn-primary':'btn-secondary'">{{ darkMode?'Dark':'Light' }}</button>
      </div>
      <div class="border-t border-[#e5e7eb] pt-2">
        <div class="label mb-1.5">Layers</div>
        <div class="space-y-1">
          <label v-for="(val, key) in { districts:layers.districts, mtr:layers.mtr, bus:layers.bus, tram:layers.tram, lightRail:layers.lightRail, ferry:layers.ferry, schools:layers.schools, hospitals:layers.hospitals }" :key="key" class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" :checked="val" @change="toggleLayer(key as any)" class="rounded border-[#d1d5db] w-3 h-3" />
            <span class="text-[#374151]">{{ {districts:'Districts',mtr:'MTR',bus:'Bus',tram:'Tram',lightRail:'Light Rail',ferry:'Ferry',schools:'Schools',hospitals:'Hospitals'}[key] }}</span>
          </label>
        </div>
      </div>
      <div class="border-t border-[#e5e7eb] pt-2">
        <div class="label mb-1.5">Heatmap</div>
        <select v-model="heatmapMetric" class="select text-[11px]">
          <option value="none">Off</option>
          <option value="stock">Domestic</option>
          <option value="office">Office</option>
          <option value="vacancy">Vacancy</option>
          <option value="price">Price/sqft</option>
        </select>
      </div>
    </div>

    <!-- Legend -->
    <div class="absolute bottom-3 left-3 z-[1000] bg-white border border-[#e5e7eb] rounded-lg p-3 text-[11px] space-y-1">
      <template v-if="heatmapMetric==='none'">
        <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#2563eb]"></span> HK Island</div>
        <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#dc2626]"></span> Kowloon</div>
        <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#059669]"></span> N.T.</div>
      </template>
      <template v-else>
        <div class="flex items-center gap-1.5"><span class="w-8 h-2 rounded" style="background:linear-gradient(to right,#fef3c7,#f59e0b,#dc2626)"></span> Low-High</div>
      </template>
    </div>
  </div>
</template>
