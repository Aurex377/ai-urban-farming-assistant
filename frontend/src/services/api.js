const API_BASE_URL = "http://127.0.0.1:8000";

/**
 * Health check for FastAPI backend service
 */
export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`);
  }
  return await response.json();
}

/**
 * Health check for Supabase database connectivity through FastAPI
 */
export async function checkDatabaseHealth() {
  const response = await fetch(`${API_BASE_URL}/health/database`);
  if (!response.ok) {
    throw new Error(`Database health check failed with status ${response.status}`);
  }
  return await response.json();
}

/**
 * Retrieve plants list from FastAPI backend (connected to Supabase 'plants' table)
 * @param {string|null} userId - Optional user UUID filter. If omitted, returns all plants in development mode.
 */
export async function getPlants(userId = null) {
  const endpoint = userId ? `${API_BASE_URL}/api/plants/${userId}` : `${API_BASE_URL}/api/plants`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch plants with status ${response.status}`);
  }
  return await response.json();
}

/**
 * Retrieve a single plant detail by plant_id from FastAPI backend
 * @param {string|number} plantId
 */
export async function getPlantDetail(plantId) {
  const response = await fetch(`${API_BASE_URL}/api/plants/detail/${plantId}`);
  if (!response.ok) {
    let errorDetail = `Failed to fetch plant detail with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (typeof errorJson?.detail === "string") {
        errorDetail = errorJson.detail;
      }
    } catch {
      // Fallback
    }
    throw new Error(errorDetail);
  }
  return await response.json();
}

/**
 * Create a new plant record in Supabase via FastAPI backend
 * @param {Object} plantData - Plant record data (plant_name, species, plant_type, planted_date, etc.)
 */
export async function createPlant(plantData) {
  const response = await fetch(`${API_BASE_URL}/api/plants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(plantData),
  });

  if (!response.ok) {
    let errorDetail = `Failed to create plant (HTTP ${response.status})`;
    try {
      const errorJson = await response.json();
      if (typeof errorJson?.detail === "string") {
        errorDetail = errorJson.detail;
      } else if (Array.isArray(errorJson?.detail)) {
        errorDetail = errorJson.detail.map((e) => e.msg || JSON.stringify(e)).join(", ");
      }
    } catch {
      // Fallback if not JSON
    }
    throw new Error(errorDetail);
  }

  return await response.json();
}

/**
 * Upload an image for a specific plant to FastAPI backend
 * Sends multipart/form-data with field name "file"
 * @param {string|number} plantId - Plant ID
 * @param {File} file - Binary image file
 */
export async function uploadPlantImage(plantId, file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/plants/${plantId}/images`, {
    method: "POST",
    body: formData,
    // Do NOT manually set Content-Type header so the browser sets the boundary automatically
  });

  if (!response.ok) {
    let errorDetail = `Failed to upload image (HTTP ${response.status})`;
    try {
      const errorJson = await response.json();
      if (typeof errorJson?.detail === "string") {
        errorDetail = errorJson.detail;
      } else if (Array.isArray(errorJson?.detail)) {
        errorDetail = errorJson.detail.map((e) => e.msg || JSON.stringify(e)).join(", ");
      }
    } catch {
      // Fallback if not JSON
    }
    throw new Error(errorDetail);
  }

  return await response.json();
}

/**
 * Retrieve uploaded images list for a specific plant from FastAPI backend
 * @param {string|number} plantId
 */
export async function getPlantImages(plantId) {
  const response = await fetch(`${API_BASE_URL}/api/plants/${plantId}/images`);
  if (!response.ok) {
    let errorDetail = `Failed to fetch plant images with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (typeof errorJson?.detail === "string") {
        errorDetail = errorJson.detail;
      }
    } catch {
      // Fallback
    }
    throw new Error(errorDetail);
  }
  return await response.json();
}

/**
 * Update an existing plant record
 * @param {string|number} plantId
 * @param {Object} plantData
 */
