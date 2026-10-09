import { apiRequest } from './apiClient';

/**
 * Retrieve plants list from FastAPI backend
 * @param {string|null} userId - Optional user UUID filter
 */
export async function getPlants(userId = null) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/plants${query}`);
}

/**
 * Retrieve single plant detail by ID
 * @param {string|number} plantId
 * @param {string|null} userId
 */
export async function getPlantDetail(plantId, userId = null) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/plants/${plantId}${query}`);
}

/**
 * Create a new plant
 * @param {Object} plantData
 */
export async function createPlant(plantData) {
  return await apiRequest('/api/plants', {
    method: 'POST',
    body: JSON.stringify(plantData),
  });
}

/**
 * Update an existing plant record
 * @param {string|number} plantId
 * @param {Object} plantData
 * @param {string|null} userId
 */
export async function updatePlant(plantId, plantData, userId = null) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/plants/${plantId}${query}`, {
    method: 'PATCH',
    body: JSON.stringify(plantData),
  });
}

/**
 * Delete a plant
 * @param {string|number} plantId
 * @param {string|null} userId
 */
export async function deletePlant(plantId, userId = null) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/plants/${plantId}${query}`, {
    method: 'DELETE',
  });
}
