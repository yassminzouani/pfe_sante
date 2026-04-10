import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, saveAuth } from "../services/authService";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser(email, password);
      saveAuth(data);
      navigate("/map");
    } catch (err) {
      setError(err.message || "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.backgroundOverlay} />
      <div style={styles.gridPattern} />

      <div style={styles.wrapper}>
        <div style={styles.leftPanel}>
          <div style={styles.brandBadge}>MEDIOT</div>

          <h1 style={styles.title}>
            Plateforme de cartographie
            <span style={styles.titleAccent}> santé</span>
          </h1>

          <p style={styles.subtitle}>
            Accédez à votre espace sécurisé pour visualiser les établissements,
            pharmacies et médecins privés sur la carte.
          </p>

          <div style={styles.featureList}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📍</div>
              <div>
                <h3 style={styles.featureTitle}>Visualisation territoriale</h3>
                <p style={styles.featureText}>
                  Navigation par régions, provinces et communes.
                </p>
              </div>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🏥</div>
              <div>
                <h3 style={styles.featureTitle}>Données de santé</h3>
                <p style={styles.featureText}>
                  Accès centralisé aux couches métiers et indicateurs terrain.
                </p>
              </div>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔐</div>
              <div>
                <h3 style={styles.featureTitle}>Accès sécurisé</h3>
                <p style={styles.featureText}>
                  Authentification protégée pour les utilisateurs autorisés.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.logoCircle}>M</div>
            <div>
              <h2 style={styles.cardTitle}>Connexion</h2>
              <p style={styles.cardDescription}>
                Entrez vos identifiants pour accéder à la plateforme.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label htmlFor="email" style={styles.label}>
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                placeholder="exemple@mediot.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="password" style={styles.label}>
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div style={styles.footerNote}>
            © {new Date().getFullYear()} MEDIOT — Système de cartographie santé
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(135deg, #0f172a 0%, #102a43 35%, #0b4f6c 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: "24px",
  },
  backgroundOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(16,185,129,0.15), transparent 28%)",
  },
  gridPattern: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
    backgroundSize: "32px 32px",
    maskImage:
      "radial-gradient(circle at center, black 35%, transparent 85%)",
    WebkitMaskImage:
      "radial-gradient(circle at center, black 35%, transparent 85%)",
  },
  wrapper: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "1180px",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    borderRadius: "24px",
    overflow: "hidden",
    boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(10px)",
  },
  leftPanel: {
    padding: "56px",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
  },
  brandBadge: {
    alignSelf: "flex-start",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "1px",
    marginBottom: "20px",
  },
  title: {
    fontSize: "42px",
    lineHeight: 1.1,
    margin: 0,
    maxWidth: "520px",
    fontWeight: 800,
  },
  titleAccent: {
    color: "#7dd3fc",
  },
  subtitle: {
    marginTop: "18px",
    marginBottom: "32px",
    fontSize: "16px",
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.82)",
    maxWidth: "540px",
  },
  featureList: {
    display: "grid",
    gap: "14px",
    marginTop: "8px",
  },
  featureCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    padding: "16px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  featureIcon: {
    width: "42px",
    height: "42px",
    minWidth: "42px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.12)",
    fontSize: "20px",
  },
  featureTitle: {
    margin: "0 0 4px 0",
    fontSize: "15px",
    fontWeight: 700,
  },
  featureText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.5,
    color: "rgba(255,255,255,0.75)",
  },
  card: {
    background: "rgba(255,255,255,0.96)",
    padding: "48px 40px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "28px",
  },
  logoCircle: {
    width: "54px",
    height: "54px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
    color: "#fff",
    fontWeight: 800,
    fontSize: "22px",
    boxShadow: "0 12px 25px rgba(37,99,235,0.25)",
  },
  cardTitle: {
    margin: 0,
    fontSize: "28px",
    color: "#0f172a",
  },
  cardDescription: {
    margin: "4px 0 0 0",
    fontSize: "14px",
    color: "#64748b",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#334155",
  },
  input: {
    height: "48px",
    borderRadius: "12px",
    border: "1px solid #dbe2ea",
    padding: "0 14px",
    fontSize: "15px",
    outline: "none",
    background: "#fff",
    transition: "all 0.2s ease",
  },
  button: {
    marginTop: "6px",
    height: "50px",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 14px 24px rgba(37,99,235,0.22)",
  },
  errorBox: {
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: "14px",
    border: "1px solid #fecaca",
  },
  footerNote: {
    marginTop: "22px",
    textAlign: "center",
    fontSize: "12px",
    color: "#94a3b8",
  },
};