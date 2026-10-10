import { useState, useEffect } from 'react';
import {
  Clock,
  Activity as ActivityIcon,
  Droplets,
  Plus,
  RefreshCw,
  Camera,
  Heart,
  AlertTriangle,
  Leaf,
} from 'lucide-react';
import { getUserActivities } from '../services/api';

const getActivityStyle = (activityType) => {
  const t = (activityType || '').toLowerCase();
  if (t.includes('plant_created') || t.includes('system')) {
    return {
      icon: <Leaf className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-100',
    };
  }
  if (t.includes('water') || t.includes('irrigation')) {
    return {
      icon: <Droplets className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-100',
    };
  }
  if (t.includes('image') || t.includes('photo')) {
    return {
      icon: <Camera className="w-5 h-5 text-cyan-600" />,
      bg: 'bg-cyan-100',
    };
  }
  if (t.includes('care') || t.includes('personalized')) {
    return {
      icon: <Heart className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-100',
    };
  }
  if (t.includes('alert') || t.includes('warning') || t.includes('disease')) {
    return {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-100',
    };
  }
  return {
    icon: <ActivityIcon className="w-5 h-5 text-emerald-600" />,
    bg: 'bg-emerald-100',
  };
};

export default function Activity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserActivities('27865d2c-302e-4a2d-83aa-c1c9ea7338a4');
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err.message || 'Unable to load activity logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto fade-in pb-24">
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Garden Activity</h1>
          <p className="text-gray-600">Audit-grade history of care, scans, irrigation, and AI guidance.</p>
        </div>
        <button
          onClick={fetchActivities}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-primary ${loading ? 'animate-spin' : ''}`} />
          Refresh Activity Log
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 relative">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm font-semibold">Loading live garden activity from Supabase...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">{error}</div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No activities recorded yet. When you add plants, upload leaf scans, or run diagnoses, they will appear here.
          </div>
        ) : (
          <div className="space-y-8 relative">
            {/* Vertical Timeline Line */}
            <div className="absolute left-5 md:left-6 top-3 bottom-3 w-0.5 bg-gray-100"></div>

            {activities.map((act) => {
              const style = getActivityStyle(act.activity_type);
              const dateStr = act.created_at
                ? new Date(act.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent';
              const timeStr = act.created_at
                ? new Date(act.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <div key={act.id} className="relative z-10 flex gap-4 md:gap-6 group">
                  <div className="shrink-0">
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-sm border-2 border-white ring-4 ring-transparent group-hover:ring-gray-100 transition-all ${style.bg}`}
                    >
                      {style.icon}
                    </div>
                  </div>

                  <div className="flex-1 bg-gray-50/80 p-4 md:p-5 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                      <h4 className="font-bold text-gray-900 text-sm md:text-base">
                        {act.description}
                      </h4>
                      <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
                        {dateStr} {timeStr}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white text-gray-600 border border-gray-200">
                        Type: {(act.activity_type || 'activity').replace('_', ' ')}
                      </span>
                      {act.plant_id && (
                        <span className="text-[10px] text-gray-500">
                          Plant ID: #{act.plant_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
