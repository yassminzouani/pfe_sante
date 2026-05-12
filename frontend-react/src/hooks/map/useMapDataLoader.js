import { useCallback } from "react";
import { loadAdminLayer } from "../../map/adminLayer";
import { loadEtablissementsLayer } from "../../map/etablissementsLayer";
import { loadPharmaciesLayer } from "../../map/pharmaciesLayer";
import { loadCabinetsLayer } from "../../map/cabinetsLayer";
import { loadCliniquesLayer } from "../../map/cliniquesLayer";
import {
  loadMedecinsPrivesLayer,
  clearMedecinsPrivesLayer
} from "../../map/medecinsPrivesLayer";
import { setLayerGroupVisibility } from "../../map/layerVisibility";

export function useMapDataLoader({
  getMap,
  getMapBBox,

  decoupage,
  accessMethod,
  distanceKm,
  analysisVersion,
  categoryFilter,

  toggleFacilities,
  togglePharmacies,
  toggleMedecinsPrives,
  toggleCabinets,
  toggleCliniques,

  adminLayerRef,

  facilitiesLayerRef,
  facilitiesGroupRef,

  pharmaciesLayerRef,
  pharmaciesGroupRef,

  cabinetsLayerRef,
  cabinetsGroupRef,

  cliniquesLayerRef,
  cliniquesGroupRef,

  isMapReadyRef,
  isReloadingRef,
  isMountedRef,

  setLoading,
  setTotalMedecinsPrives
}) {
  const applyVisibility = useCallback(() => {
    const map = getMap();
    if (!map) return;

    setLayerGroupVisibility({
      map,
      groupRef: facilitiesGroupRef,
      visible: toggleFacilities
    });

    setLayerGroupVisibility({
      map,
      groupRef: pharmaciesGroupRef,
      visible: togglePharmacies
    });

    setLayerGroupVisibility({
      map,
      groupRef: cabinetsGroupRef,
      visible: toggleCabinets
    });

    setLayerGroupVisibility({
      map,
      groupRef: cliniquesGroupRef,
      visible: toggleCliniques
    });
  }, [
    getMap,
    facilitiesGroupRef,
    pharmaciesGroupRef,
    cabinetsGroupRef,
    cliniquesGroupRef,
    toggleFacilities,
    togglePharmacies,
    toggleCabinets,
    toggleCliniques
  ]);

  const loadAdmin = useCallback(async () => {
    const map = getMap();
    if (!map) return;

    await loadAdminLayer({
      map,
      mode: decoupage,
      adminLayerRef,
      accessMethod,
      distanceKm
    });
  }, [
    getMap,
    decoupage,
    adminLayerRef,
    accessMethod,
    distanceKm,
    analysisVersion
  ]);

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
      toggleFacilities: true
    });
  }, [
    getMap,
    getMapBBox,
    categoryFilter,
    facilitiesLayerRef,
    facilitiesGroupRef
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
      togglePharmacies: true
    });
  }, [
    getMapBBox,
    pharmaciesLayerRef,
    pharmaciesGroupRef
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
      toggleCabinets: true
    });
  }, [
    getMap,
    getMapBBox,
    cabinetsLayerRef,
    cabinetsGroupRef
  ]);

  const loadCliniques = useCallback(async () => {
    const map = getMap();
    const bbox = getMapBBox();

    if (!map || !bbox) return;

    await loadCliniquesLayer({
      map,
      bbox,
      ville: null,
      nom: null,
      cliniquesLayerRef,
      cliniquesGroupRef,
      toggleCliniques: true
    });
  }, [
    getMap,
    getMapBBox,
    cliniquesLayerRef,
    cliniquesGroupRef
  ]);

  const loadPointsLayers = useCallback(async () => {
    await Promise.all([
      loadEtablissements(),
      loadPharmacies(),
      loadCabinets(),
      loadCliniques()
    ]);

    applyVisibility();
  }, [
    loadEtablissements,
    loadPharmacies,
    loadCabinets,
    loadCliniques,
    applyVisibility
  ]);

  const loadMedecinsPrives = useCallback(async () => {
    const map = getMap();

    if (!map) return;

    if (!toggleMedecinsPrives) {
      clearMedecinsPrivesLayer(adminLayerRef, map);
      setTotalMedecinsPrives(0);
      return;
    }

    if (!adminLayerRef.current) return;

    const result = await loadMedecinsPrivesLayer({
      map,
      mode: decoupage,
      codeRegion: null,
      codeProvince: null,
      adminLayerRef,
      toggleMedecinsPrives: true
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
      await loadPointsLayers();

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
    loadPointsLayers,
    loadMedecinsPrives,
    adminLayerRef
  ]);

  const reloadAnalysisOnly = useCallback(async () => {
    const map = getMap();

    if (!map || !isMapReadyRef.current || isReloadingRef.current) return;

    isReloadingRef.current = true;

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      await loadAdmin();

      if (adminLayerRef.current) {
        await loadMedecinsPrives();
      }

      applyVisibility();
    } catch (err) {
      console.error("reloadAnalysisOnly error:", err);
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
    loadMedecinsPrives,
    adminLayerRef,
    applyVisibility
  ]);

  const reloadPointsOnly = useCallback(async () => {
    const map = getMap();

    if (!map || !isMapReadyRef.current || isReloadingRef.current) return;

    isReloadingRef.current = true;

    try {
      await loadPointsLayers();
    } catch (err) {
      console.error("reloadPointsOnly error:", err);
    } finally {
      isReloadingRef.current = false;
    }
  }, [
    getMap,
    isMapReadyRef,
    isReloadingRef,
    loadPointsLayers
  ]);

  return {
    reloadData,
    reloadAnalysisOnly,
    reloadPointsOnly,
    loadMedecinsPrives,
    applyVisibility
  };
}