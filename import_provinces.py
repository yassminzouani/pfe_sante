import geopandas as gpd
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus

# ----------------- CONFIG -----------------
DB_USER = "postgres"        
DB_PASSWORD = "123456"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "pfe_sante"

GEOJSON_PATH = r"C:\Users\HP\Downloads\gadm41_MAR_2.json"  # ou .geojson
# ------------------------------------------

#  encodage du mot de passe 
pwd = quote_plus(DB_PASSWORD)

engine = create_engine(
    f"postgresql+psycopg2://{DB_USER}:{pwd}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

#  Test connexion
with engine.connect() as conn:
    conn.execute(text("SELECT 1;"))
print("Connexion PostgreSQL OK")

print("1) Lecture du fichier GeoJSON...")
gdf = gpd.read_file(GEOJSON_PATH)

#  CRS en WGS84
if gdf.crs is None:
    gdf = gdf.set_crs(epsg=4326)
else:
    gdf = gdf.to_crs(epsg=4326)

print("2) Colonnes disponibles :", list(gdf.columns))

#  trouver la bonne colonne de nom
name_col = None
for c in ["NAME_2", "NAME_1", "NAME", "NAME_0"]:
    if c in gdf.columns:
        name_col = c
        break
if not name_col:
    raise ValueError("Colonne de nom introuvable (ex: NAME_2).")

#  garder uniquement nom + geometry et définir geometry active
gdf = gdf[[name_col, "geometry"]].copy()
gdf = gdf.rename(columns={name_col: "name", "geometry": "geom"})
gdf = gdf.set_geometry("geom")

print("3) Import vers PostGIS (table: provinces)...")

# crée la table provinces correctement (avec id) puis insère
with engine.begin() as conn:
    conn.execute(text("DROP TABLE IF EXISTS provinces;"))
    conn.execute(text("""
        CREATE TABLE provinces (
            id SERIAL PRIMARY KEY,
            name TEXT,
            geom GEOMETRY(MultiPolygon, 4326)
        );
    """))

#  insertion via to_postgis (append car la table existe déjà)
gdf.to_postgis("provinces", engine, if_exists="append", index=False)

print("4) Création des index...")
with engine.begin() as conn:
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_provinces_geom ON provinces USING GIST (geom);"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_provinces_name ON provinces (name);"))

print("Index créés (VACUUM ignoré).")

