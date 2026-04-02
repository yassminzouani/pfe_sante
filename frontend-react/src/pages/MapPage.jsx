import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { fetchCategories } from "../map/api";
import { MAROC_BOUNDS } from "../map/styles";
import { loadAdminLayer } from "../map/adminLayer";
import {
  loadEtablissementsLayer,
  syncFacilitiesVisibility,
  updateFacilityMarkerSizes
} from "../map/etablissementsLayer";
import {
  loadPharmaciesLayer,
  syncPharmaciesVisibility
} from "../map/pharmaciesLayer";
import {
  loadMedecinsPrivesLayer,
  clearMedecinsPrivesLayer
} from "../map/medecinsPrivesLayer";

const panelStyle = {
  position: "absolute",
  top: 16,
  left: 16,
  zIndex: 1000,
  width: 360,
  background: "#ffffff",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 6px 20px rgba(0,0,0,0.15)"
};

const selectStyle = {
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  outline: "none"
};

const buttonStyle = {
  width: "100%",
  padding: 10,
  border: "none",
  borderRadius: 8,
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600
};

export default function MapPage() {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  const adminLayerRef = useRef(null);
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

  const loadAdmin = useCallback(async () => {
    const map = getMap();
    if (!map) return;

    await loadAdminLayer({
      map,
      mode: decoupage,
      adminLayerRef
    });
  }, [decoupage, getMap]);

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
  }, [getMap, getMapBBox, categoryFilter, toggleFacilities]);

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
  }, [getMapBBox, togglePharmacies]);

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
  }, [decoupage, toggleMedecinsPrives, getMap]);

  const reloadData = useCallback(async () => {
    const map = getMap();
    if (!map || !isMapReadyRef.current || isReloadingRef.current) return;

    isReloadingRef.current = true;
    if (isMountedRef.current) setLoading(true);

    try {
      await loadAdmin();

      await Promise.all([
        loadEtablissements(),
        loadPharmacies()
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
  }, [getMap, loadAdmin, loadEtablissements, loadPharmacies, loadMedecinsPrives]);

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
      attribution: "© OpenStreetMap"
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

        if (adminLayerRef.current && map.hasLayer(adminLayerRef.current)) {
          map.removeLayer(adminLayerRef.current);
        }

        if (facilitiesGroupRef.current && map.hasLayer(facilitiesGroupRef.current)) {
          map.removeLayer(facilitiesGroupRef.current);
        }

        if (pharmaciesGroupRef.current && map.hasLayer(pharmaciesGroupRef.current)) {
          map.removeLayer(pharmaciesGroupRef.current);
        }

        clearMedecinsPrivesLayer(adminLayerRef, map);
      } catch (err) {
        console.warn("cleanup warning:", err);
      }

      adminLayerRef.current = null;
      facilitiesGroupRef.current = null;
      pharmaciesGroupRef.current = null;

      map.remove();
      mapRef.current = null;
    };
  }, [loadCategoriesData, reloadData]);

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
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div style={panelStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Carte Santé Maroc</h3>

      

        <div style={{ marginBottom: 10 }}>
          <label htmlFor="categorie-select" style={{ display: "block", marginBottom: 6 }}>
            Catégorie
          </label>
          <select
            id="categorie-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label htmlFor="decoupage-select" style={{ display: "block", marginBottom: 6 }}>
            Découpage
          </label>
          <select
            id="decoupage-select"
            value={decoupage}
            onChange={(e) => setDecoupage(e.target.value)}
            style={selectStyle}
          >
            <option value="regions">Régions</option>
            <option value="provinces">Provinces / Préfectures</option>
            <option value="communes">Communes</option>
          </select>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={toggleFacilities}
            onChange={(e) => setToggleFacilities(e.target.checked)}
          />
          Établissements
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={togglePharmacies}
            onChange={(e) => setTogglePharmacies(e.target.checked)}
          />
          Pharmacies
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={toggleMedecinsPrives}
            onChange={(e) => setToggleMedecinsPrives(e.target.checked)}
          />
          Médecins privés
        </label>

        <button onClick={resetMap} style={buttonStyle}>
          Reset
        </button>
      </div>

      {loading && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 1000,
            background: "#111827",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 10
          }}
        >
          Chargement...
        </div>
      )}

      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}