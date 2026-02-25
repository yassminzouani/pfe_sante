import geopandas as gpd
from sqlalchemy import create_engine, text

from config import engine, REGION_FILE

PROVINCE_FILE = r"C:\Users\HP\Downloads\provinces.gpkg"

print("📥 Importing provinces...")

gdf = gpd.read_file(PROVINCE_FILE)

if gdf.crs is None:
    gdf = gdf.set_crs("EPSG:4326")
else:
    gdf = gdf.to_crs("EPSG:4326")

gdf = gdf[~gdf.geometry.isna()]
gdf = gdf[~gdf.geometry.is_empty]
gdf["geometry"] = gdf["geometry"].buffer(0)

with engine.begin() as conn:
    conn.execute(text("DROP TABLE IF EXISTS provinces;"))

gdf.to_postgis("provinces", engine, if_exists="replace", index=False)

with engine.begin() as conn:
    conn.execute(text("CREATE INDEX idx_provinces_geom ON provinces USING GIST (geometry);"))
    conn.execute(text("ANALYZE provinces;"))

print("✅ provinces imported.")