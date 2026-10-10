import { apiRequest } from './apiClient';

/**
 * Phase 5: Get complete chronological health timeline for a plant
 * @param {string|number} plantId
 */
export async function getPlantTimeline(plantId) {
  return await apiRequest(`/api/timeline/${plantId}`);
}

/**
 * Phase 5: Get health score and trajectory analytics for a plant
 * @param {string|number} plantId
 */
export async function getPlantTrajectory(plantId) {
  return await apiRequest(`/api/timeline/${plantId}/trajectory`);
}
