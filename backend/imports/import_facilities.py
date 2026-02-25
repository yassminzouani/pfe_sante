import pandas as pd
from sqlalchemy import create_engine, text

from config import engine, REGION_FILE

FILE_CLEANED = r"C:\Users\HP\Downloads\HealthFacilitiesData_cleaned.xlsx"
FILE_GOOGLE  = r"C:\Users\HP\Downloads\dataset_crawler-google-places_2025-07-15_13-45-26-755.xlsx"

# =========================
# READ EXCEL
# =========================
df_health = pd.read_excel(FILE_CLEANED, sheet_name="Data_cleaned")
df_google = pd.read_excel(FILE_GOOGLE, sheet_name="dataset_crawler-google-places_2")

df_health = df_health.rename(columns={
    "location/lat": "lat",
    "location/lng": "lng",
    "categoryName": "categoryname",
    "countryCode": "countrycode",
    "imageUrl": "imageurl",
    "totalScore": "totalscore",
})
df_health = df_health[[
    "title","lat","lng","categoryname","city","countrycode",
    "imageurl","address","phone","totalscore","website"
]].copy()

df_google = df_google.rename(columns={
    "id": "place_id",
    "categoryName": "categoryname",
    "claimThisBusiness": "claimthisbusiness",
    "imageUrl": "imageurl",
    "location/lat": "lat",
    "location/lng": "lng",
    "phoneUnformatted": "phoneunformatted",
    "reviewsCount": "reviewscount",
    "subTitle": "subtitle",
    "totalScore": "totalscore",
})
df_google = df_google[[
    "place_id","address","categoryname","city","claimthisbusiness","country",
    "imageurl","lat","lng","phone","phoneunformatted","reviewscount",
    "street","subtitle","title","totalscore","url","website"
]].copy()

# Clean lat/lng
for df in (df_health, df_google):
    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df["lng"] = pd.to_numeric(df["lng"], errors="coerce")
    df.dropna(subset=["lat", "lng"], inplace=True)

# =========================
# LOAD TO STAGING
# =========================
with engine.begin() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
    conn.execute(text("TRUNCATE TABLE stg_healthfacilities;"))
    conn.execute(text("TRUNCATE TABLE stg_googleplaces;"))

df_health.to_sql("stg_healthfacilities", engine, if_exists="append",
                 index=False, method="multi", chunksize=5000)
df_google.to_sql("stg_googleplaces", engine, if_exists="append",
                 index=False, method="multi", chunksize=5000)

# =========================
# GEOM + ADMIN ENRICHMENT (REGION/PROVINCE ONLY)
# =========================
with engine.begin() as conn:
    conn.execute(text("""
        ALTER TABLE stg_healthfacilities
        ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326),
        ADD COLUMN IF NOT EXISTS commune_nom text,
        ADD COLUMN IF NOT EXISTS province_nom text,
        ADD COLUMN IF NOT EXISTS region_nom text;
    """))

    conn.execute(text("""
        ALTER TABLE stg_googleplaces
        ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326),
        ADD COLUMN IF NOT EXISTS commune_nom text,
        ADD COLUMN IF NOT EXISTS province_nom text,
        ADD COLUMN IF NOT EXISTS region_nom text;
    """))

    # geom with cast (fix text->numeric)
    conn.execute(text("""
        UPDATE stg_healthfacilities
        SET geom = ST_SetSRID(ST_MakePoint(lng::double precision, lat::double precision), 4326)
        WHERE geom IS NULL AND lng IS NOT NULL AND lat IS NOT NULL;
    """))

    conn.execute(text("""
        UPDATE stg_googleplaces
        SET geom = ST_SetSRID(ST_MakePoint(lng::double precision, lat::double precision), 4326)
        WHERE geom IS NULL AND lng IS NOT NULL AND lat IS NOT NULL;
    """))

    # indexes
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stg_healthfacilities_geom ON stg_healthfacilities USING GIST (geom);"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stg_googleplaces_geom ON stg_googleplaces USING GIST (geom);"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_communes_geom ON communes USING GIST (geometry);"))

    # Join with your "communes" table (actually province-level attributes)
    # We fill province_nom + region_nom, and keep commune_nom null
    conn.execute(text("""
        UPDATE stg_healthfacilities h
        SET
          province_nom = c."NAME_2",
          region_nom   = c."NAME_1"
        FROM communes c
        WHERE h.geom IS NOT NULL
          AND ST_Intersects(h.geom, c.geometry);
    """))

    conn.execute(text("""
        UPDATE stg_googleplaces g
        SET
          province_nom = c."NAME_2",
          region_nom   = c."NAME_1"
        FROM communes c
        WHERE g.geom IS NOT NULL
          AND ST_Intersects(g.geom, c.geometry);
    """))

    conn.execute(text("ANALYZE stg_healthfacilities;"))
    conn.execute(text("ANALYZE stg_googleplaces;"))

# =========================
# COUNTS
# =========================
with engine.connect() as conn:
    r1 = conn.execute(text("SELECT COUNT(*) FROM stg_healthfacilities;")).scalar()
    r2 = conn.execute(text("SELECT COUNT(*) FROM stg_googleplaces;")).scalar()
    m1 = conn.execute(text("SELECT COUNT(*) FROM stg_healthfacilities WHERE province_nom IS NOT NULL;")).scalar()
    m2 = conn.execute(text("SELECT COUNT(*) FROM stg_googleplaces WHERE province_nom IS NOT NULL;")).scalar()

    print("stg_healthfacilities:", r1, "| matched province:", m1)
    print("stg_googleplaces:", r2, "| matched province:", m2)