const express = require("express");
const router = express.Router();
const db = require("../db");

const DEFAULT_DISTANCE_KM = 10;

function parseDistance(value) {
  const distance = Number(value || DEFAULT_DISTANCE_KM);

  if (!Number.isFinite(distance) || distance <= 0 || distance > 200) {
    return DEFAULT_DISTANCE_KM;
  }

  return distance;
}

function getLevelCase(columnName) {
  return `
    CASE
      WHEN ${columnName} IS NULL OR ${columnName} = 0 THEN 'Désert médical'
      WHEN ${columnName} < 0.2 THEN 'Très faible accès'
      WHEN ${columnName} < 0.5 THEN 'Faible accès'
      WHEN ${columnName} < 1 THEN 'Accès moyen'
      WHEN ${columnName} < 2 THEN 'Bon accès'
      ELSE 'Très bon accès'
    END
  `;
}

router.get("/", async (req, res) => {
  try {
    const method = String(req.query.method || "densite").toLowerCase();
    const distanceKm = parseDistance(req.query.distance);

    const query = `
      WITH offre AS (
        SELECT *
        FROM offre_medicale_commune_runtime
      ),

      distances AS (
        SELECT
          code_iso_i,
          code_iso_j,
          distance_km
        FROM distances_communes_runtime
        WHERE distance_km <= $1
      ),

      population_accessible AS (
        SELECT
          d.code_iso_j,
          SUM(o.population_rgph_2024) AS population_accessible
        FROM distances d
        JOIN offre o
          ON o.code_iso = d.code_iso_i
        GROUP BY d.code_iso_j
      ),

      ratios_sfca AS (
        SELECT
          o.code_iso,
          CASE
            WHEN COALESCE(pa.population_accessible, 0) = 0 THEN 0
            ELSE o.medecins_total::numeric / pa.population_accessible
          END AS ratio_offre_demande
        FROM offre o
        LEFT JOIN population_accessible pa
          ON pa.code_iso_j = o.code_iso
      ),

      sfca AS (
        SELECT
          d.code_iso_i AS code_iso,
          SUM(r.ratio_offre_demande) AS sfca
        FROM distances d
        JOIN ratios_sfca r
          ON r.code_iso = d.code_iso_j
        GROUP BY d.code_iso_i
      ),

      apl AS (
        SELECT
          d.code_iso_i AS code_iso,
          SUM(
            CASE
              WHEN d.distance_km = 0 THEN o.medecins_total::numeric
              ELSE o.medecins_total::numeric / NULLIF(d.distance_km::numeric, 0)
            END
          ) AS apl
        FROM distances d
        JOIN offre o
          ON o.code_iso = d.code_iso_j
        GROUP BY d.code_iso_i
      ),

      gravitaire AS (
        SELECT
          d.code_iso_i AS code_iso,
          SUM(
            CASE
              WHEN d.distance_km = 0 THEN o.medecins_total::numeric
              ELSE o.medecins_total::numeric / POWER(d.distance_km::numeric, 2)
            END
          ) AS gravitaire
        FROM distances d
        JOIN offre o
          ON o.code_iso = d.code_iso_j
        GROUP BY d.code_iso_i
      ),

      final AS (
        SELECT
          o.code_iso,
          o.nom_commune,
          o.code_province,
          o.code_region,
          o.population_rgph_2024,

          o.medecins_publics AS nb_medecins_publics,
          o.medecins_prives AS nb_medecins_prives,
          o.medecins_total AS nb_medecins_total,

          ROUND(
            (
              o.medecins_total * 10000.0 / NULLIF(o.population_rgph_2024, 0)
            )::numeric,
            2
          ) AS densite_10000,

          ROUND(
            (
              COALESCE(a.apl, 0) * 1000.0 / NULLIF(o.population_rgph_2024, 0)
            )::numeric,
            4
          ) AS apl_1000,

          ROUND(
            (
              COALESCE(s.sfca, 0) * 1000.0
            )::numeric,
            4
          ) AS sfca_1000,

          ROUND(
            (
              COALESCE(g.gravitaire, 0) * 1000.0 / NULLIF(o.population_rgph_2024, 0)
            )::numeric,
            4
          ) AS gravitaire_1000,

          o.medecins_total = 0 AS sans_medecin_commune,
          o.geometry
        FROM offre o
        LEFT JOIN apl a ON a.code_iso = o.code_iso
        LEFT JOIN sfca s ON s.code_iso = o.code_iso
        LEFT JOIN gravitaire g ON g.code_iso = o.code_iso
      )

      SELECT
        *,
        ${getLevelCase("apl_1000")} AS niveau_apl,
        ${getLevelCase("sfca_1000")} AS niveau_2sfca,
        ${getLevelCase("gravitaire_1000")} AS niveau_gravitaire,

        CASE
          WHEN sans_medecin_commune = true
            AND COALESCE(apl_1000, 0) < 0.2
            AND COALESCE(sfca_1000, 0) < 0.2
            AND COALESCE(gravitaire_1000, 0) < 0.2
          THEN true
          ELSE false
        END AS desert_medical_confirme,

        ST_AsGeoJSON(geometry)::json AS geojson_geometry
      FROM final
      ORDER BY nom_commune;
    `;

    const result = await db.query(query, [distanceKm]);

    res.json({
      type: "FeatureCollection",
      metadata: {
        method,
        distance_km: distanceKm
      },
      features: result.rows.map((row) => ({
        type: "Feature",
        geometry: row.geojson_geometry,
        properties: {
          code_iso: row.code_iso,
          nom_commune: row.nom_commune,
          code_province: row.code_province,
          code_region: row.code_region,
          population_rgph_2024: Number(row.population_rgph_2024 || 0),

          nb_medecins_publics: Number(row.nb_medecins_publics || 0),
          nb_medecins_prives: Number(row.nb_medecins_prives || 0),
          nb_medecins_total: Number(row.nb_medecins_total || 0),

          densite_10000: Number(row.densite_10000 || 0),

          apl_1000: Number(row.apl_1000 || 0),
          niveau_apl: row.niveau_apl,

          sfca_1000: Number(row.sfca_1000 || 0),
          niveau_2sfca: row.niveau_2sfca,

          gravitaire_1000: Number(row.gravitaire_1000 || 0),
          niveau_gravitaire: row.niveau_gravitaire,

          sans_medecin_commune: row.sans_medecin_commune,
          desert_medical_confirme: row.desert_medical_confirme,

          distance_km: distanceKm,
          method
        }
      }))
    });
  } catch (error) {
    console.error("Erreur GET /api/analyse-accessibilite :", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;