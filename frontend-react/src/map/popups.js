export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildSpecialitesHtml(data) {
  const specialites = Array.isArray(data?.specialites) ? data.specialites : [];

  if (!specialites.length) {
    return `<div>Aucun médecin trouvé</div>`;
  }

  return `
    <table style="width:100%; border-collapse:collapse; margin-top:8px;">
      <thead>
        <tr>
          <th style="text-align:left; padding-bottom:6px;">Spécialité</th>
          <th style="text-align:right; padding-bottom:6px;">Nombre</th>
        </tr>
      </thead>
      <tbody>
        ${specialites
          .map(
            (s) => `
              <tr>
                <td style="padding:4px 12px 4px 0;">
                  ${escapeHtml(s.specialite || "Non renseignée")}
                </td>
                <td style="padding:4px 0; text-align:right;">
                  <b>${Number(s.total || 0)}</b>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

export function buildEtablissementPopup(p, data = null) {
  return `
    <div style="min-width:300px;">
      <div style="font-size:16px; font-weight:700; margin-bottom:8px;">
        ${escapeHtml(p.nom || "")}
      </div>

      <div style="margin-bottom:8px; line-height:1.5;">
        Catégorie : ${escapeHtml(p.categorie || "")}<br>
        Milieu : ${escapeHtml(p.milieu || "")}
      </div>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:10px 0;" />

      <div style="margin:8px 0;">
        <b>Total médecins : ${data ? Number(data.total_medecins || 0) : "..."}</b>
      </div>

      ${
        data
          ? buildSpecialitesHtml(data)
          : `<div>Chargement des spécialités...</div>`
      }
    </div>
  `;
}

export function buildPharmacyPopup(p) {
  return `
    <div style="min-width:240px; line-height:1.55;">
      <div style="font-size:15px; font-weight:700; margin-bottom:8px;">
        ${escapeHtml(p.title || "")}
      </div>
      <div><b>Catégorie :</b> ${escapeHtml(p.categoryname || "")}</div>
      <div><b>Ville :</b> ${escapeHtml(p.city || "")}</div>
      <div><b>Adresse :</b> ${escapeHtml(p.address || "")}</div>
      <div><b>Téléphone :</b> ${escapeHtml(p.phone || "")}</div>
    </div>
  `;
}

export function buildMedecinsPrivesDetailsHtml(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return `<div style="margin-top:8px;">Aucun détail trouvé.</div>`;
  }

  const grouped = rows.reduce((acc, row) => {
    const key = row.specialite || "Non renseignée";
    if (!acc[key]) acc[key] = 0;
    acc[key] += Number(row.nombre || 0);
    return acc;
  }, {});

  const lines = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([specialite, total]) => `
        <tr>
          <td style="padding:4px 12px 4px 0;">${escapeHtml(specialite)}</td>
          <td style="padding:4px 0; text-align:right;"><b>${total}</b></td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="margin-top:10px;">
      <div style="font-weight:700; margin-bottom:6px;">Détails par spécialité</div>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding-bottom:6px;">Spécialité</th>
            <th style="text-align:right; padding-bottom:6px;">Nombre</th>
          </tr>
        </thead>
        <tbody>
          ${lines}
        </tbody>
      </table>
    </div>
  `;
}

export function buildMedecinsPrivesPopup(commune, detailsHtml = "", loading = false) {
  return `
    <div style="min-width:280px; line-height:1.5;">
      <div style="font-size:16px; font-weight:700; margin-bottom:8px;">
        ${escapeHtml(commune.nom_commune || "Commune")}
      </div>

      <div><b>Code ISO :</b> ${escapeHtml(commune.code_iso || "")}</div>
      <div><b>Code région :</b> ${escapeHtml(commune.code_region || "")}</div>
      <div style="margin:8px 0;">
        <b>Total médecins privés : ${Number(commune.total_medecins || 0)}</b>
      </div>

      <button
        id="btn-details-${escapeHtml(commune.code_iso || "")}"
        style="
          padding:8px 10px;
          border:none;
          border-radius:8px;
          background:#1d4ed8;
          color:white;
          cursor:pointer;
          font-weight:600;
        "
      >
        Voir détails
      </button>

      ${
        loading
          ? `<div style="margin-top:10px;">Chargement...</div>`
          : detailsHtml
      }
    </div>
  `;
}