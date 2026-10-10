import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplets,
  Heart,
  Leaf,
  AlertCircle,
  ArrowRight,
  Activity,
  Plus,
  RefreshCw,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import BackendStatus from '../components/BackendStatus';
import {
  getPlants,
  getAllEarlyWarnings,
  getUserActivities,
} from '../services/api';

export default function Dashboard() {
  const [plants, setPlants] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plantsData, warningsData, activitiesData] = await Promise.allSettled([
        getPlants(),
        getAllEarlyWarnings(),
        getUserActivities('27865d2c-302e-4a2d-83aa-c1c9ea7338a4'),
      ]);

      if (plantsData.status === 'fulfilled') {
        setPlants(Array.isArray(plantsData.value) ? plantsData.value : []);
      } else {
        throw new Error(plantsData.reason?.message || 'Failed to fetch plants');
      }

      if (warningsData.status === 'fulfilled') {
        setWarnings(Array.isArray(warningsData.value) ? warningsData.value : []);
      }

      if (activitiesData.status === 'fulfilled') {
        setActivities(Array.isArray(activitiesData.value) ? activitiesData.value : []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Unable to connect to FastAPI backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const healthyCount = plants.filter(
    (p) => (p.health_status || 'healthy').toLowerCase() === 'healthy'
  ).length;

  const attentionCount = plants.filter(
    (p) => ['needs_attention', 'critical'].includes((p.health_status || '').toLowerCase())
  ).length;

  const wateringCount = plants.filter(
    (p) => Boolean(p.next_watering_at)
  ).length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Good morning 👋</h1>
          <p className="text-gray-600 text-lg">Let's take care of your garden today.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-primary ${loading ? 'animate-spin' : ''}`} />
          Refresh Garden Intel
        </button>
      </header>

      {/* Backend & Database Connection Test Status */}
      <BackendStatus />

      {/* 👑 Best Plant for Your Home Recommendation Discovery Banner */}
      <div className="mb-8 p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-green-950 text-white rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 rounded-full bg-white/20 text-white text-xs font-bold flex items-center gap-1 backdrop-blur-xs">
              👑 Personalized Discovery
            </span>
            <span className="text-emerald-200 text-xs">• Microclimate & Sunlight Aware</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-1">
            Best Plant for Your Home
          </h2>
          <p className="text-emerald-100 text-xs md:text-sm leading-relaxed">
            Discover resilient botanical species matching your balcony sunlight, living space, maintenance routine, and local climate.
          </p>
        </div>
        <Link
          to="/recommendations"
          className="relative z-10 shrink-0 px-6 py-3 bg-white text-emerald-950 font-bold text-xs rounded-2xl hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-emerald-700" /> Find My Perfect Plant <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Backend / Network Error State */}
      {error && (
        <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-semibold">Backend Connection Issue</p>
              <p className="text-xs text-rose-600">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Phase 5: Active Early Warnings Intelligence Banner */}
      {warnings.length > 0 && (
        <div className="mb-8 p-5 bg-amber-50/90 border border-amber-200 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  Agronomic Early Warnings ({warnings.length})
                </h3>
                <p className="text-xs text-amber-900/80">
                  Deterministic environmental risk rules active for your microclimate
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-200 text-amber-900">
              Action Recommended
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-4">
            {warnings.slice(0, 4).map((warn) => (
              <div
                key={warn.id}
                className="p-4 bg-white rounded-2xl border border-amber-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-900">
                      {warn.plant_name}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                        warn.severity === 'urgent'
                          ? 'bg-rose-100 text-rose-700'
                          : warn.severity === 'high'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {warn.severity}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-amber-950 mb-1">{warn.title}</p>
                  <p className="text-[11px] text-gray-600 leading-relaxed mb-2">
                    {warn.summary}
                  </p>
                  <p className="text-[11px] text-emerald-800 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100/60">
                    <strong>Action:</strong> {warn.recommended_action}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                  <Link
                    to={`/plants/${warn.plant_id}`}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View Plant Details <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
        <StatCard
          icon={Leaf}
          label="Total Plants"
          value={loading ? '...' : plants.length}
          color="bg-green-100 text-green-700"
        />
        <StatCard
          icon={Heart}
          label="Healthy"
          value={loading ? '...' : healthyCount}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          icon={AlertCircle}
          label="Needs Attention"
          value={loading ? '...' : attentionCount}
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          icon={Droplets}
          label="Water Scheduled"
          value={loading ? '...' : wateringCount}
          color="bg-blue-100 text-blue-700"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex justify-between items-end mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">My Plants</h2>
                {!loading && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Data ({plants.length})
                  </span>
                )}
              </div>
              <Link to="/plants" className="text-primary font-medium flex items-center gap-1 hover:underline">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-gray-600 font-medium text-sm">Loading garden data from Supabase...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && plants.length === 0 && (
              <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-gray-200 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No plants added yet</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
                  Start tracking your balcony and indoor plants by adding your first plant to your garden.
                </p>
                <Link
                  to="/plants/add"
                  className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-primary-dark transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Your First Plant
                </Link>
              </div>
            )}

            {/* Live Plant Grid */}
            {!loading && plants.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-6">
                {plants.slice(0, 4).map((plant) => (
                  <div
                    key={plant.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {plant.name || plant.plant_name}
                          </h3>
                          <p className="text-sm text-gray-500 italic">
                            {plant.species || plant.plant_type || 'Urban plant'}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            (plant.health_status || 'healthy').toLowerCase() === 'healthy'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {(plant.health_status || 'healthy').replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span>Type:</span>
                        <span className="font-medium text-gray-900">
                          {plant.plant_type || 'Vegetable'}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <Link
                        to={`/plants/${plant.id}`}
                        className="block w-full text-center py-2 bg-gray-50 text-primary font-medium rounded-xl hover:bg-primary hover:text-white transition-colors"
                      >
                        View Health Timeline →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Today's Tasks & Real Activity Logs */}
        <div className="space-y-8">
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Agronomic Action Checklist
            </h2>
            <div className="space-y-3">
              <TaskItem icon="💧" text="Verify root-zone moisture before noon heat" />
              <TaskItem icon="📸" text="Perform periodic leaf scan for early blight" />
              <TaskItem icon="☀️" text="Inspect container airflow & sunlight exposure" />
              <TaskItem icon="🌿" text="Bottom-water to keep leaf surfaces dry" />
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Live Garden Activity
              </h2>
              <Link to="/activity" className="text-xs text-primary hover:underline font-semibold">
                Full Log →
              </Link>
            </div>

            <div className="space-y-5">
              {activities.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  No activity logs recorded yet. Adding plants or running diagnoses will populate this log.
                </p>
              ) : (
                activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex gap-3 text-xs">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0"></div>
                    <div>
                      <p className="text-gray-900 font-semibold">{act.description}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {act.created_at ? new Date(act.created_at).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function TaskItem({ icon, text }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
      <span className="text-xl">{icon}</span>
      <span className="text-gray-700 font-medium text-xs">{text}</span>
    </div>
  );
}
