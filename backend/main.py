"""
Main Application Entrypoint
---------------------------
FastAPI application for AI Urban Farming Assistant.
Configures CORS, routes, health checks, and Swagger documentation.
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Ensure both current directory and parent directory are on sys.path
# This guarantees that both:
#   1. (inside backend/): uvicorn main:app --reload
#   2. (from root):      uvicorn backend.main:app --reload
# work seamlessly without ModuleNotFoundError.
CURRENT_DIR = Path(__file__).resolve().parent
PARENT_DIR = CURRENT_DIR.parent
for path_entry in (str(CURRENT_DIR), str(PARENT_DIR)):
    if path_entry not in sys.path:
        sys.path.insert(0, path_entry)

# Load environment variables
load_dotenv()

from fastapi import FastAPI, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Database dependency
try:
    from backend.database import get_supabase
except ImportError:
    from database import get_supabase

# Routers
try:
    from backend.routes.users import router as users_router
    from backend.routes.plants import router as plants_router
    from backend.routes.images import router as images_router
    from backend.routes.diagnoses import router as diagnoses_router
    from backend.routes.care import router as care_router
    from backend.routes.watering import router as watering_router
    from backend.routes.weather import router as weather_router
    from backend.routes.activities import router as activities_router
    from backend.routes.timeline import router as timeline_router
    from backend.routes.notifications import router as notifications_router
    from backend.routes.warnings import router as warnings_router
    from backend.routes.recommendations import router as recommendations_router
except ImportError:
    from routes.users import router as users_router
    from routes.plants import router as plants_router
    from routes.images import router as images_router
    from routes.diagnoses import router as diagnoses_router
    from routes.care import router as care_router
    from routes.watering import router as watering_router
    from routes.weather import router as weather_router
    from routes.activities import router as activities_router
    from routes.timeline import router as timeline_router
    from routes.notifications import router as notifications_router
    from routes.warnings import router as warnings_router
    from routes.recommendations import router as recommendations_router

# Initialize FastAPI App
app = FastAPI(
    title="AI Urban Farming Assistant API",
    version="1.0.0",
    description=(
        "FastAPI backend for AI Urban Farming Assistant. "
        "Provides REST endpoints connecting to an existing Supabase database and storage "
        "for plant tracking, leaf image uploads, AI disease diagnosis placeholders, "
        "watering schedules, weather records, and activity tracking."
    ),
    docs_url="/docs",
    redoc_url="/redoc"
)

# ----------------------------------------------------
# CORS Configuration
# ----------------------------------------------------
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").strip()

# Compile allowed origins
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if FRONTEND_URL and FRONTEND_URL not in allowed_origins:
    allowed_origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------------------------------
# Health Check Endpoints
# ----------------------------------------------------
@app.get("/", tags=["Health Check"])
def root():
    """
    Root endpoint returning welcome message.
    """
    return {"message": "AI Urban Farming Assistant API is running"}


@app.get("/health", tags=["Health Check"])
def health():
    """
    Basic service health check endpoint.
    """
    return {"status": "healthy"}


@app.get("/health/database", tags=["Health Check"])
def health_database():
    """
    Tests connectivity to the existing Supabase 'plants' table.
    Safe response without exposing secret keys or credentials.
    """
    try:
        client = get_supabase()
        # Query 1 record from the existing plants table to verify connectivity
        res = client.table("plants").select("id").limit(1).execute()
        return {
            "status": "connected",
            "database": "Supabase reachable",
            "table_checked": "plants"
        }
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "disconnected",
                "database": "Supabase unreachable",
                "message": "Unable to reach Supabase. Please verify SUPABASE_URL and SUPABASE_KEY in your backend/.env file."
            }
        )


# ----------------------------------------------------
# Register Application Routers
# ----------------------------------------------------
app.include_router(users_router)
app.include_router(plants_router)
app.include_router(images_router)
app.include_router(diagnoses_router)
app.include_router(care_router)
app.include_router(watering_router)
app.include_router(weather_router)
app.include_router(activities_router)
app.include_router(timeline_router)
app.include_router(notifications_router)
app.include_router(warnings_router)
app.include_router(recommendations_router)


@app.get("/plants", tags=["Plants"])
def get_plants_alias(supabase=Depends(get_supabase)):
    """Convenience alias for /api/plants to support direct /plants queries."""
    try:
        from backend.routes.plants import get_plants
    except ImportError:
        from routes.plants import get_plants
    return get_plants(user_id=None, supabase=supabase)
