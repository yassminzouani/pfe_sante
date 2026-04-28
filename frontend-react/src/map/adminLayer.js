import L from "leaflet";
import {
  fetchRegionMedicalDensity,
  fetchCommuneMedicalDensity
} from "./api";

const API_BASE = "http://localhost:3000/api";

function isValidMap(map) {
  return (
    map &&
    map._container &&
    map._panes &&
    map.getPane &&
    map.getPane("overlayPane")
  );
}

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

function getDensityColor(value) {
  const densite = Number(value);

  if (Number.isNaN(densite)) return "#d1d5db";
  if (densite < 2) return "#d43a3a";
  if (densite < 4) return "#f916ad";
  if (densite < 6) return "#facc15";
  if (densite < 8) return "#84cc16";
  return "#16a34a";
}

function getFeatureName(props = {}) {
  return (
    props.nom_region ||
    props.nom_commune ||
    props.nom ||
    props.label ||
    "Sans nom"
  );
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

function buildDensityPopup({ name, stats }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; min-width: 240px;">
      <strong>${name}</strong><br/>
      Population : ${stats?.population_rgph_2024 ?? "N/A"}<br/>
      Médecins publics : ${stats?.nb_medecins_publics ?? 0}<br/>
      Médecins privés : ${stats?.nb_medecins_prives ?? 0}<br/>
      <strong>Total médecins : ${stats?.nb_medecins_total ?? 0}</strong><br/>
      Densité : <strong>${stats?.densite_medecins_totale ?? "N/A"}</strong> / 10 000 hab.
    </div>
  `;
}

export async function loadMaskMaroc({ map, marocBorderRef }) {
  try {
    if (!isValidMap(map)) return;

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

    const maskLayer = L.polygon([outerRing, ...marocHoles], {
      stroke: false,
      fillColor: "#f3f4f6",
      fillOpacity: 0.72,
      interactive: false
    });

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
    if (!isValidMap(map)) return;
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
    if (!isValidMap(map)) return;

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

    let densityMap = {};

    if (mode === "regions") {
      const densityData = await fetchRegionMedicalDensity();

      densityData.forEach((item) => {
        densityMap[String(item.code_region)] = item;
      });
    }

    if (mode === "communes") {
      const densityData = await fetchCommuneMedicalDensity();

      densityData.forEach((item) => {
        densityMap[String(item.code_iso)] = item;
      });
    }

    let geoJsonLayer;

    geoJsonLayer = L.geoJSON(geojson, {
      interactive: true,

      style: (feature) => {
        const props = feature?.properties || {};

        if (mode === "regions") {
          const codeRegion = String(props.code_region ?? "");
          const stats = densityMap[codeRegion];
          const densite = stats?.densite_medecins_totale;

          return {
            color: "#2563eb",
            weight: 2,
            fillColor: getDensityColor(densite),
            fillOpacity: 0.55
          };
        }

        if (mode === "communes") {
          const codeIso = String(props.code_iso ?? "");
          const stats = densityMap[codeIso];
          const densite = stats?.densite_medecins_totale;

          return {
            color: "#ea580c",
            weight: 1,
            fillColor: getDensityColor(densite),
            fillOpacity: 0.55
          };
        }

        return baseStyle;
      },

      onEachFeature: (feature, featureLayer) => {
        const props = feature?.properties || {};
        const name = getFeatureName(props);

        featureLayer.bindTooltip(name, {
          sticky: true,
          direction: "top",
          opacity: 0.95
        });

        if (mode === "regions") {
          const codeRegion = String(props.code_region ?? "");
          const stats = densityMap[codeRegion];

          featureLayer.bindPopup(
            buildDensityPopup({
              name,
              stats
            })
          );
        }

        if (mode === "communes") {
          const codeIso = String(props.code_iso ?? "");
          const stats = densityMap[codeIso];

          featureLayer.bindPopup(
            buildDensityPopup({
              name,
              stats
            })
          );
        }

        featureLayer.on({
          mouseover: (e) => {
            e.target.setStyle({
              weight: baseStyle.weight + 1,
              fillOpacity:
                mode === "regions" || mode === "communes" ? 0.75 : 0.3
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
    if (!isValidMap(map)) return;
    geoJsonLayer.addTo(map);
    adminLayerRef.current = geoJsonLayer;
  } catch (error) {
    console.error("loadAdminLayer error:", error);
  }
}