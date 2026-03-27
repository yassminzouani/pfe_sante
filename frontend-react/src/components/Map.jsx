import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const data = [
  { id: 1, lat: 33.5731, lng: -7.5898, type: "etablissement" },
  { id: 2, lat: 34.0209, lng: -6.8416, type: "pharmacie" }
];

export default function Map({ showEtab, showPharma }) {
  return (
    <MapContainer
      center={[31.7917, -7.0926]}
      zoom={6}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {data.map((point) => {
        if (
          (point.type === "etablissement" && showEtab) ||
          (point.type === "pharmacie" && showPharma)
        ) {
          return (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={6}
              color={point.type === "etablissement" ? "green" : "red"}
            />
          );
        }
        return null;
      })}
    </MapContainer>
  );
}