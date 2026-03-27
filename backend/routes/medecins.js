const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/by-etablissement/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const etabQuery = `
      SELECT id, code, nom
      FROM etablissements
      WHERE code = $1
      LIMIT 1
    `;

    const etabResult = await pool.query(etabQuery, [code]);

    if (etabResult.rows.length === 0) {
      return res.status(404).json({ error: "Établissement introuvable" });
    }

    const etab = etabResult.rows[0];

    const statsQuery = `
      SELECT
        COALESCE(specialite, 'Non renseignée') AS specialite,
        SUM(nombre) AS total
      FROM medecins
      WHERE id_etablissement = $1
      GROUP BY COALESCE(specialite, 'Non renseignée')
      ORDER BY specialite
    `;

    const statsResult = await pool.query(statsQuery, [etab.id]);

    const specialites = statsResult.rows.map((row) => ({
      specialite: row.specialite,
      total: Number(row.total)
    }));

    const total_medecins = specialites.reduce((sum, item) => sum + item.total, 0);

    res.json({
      code: etab.code,
      nom: etab.nom,
      total_medecins,
      specialites
    });
  } catch (err) {
    console.error("Erreur /medecins/by-etablissement/:code :", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;