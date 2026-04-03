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

function lngLatToLatLngRing(ring = []) {
  return ring.map(([lng, lat]) => [lat, lng]);
}

function buildMaskCoordinates(geometry) {
  if (!geometry) return [];

  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(lngLatToLatLngRing);
  }

  if (geometry.type === "MultiPolygon") {
    const holes = [];

    geometry.coordinates.forEach((polygon) => {
      polygon.forEach((ring) => {
        holes.push(lngLatToLatLngRing(ring));
      });
    });

    return holes;
  }

  return [];
}

export async function loadMaskMaroc({ map, marocBorderRef }) {
  try {
    if (!map) return;

    removeLayerIfExists(map, marocBorderRef);

    const response = await fetch(`${API_BASE}/regions/maroc`);
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status} sur ${API_BASE}/regions/maroc`);
    }

    const marocFeature = await response.json();
    const geometry = marocFeature?.geometry;

    const marocHoles = buildMaskCoordinates(geometry);

    if (!marocHoles.length) {
      throw new Error("Géométrie du Maroc invalide pour le masque");
    }

    const outerRing = [
      [90, -180],
      [90, 180],
      [-90, 180],
      [-90, -180],
      [90, -180]
    ];

    const maskLayer = L.polygon(
      [outerRing, ...marocHoles],
      {
        stroke: false,
        fillColor: "#f3f4f6",
        fillOpacity: 0.72,
        interactive: false
      }
    );

    const borderLayer = L.geoJSON(marocFeature, {
      interactive: false,
      style: {
        color: "#111827",
        weight: 2.2,
        fill: false,
        opacity: 1
      }
    });

    const group = L.layerGroup([maskLayer, borderLayer]);
    group.addTo(map);

    marocBorderRef.current = group;
  } catch (error) {
    console.error("loadMaskMaroc error:", error);
  }
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

            if (typeof e.target.bringToFront === "function") {
              e.target.bringToFront();
            }
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