export async function updatePlant(plantId, plantData) {
  const response = await fetch(`${API_BASE_URL}/api/plants/${plantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plantData),
  });
  if (!response.ok) {
    let errorDetail = `Failed to update plant (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (typeof err?.detail === "string") errorDetail = err.detail;
    } catch {
      // Fallback
    }
    throw new Error(errorDetail);
  }
  return await response.json();
}

/**
 * Delete a plant by plantId
 * @param {string|number} plantId
 */
export async function deletePlant(plantId) {
  const response = await fetch(`${API_BASE_URL}/api/plants/${plantId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    let errorDetail = `Failed to delete plant (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (typeof err?.detail === "string") errorDetail = err.detail;
    } catch {
      // Fallback
    }
    throw new Error(errorDetail);
  }
  return await response.json();
}

/**
 * Request AI plant disease diagnosis for an uploaded image
 * @param {string|number} plantId
 * @param {number} imageId
 */
export async function runDiagnosis(plantId, imageId) {
  const response = await fetch(`${API_BASE_URL}/api/diagnosis/${plantId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_id: imageId }),
  });
  if (!response.ok) {
    let errorDetail = `Failed to run diagnosis (HTTP ${response.status})`;
    try {
      const err = await response.json();
      if (typeof err?.detail === "string") errorDetail = err.detail;
    } catch {
      // Fallback
    }
    throw new Error(errorDetail);
  }
  return await response.json();
}

/**
 * Get diagnosis history for a plant
 * @param {string|number} plantId
 */
export async function getPlantDiagnoses(plantId) {
  const response = await fetch(`${API_BASE_URL}/api/diagnosis/plant/${plantId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch diagnoses (HTTP ${response.status})`);
  }
  return await response.json();
}

/**
 * Get care recommendations for a plant
 * @param {string|number} plantId
 */
export async function getCareRecommendations(plantId) {
  const response = await fetch(`${API_BASE_URL}/api/care/${plantId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch care recommendations (HTTP ${response.status})`);
  }
  return await response.json();
}

/**
 * Create a care recommendation for a plant
 * @param {string|number} plantId
 * @param {Object} careData
 */
export async function createCareRecommendation(plantId, careData) {
  const response = await fetch(`${API_BASE_URL}/api/care/${plantId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(careData),
  });
  if (!response.ok) {
    throw new Error(`Failed to create care recommendation (HTTP ${response.status})`);
  }
  return await response.json();
}

/**
 * Get watering logs for a plant
 * @param {string|number} plantId
 */
export async function getWateringLogs(plantId) {
  const response = await fetch(`${API_BASE_URL}/api/watering/${plantId}/logs`);
  if (!response.ok) {
    throw new Error(`Failed to fetch watering logs (HTTP ${response.status})`);
  }
  return await response.json();
}

/**
 * Create a watering log entry for a plant
 * @param {string|number} plantId
 * @param {Object} logData
 */
export async function createWateringLog(plantId, logData) {
  const response = await fetch(`${API_BASE_URL}/api/watering/${plantId}/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(logData),
  });
  if (!response.ok) {
    throw new Error(`Failed to create watering log (HTTP ${response.status})`);
  }
  return await response.json();
}

/**
 * Get watering recommendations for a plant
 * @param {string|number} plantId
 */
export async function getWateringRecommendations(plantId) {
  const response = await fetch(`${API_BASE_URL}/api/watering/${plantId}/recommendations`);
  if (!response.ok) {
    throw new Error(`Failed to fetch watering recommendations (HTTP ${response.status})`);
  }
  return await response.json();
}

/**
 * Get weather records for a plant
 * @param {string|number} plantId
 */
export async function getPlantWeather(plantId) {
  const response = await fetch(`${API_BASE_URL}/api/weather/${plantId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch weather records (HTTP ${response.status})`);
  }
  return await response.json();
}

/**
 * Get activities for a user
 * @param {string} userId
 */
export async function getUserActivities(userId) {
  const response = await fetch(`${API_BASE_URL}/api/activities/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user activities (HTTP ${response.status})`);
  }
  return await response.json();
}

export { API_BASE_URL };
