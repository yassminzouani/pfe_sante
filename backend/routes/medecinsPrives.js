const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/medecins-prives/regions
 * Query params optionnels :
 * - code_region
 */
router.get("/regions", async (req, res) => {
  try {
    const { code_region } = req.query;

    const values = [];
    const where = [];

    if (code_region) {
      values.push(code_region);
      where.push(`r.code_region = $${values.length}`);
    }

    const sql = `
      SELECT
        r.code_region,
        r.nom_region,
        r.nom_arabe,
        COALESCE(SUM(mps.nombre), 0) AS total_medecins
      FROM regions r

      LEFT JOIN communes c
        ON c.code_region = r.code_region

      LEFT JOIN mapping_communes_final map
        ON map.code_iso = c.code_iso

      LEFT JOIN medecins_prives_stats mps
        ON TRIM(UPPER(mps.cs)) = TRIM(UPPER(map.cs_source))
       AND TRIM(UPPER(mps.delegation)) = TRIM(UPPER(map.delegation_source))
       AND TRIM(UPPER(mps.region)) = TRIM(UPPER(map.region_source))

      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}

      GROUP BY r.code_region, r.nom_region, r.nom_arabe
      ORDER BY r.nom_region ASC
    `;

    const result = await db.query(sql, values);
    res.json(result.rows);

  } catch (error) {
    console.error("Erreur GET /api/medecins-prives/regions :", error);
    res.status(500).json({
      error: "Erreur serveur lors du chargement des statistiques par région"
    });
  }
});

/**
 * GET /api/medecins-prives/provinces
 * Query params optionnels :
 * - code_region
 * - code_province
 */
router.get("/provinces", async (req, res) => {
  try {
    const { code_region, code_province } = req.query;

    const values = [];
    const where = [];

    if (code_region) {
      values.push(code_region);
      where.push(`p.code_region = $${values.length}`);
    }

    if (code_province) {
      values.push(code_province);
      where.push(`p.code_province = $${values.length}`);
    }

    const sql = `
      SELECT
        p.code_province,
        p.nom AS nom_province,
        p.nom_arabe AS nom_province_arabe,
        p.code_region,
        COALESCE(SUM(mps.nombre), 0) AS total_medecins
      FROM provinces p
      LEFT JOIN mapping_provinces mp
        ON TRIM(mp.code_province::text) = TRIM(p.code_province::text)
      LEFT JOIN medecins_prives_stats mps
        ON TRIM(UPPER(mps.delegation)) = TRIM(UPPER(mp.nom_import))
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      GROUP BY
        p.code_province,
        p.nom,
        p.nom_arabe,
        p.code_region
      ORDER BY p.nom ASC
    `;

    const result = await db.query(sql, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur GET /api/medecins-prives/provinces :", error);
    res.status(500).json({
      error: "Erreur serveur lors du chargement des statistiques par province"
    });
  }
});

/**
 * GET /api/medecins-prives/communes
 * Query params optionnels :
 * - code_region
 * - code_province
 * - code_iso
 */
router.get("/communes", async (req, res) => {
  try {
    const { code_region, code_province, code_iso } = req.query;

    const values = [];
    const where = [];

    if (code_region) {
      values.push(code_region);
      where.push(`c.code_region = $${values.length}`);
    }

    if (code_province) {
      values.push(code_province);
      where.push(`c.code_province = $${values.length}`);
    }

    if (code_iso) {
      values.push(code_iso);
      where.push(`c.code_iso = $${values.length}`);
    }

    const sql = `
      WITH mps_aggr AS (
        SELECT
          TRIM(UPPER(cs)) AS cs_key,
          TRIM(UPPER(delegation)) AS delegation_key,
          TRIM(UPPER(region)) AS region_key,
          SUM(COALESCE(nombre, 0)) AS total_medecins
        FROM medecins_prives_stats
        GROUP BY
          TRIM(UPPER(cs)),
          TRIM(UPPER(delegation)),
          TRIM(UPPER(region))
      )
      SELECT
        c.code_iso,
        c.nom AS nom_commune,
        c.code_province,
        c.code_region,
        COALESCE(SUM(ma.total_medecins), 0) AS total_medecins
      FROM communes c
      LEFT JOIN mapping_communes_final map
        ON TRIM(map.code_iso::text) = TRIM(c.code_iso::text)
      LEFT JOIN mps_aggr ma
        ON TRIM(UPPER(map.cs_source)) = ma.cs_key
       AND TRIM(UPPER(map.delegation_source)) = ma.delegation_key
       AND TRIM(UPPER(map.region_source)) = ma.region_key
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      GROUP BY
        c.code_iso,
        c.nom,
        c.code_province,
        c.code_region
      ORDER BY c.nom ASC
    `;

    const result = await db.query(sql, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur GET /api/medecins-prives/communes :", error);
    res.status(500).json({
      error: "Erreur serveur lors du chargement des statistiques par commune"
    });
  }
});


router.get("/details", async (req, res) => {
  try {
    const { mode, code_region, code_province, code_iso } = req.query;

    if (!mode) {
      return res.status(400).json({ error: "mode obligatoire" });
    }

    let where = "";
    let values = [];

    if (mode === "regions") {
      if (!code_region) {
        return res.status(400).json({ error: "code_region requis" });
      }

      where = `c.code_region::text = $1`;
      values = [String(code_region)];
    } else if (mode === "provinces") {
      if (!code_province) {
        return res.status(400).json({ error: "code_province requis" });
      }

      where = `c.code_province::text = $1`;
      values = [String(code_province)];
    } else if (mode === "communes") {
      if (!code_iso) {
        return res.status(400).json({ error: "code_iso requis" });
      }

      where = `c.code_iso::text = $1`;
      values = [String(code_iso)];
    } else {
      return res.status(400).json({ error: "mode invalide" });
    }

    const totalSql = `
      SELECT COALESCE(SUM(mps.nombre), 0) AS total
      FROM communes c
      INNER JOIN medecins_prives_stats mps
        ON mps.code::text = c.code_iso::text
      WHERE ${where}
    `;

    const generalistesSql = `
      SELECT COALESCE(SUM(mps.nombre), 0) AS total_generalistes
      FROM communes c
      INNER JOIN medecins_prives_stats mps
        ON mps.code::text = c.code_iso::text
      WHERE ${where}
        AND (
          LOWER(COALESCE(mps.specialite, '')) LIKE '%general%'
          OR LOWER(COALESCE(mps.specialite, '')) LIKE '%général%'
        )
    `;

    const specialitesSql = `
      SELECT
        COALESCE(mps.specialite, 'Non renseignée') AS specialite,
        COALESCE(SUM(mps.nombre), 0) AS total
      FROM communes c
      INNER JOIN medecins_prives_stats mps
        ON mps.code::text = c.code_iso::text
      WHERE ${where}
      GROUP BY COALESCE(mps.specialite, 'Non renseignée')
      ORDER BY total DESC
    `;

    const [totalRes, genRes, specRes] = await Promise.all([
      db.query(totalSql, values),
      db.query(generalistesSql, values),
      db.query(specialitesSql, values)
    ]);

    res.json({
      total: Number(totalRes.rows[0]?.total || 0),
      generalistes: Number(genRes.rows[0]?.total_generalistes || 0),
      specialites: specRes.rows
    });
  } catch (error) {
    console.error("Erreur GET /api/medecins-prives/details :", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;