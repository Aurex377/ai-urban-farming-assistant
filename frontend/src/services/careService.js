import { apiRequest } from './apiClient';

/**
 * Fetch tailored clinical care & treatment guidance for a plant (Phase 3)
 * @param {string|number} plantId
 */
export async function getCareGuidance(plantId) {
  return await apiRequest(`/api/care/${plantId}/guidance`);
}

/**
 * List all approved botanical protocols (Phase 3)
 */
export async function getCareProtocols() {
  return await apiRequest('/api/care/protocols');
}

/**
 * Fetch stored care recommendations for a plant
 * @param {string|number} plantId
 */
export async function getCareRecommendations(plantId) {
  return await apiRequest(`/api/care/${plantId}`);
}

/**
 * Store a care recommendation
 * @param {string|number} plantId
 * @param {Object} careData
 */
export async function createCareRecommendation(plantId, careData) {
  return await apiRequest(`/api/care/${plantId}`, {
    method: 'POST',
    body: JSON.stringify(careData),
  });
}

/**
 * Phase 4: Fetch NVIDIA Nemotron personalized care guidance for a plant
 * @param {string|number} plantId
 * @param {boolean} autoGenerate
 */
export async function getPersonalizedCare(plantId, autoGenerate = true) {
  return await apiRequest(`/api/care/${plantId}/personalized?auto_generate=${autoGenerate}`);
}

/**
 * Phase 4: Trigger on-demand NVIDIA Nemotron personalization synthesis
 * @param {string|number} plantId
 */
export async function generatePersonalizedCare(plantId) {
  return await apiRequest(`/api/care/${plantId}/personalize`, {
    method: 'POST',
  });
}

/**
 * Phase 4: Retrieve NVIDIA Nemotron model runtime availability and status
 */
export async function getNemotronStatus() {
  return await apiRequest('/api/care/model/status');
}
