export const MAROC_BOUNDS = [
  [20.5, -17.5],
  [36.0, -1.0]
];

export const FACILITY_STYLE = {
  radius: 4,
  weight: 1,
  color: "#8f1d14",
  fillColor: "#d92d20",
  fillOpacity: 0.85
};

export const PHARMACY_STYLE = {
  radius: 5,
  weight: 1,
  color: "#18794e",
  fillColor: "#22c55e",
  fillOpacity: 0.9
};

export const PRIVATE_DOCTOR_STYLE = {
  radius: 8,
  weight: 1,
  color: "#1d4ed8",
  fillColor: "#3b82f6",
  fillOpacity: 0.75
};

export function getFacilityRadius(zoom) {
  if (zoom <= 6) return 3;
  if (zoom <= 8) return 4;
  if (zoom <= 10) return 5;
  return 6;
}

export function getAdminStyle(mode) {
  if (mode === "regions") {
    return {
      color: "#111",
      weight: 2,
      fillColor: "#457b9d",
      fillOpacity: 0.25
    };
  }

  if (mode === "provinces") {
    return {
      color: "#111",
      weight: 1.2,
      fillColor: "#2a9d8f",
      fillOpacity: 0.2
    };
  }

  return {
    color: "#111",
    weight: 0.8,
    fillColor: "#8d99ae",
    fillOpacity: 0.15
  };
}