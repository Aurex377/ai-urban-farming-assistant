import { useState, useEffect } from 'react';
import {
  Clock,
  Camera,
  Activity,
  Heart,
  Droplets,
  AlertTriangle,
  Sprout,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { getPlantTimeline } from '../services/api';

export default function PlantHealthTimeline({ plantId, plantName }) {
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTimeline = async () => {
    if (!plantId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPlantTimeline(plantId);
      setTimelineData(data);
    } catch (err) {
      console.error('Error fetching plant timeline:', err);
      setError(err.message || 'Unable to load timeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [plantId]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
        <RefreshCw className="w-6 h-6 text-primary animate-spin mb-3" />
        <p className="text-xs font-semibold text-gray-700">Compiling plant health timeline...</p>
        <p className="text-[11px] text-gray-400 mt-1">Aggregating historical scans, watering, and diagnoses</p>
      </div>
    );
  }

  if (error || !timelineData) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between text-xs text-gray-600">
          <span>{error || 'No timeline records available yet.'}</span>
          <button
            onClick={fetchTimeline}
            className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-primary font-semibold hover:bg-gray-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { trajectory, events } = timelineData;

  const getEventIcon = (eventType, severity) => {
    switch (eventType) {
      case 'plant_planted':
        return <Sprout className="w-4 h-4 text-emerald-600" />;
      case 'image_captured':
        return <Camera className="w-4 h-4 text-blue-600" />;
      case 'diagnosis_completed':
        return severity === 'success' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <Activity className="w-4 h-4 text-rose-600" />
        );
      case 'care_synthesized':
        return <Heart className="w-4 h-4 text-purple-600" />;
      case 'watering_completed':
        return <Droplets className="w-4 h-4 text-cyan-600" />;
      case 'warning_flagged':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventBadge = (severity) => {
    switch (severity) {
      case 'urgent':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'warning':
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'success':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
      {/* Header & Trajectory Analytics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Plant Health Timeline & Trajectory
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Phase 5 Live
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Audit-grade chronological history of all leaf scans, diagnoses, watering, and clinical protocols
          </p>
        </div>

        <button
          onClick={fetchTimeline}
          className="self-start md:self-auto px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Trajectory Score Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/60 to-teal-50/40 border border-emerald-100/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white border border-emerald-200 flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg font-black text-emerald-800 leading-none">
              {Math.round(trajectory.health_score)}
            </span>
            <span className="text-[9px] font-bold text-gray-400 mt-0.5">/ 100</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 capitalize">
                Status: {trajectory.health_status.replace('_', ' ')}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white text-emerald-700 border border-emerald-200">
                {trajectory.trajectory_trend === 'declining' ? (
                  <TrendingDown className="w-3 h-3 text-amber-500" />
                ) : (
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                )}
                {trajectory.trajectory_trend}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1 max-w-xl leading-relaxed">
              {trajectory.summary}
            </p>
          </div>
        </div>

        {/* Milestone counters */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-2 bg-white rounded-xl border border-gray-100 text-center">
            <p className="text-xs font-bold text-gray-900">{trajectory.scans_count}</p>
            <p className="text-[10px] text-gray-400">Scans</p>
          </div>
          <div className="px-3 py-2 bg-white rounded-xl border border-gray-100 text-center">
            <p className="text-xs font-bold text-gray-900">{trajectory.waterings_count}</p>
            <p className="text-[10px] text-gray-400">Waterings</p>
          </div>
          <div className="px-3 py-2 bg-white rounded-xl border border-gray-100 text-center">
            <p className="text-xs font-bold text-gray-900">{trajectory.diagnoses_count}</p>
            <p className="text-[10px] text-gray-400">Diagnoses</p>
          </div>
          {trajectory.active_warnings_count > 0 && (
            <div className="px-3 py-2 bg-amber-50 rounded-xl border border-amber-200 text-center text-amber-900">
              <p className="text-xs font-bold">{trajectory.active_warnings_count}</p>
              <p className="text-[10px]">Warnings</p>
            </div>
          )}
        </div>
      </div>

      {/* Chronological Stream */}
      <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-100">
        {events.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 italic">No timeline events recorded yet.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="relative group">
              {/* Dot on line */}
              <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-gray-200 group-hover:border-primary flex items-center justify-center transition-colors">
                <div className="w-2 h-2 rounded-full bg-gray-400 group-hover:bg-primary transition-colors"></div>
              </div>

              {/* Event Card */}
              <div className="p-4 rounded-2xl bg-gray-50/70 hover:bg-gray-50 border border-gray-100 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white shadow-2xs">
                      {getEventIcon(ev.event_type, ev.severity)}
                    </div>
                    <span className="font-bold text-gray-900 text-xs">{ev.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${getEventBadge(
                        ev.severity
                      )}`}
                    >
                      {ev.severity}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(ev.timestamp).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">{ev.description}</p>

                {/* Additional details */}
                {ev.details && Object.keys(ev.details).length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-gray-200/50 flex flex-wrap gap-2 text-[11px]">
                    {ev.details.model_name && (
                      <span className="text-gray-500">
                        Engine: <strong>{ev.details.model_name}</strong>
                      </span>
                    )}
                    {ev.details.amount_ml && (
                      <span className="text-cyan-700 font-semibold">
                        Volume: {ev.details.amount_ml} ml
                      </span>
                    )}
                    {ev.details.confidence !== undefined && (
                      <span className="text-gray-500">
                        Confidence: {Math.round(ev.details.confidence * 100)}%
                      </span>
                    )}
                    {ev.details.recommended_action && (
                      <span className="text-amber-800 font-medium">
                        Action: {ev.details.recommended_action}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
