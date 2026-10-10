"""
GrowWise AI — Plant Recommendation Schemas
-------------------------------------------
Pydantic contracts for personalized plant discovery, preference collection,
deterministic matching, side-by-side comparison, and favorites persistence.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator


class PlantDiscoveryPreferences(BaseModel):
    location: Optional[str] = Field(None, description="City, region, or garden location (e.g. Ahmedabad, Mumbai)")
    latitude: Optional[float] = Field(None, description="Optional GPS latitude for hyperlocal weather")
    longitude: Optional[float] = Field(None, description="Optional GPS longitude for hyperlocal weather")
    environment: str = Field(
        default="balcony",
        description="Growing zone: indoor, balcony, terrace, garden, window_sill, bedroom, living_room, small_desk, large_indoor"
    )
    sunlight: str = Field(
        default="bright_indirect",
        description="Light exposure: low_light, indirect_sunlight, bright_indirect, direct_sunlight, full_sun"
    )
    space: str = Field(
        default="balcony",
        description="Available area: small_desk, window_sill, living_room, bedroom, balcony, terrace, garden, large_indoor"
    )
    experience: str = Field(
        default="beginner",
        description="Gardener expertise: beginner, intermediate, experienced"
    )
    maintenance: str = Field(
        default="low",
        description="Maintenance bandwidth: very_low, low, moderate, high"
    )
    purposes: List[str] = Field(
        default_factory=lambda: ["decorative", "air_purifying"],
        description="Desired plant roles: decorative, air_purifying, flowering, edible_herbs, vegetables, fruits, medicinal, balcony, shaded_spaces, hot_climates, small_apartments, pet_safe"
    )
    pet_conscious: bool = Field(
        default=False,
        description="Strictly prioritize pet-safe non-toxic plants"
    )
    plant_size_preference: Optional[str] = Field(
        default="any",
        description="Preferred mature plant footprint: compact, medium, spacious, any"
    )
    watering_capacity: Optional[str] = Field(
        default="moderate",
        description="User watering commitment: very_low, low, moderate, high"
    )
    placement_type: Optional[str] = Field(
        default="both",
        description="Placement scope: indoor, outdoor, both"
    )
    flower_or_foliage: Optional[str] = Field(
        default="any",
        description="Aesthetic focus: foliage, flowering, edible_fruit, any"
    )
    growing_medium: Optional[str] = Field(
        default="any",
        description="Growing medium: standard_potting_soil, garden_soil, coco_peat, water_culture, any"
    )
    budget_tier: Optional[str] = Field(
        default="any",
        description="Budget preference: budget_friendly, moderate, premium, any"
    )


class PlantRecommendationCard(BaseModel):
    id: str
    name: str
    scientific_name: str
    category: str
    image_url: str
    match_score: int
    match_badge: str
    match_reasons: List[str]
    tradeoffs_and_warnings: List[str]
    recommended_location: str
    sunlight_label: str
    watering_label: str
    maintenance_label: str
    space_label: str
    soil_label: str
    mature_size: str
    growth_rate: str
    temperature_range: str
    pet_safe: bool
    pet_safety_notes: str
    climate_fit_note: str
    verified_source: str
    confidence_score: int = 95
    care_summary: Optional[str] = ""
    fertilizer_summary: Optional[str] = ""
    pruning_summary: Optional[str] = ""
    propagation_summary: Optional[str] = ""
    common_problems: Optional[str] = ""
    last_verified_date: Optional[str] = "2025-08-15"


class DiscoveryResultResponse(BaseModel):
    total_candidates_evaluated: int
    matched_plants: List[PlantRecommendationCard]
    weather_context: Optional[Dict[str, Any]] = None
    personalized_home_narrative: str
    climate_adaptation_tip: str
    engine_used: str
    generated_at: str


class PlantCompareRequest(BaseModel):
    plant_ids: List[str] = Field(..., min_length=2, max_length=5)
    user_preferences: Optional[PlantDiscoveryPreferences] = None
    preferences: Optional[PlantDiscoveryPreferences] = None

    @model_validator(mode="after")
    def unify_preferences(self):
        if self.user_preferences is None and self.preferences is not None:
            self.user_preferences = self.preferences
        elif self.preferences is None and self.user_preferences is not None:
            self.preferences = self.user_preferences
        return self


class PlantCompareResponse(BaseModel):
    plants: List[Dict[str, Any]]
    comparison_matrix: Dict[str, Any]
    ai_verdict: str
    best_fit_plant_id: str


class SavePreferencesRequest(BaseModel):
    user_id: Optional[str] = None
    preferences: PlantDiscoveryPreferences


class FavoriteToggleRequest(BaseModel):
    user_id: Optional[str] = None
    plant_id: str
    notes: Optional[str] = None
