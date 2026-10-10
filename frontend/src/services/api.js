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
  triggerDiagnosisAnalysis,
  getLLaVAModelStatus,
  pollDiagnosisResult,
} from './diagnosisService';

// Legacy alias for runDiagnosis -> createPendingDiagnosis
import { createPendingDiagnosis } from './diagnosisService';
export const runDiagnosis = (plantId, imageId) => createPendingDiagnosis(plantId, imageId);

// Care Recommendations & Guidance (Phase 3 & Phase 4)
export {
  getCareGuidance,
  getCareProtocols,
  getCareRecommendations,
  createCareRecommendation,
  getPersonalizedCare,
  generatePersonalizedCare,
  getNemotronStatus,
} from './careService';

// Watering Engine & Logs (Phase 3)
export {
  getWateringScheduleAll,
  calculateWatering,
  getWateringLogs,
  createWateringLog,
  getWateringRecommendations,
} from './wateringService';

// Weather Telemetry (Phase 3)
export {
  getCurrentWeather,
  getWeatherForecast,
  getPlantWeather,
} from './weatherService';

// Recommendation Context Aggregator (Phase 3)
export {
  getPlantRecommendationContext,
} from './contextService';

// User Activities (Phase 0 / ready for Phase 2)
import { apiRequest } from './apiClient';
export async function getUserActivities(userId) {
  return await apiRequest(`/api/activities/${userId}`);
}

// Plant Health Timeline (Phase 5)
export {
  getPlantTimeline,
  getPlantTrajectory,
} from './timelineService';

// Notifications & Early Warnings (Phase 5)
export {
  getNotifications,
  getNotificationBadge,
  markNotificationRead,
  markAllNotificationsRead,
  syncNotifications,
} from './notificationService';

export {
  getAllEarlyWarnings,
  getPlantEarlyWarnings,
} from './warningService';

