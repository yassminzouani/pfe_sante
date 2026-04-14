import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../services/authService";

import { fetchCategories } from "../map/api";
import { MAROC_BOUNDS } from "../map/styles";
import { loadAdminLayer, loadMaskMaroc } from "../map/adminLayer";
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

const styles = {
  page: {
    width: "100%",
    height: "100vh",
    position: "relative",
    background: "#f4f7fb"
  },

  panel: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 1000,
    width: 380,
    maxHeight: "calc(100vh - 40px)",
    overflowY: "auto",
    background: "rgba(255, 255, 255, 0.96)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.16)"
  },

  header: {
    marginBottom: 18
  },

  badge: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    background: "#e0f2fe",
    color: "#0369a1",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
    letterSpacing: 0.3
  },

  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a"
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 0,
    fontSize: 14,
    lineHeight: 1.5,
    color: "#475569"
  },

  section: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0"
  },

  sectionTitle: {
    margin: "0 0 12px 0",
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },

  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#334155"
  },

  select: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: 14,
    background: "#fff",
    color: "#0f172a"
  },

  toggleCard: {
    padding: 12,
    borderRadius: 14,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    marginBottom: 10
  },

  toggleHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10
  },

  toggleLabelWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer"
  },

  toggleTextWrap: {
    display: "flex",
    flexDirection: "column"
  },

  toggleTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1.2
  },

  toggleSubtext: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2
  },

  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#0f766e",
    cursor: "pointer"
  },

  statBox: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#ecfeff",
    border: "1px solid #bae6fd",
    color: "#155e75",
    fontSize: 13,
    fontWeight: 700
  },

  actionsSection: {
    marginTop: 4
  },

  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10
  },

  primaryButton: {
    width: "100%",
    padding: "12px 14px",
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #0f766e, #0f172a)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.18)"
  },

  secondaryButton: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14
  },

  dangerButton: {
    width: "100%",
    padding: "12px 14px",
    border: "none",
    borderRadius: 12,
    background: "#b91c1c",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    boxShadow: "0 10px 24px rgba(127, 29, 29, 0.18)"
  },

  loading: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 1000,
    background: "rgba(15, 23, 42, 0.95)",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 700,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.25)"
  },

  map: {
    width: "100%",
    height: "100%"
  }
};

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

        if (adminLayerRef.current && map.hasLayer(adminLayerRef.current)) {
          map.removeLayer(adminLayerRef.current);
        }

        if (marocBorderRef.current && map.hasLayer(marocBorderRef.current)) {
          map.removeLayer(marocBorderRef.current);
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
      marocBorderRef.current = null;
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
    <div style={styles.page}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.badge}>Mediot AI · Cartographie</span>
          <h3 style={styles.title}>Carte Santé Maroc</h3>
          
        </div>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Paramètres cartographiques</h4>

          <div style={{ marginBottom: 0 }}>
            <label htmlFor="decoupage-select" style={styles.label}>
              Découpage administratif
            </label>
            <select
              id="decoupage-select"
              value={decoupage}
              onChange={(e) => setDecoupage(e.target.value)}
              style={styles.select}
            >
              <option value="regions">Régions</option>
              <option value="provinces">Provinces / Préfectures</option>
              <option value="communes">Communes</option>
            </select>
          </div>
        </div>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Couches de données</h4>

          <div style={styles.toggleCard}>
            <div style={styles.toggleHeader}>
              <label style={styles.toggleLabelWrap}>
                <input
                  type="checkbox"
                  checked={toggleFacilities}
                  onChange={(e) => setToggleFacilities(e.target.checked)}
                  style={styles.checkbox}
                />
                <div style={styles.toggleTextWrap}>
                  <span style={styles.toggleTitle}>Établissements</span>
                  <span style={styles.toggleSubtext}>
                    Affichage des structures de santé
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label htmlFor="categorie-select" style={styles.label}>
                Catégorie des établissements
              </label>
              <select
                id="categorie-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={styles.select}
              >
                <option value="">Toutes les catégories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.toggleCard}>
            <label style={styles.toggleLabelWrap}>
              <input
                type="checkbox"
                checked={togglePharmacies}
                onChange={(e) => setTogglePharmacies(e.target.checked)}
                style={styles.checkbox}
              />
              <div style={styles.toggleTextWrap}>
                <span style={styles.toggleTitle}>Pharmacies</span>
                <span style={styles.toggleSubtext}>
                  Réseau officinal visible sur la carte
                </span>
              </div>
            </label>
          </div>

          <div style={styles.toggleCard}>
            <label style={styles.toggleLabelWrap}>
              <input
                type="checkbox"
                checked={toggleMedecinsPrives}
                onChange={(e) => setToggleMedecinsPrives(e.target.checked)}
                style={styles.checkbox}
              />
              <div style={styles.toggleTextWrap}>
                <span style={styles.toggleTitle}>Médecins privés</span>
                <span style={styles.toggleSubtext}>
                  Distribution par zone administrative
                </span>
              </div>
            </label>

            {toggleMedecinsPrives && (
              <div style={styles.statBox}>
                Total médecins privés : {totalMedecinsPrives}
              </div>
            )}
          </div>
        </div>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Actions</h4>

          <div style={styles.actionsSection}>
            <div style={styles.actionsGrid}>
              <button onClick={resetMap} style={styles.secondaryButton}>
                Réinitialiser
              </button>

              <button onClick={handleLogout} style={styles.dangerButton}>
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div style={styles.loading}>
          Chargement des données...
        </div>
      )}

      <div ref={mapContainerRef} style={styles.map} />
    </div>
  );
}