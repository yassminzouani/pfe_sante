const METHOD_DESCRIPTIONS = {
  densite:
    "La densité médicale mesure le nombre de médecins rapporté à la population. Elle ne tient pas compte des communes voisines.",

  apl:
    "L’APL estime l’accessibilité potentielle aux médecins en tenant compte de l’offre disponible autour de la commune et de la distance choisie.",

  sfca:
    "La méthode 2SFCA compare l’offre médicale disponible à la population accessible dans le rayon choisi, puis attribue un score d’accès à chaque commune.",

  gravitaire:
    "Le modèle gravitaire donne plus de poids aux médecins proches et réduit l’influence des médecins éloignés selon la distance.",

  desert:
    "Le désert médical confirmé identifie les communes critiques selon plusieurs indicateurs combinés : absence de médecins et faibles scores d’accessibilité."
};

export default function MapControlPanel({
  styles,

  decoupage,
  setDecoupage,

  accessMethod,
  setAccessMethod,

  distanceKm,
  setDistanceKm,
  launchAnalysis,

  categories,
  categoryFilter,
  setCategoryFilter,

  toggleFacilities,
  setToggleFacilities,

  togglePharmacies,
  setTogglePharmacies,

  toggleMedecinsPrives,
  setToggleMedecinsPrives,

  toggleCabinets,
  setToggleCabinets,

  toggleCliniques,
  setToggleCliniques,

  totalMedecinsPrives,
  resetMap,
  handleLogout
}) {
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.badge}>Mediot AI · Cartographie</span>
        <h3 style={styles.title}>Carte Santé Maroc</h3>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Paramètres cartographiques</h4>

        <div>
          <label htmlFor="decoupage-select" style={styles.label}>
            Découpage administratif
          </label>

          <select
            id="decoupage-select"
            value={decoupage}
            onChange={(e) => setDecoupage(e.target.value)}
            style={styles.select}
          >
            <option value="regions">Régions</option>
            <option value="provinces">Provinces / Préfectures</option>
            <option value="communes">Communes</option>
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label htmlFor="access-method-select" style={styles.label}>
            Méthode d’accessibilité
          </label>

          <select
            id="access-method-select"
            value={accessMethod}
            onChange={(e) => setAccessMethod(e.target.value)}
            style={styles.select}
            title={METHOD_DESCRIPTIONS[accessMethod]}
          >
            <option
              value="densite"
              title="Nombre de médecins rapporté à la population."
            >
              Densité médicale
            </option>

            <option
              value="apl"
              title="Accessibilité potentielle locale selon l’offre, la population et la distance."
            >
              APL
            </option>

            <option
              value="sfca"
              title="Méthode offre-demande dans un rayon d’accès choisi."
            >
              2SFCA
            </option>

            <option
              value="gravitaire"
              title="Méthode qui pondère l’accès selon la distance aux médecins."
            >
              Modèle gravitaire
            </option>

            <option
              value="desert"
              title="Identification des communes critiques selon plusieurs indicateurs."
            >
              Désert médical confirmé
            </option>
          </select>

          <div
            style={{
              marginTop: 8,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#f8fafc",
              color: "#475569",
              fontSize: 13,
              lineHeight: 1.45,
              border: "1px solid #e2e8f0"
            }}
          >
            {METHOD_DESCRIPTIONS[accessMethod]}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label htmlFor="distance-km-input" style={styles.label}>
            Distance d’analyse en km
          </label>

          <input
            id="distance-km-input"
            type="number"
            min="1"
            max="200"
            step="1"
            value={distanceKm}
            onChange={(e) => {
              const value = Number(e.target.value);
              setDistanceKm(Number.isFinite(value) ? value : 10);
            }}
            style={styles.select}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <button
            onClick={launchAnalysis}
            style={styles.primaryButton || styles.secondaryButton}
          >
            Lancer l’analyse
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Couches de données</h4>

        <div style={styles.toggleCard}>
          <label style={styles.toggleLabelWrap}>
            <input
              type="checkbox"
              checked={toggleFacilities}
              onChange={(e) => setToggleFacilities(e.target.checked)}
              style={styles.checkbox}
            />

            <div style={styles.toggleTextWrap}>
              <span style={styles.toggleTitle}>Établissements</span>
              <span style={styles.toggleSubtext}>
                Affichage des structures de santé
              </span>
            </div>
          </label>

          <div style={{ marginTop: 10 }}>
            <label htmlFor="categorie-select" style={styles.label}>
              Catégorie des établissements
            </label>

            <select
              id="categorie-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={styles.select}
            >
              <option value="">Toutes les catégories</option>

              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.toggleCard}>
          <label style={styles.toggleLabelWrap}>
            <input
              type="checkbox"
              checked={togglePharmacies}
              onChange={(e) => setTogglePharmacies(e.target.checked)}
              style={styles.checkbox}
            />

            <div style={styles.toggleTextWrap}>
              <span style={styles.toggleTitle}>Pharmacies</span>
              <span style={styles.toggleSubtext}>
                Réseau officinal visible sur la carte
              </span>
            </div>
          </label>
        </div>

        <div style={styles.toggleCard}>
          <label style={styles.toggleLabelWrap}>
            <input
              type="checkbox"
              checked={toggleCabinets}
              onChange={(e) => setToggleCabinets(e.target.checked)}
              style={styles.checkbox}
            />

            <div style={styles.toggleTextWrap}>
              <span style={styles.toggleTitle}>Cabinets</span>
              <span style={styles.toggleSubtext}>
                Cabinets médicaux privés visibles sur la carte
              </span>
            </div>
          </label>
        </div>

        <div style={styles.toggleCard}>
          <label style={styles.toggleLabelWrap}>
            <input
              type="checkbox"
              checked={toggleCliniques}
              onChange={(e) => setToggleCliniques(e.target.checked)}
              style={styles.checkbox}
            />

            <div style={styles.toggleTextWrap}>
              <span style={styles.toggleTitle}>Cliniques</span>
              <span style={styles.toggleSubtext}>
                Cliniques privées visibles sur la carte
              </span>
            </div>
          </label>
        </div>

        <div style={styles.toggleCard}>
          <label style={styles.toggleLabelWrap}>
            <input
              type="checkbox"
              checked={toggleMedecinsPrives}
              onChange={(e) => setToggleMedecinsPrives(e.target.checked)}
              style={styles.checkbox}
            />

            <div style={styles.toggleTextWrap}>
              <span style={styles.toggleTitle}>Médecins privés</span>
              <span style={styles.toggleSubtext}>
                Distribution par zone administrative
              </span>
            </div>
          </label>

          {toggleMedecinsPrives && (
            <div style={styles.statBox}>
              Total médecins privés : {totalMedecinsPrives}
            </div>
          )}
        </div>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Actions</h4>

        <div style={styles.actionsGrid}>
          <button onClick={resetMap} style={styles.secondaryButton}>
            Réinitialiser
          </button>

          <button onClick={handleLogout} style={styles.dangerButton}>
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}