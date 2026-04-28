import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../services/authService";

import { fetchCategories } from "../map/api";
import { MAROC_BOUNDS } from "../map/styles";
import { syncFacilitiesVisibility } from "../map/etablissementsLayer";
import { syncPharmaciesVisibility } from "../map/pharmaciesLayer";
import { syncCabinetsVisibility } from "../map/cabinetsLayer";
import { syncCliniquesVisibility } from "../map/cliniquesLayer";

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
  const cabinetsLayerRef = useRef(null);
  const cliniquesLayerRef = useRef(null);

  const facilitiesGroupRef = useRef(null);
  const pharmaciesGroupRef = useRef(null);
  const cabinetsGroupRef = useRef(null);
  const cliniquesGroupRef = useRef(null);

  const moveTimeoutRef = useRef(null);
  const isReloadingRef = useRef(false);
  const isMapReadyRef = useRef(false);
  const isMountedRef = useRef(false);

  const [decoupage, setDecoupage] = useState("regions");
  const [accessMethod, setAccessMethod] = useState("densite");

  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");

  const [toggleFacilities, setToggleFacilities] = useState(true);
  const [togglePharmacies, setTogglePharmacies] = useState(true);
  const [toggleMedecinsPrives, setToggleMedecinsPrives] = useState(true);
  const [toggleCabinets, setToggleCabinets] = useState(true);
  const [toggleCliniques, setToggleCliniques] = useState(true);

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

  const { loadMedecinsPrives, reloadData } =
    useMapDataLoader({
      getMap,
      getMapBBox,
      decoupage,
      accessMethod,
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
  if (!isMapReadyRef.current) return;
  reloadData();
}, [accessMethod]);

  useEffect(() => {
    syncPharmaciesVisibility({
      togglePharmacies,
      pharmaciesGroupRef,
      pharmaciesLayerRef
    });
  }, [togglePharmacies]);

  useEffect(() => {
    syncCabinetsVisibility({
      toggleCabinets,
      cabinetsGroupRef,
      cabinetsLayerRef,
      map: mapRef.current
    });
  }, [toggleCabinets]);

  useEffect(() => {
    syncCliniquesVisibility({
      toggleCliniques,
      cliniquesGroupRef,
      cliniquesLayerRef,
      map: mapRef.current
    });
  }, [toggleCliniques]);

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
        accessMethod={accessMethod}
        setAccessMethod={setAccessMethod}
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

      <div ref={mapContainerRef} style={styles.map} />
    </div>
  );
}