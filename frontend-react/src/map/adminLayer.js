import L from "leaflet";

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

function formatNumber(value, digits = 2) {
  const number = Number(value || 0);

  return number.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function getLevelColor(level) {
  switch (level) {
    case "Désert médical":
      return "#7f1d1d";
    case "Très faible accès":
      return "#b91c1c";
    case "Faible accès":
      return "#f97316";
    case "Accès moyen":
      return "#facc15";
    case "Bon accès":
      return "#4ade80";
    case "Très bon accès":
      return "#166534";
    default:
      return "#d1d5db";
  }
}

function getDensityColor(value) {
  const densite = Number(value || 0);

  if (densite === 0) return "#7f1d1d";
  if (densite < 1) return "#b91c1c";
  if (densite < 3) return "#f97316";
  if (densite < 6) return "#facc15";
  if (densite < 10) return "#4ade80";
  return "#166534";
}

function getCommuneColor(stats, accessMethod) {
  if (!stats) return "#d1d5db";

  if (accessMethod === "densite") {
    return getDensityColor(stats.densite_10000);
  }

  if (accessMethod === "apl") {
    return getLevelColor(stats.niveau_apl);
  }

  if (accessMethod === "sfca") {
    return getLevelColor(stats.niveau_2sfca);
  }

  if (accessMethod === "gravitaire") {
    return getLevelColor(stats.niveau_gravitaire);
  }

  if (accessMethod === "desert") {
    return stats.desert_medical_confirme ? "#7f1d1d" : "#16a34a";
  }

  return "#d1d5db";
}

function buildDensitePopup(name, stats) {
  return `
    <div style="font-family:Arial,sans-serif; line-height:1.55; min-width:260px;">
      <div style="font-size:16px; font-weight:700; margin-bottom:8px;">
        ${name}
      </div>

      <div><b>Population :</b> ${Number(stats?.population_rgph_2024 || 0).toLocaleString("fr-FR")}</div>
      <div><b>Médecins publics :</b> ${Number(stats?.nb_medecins_publics || 0)}</div>
      <div><b>Médecins privés :</b> ${Number(stats?.nb_medecins_prives || 0)}</div>
      <div><b>Total médecins :</b> ${Number(stats?.nb_medecins_total || 0)}</div>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0;" />

      <div>
        <b>Densité médicale :</b>
        ${formatNumber(stats?.densite_10000)} / 10 000 hab.
      </div>
    </div>
  `;
}

function buildAplPopup(name, stats) {
  return `
    <div style="font-family:Arial,sans-serif; line-height:1.55; min-width:260px;">
      <div style="font-size:16px; font-weight:700; margin-bottom:8px;">
        ${name}
      </div>

      <div><b>Population :</b> ${Number(stats?.population_rgph_2024 || 0).toLocaleString("fr-FR")}</div>
      <div><b>Total médecins :</b> ${Number(stats?.nb_medecins_total || 0)}</div>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0;" />

      <div><b>APL :</b> ${formatNumber(stats?.apl_1000)} / 1 000 hab.</div>
      <div><b>Niveau :</b> ${stats?.niveau_apl || "Non classé"}</div>
    </div>
  `;
}

function buildSfcaPopup(name, stats) {
  return `
    <div style="font-family:Arial,sans-serif; line-height:1.55; min-width:260px;">
      <div style="font-size:16px; font-weight:700; margin-bottom:8px;">
        ${name}
      </div>

      <div><b>Population :</b> ${Number(stats?.population_rgph_2024 || 0).toLocaleString("fr-FR")}</div>
      <div><b>Total médecins :</b> ${Number(stats?.nb_medecins_total || 0)}</div>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0;" />

      <div><b>2SFCA :</b> ${formatNumber(stats?.sfca_1000)} / 1 000 hab.</div>
      <div><b>Niveau :</b> ${stats?.niveau_2sfca || "Non classé"}</div>
    </div>
  `;
}

function buildGravitairePopup(name, stats) {
  return `
    <div style="font-family:Arial,sans-serif; line-height:1.55; min-width:260px;">
      <div style="font-size:16px; font-weight:700; margin-bottom:8px;">
        ${name}
      </div>

      <div><b>Population :</b> ${Number(stats?.population_rgph_2024 || 0).toLocaleString("fr-FR")}</div>
      <div><b>Total médecins :</b> ${Number(stats?.nb_medecins_total || 0)}</div>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0;" />

      <div><b>Score gravitaire :</b> ${formatNumber(stats?.gravitaire_1000)}</div>
      <div><b>Niveau :</b> ${stats?.niveau_gravitaire || "Non classé"}</div>
    </div>
  `;
}

function buildDesertPopup(name, stats) {
  return `
    <div style="font-family:Arial,sans-serif; line-height:1.55; min-width:320px;">
      <div style="font-size:16px; font-weight:700; margin-bottom:8px;">
        ${name}
      </div>

      <div><b>Population :</b> ${Number(stats?.population_rgph_2024 || 0).toLocaleString("fr-FR")}</div>
      <div><b>Médecins publics :</b> ${Number(stats?.nb_medecins_publics || 0)}</div>
      <div><b>Médecins privés :</b> ${Number(stats?.nb_medecins_prives || 0)}</div>
      <div><b>Total médecins :</b> ${Number(stats?.nb_medecins_total || 0)}</div>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0;" />

      <div><b>Densité :</b> ${formatNumber(stats?.densite_10000)} / 10 000 hab.</div>
      <div><b>APL :</b> ${formatNumber(stats?.apl_1000)} — ${stats?.niveau_apl || "Non classé"}</div>
      <div><b>2SFCA :</b> ${formatNumber(stats?.sfca_1000)} — ${stats?.niveau_2sfca || "Non classé"}</div>
      <div><b>Gravitaire :</b> ${formatNumber(stats?.gravitaire_1000)} — ${stats?.niveau_gravitaire || "Non classé"}</div>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0;" />

      <div><b>Commune sans médecin :</b> ${stats?.sans_medecin_commune ? "Oui" : "Non"}</div>
      <div>
        <b>Désert médical confirmé :</b>
        <span style="font-weight:700; color:${stats?.desert_medical_confirme ? "#b91c1c" : "#15803d"};">
          ${stats?.desert_medical_confirme ? "Oui" : "Non"}
        </span>
      </div>
    </div>
  `;
}

function buildCommunePopup(name, stats, accessMethod) {
  if (!stats) {
    return `
      <div style="font-family:Arial,sans-serif; line-height:1.5; min-width:220px;">
        <strong>${name}</strong><br/>
        Données d’accessibilité non disponibles.
      </div>
    `;
  }

  if (accessMethod === "densite") return buildDensitePopup(name, stats);
  if (accessMethod === "apl") return buildAplPopup(name, stats);
  if (accessMethod === "sfca") return buildSfcaPopup(name, stats);
  if (accessMethod === "gravitaire") return buildGravitairePopup(name, stats);
  if (accessMethod === "desert") return buildDesertPopup(name, stats);

  return buildDensitePopup(name, stats);
}

async function fetchComparaisonAccessibilite() {
  const response = await fetch(`${API_BASE}/comparaison-accessibilite`);

  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status} sur /comparaison-accessibilite`);
  }

  const geojson = await response.json();

  const map = {};

  geojson.features.forEach((feature) => {
    const p = feature.properties || {};
    map[String(p.code_iso || "")] = p;
  });

  return map;
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
  adminLayerRef,
  accessMethod = "densite"
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

    let comparaisonMap = {};

    if (mode === "communes") {
      comparaisonMap = await fetchComparaisonAccessibilite();
    }

    let geoJsonLayer;

    geoJsonLayer = L.geoJSON(geojson, {
      interactive: true,

      style: (feature) => {
        const props = feature?.properties || {};

        if (mode === "communes") {
          const codeIso = String(props.code_iso ?? "");
          const stats = comparaisonMap[codeIso];

          return {
            color: "#374151",
            weight: 0.8,
            fillColor: getCommuneColor(stats, accessMethod),
            fillOpacity: 0.72
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

        if (mode === "communes") {
          const codeIso = String(props.code_iso ?? "");
          const stats = comparaisonMap[codeIso];

          featureLayer.bindPopup(
            buildCommunePopup(name, stats, accessMethod)
          );
        }

        featureLayer.on({
          mouseover: (e) => {
            e.target.setStyle({
              weight: baseStyle.weight + 1,
              fillOpacity: mode === "communes" ? 0.9 : 0.3
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