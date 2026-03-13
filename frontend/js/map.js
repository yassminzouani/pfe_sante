const API = "http://localhost:3000/api";

const marocBounds = [
  [20.5, -17.5],
  [36.0, -1.0]
];

const map = L.map("map", {
  minZoom: 6,
  maxZoom: 12,
  preferCanvas: true
}).fitBounds(marocBounds);

const pharmaciesGroup = L.layerGroup().addTo(map);
let pharmaciesLayer = null;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

map.createPane("maskPane");
map.getPane("maskPane").style.zIndex = 200;

map.createPane("adminPane");
map.getPane("adminPane").style.zIndex = 400;

map.createPane("pointsPane");
map.getPane("pointsPane").style.zIndex = 500;

let adminLayer = null;
let facilitiesLayer = null;
const facilitiesGroup = L.layerGroup().addTo(map);

let currentRegion = null;
let currentProvince = null;
let currentCommune = null;

function getSelectedCategory() {
  const sel = document.getElementById("categoryFilter");
  return sel && sel.value ? sel.value : null;
}

function getMapBBox() {
  const b = map.getBounds();
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(",");
}

function loadMaskMaroc() {
  fetch(`${API}/regions/maroc`)
    .then((r) => r.json())
    .then((maroc) => {
      if (!maroc.geometry) {
        console.error("GeoJSON Maroc invalide :", maroc);
        return;
      }

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
        // extérieur du Maroc
        holes.push(toLatLng(maroc.geometry.coordinates[0]));
      }

      if (maroc.geometry.type === "MultiPolygon") {
        maroc.geometry.coordinates.forEach((poly) => {
          holes.push(toLatLng(poly[0]));
        });
      }

      L.polygon(
        [toLatLng(worldOuterRing), ...holes],
        {
          pane: "maskPane",
          stroke: false,
          fillColor: "#ffffff",
          fillOpacity: 0.95,
          interactive: false
        }
      ).addTo(map);

      // contour du Maroc par-dessus
      L.geoJSON(maroc, {
        pane: "adminPane",
        style: {
          color: "#111",
          weight: 2,
          fillOpacity: 0
        },
        interactive: false
      }).addTo(map);
    })
    .catch((err) => console.error("loadMaskMaroc error:", err));
}

function loadCategories() {
  fetch(`${API}/etablissements/categories`)
    .then(r => r.json())
    .then(categories => {
      const sel = document.getElementById("categoryFilter");
      if (!sel) return;

      sel.innerHTML = `<option value="">Toutes les catégories</option>`;

      categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        sel.appendChild(opt);
      });
    })
    .catch(err => console.error("loadCategories error:", err));
}

function loadEtablissements({ region = null, province = null, commune = null, categorie = null } = {}) {
  if (facilitiesLayer) {
    facilitiesGroup.clearLayers();
    facilitiesLayer = null;
  }

  const params = new URLSearchParams();
  params.set("limit", "5000");
  params.set("bbox", getMapBBox());

  if (region) params.set("region", region);
  if (province) params.set("province", province);
  if (commune) params.set("commune", commune);
  if (categorie) params.set("categorie", categorie);

  fetch(`${API}/etablissements?${params.toString()}`)
    .then(r => r.json())
    .then(gj => {
      facilitiesLayer = L.geoJSON(gj, {
        pane: "pointsPane",
        renderer: L.canvas(),
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
          radius: 4,
          weight: 1,
          color: "#b42318",
          fillColor: "#d92d20",
          fillOpacity: 0.75
        }),
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};
          layer.bindPopup(`
            <b>${p.nom || ""}</b><br>
            Code : <b>${p.code || ""}</b><br>
            Catégorie : ${p.categorie || ""}<br>
            Réseau : ${p.reseau || ""}<br>
            Milieu : ${p.milieu || ""}<br>
            Région : ${p.code_region || ""}<br>
            Province : ${p.code_province || ""}<br>
            Commune : ${p.code_iso || ""}
          `);
        }
      });

      const cb = document.getElementById("toggleFacilities");
      if (!cb || cb.checked) {
        facilitiesGroup.addLayer(facilitiesLayer);
      }
    })
    .catch(err => console.error("loadEtablissements error:", err));
}

