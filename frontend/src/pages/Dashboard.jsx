import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mockActivities } from '../data/mockActivities';
import { Droplets, Heart, Leaf, AlertCircle, ArrowRight, Activity, Plus, RefreshCw } from 'lucide-react';
import BackendStatus from '../components/BackendStatus';
import { getPlants } from '../services/api';

export default function Dashboard() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardPlants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPlants();
      setPlants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading plants for dashboard:', err);
      setError(err.message || 'Unable to connect to FastAPI backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardPlants();
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
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Good morning 👋</h1>
        <p className="text-gray-600 text-lg">Let's take care of your garden today.</p>
      </header>

      {/* Backend & Database Connection Test Status */}
      <BackendStatus />

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
            onClick={fetchDashboardPlants}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
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
                        View Plant →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Today's Tasks
            </h2>
            <div className="space-y-4">
              <TaskItem icon="💧" text="Check soil moisture" />
              <TaskItem icon="🌱" text="Inspect plant leaf health" />
              <TaskItem icon="🔍" text="Upload new growth photo" />
              <TaskItem icon="☀️" text="Review sunlight exposure" />
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Activity
            </h2>
            <div className="space-y-6">
              {mockActivities.slice(0, 3).map((activity) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary"></div>
                  <div>
                    <p className="text-gray-900 font-medium">{activity.title}</p>
                    <p className="text-sm text-gray-500">{activity.plant} • {activity.time}</p>
                  </div>
                </div>
              ))}
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
      <span className="text-gray-700 font-medium text-sm">{text}</span>
    </div>
  );
}
