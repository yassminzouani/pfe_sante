import L from "leaflet";
import { PHARMACY_STYLE } from "./styles";
import { fetchPharmacies } from "./api";
import { buildPharmacyPopup } from "./popups";

export function createPharmacyMarker(latlng) {
  return L.circleMarker(latlng, PHARMACY_STYLE);
}

export function clearPharmaciesLayer(pharmaciesGroupRef, pharmaciesLayerRef) {
  if (pharmaciesGroupRef.current) {
    pharmaciesGroupRef.current.clearLayers();
  }
  pharmaciesLayerRef.current = null;
}

export function syncPharmaciesVisibility({
  togglePharmacies,
  pharmaciesGroupRef,
  pharmaciesLayerRef
}) {
  if (!pharmaciesGroupRef.current) return;

  pharmaciesGroupRef.current.clearLayers();

  if (togglePharmacies && pharmaciesLayerRef.current) {
    pharmaciesGroupRef.current.addLayer(pharmaciesLayerRef.current);
  }
}

export async function loadPharmaciesLayer({
  map,
  bbox,
  region,
  province,
  commune,
  pharmaciesLayerRef,
  pharmaciesGroupRef,
  togglePharmacies
}) {
  clearPharmaciesLayer(pharmaciesGroupRef, pharmaciesLayerRef);

  if (!bbox) return;

  const gj = await fetchPharmacies({
    limit: 5000,
    bbox,
    region,
    province,
    commune
  });

  const geoJsonOptions = {
    pointToLayer: (_, latlng) => createPharmacyMarker(latlng),
    onEachFeature: (feature, leafletLayer) => {
      const p = feature.properties || {};
      leafletLayer.bindPopup(buildPharmacyPopup(p));
    }
  };

  if (map?.getPane && map.getPane("pointsPane")) {
    geoJsonOptions.pane = "pointsPane";
  }

  const layer = L.geoJSON(gj, geoJsonOptions);

  pharmaciesLayerRef.current = layer;

  syncPharmaciesVisibility({
    togglePharmacies,
    pharmaciesGroupRef,
    pharmaciesLayerRef
  });
}