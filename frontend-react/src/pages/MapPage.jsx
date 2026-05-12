import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../services/authService";

import MapLegend from "../components/map/MapLegend";
import LoadingOverlay from "../components/map/LoadingOverlay";
import MapControlPanel from "../components/map/MapControlPanel";

import { fetchCategories } from "../map/api";
import { MAROC_BOUNDS } from "../map/styles";
import { setLayerGroupVisibility } from "../map/layerVisibility";
import { clearMedecinsPrivesLayer } from "../map/medecinsPrivesLayer";

import { styles } from "./mapPage.styles";
import { useMapDataLoader } from "../hooks/map/useMapDataLoader";
import { useLeafletMap } from "../hooks/map/useLeafletMap";

export default function MapPage() {
  const navigate = useNavigate();

  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  const adminLayerRef = useRef(null);
  const marocBorderRef = useRef(null);

  const facilitiesLayerRef = useRef(null);
  const pharmaciesLayerRef = useRef(null);
  const cabinetsLayerRef = useRef(null);
  const cliniquesLayerRef = useRef(null);

  const facilitiesGroupRef = useRef(null);
  const pharmaciesGroupRef = useRef(null);
  const cabinetsGroupRef = useRef(null);
  const cliniquesGroupRef = useRef(null);

  const isReloadingRef = useRef(false);
  const isMapReadyRef = useRef(false);
  const isMountedRef = useRef(false);

  const [decoupage, setDecoupage] = useState("regions");
  const [accessMethod, setAccessMethod] = useState("densite");
  const [distanceKm, setDistanceKm] = useState(10);
  const [analysisVersion, setAnalysisVersion] = useState(0);

  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");

  const [toggleFacilities, setToggleFacilities] = useState(true);
  const [togglePharmacies, setTogglePharmacies] = useState(true);
  const [toggleMedecinsPrives, setToggleMedecinsPrives] = useState(true);
  const [toggleCabinets, setToggleCabinets] = useState(true);
  const [toggleCliniques, setToggleCliniques] = useState(true);

  const [totalMedecinsPrives, setTotalMedecinsPrives] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleLogout = useCallback(() => {
    logoutUser();
    navigate("/login");
  }, [navigate]);

  const getMap = useCallback(() => mapRef.current, []);

  const getMapBBox = useCallback(() => {
    const map = getMap();
    if (!map) return null;

    const bounds = map.getBounds();

    return [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ].join(",");
  }, [getMap]);

  const launchAnalysis = useCallback(() => {
    setAnalysisVersion((value) => value + 1);
  }, []);

  const loadCategoriesData = useCallback(async () => {
    try {
      const data = await fetchCategories();

      if (!isMountedRef.current) return;

      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadCategoriesData error:", err);
    }
  }, []);

  const {
    loadMedecinsPrives,
    reloadData,
    reloadAnalysisOnly,
    reloadPointsOnly
  } = useMapDataLoader({
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
  });

  const resetMap = useCallback(() => {
    const map = getMap();
    if (!map) return;

    setCategoryFilter("");
    setDecoupage("regions");
    setAccessMethod("densite");
    setDistanceKm(10);
    setAnalysisVersion((value) => value + 1);

    setToggleFacilities(true);
    setTogglePharmacies(true);
    setToggleMedecinsPrives(true);
    setToggleCabinets(true);
    setToggleCliniques(true);

    setTotalMedecinsPrives(0);
    map.fitBounds(MAROC_BOUNDS);
  }, [getMap]);

  useLeafletMap({
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

    isMapReadyRef,
    isReloadingRef,
    isMountedRef,

    loadCategoriesData,
    reloadData
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    setLayerGroupVisibility({
      map,
      groupRef: facilitiesGroupRef,
      visible: toggleFacilities
    });
  }, [toggleFacilities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    setLayerGroupVisibility({
      map,
      groupRef: pharmaciesGroupRef,
      visible: togglePharmacies
    });
  }, [togglePharmacies]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    setLayerGroupVisibility({
      map,
      groupRef: cabinetsGroupRef,
      visible: toggleCabinets
    });
  }, [toggleCabinets]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    setLayerGroupVisibility({
      map,
      groupRef: cliniquesGroupRef,
      visible: toggleCliniques
    });
  }, [toggleCliniques]);

  useEffect(() => {
    if (!isMapReadyRef.current) return;

    if (!toggleMedecinsPrives) {
      clearMedecinsPrivesLayer(adminLayerRef, mapRef.current);
      setTotalMedecinsPrives(0);
      return;
    }

    loadMedecinsPrives();
  }, [toggleMedecinsPrives, decoupage]);

  useEffect(() => {
    if (!isMapReadyRef.current) return;
    reloadAnalysisOnly();
  }, [decoupage, analysisVersion]);

  useEffect(() => {
    if (!isMapReadyRef.current) return;
    reloadPointsOnly();
  }, [categoryFilter]);

  return (
    <div style={styles.page}>
      <MapControlPanel
        styles={styles}
        decoupage={decoupage}
        setDecoupage={setDecoupage}
        accessMethod={accessMethod}
        setAccessMethod={setAccessMethod}
        distanceKm={distanceKm}
        setDistanceKm={setDistanceKm}
        launchAnalysis={launchAnalysis}
        categories={categories}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        toggleFacilities={toggleFacilities}
        setToggleFacilities={setToggleFacilities}
        togglePharmacies={togglePharmacies}
        setTogglePharmacies={setTogglePharmacies}
        toggleMedecinsPrives={toggleMedecinsPrives}
        setToggleMedecinsPrives={setToggleMedecinsPrives}
        toggleCabinets={toggleCabinets}
        setToggleCabinets={setToggleCabinets}
        toggleCliniques={toggleCliniques}
        setToggleCliniques={setToggleCliniques}
        totalMedecinsPrives={totalMedecinsPrives}
        resetMap={resetMap}
        handleLogout={handleLogout}
      />

      <LoadingOverlay loading={loading} style={styles.loading} />
      <MapLegend accessMethod={accessMethod} />

      <div ref={mapContainerRef} style={styles.map} />
    </div>
  );
}