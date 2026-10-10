import { apiRequest } from './apiClient';

/**
 * Fetch watering schedule and recommendations across all plants
 */
export async function getWateringScheduleAll() {
  return await apiRequest('/api/watering/schedule/all');
}

/**
 * Calculate deterministic watering volume and schedule for a plant
 * @param {string|number} plantId
 */
export async function calculateWatering(plantId) {
  return await apiRequest(`/api/watering/${plantId}/calculate`, {
    method: 'POST',
  });
}

/**
 * Get watering logs history for a plant
 * @param {string|number} plantId
 */
export async function getWateringLogs(plantId) {
  return await apiRequest(`/api/watering/${plantId}/logs`);
}

/**
 * Record a watering event for a plant
 * @param {string|number} plantId
 * @param {Object} logData - { amount_ml: number, notes?: string, watered_at?: string }
 */
export async function createWateringLog(plantId, logData) {
  return await apiRequest(`/api/watering/${plantId}/log`, {
    method: 'POST',
    body: JSON.stringify(logData),
  });
}

/**
 * Get stored watering recommendations for a plant
 * @param {string|number} plantId
 */
export async function getWateringRecommendations(plantId) {
  return await apiRequest(`/api/watering/${plantId}/recommendations`);
}
