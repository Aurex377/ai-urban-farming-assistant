"""
Recommendations Route Module — Best Plant for Your Home
--------------------------------------------------------
Intelligent botanical recommendation endpoints integrating deterministic
horticultural scoring, live weather data, and NVIDIA Nemotron AI narrative.
"""

import os
from typing import List, Optional, Dict, Any, Set
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.data.botanical_catalog import (
        BOTANICAL_CATALOG,
        BOTANICAL_CATALOG_DICT,
        get_catalog_plant_by_id,
    )
    from backend.schemas.recommendations import (
        PlantDiscoveryPreferences,
        PlantRecommendationCard,
        DiscoveryResultResponse,
        PlantCompareRequest,
        PlantCompareResponse,
        SavePreferencesRequest,
        FavoriteToggleRequest,
    )
    from backend.services.plant_recommendation_engine import (
        discover_best_plants,
        compare_plants_detailed,
    )
except ImportError:
    from database import get_supabase
    from data.botanical_catalog import (
        BOTANICAL_CATALOG,
        BOTANICAL_CATALOG_DICT,
        get_catalog_plant_by_id,
    )
    from schemas.recommendations import (
        PlantDiscoveryPreferences,
        PlantRecommendationCard,
        DiscoveryResultResponse,
        PlantCompareRequest,
        PlantCompareResponse,
        SavePreferencesRequest,
        FavoriteToggleRequest,
    )
    from services.plant_recommendation_engine import (
        discover_best_plants,
        compare_plants_detailed,
    )

router = APIRouter(prefix="/api/recommendations", tags=["Plant Recommendations"])

DEFAULT_DEV_USER = "27865d2c-302e-4a2d-83aa-c1c9ea7338a4"

def get_effective_user_id(user_id: Optional[str] = None) -> str:
    """Returns effective user UUID prioritizing provided param then dev env."""
    if user_id and user_id.strip():
        return user_id.strip()
    return os.getenv("DEV_USER_ID", DEFAULT_DEV_USER).strip() or DEFAULT_DEV_USER


# In-memory stores for preferences and favorites with Supabase resilience
_USER_PREFERENCES_STORE: Dict[str, Dict[str, Any]] = {}
_USER_FAVORITES_STORE: Dict[str, Set[str]] = {}


@router.post(
    "/discover",
    response_model=DiscoveryResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate personalized, climate-aware plant recommendations",
)
async def discover_plants_endpoint(preferences: PlantDiscoveryPreferences):
    """
    Evaluates botanical catalog against user's preferences, sunlight conditions,
    space, maintenance, climate, and live weather. Generates deterministic scoring
    and enriches with NVIDIA Nemotron AI narrative explanation.
    """
    try:
        result = await discover_best_plants(preferences)
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(exc)}",
        )


@router.get(
    "/catalog",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Browse botanical catalog of home plants",
)
def get_botanical_catalog_endpoint(
    category: Optional[str] = Query(None, description="Filter by category (foliage, edible, flowering, succulent, air_purifying)"),
    sunlight: Optional[str] = Query(None, description="Filter by sunlight compatibility"),
    environment: Optional[str] = Query(None, description="Filter by environment (indoor, outdoor, balcony)"),
    pet_friendly: Optional[bool] = Query(None, description="Filter for ASPCA pet safe plants"),
):
    """
    Returns curated botanical catalog profiles with optional horticultural filters.
    """
    results = []
    for p_dict in BOTANICAL_CATALOG:
        if category and p_dict.get("category") != category:
            continue
        if sunlight and sunlight not in p_dict.get("sunlight", []):
            continue
        if environment and environment not in p_dict.get("environment", []):
            continue
        if pet_friendly is True and not p_dict.get("pet_safe", False):
            continue
        results.append(p_dict)
    return results


@router.get(
    "/plants/{plant_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get comprehensive botanical profile for a single plant",
)
def get_plant_detail_endpoint(plant_id: str):
    """
    Returns complete scientific, horticultural, and clinical care information for a plant.
    """
    plant = get_catalog_plant_by_id(plant_id)
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plant '{plant_id}' not found in botanical catalog",
        )
    return plant


