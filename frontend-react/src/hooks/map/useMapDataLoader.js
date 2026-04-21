import { useCallback } from "react";
import { loadAdminLayer } from "../../map/adminLayer";
import { loadEtablissementsLayer } from "../../map/etablissementsLayer";
import { loadPharmaciesLayer } from "../../map/pharmaciesLayer";
import { loadCabinetsLayer } from "../../map/cabinetsLayer";
import {
  loadMedecinsPrivesLayer,
  clearMedecinsPrivesLayer
} from "../../map/medecinsPrivesLayer";

export function useMapDataLoader({
  getMap,
  getMapBBox,
  decoupage,
  categoryFilter,
  toggleFacilities,
  togglePharmacies,
  toggleMedecinsPrives,
  toggleCabinets,
  adminLayerRef,
  facilitiesLayerRef,
  facilitiesGroupRef,
  pharmaciesLayerRef,
  pharmaciesGroupRef,
  cabinetsLayerRef,
  cabinetsGroupRef,
  isMapReadyRef,
  isReloadingRef,
  isMountedRef,
  setLoading,
  setTotalMedecinsPrives
}) {
  const loadAdmin = useCallback(async () => {
    const map = getMap();
    if (!map) return;

    await loadAdminLayer({
      map,
      mode: decoupage,
      adminLayerRef
    });
  }, [getMap, decoupage, adminLayerRef]);

  const loadEtablissements = useCallback(async () => {
    const map = getMap();
    const bbox = getMapBBox();

    if (!map || !bbox) return;

    await loadEtablissementsLayer({
      map,
      bbox,
      region: null,
      province: null,
      commune: null,
      categorie: categoryFilter,
      facilitiesLayerRef,
      facilitiesGroupRef,
      toggleFacilities
    });
  }, [
    getMap,
    getMapBBox,
    categoryFilter,
    facilitiesLayerRef,
    facilitiesGroupRef,
    toggleFacilities
  ]);

  const loadPharmacies = useCallback(async () => {
    const bbox = getMapBBox();
    if (!bbox) return;

    await loadPharmaciesLayer({
      bbox,
      region: null,
      province: null,
      commune: null,
      pharmaciesLayerRef,
      pharmaciesGroupRef,
      togglePharmacies
    });
  }, [
    getMapBBox,
    pharmaciesLayerRef,
    pharmaciesGroupRef,
    togglePharmacies
  ]);

  const loadCabinets = useCallback(async () => {
    const map = getMap();
    const bbox = getMapBBox();

    if (!map || !bbox) return;

    await loadCabinetsLayer({
      map,
      bbox,
      ville: null,
      nom: null,
      cabinetsLayerRef,
      cabinetsGroupRef,
      toggleCabinets
    });
  }, [
    getMap,
    getMapBBox,
    cabinetsLayerRef,
    cabinetsGroupRef,
    toggleCabinets
  ]);

  const loadMedecinsPrives = useCallback(async () => {
    const map = getMap();

    if (!toggleMedecinsPrives) {
      clearMedecinsPrivesLayer(adminLayerRef, map);
      setTotalMedecinsPrives(0);
      return;
    }

    if (!adminLayerRef.current || !map) return;

    const result = await loadMedecinsPrivesLayer({
      map,
      mode: decoupage,
      codeRegion: null,
      codeProvince: null,
      adminLayerRef,
      toggleMedecinsPrives
    });

    setTotalMedecinsPrives(Number(result?.totalGlobal || 0));
  }, [
    getMap,
    toggleMedecinsPrives,
    adminLayerRef,
    decoupage,
    setTotalMedecinsPrives
  ]);

  const reloadData = useCallback(async () => {
    const map = getMap();

    if (!map || !isMapReadyRef.current || isReloadingRef.current) return;

    isReloadingRef.current = true;

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      await loadAdmin();

      await Promise.all([
        loadEtablissements(),
        loadPharmacies(),
        loadCabinets()
      ]);

      if (adminLayerRef.current) {
        await loadMedecinsPrives();
      }
    } catch (err) {
      console.error("reloadData error:", err);
    } finally {
      isReloadingRef.current = false;

      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    getMap,
    isMapReadyRef,
    isReloadingRef,
    isMountedRef,
    setLoading,
    loadAdmin,
    loadEtablissements,
    loadPharmacies,
    loadCabinets,
    loadMedecinsPrives,
    adminLayerRef
  ]);

  return {
    loadAdmin,
    loadEtablissements,
    loadPharmacies,
    loadCabinets,
    loadMedecinsPrives,
    reloadData
  };
}