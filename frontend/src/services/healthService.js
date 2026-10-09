import { apiRequest } from './apiClient';

/**
 * Basic health check for FastAPI backend service
 */
export async function checkBackendHealth() {
  return await apiRequest('/health');
}

/**
 * Tests live Supabase database connectivity through FastAPI
 */
export async function checkDatabaseHealth() {
  return await apiRequest('/health/database');
}
