const API = "http://localhost:3000/api";

// ====== Map + bounds Maroc ======
const marocBounds = [
  [20.5, -17.5],
  [36.0, -1.0]
];

const map = L.map("map", { minZoom: 5, maxZoom: 12 }).fitBounds(marocBounds);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// ====== panes ======
map.createPane("maskPane");   map.getPane("maskPane").style.zIndex = 200;
map.createPane("adminPane");  map.getPane("adminPane").style.zIndex = 400;
map.createPane("pointsPane"); map.getPane("pointsPane").style.zIndex = 500;

// ====== layers ======
let adminLayer = L.geoJSON(null, { pane:"adminPane" }).addTo(map);

//   facilities dans un group pour toggle
const facilitiesGroup = L.layerGroup().addTo(map);
let facilitiesLayer = L.geoJSON(null, { pane:"pointsPane" }); // pas addTo(map) ici

// ====== helpers ======
function getSelectedCategory() {
  const sel = document.getElementById("categoryFilter");
  return sel && sel.value ? sel.value : null;
}

function getFacilitiesParams(extra = {}) {
  // extra = { region, province }
  return {
    region: extra.region ?? null,
    province: extra.province ?? null,
    category: getSelectedCategory()
  };
}

// ====== Mask Maroc (troué) ======
fetch(`${API}/regions/maroc`)
  .then(r => r.json())
  .then(maroc => {
    const worldRing = [[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]];
    const holes = [];

    if (maroc.geometry.type === "Polygon") holes.push(maroc.geometry.coordinates[0]);
    if (maroc.geometry.type === "MultiPolygon") maroc.geometry.coordinates.forEach(p => holes.push(p[0]));

    const toLatLng = ring => ring.map(([lng,lat]) => [lat,lng]);
    const maskLatLngs = [toLatLng(worldRing), ...holes.map(toLatLng)];

    L.polygon(maskLatLngs, {
      pane:"maskPane",
      stroke:false,
      fillColor:"#fff",
      fillOpacity:0.92
    }).addTo(map);

    L.geoJSON(maroc, {
      pane:"adminPane",
      style:{ color:"#111", weight:2, fillOpacity:0 }
    }).addTo(map);
  })
  .catch(err => console.error("mask maroc error:", err));

// ====== Load facilities with filters ======
function loadFacilities({ region=null, province=null, category=null } = {}) {
  facilitiesGroup.clearLayers();
  facilitiesLayer.clearLayers();

  const params = new URLSearchParams({ limit: "5000" });
  if (region) params.set("region", region);
  if (province) params.set("province", province);
  if (category) params.set("category", category);

  fetch(`${API}/facilities?` + params.toString())
    .then(r => r.json())
    .then(gj => {
      facilitiesLayer = L.geoJSON(gj, {
        pane:"pointsPane",
        pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 5, weight: 1 }),
        onEachFeature: (f, layer) => {
          const p = f.properties || {};
          layer.bindPopup(
            `<b>${p.title ?? ""}</b><br>` +
            `${p.categoryname ?? ""}<br>` +
            `${p.province_nom ?? ""}<br>` +
            `${p.region_nom ?? ""}`
          );
        }
      });

      //  ajouter seulement si checkbox active
      const cb = document.getElementById("toggleFacilities");
      if (!cb || cb.checked) facilitiesGroup.addLayer(facilitiesLayer);
    })
    .catch(err => console.error("loadFacilities error:", err));
}

// ====== Load admin layer (regions/provinces/communes) ======
function loadAdmin(mode) {
  adminLayer.clearLayers();
  console.log("MODE =", mode);

  fetch(`${API}/${mode}`)
    .then(r => r.json())
    .then(gj => {
      adminLayer = L.geoJSON(gj, {
        pane: "adminPane",

        style: () => {
          if (mode === "regions") {
            return { color:"#111", weight:2, fillColor:"#457b9d", fillOpacity:0.25 };
          }
          if (mode === "provinces") {
            return { color:"#111", weight:1.2, fillColor:"#2a9d8f", fillOpacity:0.20 };
          }
          return { color:"#111", weight:0.6, fillColor:"#8d99ae", fillOpacity:0.15 }; // communes
        },

        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};
          layer.bindTooltip(p.label || "", { sticky: true });

          // hover
          layer.on("mouseover", () => layer.setStyle({ weight: 3, fillOpacity: 0.35 }));
          layer.on("mouseout", () => adminLayer.resetStyle(layer));

          layer.on("click", () => {
            map.fitBounds(layer.getBounds());

            const category = getSelectedCategory();

            if (mode === "regions") {
              loadFacilities({ region: p.region, category });
            } else {
              loadFacilities({ region: p.region, province: p.province, category });
            }
          });
        }
      }).addTo(map);
    })
    .catch(err => console.error("loadAdmin error:", err));
}

// ====== Load categories for dropdown ======
function loadCategories() {
  fetch(`${API}/facilities/categories`)
    .then(r => r.json())
    .then(list => {
      const sel = document.getElementById("categoryFilter");
      if (!sel) return;

      sel.innerHTML = `<option value="">Toutes les catégories</option>`;
      list.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        sel.appendChild(opt);
      });
    })
    .catch(err => console.error("loadCategories error:", err));
}

// ====== UI events ======
document.getElementById("decoupage")?.addEventListener("change", (e) => {
  const mode = e.target.value;
  loadAdmin(mode);

  //  reset points mais garde la catégorie
  loadFacilities({ category: getSelectedCategory() });
});

document.getElementById("reset")?.addEventListener("click", () => {
  map.fitBounds(marocBounds);
  loadFacilities({ category: getSelectedCategory() });
});

document.getElementById("toggleFacilities")?.addEventListener("change", (e) => {
  if (e.target.checked) {
    facilitiesGroup.addLayer(facilitiesLayer);
  } else {
    facilitiesGroup.clearLayers();
  }
});

document.getElementById("categoryFilter")?.addEventListener("change", () => {
  //  filtre global (sans zone), mais tu peux le garder avec dernière zone si tu veux
  loadFacilities({ category: getSelectedCategory() });
});

// ====== initial load ======
loadAdmin("regions");
loadCategories();
loadFacilities({ category: getSelectedCategory() });