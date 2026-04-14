export default function LoadingOverlay({ loading, style }) {
  if (!loading) return null;

  return <div style={style}>Chargement des données...</div>;
}