import { apiRequest } from './apiClient';

/**
 * GrowWise AI — Plant Recommendation Service
 * Connects frontend discovery wizard, side-by-side comparison,
 * and plant favorites to the FastAPI backend.
 */

/**
 * Generate climate-aware personalized plant recommendations
 * @param {Object} preferences
 */
export async function discoverPlants(preferences) {
  return await apiRequest('/api/recommendations/discover', {
    method: 'POST',
    body: JSON.stringify(preferences),
  });
}

/**
 * Retrieve curated botanical catalog with optional horticultural filters
 * @param {Object} filters
 */
export async function getBotanicalCatalog(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.sunlight) params.append('sunlight', filters.sunlight);
  if (filters.environment) params.append('environment', filters.environment);
  if (filters.pet_friendly !== undefined) params.append('pet_friendly', filters.pet_friendly);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return await apiRequest(`/api/recommendations/catalog${queryStr}`);
}

/**
 * Get comprehensive botanical and clinical care profile for a single plant
 * @param {string} plantId
 */
export async function getCatalogPlantDetail(plantId) {
  return await apiRequest(`/api/recommendations/plants/${encodeURIComponent(plantId)}`);
}

/**
 * Compare 2 to 5 plants side-by-side with suitability verdict
 * @param {Array<string>} plantIds
 * @param {Object} userPreferences
 */
export async function comparePlants(plantIds, userPreferences = null) {
  return await apiRequest('/api/recommendations/compare', {
    method: 'POST',
    body: JSON.stringify({
      plant_ids: plantIds,
      user_preferences: userPreferences,
    }),
  });
}

/**
 * Save user discovery preferences
 * @param {Object} preferences
 * @param {string|null} userId
 */
export async function saveDiscoveryPreferences(preferences, userId = null) {
  return await apiRequest('/api/recommendations/preferences', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      preferences,
    }),
  });
}

/**
 * Retrieve saved discovery preferences
 * @param {string|null} userId
 */
export async function getSavedDiscoveryPreferences(userId = null) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/recommendations/preferences${query}`);
}

/**
 * Add a plant to favorites
 * @param {string} plantId
 * @param {string|null} userId
 */
export async function addFavoritePlant(plantId, userId = null) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/recommendations/favorites/${encodeURIComponent(plantId)}${query}`, {
    method: 'POST',
  });
}

/**
 * Remove a plant from favorites
 * @param {string} plantId
 * @param {string|null} userId
 */
export async function removeFavoritePlant(plantId, userId = null) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/recommendations/favorites/${encodeURIComponent(plantId)}${query}`, {
    method: 'DELETE',
  });
}

/**
 * List all favorite plants for user
 * @param {string|null} userId
 */
export async function getFavoritePlants(userId = null) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/recommendations/favorites${query}`);
}
