import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../services/authService";

import { fetchCategories } from "../map/api";
import { MAROC_BOUNDS } from "../map/styles";
import { syncFacilitiesVisibility } from "../map/etablissementsLayer";
import { syncPharmaciesVisibility } from "../map/pharmaciesLayer";

import LoadingOverlay from "../components/map/LoadingOverlay";
import MapControlPanel from "../components/map/MapControlPanel";
import { styles } from "./mapPage.styles";
import { useMapDataLoader } from "../hooks/map/useMapDataLoader";
import { useLeafletMap } from "../hooks/map/useLeafletMap";

export default function MapPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  const adminLayerRef = useRef(null);
  const marocBorderRef = useRef(null);

  const facilitiesLayerRef = useRef(null);
  const pharmaciesLayerRef = useRef(null);

  const facilitiesGroupRef = useRef(null);
  const pharmaciesGroupRef = useRef(null);

  const moveTimeoutRef = useRef(null);
  const isReloadingRef = useRef(false);
  const isMapReadyRef = useRef(false);
  const isMountedRef = useRef(false);

  const [decoupage, setDecoupage] = useState("regions");
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");

  const [toggleFacilities, setToggleFacilities] = useState(true);
  const [togglePharmacies, setTogglePharmacies] = useState(true);
  const [toggleMedecinsPrives, setToggleMedecinsPrives] = useState(true);

  const [totalMedecinsPrives, setTotalMedecinsPrives] = useState(0);
  const [loading, setLoading] = useState(false);

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

  const loadCategoriesData = useCallback(async () => {
    try {
      const data = await fetchCategories();

      if (!isMountedRef.current) return;

      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadCategoriesData error:", err);
    }
  }, []);

  const { loadMedecinsPrives, reloadData } = useMapDataLoader({
    getMap,
    getMapBBox,
    decoupage,
    categoryFilter,
    toggleFacilities,
    togglePharmacies,
    toggleMedecinsPrives,
    adminLayerRef,
    facilitiesLayerRef,
    facilitiesGroupRef,
    pharmaciesLayerRef,
    pharmaciesGroupRef,
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
    setToggleFacilities(true);
    setTogglePharmacies(true);
    setToggleMedecinsPrives(true);
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
    moveTimeoutRef,
    isMapReadyRef,
    isReloadingRef,
    isMountedRef,
    loadCategoriesData,
    reloadData
  });

  useEffect(() => {
    syncFacilitiesVisibility({
      toggleFacilities,
      facilitiesGroupRef,
      facilitiesLayerRef,
      map: mapRef.current
    });
  }, [toggleFacilities]);

  useEffect(() => {
    syncPharmaciesVisibility({
      togglePharmacies,
      pharmaciesGroupRef,
      pharmaciesLayerRef
    });
  }, [togglePharmacies]);

  useEffect(() => {
    if (!isMapReadyRef.current) return;
    reloadData();
  }, [reloadData]);

  useEffect(() => {
    if (!isMapReadyRef.current) return;
    loadMedecinsPrives();
  }, [decoupage, toggleMedecinsPrives, loadMedecinsPrives]);

  return (
    <div style={styles.page}>
      <MapControlPanel
        styles={styles}
        decoupage={decoupage}
        setDecoupage={setDecoupage}
        categories={categories}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        toggleFacilities={toggleFacilities}
        setToggleFacilities={setToggleFacilities}
        togglePharmacies={togglePharmacies}
        setTogglePharmacies={setTogglePharmacies}
        toggleMedecinsPrives={toggleMedecinsPrives}
        setToggleMedecinsPrives={setToggleMedecinsPrives}
        totalMedecinsPrives={totalMedecinsPrives}
        resetMap={resetMap}
        handleLogout={handleLogout}
      />

      <LoadingOverlay loading={loading} style={styles.loading} />

      <div ref={mapContainerRef} style={styles.map} />
    </div>
  );
}