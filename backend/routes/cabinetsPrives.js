const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /api/cabinets
router.get("/", async (req, res) => {
  try {
    const { ville, nom, bbox, limit = 5000 } = req.query;

    let query = `
      SELECT
        id,
        ville_normalisee,
        nom_nettoye,
        latitude,
        longitude,
        maps_url,
        ST_AsGeoJSON(geometry) AS geometry
      FROM cabinets_medecins
      WHERE geometry IS NOT NULL
    `;

    const values = [];
    let index = 1;

    if (ville) {
      query += ` AND ville_normalisee ILIKE $${index}`;
      values.push(`%${ville}%`);
      index++;
    }

    if (nom) {
      query += ` AND nom_nettoye ILIKE $${index}`;
      values.push(`%${nom}%`);
      index++;
    }

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);

      if ([minLng, minLat, maxLng, maxLat].every((n) => !Number.isNaN(n))) {
        query += `
          AND geometry && ST_MakeEnvelope($${index}, $${index + 1}, $${index + 2}, $${index + 3}, 4326)
        `;
        values.push(minLng, minLat, maxLng, maxLat);
        index += 4;
      }
    }

    query += ` ORDER BY nom_nettoye ASC LIMIT $${index}`;
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
          maps_url: row.maps_url
        }
      }))
    };

    res.json(geojson);
  } catch (err) {
    console.error("Erreur GET /api/cabinets :", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cabinets/:id
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
        maps_url
      FROM cabinets_medecins
      WHERE id = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cabinet introuvable" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur GET /api/cabinets/:id :", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;