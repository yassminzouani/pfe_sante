import L from "leaflet";
import { fetchCabinets } from "./api";
import { buildCabinetPopup } from "./popups";

const cabinetIcon = L.divIcon({
  className: "custom-cabinet-icon",
  html: `
    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      width:28px;
      height:28px;
      border-radius:50%;
      background:#0ea5e9;
      color:white;
      font-weight:700;
      font-size:16px;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    ">
      ⚛
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14]
});

export function createCabinetMarker(latlng) {
  return L.marker(latlng, { icon: cabinetIcon });
}

export function updateCabinetMarkerSizes() {
  // Pas nécessaire avec DivIcon fixe
}

export function clearCabinetsLayer(cabinetsGroupRef, cabinetsLayerRef) {
  if (cabinetsGroupRef.current) {
    cabinetsGroupRef.current.clearLayers();
  }
  cabinetsLayerRef.current = null;
}

export function syncCabinetsVisibility({
  toggleCabinets,
  cabinetsGroupRef,
  cabinetsLayerRef
}) {
  if (!cabinetsGroupRef.current) return;

  cabinetsGroupRef.current.clearLayers();

  if (toggleCabinets && cabinetsLayerRef.current) {
    cabinetsGroupRef.current.addLayer(cabinetsLayerRef.current);

    if (cabinetsLayerRef.current.bringToFront) {
      cabinetsLayerRef.current.bringToFront();
    }
  }
}

export async function loadCabinetsLayer({
  map,
  bbox,
  ville,
  nom,
  cabinetsLayerRef,
  cabinetsGroupRef,
  toggleCabinets
}) {
  clearCabinetsLayer(cabinetsGroupRef, cabinetsLayerRef);

  if (!bbox) return;

  const gj = await fetchCabinets({
    limit: 5000,
    bbox,
    ville,
    nom
  });

  if (!gj || gj.type !== "FeatureCollection" || !Array.isArray(gj.features)) {
    console.warn("Réponse cabinets invalide :", gj);
    return;
  }

  const geoJsonOptions = {
    pointToLayer: (_, latlng) => createCabinetMarker(latlng),
    onEachFeature: (feature, leafletLayer) => {
      const p = feature.properties || {};

      leafletLayer.bindTooltip(p.nom_nettoye || "Cabinet", {
        permanent: false,
        direction: "top",
        offset: [0, -10]
      });

      leafletLayer.on("click", () => {
        leafletLayer.bindPopup(buildCabinetPopup(p)).openPopup();
      });
    }
  };

  if (map?.getPane && map.getPane("pointsPane")) {
    geoJsonOptions.pane = "pointsPane";
  }

  const layer = L.geoJSON(gj, geoJsonOptions);

  cabinetsLayerRef.current = layer;

  syncCabinetsVisibility({
    toggleCabinets,
    cabinetsGroupRef,
    cabinetsLayerRef
  });
}