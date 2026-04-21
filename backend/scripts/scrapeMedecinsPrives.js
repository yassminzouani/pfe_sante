const axios = require("axios");
const { parse } = require("csv-parse/sync");
const pool = require("../db");

const URL = "https://cartesanitaire.sante.gov.ma/ws/ws_prive_medecin_csv.ashx";
const ANNEE = 2025;

async function fetchData() {
  const response = await axios.get(URL, {
    responseType: "text",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://cartesanitaire.sante.gov.ma/dashboard/pages2/prive_medecin_2025.html",
      "Accept": "text/tab-separated-values,text/plain,text/csv,*/*",
      "Origin": "https://cartesanitaire.sante.gov.ma"
    },
    timeout: 60000
  });

  return response.data;
}

function parseTSV(text) {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    delimiter: "\t",
    bom: true,
    trim: true
  });
}

function toInt(value) {
  const n = parseInt(String(value ?? "").trim(), 10);
  return Number.isNaN(n) ? 0 : n;
}

function clean(value) {
  const v = String(value ?? "").trim();
  return v === "" ? null : v;
}

async function main() {
  const client = await pool.connect();

  try {
    console.log("Récupération...");
    const raw = await fetchData();

    console.log("Taille brute:", raw.length);
    console.log("Début:", raw.slice(0, 300));
    console.log("Fin:", raw.slice(-300));

    const rows = parseTSV(raw);

    console.log("Nombre de lignes parsées:", rows.length);
    console.log("Colonnes:", Object.keys(rows[0] || {}));
    console.log("Exemple:", rows[0]);

    await client.query("BEGIN");

    const sql = `
      INSERT INTO medecins_prives_stats (
        code, cs, milieu, delegation, region, specialite, nombre, annee
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (code, cs, milieu, delegation, region, specialite, annee)
      DO UPDATE SET
        nombre = EXCLUDED.nombre,
        updated_at = NOW()
      RETURNING id
    `;

    let processed = 0;
    let insertedOrUpdated = 0;
    let skipped = 0;

    for (const row of rows) {
      processed++;

      const values = [
        clean(row.code),
        clean(row.cs),
        clean(row.milieu),
        clean(row.delegation),
        clean(row.region),
        clean(row.type || row.specialite),
        toInt(row.nombre),
        ANNEE
      ];

      if (!values[0] || !values[5]) {
        skipped++;
        continue;
      }

      const result = await client.query(sql, values);
      insertedOrUpdated += result.rowCount;

      if (processed % 500 === 0) {
        console.log({ processed, insertedOrUpdated, skipped });
      }
    }

    await client.query("COMMIT");

    const countRes = await client.query(
      "SELECT COUNT(*)::int AS total FROM medecins_prives_stats"
    );

    console.log("Terminé");
    console.log({
      processed,
      insertedOrUpdated,
      skipped,
      totalInTable: countRes.rows[0].total
    });

    process.exit(0);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }
}

main();