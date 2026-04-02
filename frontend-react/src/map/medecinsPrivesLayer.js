import L from "leaflet";
import { fetchJson } from "./api";

let medecinsCountLayer = null;

function getCodeFromFeature(feature, mode) {
  const props = feature?.properties || {};

  if (mode === "regions") {
    return String(props.code_region || props.region || "");
  }

  if (mode === "provinces") {
    return String(props.code_province || props.province || "");
  }

  return String(props.code_iso || props.commune || "");
}

function getNameFromFeature(feature, mode) {
  const props = feature?.properties || {};

  if (mode === "regions") {
    return props.nom_region || props.nom || props.label || "Région";
  }

  if (mode === "provinces") {
    return props.nom || props.nom_province || props.label || "Province";
  }

  return props.nom || props.nom_commune || props.label || "Commune";
}

function getStatsUrl({ mode, codeRegion, codeProvince }) {
  const params = new URLSearchParams();

  if (mode === "regions") {
    if (codeRegion) params.set("code_region", codeRegion);
    const qs = params.toString();
    return `http://localhost:3000/api/medecins-prives/regions${qs ? `?${qs}` : ""}`;
  }

  if (mode === "provinces") {
    if (codeRegion) params.set("code_region", codeRegion);
    if (codeProvince) params.set("code_province", codeProvince);
    const qs = params.toString();
    return `http://localhost:3000/api/medecins-prives/provinces${qs ? `?${qs}` : ""}`;
  }

  if (codeRegion) params.set("code_region", codeRegion);
  if (codeProvince) params.set("code_province", codeProvince);

  const qs = params.toString();
  return `http://localhost:3000/api/medecins-prives/communes${qs ? `?${qs}` : ""}`;
}

function getStatCode(item, mode) {
  if (mode === "regions") return String(item?.code_region || "");
  if (mode === "provinces") return String(item?.code_province || "");
  return String(item?.code_iso || "");
}

function getFillOpacity(total, enabled) {
  if (!enabled) return 0;
  if (total >= 200) return 0.45;
  if (total >= 100) return 0.35;
  if (total >= 50) return 0.25;
  if (total > 0) return 0.15;
  return 0.05;
}

function getFillColor(total) {
  if (total >= 200) return "#1d4ed8";
  if (total >= 100) return "#2563eb";
  if (total >= 50) return "#60a5fa";
  if (total > 0) return "#bfdbfe";
  return "#e5e7eb";
}

function makeCountIcon(total) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #f59e0b;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        color: white;
      ">
        ${total}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function clearMarkers(map) {
  if (medecinsCountLayer && map && map.hasLayer(medecinsCountLayer)) {
    map.removeLayer(medecinsCountLayer);
  }
  medecinsCountLayer = null;
}

export function clearMedecinsPrivesLayer(adminLayerRef, map = null) {
  const adminLayer = adminLayerRef?.current;

  if (adminLayer && typeof adminLayer.eachLayer === "function") {
    adminLayer.eachLayer((layer) => {
      try {
        if (typeof layer.setStyle === "function") {
          layer.setStyle({
            fillColor: undefined,
            fillOpacity: 0
          });
        }
      } catch (err) {
        console.warn("clearMedecinsPrivesLayer warning:", err);
      }
    });
  }

  clearMarkers(map);
}

export async function loadMedecinsPrivesLayer({
  map,
  mode,
  codeRegion,
  codeProvince,
  adminLayerRef,
  toggleMedecinsPrives
}) {
  const adminLayer = adminLayerRef?.current;

  if (!toggleMedecinsPrives) {
    clearMedecinsPrivesLayer(adminLayerRef, map);
    return { totalGlobal: 0 };
  }

  if (!adminLayer || typeof adminLayer.eachLayer !== "function") {
    return { totalGlobal: 0 };
  }

  try {
    clearMarkers(map);

    const url = getStatsUrl({
      mode,
      codeRegion,
      codeProvince
    });

    const stats = await fetchJson(url);
    const rows = Array.isArray(stats) ? stats : [];

    const totalsByCode = new Map(
      rows.map((item) => [getStatCode(item, mode), Number(item.total_medecins || 0)])
    );

    const totalGlobal = rows.reduce(
      (sum, item) => sum + Number(item.total_medecins || 0),
      0
    );

    medecinsCountLayer = L.layerGroup();

    adminLayer.eachLayer((layer) => {
      const feature = layer?.feature;
      const code = getCodeFromFeature(feature, mode);
      const name = getNameFromFeature(feature, mode);
      const total = totalsByCode.get(code) || 0;

      if (typeof layer.setStyle === "function") {
        layer.setStyle({
          fillColor: getFillColor(total),
          fillOpacity: getFillOpacity(total, toggleMedecinsPrives)
        });
      }

      layer.bindPopup(
        `
          <div style="min-width:220px">
            <div><b>${name}</b></div>
            <div><b>Total médecins privés :</b> ${total}</div>
          </div>
        `,
        { maxWidth: 320 }
      );

      layer.on("click", () => {
        layer.openPopup();
      });

      if (total > 0) {
        const center = layer.getBounds().getCenter();

        const marker = L.marker(center, {
          icon: makeCountIcon(total),
          interactive: false
        });

        medecinsCountLayer.addLayer(marker);
      }
    });

    if (map) {
      medecinsCountLayer.addTo(map);
    }

    return { totalGlobal };
  } catch (err) {
    console.error("Erreur loadMedecinsPrivesLayer:", err);
    return { totalGlobal: 0 };
  }
}