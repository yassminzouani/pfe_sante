import L from "leaflet";

const API_BASE = "http://localhost:3000/api";

function getAdminStyle(mode) {
  if (mode === "regions") {
    return {
      color: "#2563eb",
      weight: 2,
      fillColor: "#60a5fa",
      fillOpacity: 0.15
    };
  }

  if (mode === "provinces") {
    return {
      color: "#16a34a",
      weight: 1.5,
      fillColor: "#86efac",
      fillOpacity: 0.15
    };
  }

  return {
    color: "#ea580c",
    weight: 1,
    fillColor: "#fdba74",
    fillOpacity: 0.15
  };
}

function getFeatureName(props = {}) {
  return props.nom_region || props.nom || props.label || "Sans nom";
}

function removeLayerIfExists(map, layerRef) {
  if (layerRef?.current && map?.hasLayer(layerRef.current)) {
    map.removeLayer(layerRef.current);
  }
}

export async function loadMaskMaroc() {
  return null;
}

export async function loadAdminLayer({
  map,
  mode = "regions",
  currentRegionCode,
  currentProvinceCode,
  adminLayerRef
}) {
  try {
    if (!map) return;

    removeLayerIfExists(map, adminLayerRef);

    let url = `${API_BASE}/regions`;

    if (mode === "provinces") {
      url = currentRegionCode
        ? `${API_BASE}/provinces?region=${encodeURIComponent(currentRegionCode)}`
        : `${API_BASE}/provinces`;
    }

    if (mode === "communes") {
      url = currentProvinceCode
        ? `${API_BASE}/communes?province=${encodeURIComponent(currentProvinceCode)}`
        : `${API_BASE}/communes`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status} sur ${url}`);
    }

    const geojson = await response.json();
    const baseStyle = getAdminStyle(mode);

    let geoJsonLayer;

    geoJsonLayer = L.geoJSON(geojson, {
      interactive: true,
      style: () => baseStyle,
      onEachFeature: (feature, featureLayer) => {
        const props = feature?.properties || {};
        const name = getFeatureName(props);

        featureLayer.bindTooltip(name, {
          sticky: true,
          direction: "top",
          opacity: 0.95
        });

        featureLayer.on({
          mouseover: (e) => {
            e.target.setStyle({
              weight: baseStyle.weight + 1,
              fillOpacity: 0.3
            });
          },
          mouseout: (e) => {
            if (geoJsonLayer) {
              geoJsonLayer.resetStyle(e.target);
            }
          }
        });
      }
    });

    geoJsonLayer.addTo(map);
    adminLayerRef.current = geoJsonLayer;
  } catch (error) {
    console.error("loadAdminLayer error:", error);
  }
}