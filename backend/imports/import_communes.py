import geopandas as gpd
from sqlalchemy import create_engine, text

from config import engine, REGION_FILE

COMMUNE_FILE = r"C:\Users\HP\Downloads\commune.gpkg"
COMMUNE_LAYER = "commune"

print(f"📥 Importing layer '{COMMUNE_LAYER}' from {COMMUNE_FILE}")
gdf = gpd.read_file(COMMUNE_FILE, layer=COMMUNE_LAYER)

print("Rows:", len(gdf))
print("Columns:", list(gdf.columns))

if gdf.crs is None:
    gdf = gdf.set_crs("EPSG:4326")
else:
    gdf = gdf.to_crs("EPSG:4326")

gdf = gdf[~gdf.geometry.isna()]
gdf = gdf[~gdf.geometry.is_empty]
gdf["geometry"] = gdf["geometry"].buffer(0)

with engine.begin() as conn:
    conn.execute(text("DROP TABLE IF EXISTS communes;"))

gdf.to_postgis("communes", engine, if_exists="replace", index=False)

with engine.begin() as conn:
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_communes_geom ON communes USING GIST (geometry);"))
    conn.execute(text("ANALYZE communes;"))

print("✅ communes imported.")