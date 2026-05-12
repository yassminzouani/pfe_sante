const LEVEL_COLORS = [
  { color: "#7f1d1d", label: "Désert médical" },
  { color: "#b91c1c", label: "Très faible accès" },
  { color: "#f97316", label: "Faible accès" },
  { color: "#facc15", label: "Accès moyen" },
  { color: "#4ade80", label: "Bon accès" },
  { color: "#166534", label: "Très bon accès" }
];

const DENSITY_COLORS = [
  { color: "#7f1d1d", label: "0 médecin / 10 000 hab." },
  { color: "#b91c1c", label: "< 1 médecin / 10 000 hab." },
  { color: "#f97316", label: "1 à 3 médecins / 10 000 hab." },
  { color: "#facc15", label: "3 à 6 médecins / 10 000 hab." },
  { color: "#4ade80", label: "6 à 10 médecins / 10 000 hab." },
  { color: "#166534", label: "> 10 médecins / 10 000 hab." }
];

const DESERT_COLORS = [
  { color: "#7f1d1d", label: "Désert médical confirmé" },
  { color: "#16a34a", label: "Accès non critique" }
];

const METHOD_LABELS = {
  densite: "Densité médicale",
  apl: "APL",
  sfca: "2SFCA",
  gravitaire: "Modèle gravitaire",
  desert: "Désert médical confirmé"
};

function getLegendItems(accessMethod) {
  if (accessMethod === "densite") return DENSITY_COLORS;
  if (accessMethod === "desert") return DESERT_COLORS;
  return LEVEL_COLORS;
}

export default function MapLegend({ accessMethod }) {
  const items = getLegendItems(accessMethod);

  return (
    <div
      style={{
        position: "absolute",
        right: 18,
        top: 90,
        zIndex: 1000,
        background: "white",
        padding: "14px 16px",
        borderRadius: 14,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
        minWidth: 230,
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 10,
          color: "#111827"
        }}
      >
        Légende — {METHOD_LABELS[accessMethod] || "Analyse"}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#374151"
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: item.color,
                border: "1px solid rgba(0,0,0,0.12)"
              }}
            />

            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}