import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertTriangle, Droplets, CheckCircle, Info, Check, RefreshCw, X } from 'lucide-react';
import {
  getNotifications,
  getNotificationBadge,
  markNotificationRead,
  markAllNotificationsRead,
  syncNotifications,
} from '../services/api';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [badge, setBadge] = useState({ unread_count: 0, has_urgent: false });
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef(null);

  const fetchBadge = async () => {
    try {
      const data = await getNotificationBadge();
      if (data) setBadge(data);
    } catch (err) {
      // quiet fail
    }
  };

  const fetchNotificationList = async () => {
    setLoading(true);
    try {
      const list = await getNotifications(false, 30);
      setNotifications(Array.isArray(list) ? list : []);
      fetchBadge();
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadge();
    // Poll badge every 20 seconds
    const interval = setInterval(fetchBadge, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotificationList();
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setBadge((prev) => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - 1),
      }));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setBadge({ unread_count: 0, has_urgent: false });
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      await syncNotifications();
      await fetchNotificationList();
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type, severity) => {
    if (severity === 'urgent' || severity === 'high' || type === 'disease_warning') {
      return <AlertTriangle className="w-4 h-4 text-rose-500" />;
    }
    if (type === 'watering_due' || type === 'dehydration') {
      return <Droplets className="w-4 h-4 text-blue-500" />;
    }
    if (severity === 'success') {
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    }
    return <Info className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {badge.unread_count > 0 && (
          <span
            className={`absolute top-1 right-1 flex items-center justify-center min-w-4.5 h-4.5 px-1 text-[10px] font-bold text-white rounded-full ${
              badge.has_urgent ? 'bg-rose-500 animate-pulse' : 'bg-primary'
            }`}
          >
            {badge.unread_count > 9 ? '9+' : badge.unread_count}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">Notifications</span>
              {badge.unread_count > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                  {badge.unread_count} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={loading}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200/50 transition-colors"
                title="Sync warning rules"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {badge.unread_count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center">
                <RefreshCw className="w-5 h-5 animate-spin mb-2 text-primary" />
                Checking plant early warnings...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No active notifications. Your urban garden is running smoothly! 🌱
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 transition-colors flex items-start gap-3 hover:bg-gray-50/80 ${
                    !item.is_read ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-gray-100">
                    {getIcon(item.type, item.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold text-gray-900 leading-tight">
                        {item.title}
                      </p>
                      {!item.is_read && (
                        <button
                          onClick={(e) => handleMarkRead(item.id, e)}
                          className="shrink-0 text-gray-400 hover:text-emerald-600 p-0.5 rounded"
                          title="Mark read"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      {item.action_url && (
                        <Link
                          to={item.action_url}
                          onClick={() => setIsOpen(false)}
                          className="text-primary hover:underline font-semibold"
                        >
                          Inspect →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