@router.post(
    "/compare",
    response_model=PlantCompareResponse,
    status_code=status.HTTP_200_OK,
    summary="Compare 2 to 5 plants side-by-side with suitability verdict",
)
async def compare_plants_endpoint(request: PlantCompareRequest):
    """
    Generates side-by-side comparison matrix and AI/horticultural verdict
    evaluating which plant best satisfies the user's specific requirements.
    """
    if len(request.plant_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 plant IDs are required for comparison",
        )
    if len(request.plant_ids) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A maximum of 5 plants can be compared at once",
        )

    try:
        resolved_prefs = request.user_preferences or request.preferences
        res = await compare_plants_detailed(request.plant_ids, resolved_prefs)
        return res
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compare plants: {str(exc)}",
        )


@router.post(
    "/preferences",
    status_code=status.HTTP_200_OK,
    summary="Save user discovery preferences",
)
def save_preferences_endpoint(
    req: SavePreferencesRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Saves user plant discovery preferences for quick retrieval and recommendation refresh.
    """
    user_id = get_effective_user_id(req.user_id)
    pref_dict = req.preferences.model_dump()
    _USER_PREFERENCES_STORE[user_id] = pref_dict

    # Optionally persist in Supabase if table exists
    try:
        supabase.table("user_plant_preferences").upsert({
            "user_id": user_id,
            "preferences": pref_dict,
        }).execute()
    except Exception:
        # Graceful fallback: stored in memory
        pass

    return {
        "status": "success",
        "message": "Preferences saved successfully",
        "user_id": user_id,
    }


@router.get(
    "/preferences",
    status_code=status.HTTP_200_OK,
    summary="Retrieve saved user discovery preferences",
)
def get_preferences_endpoint(
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase),
):
    """
    Retrieves previously saved discovery preferences for the user.
    """
    uid = get_effective_user_id(user_id)
    # Try Supabase first
    try:
        res = supabase.table("user_plant_preferences").select("preferences").eq("user_id", uid).limit(1).execute()
        if res.data and len(res.data) > 0:
            return {"preferences": res.data[0].get("preferences")}
    except Exception:
        pass

    # Fallback to in-memory store
    if uid in _USER_PREFERENCES_STORE:
        return {"preferences": _USER_PREFERENCES_STORE[uid]}

    return {"preferences": None}


@router.post(
    "/favorites/{plant_id}",
    status_code=status.HTTP_200_OK,
    summary="Add a plant to favorites",
)
def add_favorite_endpoint(
    plant_id: str,
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase),
):
    """
    Adds a catalog plant to the user's favorites list.
    """
    plant = get_catalog_plant_by_id(plant_id)
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plant '{plant_id}' not found in catalog",
        )

    uid = get_effective_user_id(user_id)
    actual_pid = plant["id"]

    if uid not in _USER_FAVORITES_STORE:
        _USER_FAVORITES_STORE[uid] = set()
    _USER_FAVORITES_STORE[uid].add(actual_pid)

    try:
        supabase.table("plant_favorites").upsert({
            "user_id": uid,
            "plant_id": actual_pid,
        }).execute()
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Plant {plant['name']} added to favorites",
        "favorites": list(_USER_FAVORITES_STORE[uid]),
    }


@router.delete(
    "/favorites/{plant_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove a plant from favorites",
)
def remove_favorite_endpoint(
    plant_id: str,
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase),
):
    """
    Removes a catalog plant from the user's favorites list.
    """
    uid = get_effective_user_id(user_id)
    plant = get_catalog_plant_by_id(plant_id)
    target_pid = plant["id"] if plant else plant_id

    if uid in _USER_FAVORITES_STORE:
        _USER_FAVORITES_STORE[uid].discard(target_pid)

    try:
        supabase.table("plant_favorites").delete().eq("user_id", uid).eq("plant_id", target_pid).execute()
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Plant {plant_id} removed from favorites",
        "favorites": list(_USER_FAVORITES_STORE.get(uid, set())),
    }


@router.get(
    "/favorites",
    status_code=status.HTTP_200_OK,
    summary="List all favorite plants for a user",
)
def get_favorites_endpoint(
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase),
):
    """
    Returns full catalog cards for all plants favorited by the user.
    """
    uid = get_effective_user_id(user_id)
    fav_ids = set()

    try:
        res = supabase.table("plant_favorites").select("plant_id").eq("user_id", uid).execute()
        if res.data:
            fav_ids = {row["plant_id"] for row in res.data if "plant_id" in row}
    except Exception:
        pass

    # Merge with memory store
    if uid in _USER_FAVORITES_STORE:
        fav_ids.update(_USER_FAVORITES_STORE[uid])

    plants = []
    for pid in fav_ids:
        p = get_catalog_plant_by_id(pid)
        if p:
            plants.append(p)

    return {
        "favorites": list(fav_ids),
        "plants": plants,
    }
