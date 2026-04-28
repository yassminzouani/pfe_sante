const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /api/cliniques
router.get("/", async (req, res) => {
  try {
    const { ville, nom, bbox, limit = 5000 } = req.query;

    let query = `
      SELECT
        c.id,
        c.ville_normalisee,
        c.nom_nettoye,
        c.latitude,
        c.longitude,
        c.maps_url,
        c.type_etablissement,
        c.code_commune,
        c.code_province,
        c.code_region,
        ST_AsGeoJSON(c.geom) AS geometry
      FROM clinique c
      WHERE c.geom IS NOT NULL
    `;

    const values = [];
    let index = 1;

    // 🔎 filtre ville
    if (ville) {
      query += ` AND c.ville_normalisee ILIKE $${index}`;
      values.push(`%${ville}%`);
      index++;
    }

    // 🔎 filtre nom
    if (nom) {
      query += ` AND c.nom_nettoye ILIKE $${index}`;
      values.push(`%${nom}%`);
      index++;
    }

    // 📍 filtre bbox (carte)
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);

      if ([minLng, minLat, maxLng, maxLat].every((n) => !Number.isNaN(n))) {
        query += `
          AND c.geom && ST_MakeEnvelope($${index}, $${index + 1}, $${index + 2}, $${index + 3}, 4326)
        `;
        values.push(minLng, minLat, maxLng, maxLat);
        index += 4;
      }
    }

    query += ` ORDER BY c.nom_nettoye ASC LIMIT $${index}`;
    values.push(Number(limit));

    const result = await pool.query(query, values);

    const geojson = {
      type: "FeatureCollection",
      features: result.rows.map((row) => ({
        type: "Feature",
        geometry: JSON.parse(row.geometry),
        properties: {
          id: row.id,
          ville_normalisee: row.ville_normalisee,
          nom_nettoye: row.nom_nettoye,
          latitude: row.latitude,
          longitude: row.longitude,
          maps_url: row.maps_url,
          type_etablissement: row.type_etablissement,
          code_commune: row.code_commune,
          code_province: row.code_province,
          code_region: row.code_region
        }
      }))
    };

    res.json(geojson);
  } catch (err) {
    console.error("Erreur GET /api/cliniques :", err);
    res.status(500).json({ error: err.message });
  }
});


// GET /api/cliniques/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        id,
        ville_normalisee,
        nom_nettoye,
        latitude,
        longitude,
        maps_url,
        type_etablissement,
        code_commune,
        code_province,
        code_region
      FROM clinique
      WHERE id = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Clinique introuvable" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur GET /api/cliniques/:id :", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;