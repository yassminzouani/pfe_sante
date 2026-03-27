export default function Sidebar({
  showEtab,
  setShowEtab,
  showPharma,
  setShowPharma,
  reset
}) {
  return (
    <div style={styles.sidebar}>
      <h3>Filtres</h3>

      <div>
        <label>
          <input
            type="checkbox"
            checked={showEtab}
            onChange={() => setShowEtab(!showEtab)}
          />
          Établissements
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={showPharma}
            onChange={() => setShowPharma(!showPharma)}
          />
          Pharmacies
        </label>
      </div>

      <button onClick={reset} style={styles.button}>
        Reset
      </button>
    </div>
  );
}

const styles = {
  sidebar: {
    position: "absolute",
    top: 20,
    left: 20,
    background: "white",
    padding: 15,
    borderRadius: 10,
    zIndex: 1000
  },
  button: {
    marginTop: 10,
    padding: "8px 12px",
    background: "#0d1b2a",
    color: "white",
    border: "none",
    borderRadius: 6
  }
};