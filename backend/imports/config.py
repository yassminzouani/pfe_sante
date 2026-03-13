from sqlalchemy import create_engine

DB_USER = "postgres"
DB_PASSWORD = "123456"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "pfe_sante"

engine = create_engine(
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
    future=True
)

REGION_FILE   = r".\data\region.gpkg"
PROVINCE_FILE = r".\data\provinces.gpkg"
COMMUNE_FILE  = r".\data\commune.gpkg"

FILE_CLEANED = r".\data\HealthFacilitiesData_cleaned.xlsx"
FILE_GOOGLE  = r".\data\dataset_crawler-google-places_2025-07-15_13-45-26-755.xlsx"