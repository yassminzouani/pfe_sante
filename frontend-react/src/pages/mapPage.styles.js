export const styles = {
  page: {
    width: "100%",
    height: "100vh",
    position: "relative",
    background: "#f4f7fb"
  },

  panel: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 1000,
    width: 380,
    maxHeight: "calc(100vh - 40px)",
    overflowY: "auto",
    background: "rgba(255, 255, 255, 0.96)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.16)"
  },

  header: {
    marginBottom: 18
  },

  badge: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    background: "#e0f2fe",
    color: "#0369a1",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
    letterSpacing: 0.3
  },

  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a"
  },

  section: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0"
  },

  sectionTitle: {
    margin: "0 0 12px 0",
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },

  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#334155"
  },

  select: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: 14,
    background: "#fff",
    color: "#0f172a"
  },

  toggleCard: {
    padding: 12,
    borderRadius: 14,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    marginBottom: 10
  },

  toggleLabelWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer"
  },

  toggleTextWrap: {
    display: "flex",
    flexDirection: "column"
  },

  toggleTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1.2
  },

  toggleSubtext: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2
  },

  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#0f766e",
    cursor: "pointer"
  },

  statBox: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#ecfeff",
    border: "1px solid #bae6fd",
    color: "#155e75",
    fontSize: 13,
    fontWeight: 700
  },

  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10
  },

  secondaryButton: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14
  },

  dangerButton: {
    width: "100%",
    padding: "12px 14px",
    border: "none",
    borderRadius: 12,
    background: "#b91c1c",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14
  },

  loading: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 1000,
    background: "rgba(15, 23, 42, 0.95)",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 700,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.25)"
  },

  map: {
    width: "100%",
    height: "100%"
  }
};