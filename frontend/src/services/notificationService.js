import { apiRequest } from './apiClient';

/**
 * Phase 5: Fetch in-app notifications
 * @param {boolean} unreadOnly
 * @param {number} limit
 */
export async function getNotifications(unreadOnly = false, limit = 50) {
  const query = unreadOnly ? `?unread_only=true&limit=${limit}` : `?limit=${limit}`;
  return await apiRequest(`/api/notifications${query}`);
}

/**
 * Phase 5: Get unread notifications badge count
 */
export async function getNotificationBadge() {
  return await apiRequest('/api/notifications/badge');
}

/**
 * Phase 5: Mark a notification as read
 * @param {number} id
 */
export async function markNotificationRead(id) {
  return await apiRequest(`/api/notifications/${id}/read`, {
    method: 'POST',
  });
}

/**
 * Phase 5: Mark all notifications as read
 */
export async function markAllNotificationsRead() {
  return await apiRequest('/api/notifications/read-all', {
    method: 'POST',
  });
}

/**
 * Phase 5: Trigger fresh sync of early warnings into notifications
 */
export async function syncNotifications() {
  return await apiRequest('/api/notifications/sync', {
    method: 'POST',
  });
}
