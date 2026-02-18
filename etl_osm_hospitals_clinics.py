import requests
from urllib.parse import quote_plus
from sqlalchemy import create_engine, text

# ---------------- DB CONFIG ----------------
DB_USER = "postgres"
DB_PASSWORD = "123456"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "pfe_sante"
# ------------------------------------------

#  Overpass endpoints (fallback automatique)
OVERPASS_URLS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
]

# Requête Overpass par "area Morocco" (ISO MA) => évite les points hors Maroc
QUERY = """
[out:json][timeout:180];
area["ISO3166-1"="MA"][admin_level=2]->.maroc;
(
  node["amenity"="hospital"](area.maroc);
  way["amenity"="hospital"](area.maroc);
  relation["amenity"="hospital"](area.maroc);

  node["amenity"="clinic"](area.maroc);
  way["amenity"="clinic"](area.maroc);
  relation["amenity"="clinic"](area.maroc);
);
out center tags;
"""

def normalize_type(tags: dict) -> str:
    a = (tags.get("amenity") or "").lower()
    if a == "hospital":
        return "hopital"
    if a == "clinic":
        return "clinique"
    return "autre"

def normalize_name(tags: dict) -> str:
    name = tags.get("name")
    if name and name.strip():
        return name.strip()
    a = (tags.get("amenity") or "").lower()
    return "Hôpital (sans nom OSM)" if a == "hospital" else "Clinique (sans nom OSM)"

def get_center(el: dict):
    # node: lat/lon direct
    if el.get("type") == "node" and "lat" in el and "lon" in el:
        return el["lat"], el["lon"]
    # way/relation: center fourni par out center
    c = el.get("center")
    if c and "lat" in c and "lon" in c:
        return c["lat"], c["lon"]
    return None, None

def overpass_request():
    last_err = None
    for url in OVERPASS_URLS:
        try:
            r = requests.post(
                url,
                data=QUERY.encode("utf-8"),
                headers={"Content-Type": "text/plain; charset=utf-8"},
                timeout=300
            )
            if r.status_code == 200:
                return r.json(), url
            last_err = f"HTTP {r.status_code} via {url}"
        except Exception as e:
            last_err = f"{e} via {url}"
            continue
    raise RuntimeError(f"Overpass failed. Last error: {last_err}")

def main():
    pwd = quote_plus(DB_PASSWORD)
    engine = create_engine(
        f"postgresql+psycopg2://{DB_USER}:{pwd}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    print("1) DB check...")
    with engine.connect() as conn:
        conn.execute(text("SELECT 1;"))
    print(" DB OK")

    # colonnes au cas où
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE facilities ADD COLUMN IF NOT EXISTS osm_id BIGINT;"))
        conn.execute(text("ALTER TABLE facilities ADD COLUMN IF NOT EXISTS province_id INTEGER;"))

    insert_sql = text("""
        INSERT INTO facilities (osm_id, name, type, source, geom)
        VALUES (:osm_id, :name, :type, 'OSM',
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
        ON CONFLICT (osm_id) DO NOTHING;
    """)

    print("2) Overpass (area Morocco MA)...")
    data, used_url = overpass_request()
    elements = data.get("elements", [])
    print(f" Source: {used_url}")
    print(f" Reçu {len(elements)} éléments OSM")

    inserted = 0
    skipped = 0

    print("3) Nettoyage + insertion...")
    with engine.begin() as conn:
        for el in elements:
            osm_id = el.get("id")
            tags = el.get("tags", {})
            lat, lon = get_center(el)

            if osm_id is None or lat is None or lon is None:
                skipped += 1
                continue

            t = normalize_type(tags)
            if t not in ("hopital", "clinique"):
                skipped += 1
                continue

            name = normalize_name(tags)

            res = conn.execute(insert_sql, {
                "osm_id": int(osm_id),
                "name": name,
                "type": t,
                "lat": float(lat),
                "lon": float(lon),
            })
            if res.rowcount == 1:
                inserted += 1

    print(f" Insertions nouvelles: {inserted} | Ignorés: {skipped}")

    print("4) Associer province_id (jointure spatiale)...")
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE facilities f
            SET province_id = p.id
            FROM provinces p
            WHERE f.province_id IS NULL
              AND ST_Intersects(p.geom, f.geom);
        """))

    print(" ETL terminé.")

if __name__ == "__main__":
    main()
