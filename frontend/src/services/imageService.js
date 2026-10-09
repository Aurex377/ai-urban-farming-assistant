import { apiRequest } from './apiClient';

/**
 * Upload an image for a specific plant to FastAPI backend
 * @param {string|number} plantId
 * @param {File} file
 * @param {string|null} userId
 */
export async function uploadPlantImage(plantId, file, userId = null) {
  const formData = new FormData();
  formData.append('file', file);

  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/plants/${plantId}/images${query}`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Retrieve uploaded images list for a specific plant with signed URLs
 * @param {string|number} plantId
 * @param {string|null} userId
 */
export async function getPlantImages(plantId, userId = null) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/plants/${plantId}/images${query}`);
}

/**
 * Delete a plant image from Storage and Database
 * @param {string|number} plantId
 * @param {string|number} imageId
 * @param {string|null} userId
 */
export async function deletePlantImage(plantId, imageId, userId = null) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return await apiRequest(`/api/plants/${plantId}/images/${imageId}${query}`, {
    method: 'DELETE',
  });
}
