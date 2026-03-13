const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const { region, province, commune, bbox, limit } = req.query;

    let query = `
      SELECT
        id,
        title,
        latitude,
        longitude,
        categoryname,
        city,
        countrycode,
        imageurl,
        address,
        phone,
        code_region,
        code_province,
        code_iso,
        nom_region,
        nom_province,
        nom_commune,
        ST_AsGeoJSON(geometry) AS geometry
      FROM pharmacies
      WHERE geometry IS NOT NULL
    `;

    const params = [];

    if (region) {
      params.push(String(region));
      query += ` AND code_region::text = $${params.length}`;
    }

    if (province) {
      params.push(String(province));
      query += ` AND code_province::text = $${params.length}`;
    }

    if (commune) {
      params.push(String(commune));
      query += ` AND code_iso::text = $${params.length}`;
    }

    if (bbox) {
      const parts = bbox.split(",").map(Number);

      if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
        const [west, south, east, north] = parts;
        params.push(west, south, east, north);

        query += `
          AND geometry && ST_MakeEnvelope(
            $${params.length - 3},
            $${params.length - 2},
            $${params.length - 1},
            $${params.length},
            4326
          )
        `;
      }
    }

    const rowLimit = Number(limit) > 0 ? Math.min(Number(limit), 10000) : 5000;
    params.push(rowLimit);
    query += ` ORDER BY title LIMIT $${params.length}`;

    const { rows } = await pool.query(query, params);

    res.json({
      type: "FeatureCollection",
      features: rows.map((p) => ({
        type: "Feature",
        geometry: JSON.parse(p.geometry),
        properties: {
          id: p.id,
          title: p.title,
          latitude: p.latitude,
          longitude: p.longitude,
          categoryname: p.categoryname,
          city: p.city,
          countrycode: p.countrycode,
          imageurl: p.imageurl,
          address: p.address,
          phone: p.phone,
          code_region: p.code_region,
          code_province: p.code_province,
          code_iso: p.code_iso,
          nom_region: p.nom_region,
          nom_province: p.nom_province,
          nom_commune: p.nom_commune,
          region: p.code_region,
          province: p.code_province,
          commune: p.code_iso,
          label: p.title
        }
      }))
    });
  } catch (err) {
    console.error("Erreur /pharmacies :", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;