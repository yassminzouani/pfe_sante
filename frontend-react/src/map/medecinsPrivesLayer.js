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
    return props.nom_province || props.nom || props.label || "Province";
  }

  return props.nom_commune || props.nom || props.label || "Commune";
}

function getStatsUrl({ mode, codeRegion, codeProvince }) {
  const params = new URLSearchParams();

  if (mode === "regions") {
    if (codeRegion) params.set("code_region", codeRegion);
    return `http://localhost:3000/api/medecins-prives/regions?${params.toString()}`;
  }

  if (mode === "provinces") {
    if (codeRegion) params.set("code_region", codeRegion);
    if (codeProvince) params.set("code_province", codeProvince);
    return `http://localhost:3000/api/medecins-prives/provinces?${params.toString()}`;
  }

  if (codeRegion) params.set("code_region", codeRegion);
  if (codeProvince) params.set("code_province", codeProvince);

  return `http://localhost:3000/api/medecins-prives/communes?${params.toString()}`;
}

function getDetailsUrl({ mode, code }) {
  const params = new URLSearchParams();
  params.set("mode", mode);

  if (mode === "regions") {
    params.set("code_region", code);
  } else if (mode === "provinces") {
    params.set("code_province", code);
  } else {
    params.set("code_iso", code);
  }

  return `http://localhost:3000/api/medecins-prives/details?${params.toString()}`;
}

function getStatCode(item, mode) {
  if (mode === "regions") return String(item?.code_region || "");
  if (mode === "provinces") return String(item?.code_province || "");
  return String(item?.code_iso || "");
}

function makeCountIcon(total) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #f59e0b;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        color: white;
        cursor: pointer;
      ">
        ${total}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

function clearMarkers(map) {
  if (medecinsCountLayer && map && map.hasLayer(medecinsCountLayer)) {
    map.removeLayer(medecinsCountLayer);
  }
  medecinsCountLayer = null;
}

export function clearMedecinsPrivesLayer(adminLayerRef, map = null) {
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

      if (total > 0 && layer?.getBounds) {
        const center = layer.getBounds().getCenter();

        const marker = L.marker(center, {
          icon: makeCountIcon(total),
          interactive: true
        });

        marker.on("click", async () => {
          try {
            const detailsUrl = getDetailsUrl({ mode, code });
            const details = await fetchJson(detailsUrl);

            const html = `
              <div style="min-width:260px">
                <div><b>${name}</b></div>
                <div><b>Total :</b> ${details.total ?? 0}</div>
                <div><b>Généralistes :</b> ${details.generalistes ?? 0}</div>

                <div style="margin-top:8px"><b>Spécialités :</b></div>
                <ul style="margin:6px 0 0 16px">
                  ${
                    details.specialites?.length
                      ? details.specialites
                          .slice(0, 8)
                          .map((s) => `<li>${s.specialite} : ${s.total}</li>`)
                          .join("")
                      : "<li>Aucune donnée</li>"
                  }
                </ul>
              </div>
            `;

            marker.bindPopup(html).openPopup();
          } catch (err) {
            console.error("Erreur details:", err);
          }
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