import { apiRequest } from './apiClient';

/**
 * Request creation of a pending diagnosis record for a plant leaf photo
 * @param {string|number} plantId
 * @param {number} imageId
 * @param {string|null} notes
 * @param {string|null} userId
 */
export async function createPendingDiagnosis(plantId, imageId, notes = null, userId = null) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/plants/${plantId}/diagnoses${query}`, {
    method: 'POST',
    body: JSON.stringify({ image_id: imageId, notes }),
  });
}

/**
 * Get diagnosis history for a plant
 * @param {string|number} plantId
 * @param {string|null} userId
 */
export async function getPlantDiagnoses(plantId, userId = null) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/plants/${plantId}/diagnoses${query}`);
}

/**
 * Get single diagnosis details by ID
 * @param {string|number} diagnosisId
 */
export async function getDiagnosis(diagnosisId) {
  return await apiRequest(`/api/diagnoses/${diagnosisId}`);
}
