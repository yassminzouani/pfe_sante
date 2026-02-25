const express = require("express");
const router = express.Router();
const pool = require("../db");

function toFeatureCollection(rows) {
  return {
    type: "FeatureCollection",
    features: rows.map(r => ({
      type: "Feature",
      geometry: JSON.parse(r.geometry),
      properties: {
        source: r.source,
        title: r.title,
        categoryname: r.categoryname,
        address: r.address,
        region_nom: r.region_nom,
        province_nom: r.province_nom,

        // codes calculés
        region: r.region_code,
        province: r.province_code
      }
    }))
  };
}

router.get("/", async (req, res) => {
  const limit = Number(req.query.limit || 5000);
  const { region = null, province = null } = req.query;

  try {
    const params = [limit];
    let where = `WHERE f.geom IS NOT NULL`;

    if (region) { params.push(region); where += ` AND r."CODE_REGIO" = $${params.length}`; }
    if (province) { params.push(province); where += ` AND p."Code_Provi" = $${params.length}`; }

    const { rows } = await pool.query(`
      SELECT
        f.source, f.title, f.categoryname, f.address,
        f.province_nom, f.region_nom,
        r."CODE_REGIO" AS region_code,
        p."Code_Provi" AS province_code,
        ST_AsGeoJSON(f.geom) AS geometry
      FROM facilities f
      LEFT JOIN regions r
        ON r."nom_region" = f.region_nom
      LEFT JOIN provinces p
        ON p."nom" = f.province_nom
      ${where}
      LIMIT $1
    `, params);

    res.json(toFeatureCollection(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT categoryname
      FROM facilities
      WHERE categoryname IS NOT NULL AND categoryname <> ''
      ORDER BY categoryname
    `);
    res.json(rows.map(r => r.categoryname));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  const limit = Number(req.query.limit || 5000);
  const { region = null, province = null, category = null } = req.query;

  try {
    const params = [limit];
    let where = `WHERE f.geom IS NOT NULL`;

    if (region)  { params.push(region);  where += ` AND r."CODE_REGIO" = $${params.length}`; }
    if (province){ params.push(province);where += ` AND p."Code_Provi" = $${params.length}`; }

    //  filtre par catégorie
    if (category) {
      params.push(category);
      where += ` AND f.categoryname = $${params.length}`;
    }

    const { rows } = await pool.query(`
      SELECT
        f.source, f.title, f.categoryname, f.address, f.phone, f.website, f.totalscore,
        f.province_nom, f.region_nom,
        r."CODE_REGIO" AS region_code,
        p."Code_Provi" AS province_code,
        ST_AsGeoJSON(f.geom) AS geometry
      FROM facilities f
      LEFT JOIN regions r ON r."nom_region" = f.region_nom
      LEFT JOIN provinces p ON p."nom" = f.province_nom
      ${where}
      LIMIT $1
    `, params);

    res.json({
      type: "FeatureCollection",
      features: rows.map(r => ({
        type: "Feature",
        geometry: JSON.parse(r.geometry),
        properties: {
          source: r.source,
          title: r.title,
          categoryname: r.categoryname,
          address: r.address,
          phone: r.phone,
          website: r.website,
          totalscore: r.totalscore,
          province_nom: r.province_nom,
          region_nom: r.region_nom,
          region: r.region_code,
          province: r.province_code
        }
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;