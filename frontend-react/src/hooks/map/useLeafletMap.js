import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAROC_BOUNDS } from "../../map/styles";
import { loadMaskMaroc } from "../../map/adminLayer";
import { updateFacilityMarkerSizes } from "../../map/etablissementsLayer";
import { updateCabinetMarkerSizes } from "../../map/cabinetsLayer";
import { updateCliniqueMarkerSizes } from "../../map/cliniquesLayer";

export function useLeafletMap({
  mapRef,
  mapContainerRef,
  marocBorderRef,
  facilitiesLayerRef,
  facilitiesGroupRef,
  pharmaciesGroupRef,
  cabinetsLayerRef,
  cabinetsGroupRef,
  cliniquesLayerRef,
  cliniquesGroupRef,
  moveTimeoutRef,
  isMapReadyRef,
  isReloadingRef,
  isMountedRef,
  loadCategoriesData,
  reloadData
}) {
  useEffect(() => {
    isMountedRef.current = true;

    if (mapRef.current || !mapContainerRef.current) {
      return () => {
        isMountedRef.current = false;
      };
    }

    const map = L.map(mapContainerRef.current, {
      minZoom: 6,
      maxZoom: 12
    });

    mapRef.current = map;
    map.fitBounds(MAROC_BOUNDS);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      noWrap: true
    }).addTo(map);

    facilitiesGroupRef.current = L.layerGroup().addTo(map);
    pharmaciesGroupRef.current = L.layerGroup().addTo(map);
    cabinetsGroupRef.current = L.layerGroup().addTo(map);
    cliniquesGroupRef.current = L.layerGroup().addTo(map);

    const handleZoomEnd = () => {
      updateFacilityMarkerSizes(map, facilitiesLayerRef);
      updateCabinetMarkerSizes(map, cabinetsLayerRef);
      updateCliniqueMarkerSizes(map, cliniquesLayerRef);
    };

    const handleMoveEnd = () => {
      clearTimeout(moveTimeoutRef.current);

      if (isReloadingRef.current) return;

      moveTimeoutRef.current = setTimeout(() => {
        if (!isReloadingRef.current) {
          reloadData();
        }
      }, 2500);
    };

    map.on("zoomend", handleZoomEnd);
    map.on("moveend", handleMoveEnd);

    map.whenReady(async () => {
      try {
        await loadMaskMaroc({
          map,
          marocBorderRef
        });

        await loadCategoriesData();

        isMapReadyRef.current = true;
        await reloadData();
      } catch (err) {
        console.error("map init error:", err);
      }
    });

    return () => {
      clearTimeout(moveTimeoutRef.current);
      isMapReadyRef.current = false;
      isReloadingRef.current = false;
      isMountedRef.current = false;

      try {
        map.off("zoomend", handleZoomEnd);
        map.off("moveend", handleMoveEnd);
        map.remove();
      } catch (err) {
        console.warn("cleanup warning:", err);
      }

      mapRef.current = null;
      marocBorderRef.current = null;
      facilitiesGroupRef.current = null;
      pharmaciesGroupRef.current = null;
      cabinetsGroupRef.current = null;
      cliniquesGroupRef.current = null;
    };
  }, [
    mapRef,
    mapContainerRef,
    marocBorderRef,
    facilitiesLayerRef,
    facilitiesGroupRef,
    pharmaciesGroupRef,
    cabinetsLayerRef,
    cabinetsGroupRef,
    cliniquesLayerRef,
    cliniquesGroupRef,
    moveTimeoutRef,
    isMapReadyRef,
    isReloadingRef,
    isMountedRef,
    loadCategoriesData,
    reloadData
  ]);
}