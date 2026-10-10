/**
 * GrowWise AI — Context Service (Phase 3)
 * Fetches the synthesized 10-dimension agronomic context for decision support.
 */

import { apiRequest } from './apiClient';

/**
 * Fetch complete assembled 10-dimension recommendation context for a plant
 * @param {string} plantId
 * @returns {Promise<Object>}
 */
export async function getPlantRecommendationContext(plantId) {
  return await apiRequest(`/api/plants/${plantId}/context`);
}
