import { apiRequest } from './apiClient';

/**
 * Request creation of a pending diagnosis record for a plant leaf photo.
 * Background processing will automatically trigger NVIDIA Nemotron inference.
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

/**
 * Trigger or retry NVIDIA Nemotron inference on an existing diagnosis record
 * @param {string|number} diagnosisId
 * @param {boolean} background
 */
export async function triggerDiagnosisAnalysis(diagnosisId, background = false) {
  const query = background ? '?background=true' : '?background=false';
  return await apiRequest(`/api/diagnoses/${diagnosisId}/analyze${query}`, {
    method: 'POST',
  });
}

/**
 * Check NVIDIA Nemotron vision model server availability
 */
export async function getNemotronVisionStatus() {
  return await apiRequest('/api/diagnoses/model/status');
}

// Backward-compatible alias
export const getLLaVAModelStatus = getNemotronVisionStatus;

/**
 * Helper to poll diagnosis status until completion or terminal state
 * @param {string|number} diagnosisId
 * @param {number} maxAttempts
 * @param {number} intervalMs
 */
export async function pollDiagnosisResult(diagnosisId, maxAttempts = 15, intervalMs = 2000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const data = await getDiagnosis(diagnosisId);
    if (!data) return null;

    // Terminal statuses: completed, model_unavailable, inconclusive, failed
    if (['completed', 'model_unavailable', 'inconclusive', 'failed'].includes(data.status)) {
      return data;
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  // Return last fetched state if still processing after maxAttempts
  return await getDiagnosis(diagnosisId);
}