function loadPharmacies({ region = null, province = null, commune = null } = {}) {
  if (pharmaciesLayer) {
    pharmaciesGroup.clearLayers();
    pharmaciesLayer = null;
  }

  const params = new URLSearchParams();
  params.set("limit", "5000");
  params.set("bbox", getMapBBox());

  if (region) params.set("region", region);
  if (province) params.set("province", province);
  if (commune) params.set("commune", commune);

  fetch(`${API}/pharmacies?${params.toString()}`)
    .then((r) => r.json())
    .then((gj) => {
      pharmaciesLayer = L.geoJSON(gj, {
        pane: "pointsPane",
        renderer: L.canvas(),
        pointToLayer: (feature, latlng) =>
          L.circleMarker(latlng, {
            radius: 5,
            color: "#18794e",
            fillColor: "#22c55e",
            fillOpacity: 0.9,
            weight: 1
          }),
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};

          layer.bindPopup(`
            <b>${p.title || ""}</b><br>
            Catégorie : ${p.categoryname || ""}<br>
            Ville : ${p.city || ""}<br>
            Adresse : ${p.address || ""}<br>
            Téléphone : ${p.phone || ""}<br>
            Région : ${p.nom_region || ""}<br>
            Province : ${p.nom_province || ""}<br>
            Commune : ${p.nom_commune || ""}
          `);
        }
      });

      const cb = document.getElementById("togglePharmacies");
      if (!cb || cb.checked) {
        pharmaciesGroup.addLayer(pharmaciesLayer);
      }
    })
    .catch((err) => console.error("loadPharmacies error:", err));
}

function loadAdmin(mode) {
  if (adminLayer) {
    map.removeLayer(adminLayer);
  }

  const params = new URLSearchParams();

  if (mode === "provinces" && currentRegion) {
    params.set("region", currentRegion);
  }

  if (mode === "communes") {
    if (currentRegion) params.set("region", currentRegion);
    if (currentProvince) params.set("province", currentProvince);
  }

  const url = `${API}/${mode}${params.toString() ? "?" + params.toString() : ""}`;

  fetch(url)
    .then(r => r.json())
    .then(gj => {
      adminLayer = L.geoJSON(gj, {
        pane: "adminPane",
        style: () => {
          if (mode === "regions") {
            return { color: "#111", weight: 2, fillColor: "#457b9d", fillOpacity: 0.25 };
          }
          if (mode === "provinces") {
            return { color: "#111", weight: 1.2, fillColor: "#2a9d8f", fillOpacity: 0.20 };
          }
          return { color: "#111", weight: 0.8, fillColor: "#8d99ae", fillOpacity: 0.15 };
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};

          layer.bindTooltip(p.label || p.nom || p.nom_region || "", { sticky: true });

          layer.on("mouseover", () => {
            layer.setStyle({ weight: 3, fillOpacity: 0.35 });
          });

          layer.on("mouseout", () => {
            adminLayer.resetStyle(layer);
          });

          layer.on("click", () => {
            map.fitBounds(layer.getBounds());

            if (mode === "regions") {
              currentRegion = p.region || p.code_region;
              currentProvince = null;
              currentCommune = null;
            } else if (mode === "provinces") {
              currentRegion = p.region || p.code_region;
              currentProvince = p.province || p.code_province;
              currentCommune = null;
            } else {
              currentRegion = p.region || p.code_region;
              currentProvince = p.province || p.code_province;
              currentCommune = p.commune || p.code_iso;
            }

            loadEtablissements({
              region: currentRegion,
              province: currentProvince,
              commune: currentCommune,
              categorie: getSelectedCategory()
            });
          });
        }
      }).addTo(map);
    })
    .catch(err => console.error("loadAdmin error:", err));
}

document.getElementById("decoupage")?.addEventListener("change", (e) => {
  loadAdmin(e.target.value);
});

document.getElementById("reset")?.addEventListener("click", () => {
  currentRegion = null;
  currentProvince = null;
  currentCommune = null;
  map.fitBounds(marocBounds);
  loadAdmin("regions");
  loadEtablissements({ categorie: getSelectedCategory() });
  loadPharmacies();
});

document.getElementById("toggleFacilities")?.addEventListener("change", (e) => {
  if (e.target.checked && facilitiesLayer) {
    facilitiesGroup.addLayer(facilitiesLayer);
  } else {
    facilitiesGroup.clearLayers();
  }
});

document.getElementById("categoryFilter")?.addEventListener("change", () => {
  loadEtablissements({
    region: currentRegion,
    province: currentProvince,
    commune: currentCommune,
    categorie: getSelectedCategory()
  });
});

document.getElementById("togglePharmacies")?.addEventListener("change", (e) => {
  if (e.target.checked && pharmaciesLayer) {
    pharmaciesGroup.addLayer(pharmaciesLayer);
  } else {
    pharmaciesGroup.clearLayers();
  }
});

loadMaskMaroc();
loadAdmin("regions");
loadCategories();
loadEtablissements();
loadPharmacies();