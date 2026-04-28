import L from "leaflet";
import { fetchCliniques } from "./api";
import { buildCliniquePopup } from "./popups";

const cliniqueIcon = L.divIcon({
  className: "custom-clinique-icon",
  html: `
    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      width:30px;
      height:30px;
      border-radius:50%;
      background:#dc2626;
      color:white;
      font-weight:700;
      font-size:16px;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    ">
      ✚
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

export function createCliniqueMarker(latlng) {
  return L.marker(latlng, { icon: cliniqueIcon });
}

export function updateCliniqueMarkerSizes() {
  // Pas nécessaire avec DivIcon fixe
}

export function clearCliniquesLayer(cliniquesGroupRef, cliniquesLayerRef) {
  if (cliniquesGroupRef.current) {
    cliniquesGroupRef.current.clearLayers();
  }
  cliniquesLayerRef.current = null;
}

export function syncCliniquesVisibility({
  toggleCliniques,
  cliniquesGroupRef,
  cliniquesLayerRef
}) {
  if (!cliniquesGroupRef.current) return;

  cliniquesGroupRef.current.clearLayers();

  if (toggleCliniques && cliniquesLayerRef.current) {
    cliniquesGroupRef.current.addLayer(cliniquesLayerRef.current);

    if (cliniquesLayerRef.current.bringToFront) {
      cliniquesLayerRef.current.bringToFront();
    }
  }
}

export async function loadCliniquesLayer({
  map,
  bbox,
  ville,
  nom,
  cliniquesLayerRef,
  cliniquesGroupRef,
  toggleCliniques
}) {
  clearCliniquesLayer(cliniquesGroupRef, cliniquesLayerRef);

  if (!bbox) return;

  const gj = await fetchCliniques({
    limit: 5000,
    bbox,
    ville,
    nom
  });

  if (!gj || gj.type !== "FeatureCollection" || !Array.isArray(gj.features)) {
    console.warn("Réponse cliniques invalide :", gj);
    return;
  }

  const geoJsonOptions = {
    pointToLayer: (_, latlng) => createCliniqueMarker(latlng),
    onEachFeature: (feature, leafletLayer) => {
      const p = feature.properties || {};

      leafletLayer.bindTooltip(p.nom_nettoye || "Clinique", {
        permanent: false,
        direction: "top",
        offset: [0, -10]
      });

      leafletLayer.on("click", () => {
        leafletLayer.bindPopup(buildCliniquePopup(p)).openPopup();
      });
    }
  };

  if (map?.getPane && map.getPane("pointsPane")) {
    geoJsonOptions.pane = "pointsPane";
  }

  const layer = L.geoJSON(gj, geoJsonOptions);

  cliniquesLayerRef.current = layer;

  syncCliniquesVisibility({
    toggleCliniques,
    cliniquesGroupRef,
    cliniquesLayerRef
  });
}