import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API = "http://localhost:3000/api";

const MAROC_BOUNDS = [
  [20.5, -17.5],
  [36.0, -1.0]
];

const FACILITY_STYLE = {
  radius: 4,
  weight: 1,
  color: "#8f1d14",
  fillColor: "#d92d20",
  fillOpacity: 0.85
};

const PHARMACY_STYLE = {
  radius: 5,
  weight: 1,
  color: "#18794e",
  fillColor: "#22c55e",
  fillOpacity: 0.9
};

const panelStyle = {
  position: "absolute",
  top: 16,
  left: 16,
  zIndex: 1000,
  width: 340,
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFacilityRadius(zoom) {
  if (zoom <= 6) return 3;
  if (zoom <= 8) return 4;
  if (zoom <= 10) return 5;
  return 6;
}

function buildSpecialitesHtml(data) {
  const specialites = Array.isArray(data?.specialites) ? data.specialites : [];

  if (!specialites.length) {
    return `<div>Aucun médecin trouvé</div>`;
  }

  return `
    <table style="width:100%; border-collapse:collapse; margin-top:8px;">
      <thead>
        <tr>
          <th style="text-align:left; padding-bottom:6px;">Spécialité</th>
          <th style="text-align:right; padding-bottom:6px;">Nombre</th>
        </tr>
      </thead>
      <tbody>
        ${specialites
          .map(
            (s) => `
              <tr>
                <td style="padding:4px 12px 4px 0;">
                  ${escapeHtml(s.specialite || "Non renseignée")}
                </td>
                <td style="padding:4px 0; text-align:right;">
                  <b>${Number(s.total || 0)}</b>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function buildEtablissementPopup(p, data = null) {
  return `
    <div style="min-width:300px;">
      <div style="font-size:16px; font-weight:700; margin-bottom:8px;">
        ${escapeHtml(p.nom || "")}
      </div>

      <div style="margin-bottom:8px; line-height:1.5;">
        Catégorie : ${escapeHtml(p.categorie || "")}<br>
        Milieu : ${escapeHtml(p.milieu || "")}
      </div>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0;" />

      <div style="margin:8px 0;">
        <b>Total médecins : ${data ? Number(data.total_medecins || 0) : "..."}</b>
      </div>

      ${
        data
          ? buildSpecialitesHtml(data)
          : `<div>Chargement des spécialités...</div>`
      }
    </div>
  `;
}

function buildPharmacyPopup(p) {
  return `
    <div style="min-width:240px; line-height:1.55;">
      <div style="font-size:15px; font-weight:700; margin-bottom:8px;">
        ${escapeHtml(p.title || "")}
      </div>
      <div><b>Catégorie :</b> ${escapeHtml(p.categoryname || "")}</div>
      <div><b>Ville :</b> ${escapeHtml(p.city || "")}</div>
      <div><b>Adresse :</b> ${escapeHtml(p.address || "")}</div>
      <div><b>Téléphone :</b> ${escapeHtml(p.phone || "")}</div>
    </div>
  `;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchMedecinsByEtablissement(code) {
  return fetchJson(
    `${API}/medecins/by-etablissement/${encodeURIComponent(code)}`
  );
}

export default function MapPage() {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  const adminLayerRef = useRef(null);
  const marocMaskRef = useRef(null);
  const marocBorderRef = useRef(null);

  const facilitiesLayerRef = useRef(null);
  const pharmaciesLayerRef = useRef(null);

  const facilitiesGroupRef = useRef(null);
  const pharmaciesGroupRef = useRef(null);

  const moveTimeoutRef = useRef(null);
  const readyRef = useRef(false);
  const isReloadingRef = useRef(false);

  const [decoupage, setDecoupage] = useState("regions");
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");

  const [toggleFacilities, setToggleFacilities] = useState(true);
  const [togglePharmacies, setTogglePharmacies] = useState(true);

  const [currentRegion, setCurrentRegion] = useState(null);
  const [currentProvince, setCurrentProvince] = useState(null);
  const [currentCommune, setCurrentCommune] = useState(null);

  const [loading, setLoading] = useState(false);

  const getMap = useCallback(() => mapRef.current, []);

  const getMapBBox = useCallback(() => {
    const map = getMap();
    if (!map) return null;
    const b = map.getBounds();
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(",");
  }, [getMap]);

  const updateFacilityMarkerSizes = useCallback(() => {
    const map = getMap();
    const layer = facilitiesLayerRef.current;
    if (!map || !layer) return;

    const radius = getFacilityRadius(map.getZoom());

    layer.eachLayer((item) => {
      if (item instanceof L.CircleMarker) {
        item.setRadius(radius);
      }
    });
  }, [getMap]);

  const createFacilityMarker = useCallback(
    (latlng) => {
      const map = getMap();
      const zoom = map ? map.getZoom() : 6;

      return L.circleMarker(latlng, {
        ...FACILITY_STYLE,
        radius: getFacilityRadius(zoom)
      });
    },
    [getMap]
  );

  const createPharmacyMarker = useCallback((latlng) => {
    return L.circleMarker(latlng, PHARMACY_STYLE);
  }, []);

  const clearAdminLayer = useCallback(() => {
    const map = getMap();
    if (map && adminLayerRef.current) {
      map.removeLayer(adminLayerRef.current);
      adminLayerRef.current = null;
    }
  }, [getMap]);

  const clearFacilitiesLayer = useCallback(() => {
    if (facilitiesGroupRef.current) {
      facilitiesGroupRef.current.clearLayers();
    }
    facilitiesLayerRef.current = null;
  }, []);

  const clearPharmaciesLayer = useCallback(() => {
    if (pharmaciesGroupRef.current) {
      pharmaciesGroupRef.current.clearLayers();
    }
    pharmaciesLayerRef.current = null;
  }, []);

  const syncFacilitiesVisibility = useCallback(() => {
    if (!facilitiesGroupRef.current) return;
    facilitiesGroupRef.current.clearLayers();

    if (toggleFacilities && facilitiesLayerRef.current) {
      facilitiesGroupRef.current.addLayer(facilitiesLayerRef.current);
      facilitiesLayerRef.current.bringToFront();
      updateFacilityMarkerSizes();
    }
  }, [toggleFacilities, updateFacilityMarkerSizes]);

  const syncPharmaciesVisibility = useCallback(() => {
    if (!pharmaciesGroupRef.current) return;
    pharmaciesGroupRef.current.clearLayers();

    if (togglePharmacies && pharmaciesLayerRef.current) {
      pharmaciesGroupRef.current.addLayer(pharmaciesLayerRef.current);
    }
  }, [togglePharmacies]);

  const loadMaskMaroc = useCallback(async () => {
    const map = getMap();
    if (!map) return;

    try {
      const maroc = await fetchJson(`${API}/regions/maroc`);
      if (!maroc.geometry) return;

      const worldOuterRing = [
        [-180, -90],
        [180, -90],
        [180, 90],
        [-180, 90],
        [-180, -90]
      ];

      const toLatLng = (ring) => ring.map(([lng, lat]) => [lat, lng]);
      const holes = [];

      if (maroc.geometry.type === "Polygon") {
        holes.push(toLatLng(maroc.geometry.coordinates[0]));
      }

      if (maroc.geometry.type === "MultiPolygon") {
        maroc.geometry.coordinates.forEach((poly) => {
          holes.push(toLatLng(poly[0]));
        });
      }

      if (marocMaskRef.current) {
        map.removeLayer(marocMaskRef.current);
      }

      if (marocBorderRef.current) {
        map.removeLayer(marocBorderRef.current);
      }

      marocMaskRef.current = L.polygon([toLatLng(worldOuterRing), ...holes], {
        pane: "maskPane",
        stroke: false,
        fillColor: "#ffffff",
        fillOpacity: 0.95,
        interactive: false
      }).addTo(map);

      marocBorderRef.current = L.geoJSON(maroc, {
        pane: "adminPane",
        style: {
          color: "#111",
          weight: 2,
          fillOpacity: 0
        },
        interactive: false
      }).addTo(map);
    } catch (err) {
      console.error("loadMaskMaroc error:", err);
    }
  }, [getMap]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchJson(`${API}/etablissements/categories`);
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadCategories error:", err);
    }
  }, []);

  const getAdminStyle = useCallback((mode) => {
    if (mode === "regions") {
      return {
        color: "#111",
        weight: 2,
        fillColor: "#457b9d",
        fillOpacity: 0.25
      };
    }

    if (mode === "provinces") {
      return {
        color: "#111",
        weight: 1.2,
        fillColor: "#2a9d8f",
        fillOpacity: 0.2
      };
    }

    return {
      color: "#111",
      weight: 0.8,
      fillColor: "#8d99ae",
      fillOpacity: 0.15
    };
  }, []);

  const handleAdminFeatureClick = useCallback(
    (feature, layer, mode) => {
      const props = feature.properties || {};
      const map = getMap();

      layer.on({
        mouseover: () => {
          layer.setStyle({
            fillOpacity: 0.35,
            weight: mode === "regions" ? 3 : 2
          });
        },
        mouseout: () => {
          layer.setStyle(getAdminStyle(mode));
        },
        click: () => {
          if (map) {
            try {
              map.fitBounds(layer.getBounds(), { padding: [20, 20] });
            } catch (e) {
              console.error(e);
            }
          }

          if (mode === "regions") {
            const regionName =
              props.nom ||
              props.name ||
              props.region ||
              props.nom_region ||
              null;

            setCurrentRegion(regionName);
            setCurrentProvince(null);
            setCurrentCommune(null);
            setDecoupage("provinces");
          }

          if (mode === "provinces") {
            const provinceName =
              props.nom ||
              props.name ||
              props.province ||
              props.nom_province ||
              null;

            setCurrentProvince(provinceName);
            setCurrentCommune(null);
            setDecoupage("communes");
          }

          if (mode === "communes") {
            const communeName =
              props.nom ||
              props.name ||
              props.commune ||
              props.nom_commune ||
              null;

            setCurrentCommune(communeName);
          }
        }
      });
    },
    [getAdminStyle, getMap]
  );

  const loadAdmin = useCallback(
    async (mode) => {
      clearAdminLayer();

      const params = new URLSearchParams();

      if (mode === "provinces" && currentRegion) {
        params.set("region", currentRegion);
      }

      if (mode === "communes") {
        if (currentRegion) params.set("region", currentRegion);
        if (currentProvince) params.set("province", currentProvince);
      }

      const url = `${API}/${mode}${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      try {
        const gj = await fetchJson(url);

        const layer = L.geoJSON(gj, {
          pane: "adminPane",
          style: () => getAdminStyle(mode),
          onEachFeature: (feature, leafletLayer) => {
            handleAdminFeatureClick(feature, leafletLayer, mode);
          }
        }).addTo(getMap());

        adminLayerRef.current = layer;
      } catch (err) {
        console.error("loadAdmin error:", err);
      }
    },
    [
      clearAdminLayer,
      currentProvince,
      currentRegion,
      getAdminStyle,
      getMap,
      handleAdminFeatureClick
    ]
  );

  const loadEtablissements = useCallback(
    async ({ region = null, province = null, commune = null, categorie = null } = {}) => {
      clearFacilitiesLayer();

      const bbox = getMapBBox();
      if (!bbox) return;

      const params = new URLSearchParams();
      params.set("limit", "5000");
      params.set("bbox", bbox);

      if (region) params.set("region", region);
      if (province) params.set("province", province);
      if (commune) params.set("commune", commune);
      if (categorie) params.set("categorie", categorie);

      try {
        const gj = await fetchJson(`${API}/etablissements?${params.toString()}`);

        const layer = L.geoJSON(gj, {
          pane: "pointsPane",
          pointToLayer: (feature, latlng) => createFacilityMarker(latlng),
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
        });

        facilitiesLayerRef.current = layer;
        syncFacilitiesVisibility();
      } catch (err) {
        console.error("loadEtablissements error:", err);
      }
    },
    [clearFacilitiesLayer, createFacilityMarker, getMapBBox, syncFacilitiesVisibility]
  );

  const loadPharmacies = useCallback(
    async ({ region = null, province = null, commune = null } = {}) => {
      clearPharmaciesLayer();

      const bbox = getMapBBox();
      if (!bbox) return;

      const params = new URLSearchParams();
      params.set("limit", "5000");
      params.set("bbox", bbox);

      if (region) params.set("region", region);
      if (province) params.set("province", province);
      if (commune) params.set("commune", commune);

      try {
        const gj = await fetchJson(`${API}/pharmacies?${params.toString()}`);

        const layer = L.geoJSON(gj, {
          pane: "pointsPane",
          pointToLayer: (feature, latlng) => createPharmacyMarker(latlng),
          onEachFeature: (feature, leafletLayer) => {
            const p = feature.properties || {};
            leafletLayer.bindPopup(buildPharmacyPopup(p));
          }
        });

        pharmaciesLayerRef.current = layer;
        syncPharmaciesVisibility();
      } catch (err) {
        console.error("loadPharmacies error:", err);
      }
    },
    [clearPharmaciesLayer, createPharmacyMarker, getMapBBox, syncPharmaciesVisibility]
  );

  const reloadData = useCallback(async () => {
    if (!readyRef.current || isReloadingRef.current) return;

    isReloadingRef.current = true;
    setLoading(true);

    try {
      await Promise.all([
        loadAdmin(decoupage),
        loadEtablissements({
          region: currentRegion,
          province: currentProvince,
          commune: currentCommune,
          categorie: categoryFilter
        }),
        loadPharmacies({
          region: currentRegion,
          province: currentProvince,
          commune: currentCommune
        })
      ]);
    } finally {
      isReloadingRef.current = false;
      setLoading(false);
    }
  }, [
    categoryFilter,
    currentCommune,
    currentProvince,
    currentRegion,
    decoupage,
    loadAdmin,
    loadEtablissements,
    loadPharmacies
  ]);

  const resetMap = useCallback(() => {
    const map = getMap();
    if (!map) return;

    setCurrentRegion(null);
    setCurrentProvince(null);
    setCurrentCommune(null);
    setCategoryFilter("");
    setDecoupage("regions");
    setToggleFacilities(true);
    setTogglePharmacies(true);

    map.fitBounds(MAROC_BOUNDS);
  }, [getMap]);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      minZoom: 6,
      maxZoom: 12
    }).fitBounds(MAROC_BOUNDS);

    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap"
    }).addTo(map);

    map.createPane("maskPane");
    map.getPane("maskPane").style.zIndex = 200;

    map.createPane("adminPane");
    map.getPane("adminPane").style.zIndex = 300;

    map.createPane("pointsPane");
    map.getPane("pointsPane").style.zIndex = 700;

    facilitiesGroupRef.current = L.layerGroup().addTo(map);
    pharmaciesGroupRef.current = L.layerGroup().addTo(map);

    map.on("zoomend", updateFacilityMarkerSizes);

    map.on("moveend", () => {
      clearTimeout(moveTimeoutRef.current);
      moveTimeoutRef.current = setTimeout(() => {
        reloadData();
      }, 250);
    });

    Promise.all([loadMaskMaroc(), loadCategories()])
      .then(async () => {
        readyRef.current = true;
        await reloadData();
      })
      .catch((err) => {
        console.error(err);
      });

    return () => {
      clearTimeout(moveTimeoutRef.current);

      map.off("zoomend", updateFacilityMarkerSizes);
      map.off("moveend");

      map.remove();
      mapRef.current = null;
      readyRef.current = false;
      isReloadingRef.current = false;
    };
  }, [loadCategories, loadMaskMaroc, reloadData, updateFacilityMarkerSizes]);

  useEffect(() => {
    syncFacilitiesVisibility();
  }, [syncFacilitiesVisibility]);

  useEffect(() => {
    syncPharmaciesVisibility();
  }, [syncPharmaciesVisibility]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div style={panelStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Carte Santé Maroc</h3>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Catégorie</label>
          <select
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
          <label style={{ display: "block", marginBottom: 6 }}>Découpage</label>
          <select
            value={decoupage}
            onChange={(e) => {
              const value = e.target.value;
              setCurrentRegion(null);
              setCurrentProvince(null);
              setCurrentCommune(null);
              setDecoupage(value);
            }}
            style={selectStyle}
          >
            <option value="regions">Régions</option>
            <option value="provinces">Provinces</option>
            <option value="communes">Communes</option>
          </select>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            cursor: "pointer"
          }}
        >
          <input
            type="checkbox"
            checked={toggleFacilities}
            onChange={(e) => setToggleFacilities(e.target.checked)}
          />
          Établissements
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            cursor: "pointer"
          }}
        >
          <input
            type="checkbox"
            checked={togglePharmacies}
            onChange={(e) => setTogglePharmacies(e.target.checked)}
          />
          Pharmacies
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
            borderRadius: 10,
            boxShadow: "0 4px 14px rgba(0,0,0,0.15)"
          }}
        >
          Chargement...
        </div>
      )}

      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}