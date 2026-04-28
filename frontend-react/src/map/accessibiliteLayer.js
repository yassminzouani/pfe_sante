import L from "leaflet";

function formatNumber(value, digits = 2) {
  const number = Number(value || 0);
  return number.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function getColorByLevel(level) {
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

function getDensiteColor(value) {
  const densite = Number(value || 0);

  if (densite === 0) return "#7f1d1d";
  if (densite < 1) return "#b91c1c";
  if (densite < 3) return "#f97316";
  if (densite < 6) return "#facc15";
  if (densite < 10) return "#4ade80";
  return "#166534";
}

function getFeatureColor(properties, accessMethod) {
  if (accessMethod === "densite") {
    return getDensiteColor(properties.densite_10000);
  }

  if (accessMethod === "apl") {
    return getColorByLevel(properties.niveau_apl);
  }

  if (accessMethod === "sfca") {
    return getColorByLevel(properties.niveau_2sfca);
  }

  if (accessMethod === "gravitaire") {
    return getColorByLevel(properties.niveau_gravitaire);
  }

  if (accessMethod === "desert") {
    return properties.desert_medical_confirme ? "#7f1d1d" : "#16a34a";
  }

  return "#d1d5db";
}

function buildAccessibilitePopup(p) {
  return `
    <div style="min-width:300px; line-height:1.55;">
      <div style="font-size:16px; font-weight:700; margin-bottom:8px;">
        ${p.nom_commune || "Commune"}
      </div>

      <div><b>Code ISO :</b> ${p.code_iso || ""}</div>
      <div><b>Population :</b> ${Number(p.population_rgph_2024 || 0).toLocaleString("fr-FR")}</div>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0;" />

      <div><b>Médecins publics :</b> ${Number(p.nb_medecins_publics || 0)}</div>
      <div><b>Médecins privés :</b> ${Number(p.nb_medecins_prives || 0)}</div>
      <div><b>Total médecins :</b> ${Number(p.nb_medecins_total || 0)}</div>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0;" />

      <div><b>Densité médicale :</b> ${formatNumber(p.densite_10000)} / 10 000 hab.</div>

      <div style="margin-top:8px;">
        <b>APL :</b> ${formatNumber(p.apl_1000)} / 1 000 hab.<br/>
        <span>Niveau APL : ${p.niveau_apl || "Non classé"}</span>
      </div>

      <div style="margin-top:8px;">
        <b>2SFCA :</b> ${formatNumber(p.sfca_1000)} / 1 000 hab.<br/>
        <span>Niveau 2SFCA : ${p.niveau_2sfca || "Non classé"}</span>
      </div>

      <div style="margin-top:8px;">
        <b>Gravitaire :</b> ${formatNumber(p.gravitaire_1000)}<br/>
        <span>Niveau gravitaire : ${p.niveau_gravitaire || "Non classé"}</span>
      </div>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0;" />

      <div>
        <b>Commune sans médecin :</b> ${p.sans_medecin_commune ? "Oui" : "Non"}<br/>
        <b>Désert médical confirmé :</b>
        <span style="font-weight:700; color:${p.desert_medical_confirme ? "#b91c1c" : "#15803d"};">
          ${p.desert_medical_confirme ? "Oui" : "Non"}
        </span>
      </div>
    </div>
  `;
}

export async function loadAccessibiliteLayer({
  map,
  accessMethod,
  accessLayerRef
}) {
  if (!map) return;

  if (accessLayerRef.current) {
    map.removeLayer(accessLayerRef.current);
    accessLayerRef.current = null;
  }

const response = await fetch("http://localhost:3000/api/comparaison-accessibilite");
  if (!response.ok) {
    throw new Error("Erreur lors du chargement de la couche accessibilité");
  }

  const geojson = await response.json();

  accessLayerRef.current = L.geoJSON(geojson, {
    style: (feature) => ({
      fillColor: getFeatureColor(feature.properties, accessMethod),
      color: "#374151",
      weight: 0.8,
      opacity: 1,
      fillOpacity: 0.72
    }),

    onEachFeature: (feature, layer) => {
      layer.bindPopup(buildAccessibilitePopup(feature.properties));

      layer.on("mouseover", () => {
        layer.setStyle({
          weight: 2,
          color: "#111827",
          fillOpacity: 0.9
        });
      });

      layer.on("mouseout", () => {
        accessLayerRef.current.resetStyle(layer);
      });
    }
  }).addTo(map);
}

export function clearAccessibiliteLayer(accessLayerRef, map) {
  if (accessLayerRef.current && map) {
    map.removeLayer(accessLayerRef.current);
    accessLayerRef.current = null;
  }
}