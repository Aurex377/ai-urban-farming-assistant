import { apiRequest } from './apiClient';

/**
 * Fetch live current weather observation
 * @param {string|null} location
 */
export async function getCurrentWeather(location = null) {
  const query = location ? `?location=${encodeURIComponent(location)}` : '';
  return await apiRequest(`/api/weather/current${query}`);
}

/**
 * Fetch 5-day weather forecast and garden impact
 * @param {string|null} location
 */
export async function getWeatherForecast(location = null) {
  const query = location ? `?location=${encodeURIComponent(location)}` : '';
  return await apiRequest(`/api/weather/forecast${query}`);
}

/**
 * Fetch plant-specific weather records
 * @param {string|number} plantId
 */
export async function getPlantWeather(plantId) {
  return await apiRequest(`/api/weather/${plantId}`);
}
