import geopandas as gpd
from sqlalchemy import create_engine, text

from config import engine, REGION_FILE

REGION_FILE = r"C:\Users\HP\Downloads\region.gpkg"

print("📥 Importing regions...")

gdf = gpd.read_file(REGION_FILE)

# CRS
if gdf.crs is None:
    gdf = gdf.set_crs("EPSG:4326")
else:
    gdf = gdf.to_crs("EPSG:4326")

# Nettoyage
gdf = gdf[~gdf.geometry.isna()]
gdf = gdf[~gdf.geometry.is_empty]
gdf["geometry"] = gdf["geometry"].buffer(0)

with engine.begin() as conn:
    conn.execute(text("DROP TABLE IF EXISTS regions;"))

gdf.to_postgis("regions", engine, if_exists="replace", index=False)

with engine.begin() as conn:
    conn.execute(text("CREATE INDEX idx_regions_geom ON regions USING GIST (geometry);"))
    conn.execute(text("ANALYZE regions;"))

print("✅ regions imported.")