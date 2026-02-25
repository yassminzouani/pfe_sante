const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c."NAME_2" AS commune_nom,
        p."Code_Provi" AS province_code,
        p."nom" AS province_nom,
        r."CODE_REGIO" AS region_code,
        r."nom_region" AS region_nom,
        ST_AsGeoJSON(c.geometry) AS geometry
      FROM communes c
      JOIN LATERAL (
        SELECT p2.*
        FROM provinces p2
        WHERE ST_Intersects(p2.geometry, c.geometry)
        ORDER BY ST_Area(ST_Intersection(p2.geometry, c.geometry)) DESC
        LIMIT 1
      ) p ON true
      JOIN LATERAL (
        SELECT r2.*
        FROM regions r2
        WHERE ST_Intersects(r2.geometry, p.geometry)
        ORDER BY ST_Area(ST_Intersection(r2.geometry, p.geometry)) DESC
        LIMIT 1
      ) r ON true
    `);

    res.json({
      type: "FeatureCollection",
      features: rows.map(r => ({
        type: "Feature",
        geometry: JSON.parse(r.geometry),
        properties: {
          region: r.region_code,
          province: r.province_code,
          commune: r.commune_nom,
          label: r.commune_nom,
          region_nom: r.region_nom,
          province_nom: r.province_nom
        }
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;