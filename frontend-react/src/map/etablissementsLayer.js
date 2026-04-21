import L from "leaflet";
import { FACILITY_STYLE, getFacilityRadius } from "./styles";
import { fetchEtablissements, fetchMedecinsByEtablissement } from "./api";
import { buildEtablissementPopup, escapeHtml } from "./popups";

export function createFacilityMarker(latlng, map) {
  const zoom = map ? map.getZoom() : 6;

  return L.circleMarker(latlng, {
    ...FACILITY_STYLE,
    radius: getFacilityRadius(zoom)
  });
}

export function updateFacilityMarkerSizes(map, facilitiesLayerRef) {
  const layer = facilitiesLayerRef.current;
  if (!map || !layer) return;

  const radius = getFacilityRadius(map.getZoom());

  layer.eachLayer((item) => {
    if (item instanceof L.CircleMarker) {
      item.setRadius(radius);
    }
  });
}

export function clearFacilitiesLayer(facilitiesGroupRef, facilitiesLayerRef) {
  if (facilitiesGroupRef.current) {
    facilitiesGroupRef.current.clearLayers();
  }
  facilitiesLayerRef.current = null;
}

export function syncFacilitiesVisibility({
  toggleFacilities,
  facilitiesGroupRef,
  facilitiesLayerRef,
  map
}) {
  if (!facilitiesGroupRef.current) return;

  facilitiesGroupRef.current.clearLayers();

  if (toggleFacilities && facilitiesLayerRef.current) {
    facilitiesGroupRef.current.addLayer(facilitiesLayerRef.current);

    if (facilitiesLayerRef.current.bringToFront) {
      facilitiesLayerRef.current.bringToFront();
    }

    updateFacilityMarkerSizes(map, facilitiesLayerRef);
  }
}

export async function loadEtablissementsLayer({
  map,
  bbox,
  region,
  province,
  commune,
  categorie,
  milieu,
  facilitiesLayerRef,
  facilitiesGroupRef,
  toggleFacilities
}) {
  clearFacilitiesLayer(facilitiesGroupRef, facilitiesLayerRef);

  if (!bbox) return;

  const gj = await fetchEtablissements({
    limit: 5000,
    bbox,
    region,
    province,
    commune,
    categorie,
    milieu
  });

  const geoJsonOptions = {
    pointToLayer: (_, latlng) => createFacilityMarker(latlng, map),
    onEachFeature: (feature, leafletLayer) => {
      const p = feature.properties || {};

      leafletLayer.on("click", async () => {
        leafletLayer.bindPopup(buildEtablissementPopup(p)).openPopup();

        try {
          const data = await fetchMedecinsByEtablissement(p.code);
          leafletLayer.setPopupContent(buildEtablissementPopup(p, data));
        } catch (err) {
          console.error("Erreur chargement médecins :", err);
          leafletLayer.setPopupContent(`
            <div style="min-width:300px;">
              <div style="font-size:16px; font-weight:700; margin-bottom:8px;">
                ${escapeHtml(p.nom || "")}
              </div>
              <div>Impossible de charger les médecins.</div>
            </div>
          `);
        }
      });
    }
  };

  if (map?.getPane && map.getPane("pointsPane")) {
    geoJsonOptions.pane = "pointsPane";
  }

  const layer = L.geoJSON(gj, geoJsonOptions);

  facilitiesLayerRef.current = layer;

  syncFacilitiesVisibility({
    toggleFacilities,
    facilitiesGroupRef,
    facilitiesLayerRef,
    map
  });
}