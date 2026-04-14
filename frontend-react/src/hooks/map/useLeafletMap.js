import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAROC_BOUNDS } from "../../map/styles";
import { loadMaskMaroc } from "../../map/adminLayer";
import { updateFacilityMarkerSizes } from "../../map/etablissementsLayer";

export function useLeafletMap({
  mapRef,
  mapContainerRef,
  marocBorderRef,
  facilitiesLayerRef,
  facilitiesGroupRef,
  pharmaciesGroupRef,
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

    const handleZoomEnd = () => {
      updateFacilityMarkerSizes(map, facilitiesLayerRef);
    };

    const handleMoveEnd = () => {
      clearTimeout(moveTimeoutRef.current);
      moveTimeoutRef.current = setTimeout(() => {
        reloadData();
      }, 250);
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
    };
  }, [
    mapRef,
    mapContainerRef,
    marocBorderRef,
    facilitiesLayerRef,
    facilitiesGroupRef,
    pharmaciesGroupRef,
    moveTimeoutRef,
    isMapReadyRef,
    isReloadingRef,
    isMountedRef,
    loadCategoriesData,
    reloadData
  ]);
}