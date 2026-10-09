/**
 * GrowWise AI — Unified Services API Gateway
 * Re-exports modular service methods while preserving complete backward compatibility.
 */

export { API_BASE_URL, apiRequest } from './apiClient';

// Health Services
export { checkBackendHealth, checkDatabaseHealth } from './healthService';

// Plant Services
export {
  getPlants,
  getPlantDetail,
  createPlant,
  updatePlant,
  deletePlant,
} from './plantService';

// Image Services
export {
  uploadPlantImage,
  getPlantImages,
  deletePlantImage,
} from './imageService';

// Diagnosis Services
export {
  createPendingDiagnosis,
  getPlantDiagnoses,
  getDiagnosis,
} from './diagnosisService';

// Legacy alias for runDiagnosis -> createPendingDiagnosis
import { createPendingDiagnosis } from './diagnosisService';
export const runDiagnosis = (plantId, imageId) => createPendingDiagnosis(plantId, imageId);

// Care Recommendations (Phase 0 / ready for Phase 2)
import { apiRequest } from './apiClient';

export async function getCareRecommendations(plantId) {
  return await apiRequest(`/api/care/${plantId}`);
}

export async function createCareRecommendation(plantId, careData) {
  return await apiRequest(`/api/care/${plantId}`, {
    method: 'POST',
    body: JSON.stringify(careData),
  });
}

// Watering Logs & Recommendations (Phase 0 / ready for Phase 2)
export async function getWateringLogs(plantId) {
  return await apiRequest(`/api/watering/${plantId}/logs`);
}

export async function createWateringLog(plantId, logData) {
  return await apiRequest(`/api/watering/${plantId}/log`, {
    method: 'POST',
    body: JSON.stringify(logData),
  });
}

export async function getWateringRecommendations(plantId) {
  return await apiRequest(`/api/watering/${plantId}/recommendations`);
}

// Weather Records (Phase 0 / ready for Phase 2)
export async function getPlantWeather(plantId) {
  return await apiRequest(`/api/weather/${plantId}`);
}

// User Activities (Phase 0 / ready for Phase 2)
export async function getUserActivities(userId) {
  return await apiRequest(`/api/activities/${userId}`);
}
