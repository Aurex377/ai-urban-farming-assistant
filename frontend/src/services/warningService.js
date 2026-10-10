import { apiRequest } from './apiClient';

/**
 * Phase 5: Fetch all active early warnings across all plants
 */
export async function getAllEarlyWarnings() {
  return await apiRequest('/api/warnings');
}

/**
 * Phase 5: Fetch active early warnings for a specific plant
 * @param {string|number} plantId
 */
export async function getPlantEarlyWarnings(plantId) {
  return await apiRequest(`/api/warnings/${plantId}`);
}
