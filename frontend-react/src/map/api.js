const API = "http://localhost:3000/api";

export async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export function fetchRegionMedicalDensity() {
  return fetchJson(`${API}/densite-medical-region`);
}

export function fetchProvinceMedicalDensity() {
  return fetchJson(`${API}/densite-medical-province`);
}

export function fetchCommuneMedicalDensity() {
  return fetchJson(`${API}/densite-medical-commune`);
}

export function fetchMaroc() {
  return fetchJson(`${API}/regions/maroc`);
}

export function fetchCategories() {
  return fetchJson(`${API}/etablissements/categories`);
}

export function fetchAdmin(mode, params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return fetchJson(`${API}/${mode}${query ? `?${query}` : ""}`);
}

export function fetchEtablissements(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, value);
    }
  });

  return fetchJson(`${API}/etablissements?${search.toString()}`);
}

export function fetchPharmacies(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, value);
    }
  });

  return fetchJson(`${API}/pharmacies?${search.toString()}`);
}

export function fetchMedecinsByEtablissement(code) {
  return fetchJson(
    `${API}/medecins/by-etablissement/${encodeURIComponent(code)}`
  );
}

export function fetchMedecinsPrivesCommunes(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, value);
    }
  });

  return fetchJson(`${API}/medecins-prives/communes?${search.toString()}`);
}

export function fetchMedecinsPrivesDetailsByCommune(codeIso) {
  return fetchJson(
    `${API}/medecins-prives?code_iso=${encodeURIComponent(codeIso)}`
  );
}

export function fetchCabinets(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, value);
    }
  });

  return fetchJson(`${API}/cabinets?${search.toString()}`);
}
export function fetchCliniques(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, value);
    }
  });

  return fetchJson(`${API}/cliniques?${search.toString()}`);
}