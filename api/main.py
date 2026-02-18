from fastapi import FastAPI
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi import Request

DB_USER = "postgres"
DB_PASSWORD = "123456"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "pfe_sante"

pwd = quote_plus(DB_PASSWORD)
engine = create_engine(
    f"postgresql+psycopg2://{DB_USER}:{pwd}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

app = FastAPI(title="PFE Santé - API")

@app.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1;"))
    return {"status": "ok"}

@app.get("/provinces")
def provinces():
    # renvoie les provinces en GeoJSON FeatureCollection
    q = """
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(jsonb_agg(
        jsonb_build_object(
          'type','Feature',
          'geometry', ST_AsGeoJSON(geom)::jsonb,
          'properties', jsonb_build_object(
            'id', id,
            'name', name
          )
        )
      ), '[]'::jsonb)
    ) AS geojson
    FROM provinces;
    """
    with engine.connect() as conn:
        return conn.execute(text(q)).scalar()

@app.get("/facilities")
def facilities():
    q = """
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(jsonb_agg(
        jsonb_build_object(
          'type','Feature',
          'geometry', ST_AsGeoJSON(geom)::jsonb,
          'properties', jsonb_build_object(
            'id', id,
            'name', name,
            'type', type,
            'province', province_name,
            'source', source
          )
        )
      ), '[]'::jsonb)
    ) AS geojson
    FROM facilities;
    """
    with engine.connect() as conn:
        return conn.execute(text(q)).scalar()
@app.get("/", response_class=HTMLResponse)
def serve_map():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()
@app.get("/morocco_outline")
def morocco_outline():
    q = """
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', jsonb_build_array(
        jsonb_build_object(
          'type','Feature',
          'geometry', ST_AsGeoJSON(ST_UnaryUnion(ST_Collect(geom)))::jsonb,
          'properties', jsonb_build_object('name','Morocco')
        )
      )
    ) AS geojson
    FROM provinces;
    """
    with engine.connect() as conn:
        return conn.execute(text(q)).scalar()
@app.get("/provinces_stats")
def provinces_stats():
    q = """
    WITH stats AS (
      SELECT province_id, COUNT(*) AS nb_facilities
      FROM facilities
      WHERE province_id IS NOT NULL
      GROUP BY province_id
    )
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(jsonb_agg(
        jsonb_build_object(
          'type','Feature',
          'geometry', ST_AsGeoJSON(p.geom)::jsonb,
          'properties', jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'nb_facilities', COALESCE(s.nb_facilities, 0)
          )
        )
      ), '[]'::jsonb)
    ) AS geojson
    FROM provinces p
    LEFT JOIN stats s ON s.province_id = p.id;
    """
    with engine.connect() as conn:
        return conn.execute(text(q)).scalar()
