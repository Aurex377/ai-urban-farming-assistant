import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Search, Calendar, RefreshCw, AlertCircle, Leaf, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getPlants } from '../services/api';

export default function Plants() {
  const location = useLocation();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(location.state?.successMessage || null);

  const fetchPlantsList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPlants();
      setPlants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching plants:', err);
      setError('Unable to load plants. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlantsList();
  }, []);

  // Clear toast after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const filteredPlants = plants.filter((plant) => {
    const q = searchQuery.toLowerCase();
    const nameStr = plant.name || plant.plant_name || '';
    const nameMatch = nameStr.toLowerCase().includes(q);
    const speciesMatch = plant.species?.toLowerCase().includes(q);
    const typeMatch = plant.plant_type?.toLowerCase().includes(q);
    return nameMatch || speciesMatch || typeMatch;
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">My Plants</h1>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
              title="Connected to FastAPI backend and Supabase database"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Data
            </span>
          </div>
          <p className="text-gray-600">Manage and monitor all your plants in one place.</p>
        </div>

        <Link
          to="/plants/add"
          className="bg-primary text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 hover:bg-primary-dark transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Add Plant
        </Link>
      </div>

      {/* Success Toast Notification */}
      {toastMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-sm shadow-xs fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-0.5 rounded cursor-pointer"
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search Input (Only shown if plants exist or when filtering) */}
      {!loading && !error && plants.length > 0 && (
        <div className="mb-8 relative max-w-md">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search plants by name, species, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">🌱 Loading your plants...</h3>
          <p className="text-sm text-gray-500">Fetching live garden records from FastAPI</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-8 my-6 bg-rose-50 border border-rose-200 rounded-3xl text-center max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Unable to load plants</h3>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchPlantsList}
            className="bg-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-primary-dark transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* Empty State: Database has 0 plants */}
      {!loading && !error && plants.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-xs my-8">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl">
            🌱
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Your garden is empty</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Add your first plant and start monitoring its health.
          </p>
          <Link
            to="/plants/add"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-medium hover:bg-primary-dark transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Your First Plant
          </Link>
        </div>
      )}

      {/* Empty Search State */}
      {!loading && !error && plants.length > 0 && filteredPlants.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-3xl p-10 text-center max-w-md mx-auto shadow-xs my-6">
          <p className="text-gray-600 mb-4">
            No plants found matching &ldquo;<span className="font-semibold text-gray-900">{searchQuery}</span>&rdquo;.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-primary text-sm font-medium hover:underline cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Plant Cards Grid (Real Database Data) */}
      {!loading && !error && filteredPlants.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlants.map((plant) => (
            <Link key={plant.id} to={`/plants/${plant.id}`} className="block group">
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 h-full flex flex-col group-hover:-translate-y-1">
                {/* Fallback illustration placeholder since Supabase 'plants' table does not have image column */}
                <div className="h-48 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-xs flex items-center justify-center shadow-xs border border-emerald-100">
                    <Leaf className="w-8 h-8 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-800/80 mt-2">
                    {plant.plant_type || 'Plant'}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                      {plant.name || plant.plant_name}
                    </h3>
                    {plant.plant_type && (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                        {plant.plant_type}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 italic mb-4">
                    {plant.species || 'Species not specified'}
                  </p>

                  <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                    {plant.planted_date ? (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Planted: {formatDate(plant.planted_date)}</span>
                      </div>
                    ) : (
                      <span>Garden plant</span>
                    )}

                    <span className="text-primary font-medium text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Details <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
