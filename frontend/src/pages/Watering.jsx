import { useState, useEffect, useCallback } from 'react';
import { Droplets, Info, RefreshCw, CheckCircle2, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { getWateringScheduleAll, createWateringLog } from '../services/api';

export default function Watering() {
  const [scheduleData, setScheduleData] = useState({
    today: [],
    tomorrow: [],
    upcoming: [],
    total_plants: 0,
    today_volume_ml: 0,
    weather_summary: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loggingPlantId, setLoggingPlantId] = useState(null);
  const [logSuccessMessage, setLogSuccessMessage] = useState(null);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWateringScheduleAll();
      setScheduleData(data);
    } catch (err) {
      console.error('Error loading watering schedule:', err);
      setError(err.message || 'Unable to load watering schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Clear success notification
  useEffect(() => {
    if (logSuccessMessage) {
      const timer = setTimeout(() => setLogSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [logSuccessMessage]);

  const handleQuickLog = async (plant) => {
    setLoggingPlantId(plant.id);
    try {
      await createWateringLog(plant.id, {
        amount_ml: plant.amount_ml || 250,
        notes: `Recorded via Quick Watering Log (${plant.amount_ml || 250} ml)`
      });
      setLogSuccessMessage(`Successfully logged ${plant.amount_ml || 250} ml for ${plant.name}!`);
      await fetchSchedule();
    } catch (err) {
      console.error('Failed to log watering:', err);
      alert(`Error logging watering: ${err.message || 'Server error'}`);
    } finally {
      setLoggingPlantId(null);
    }
  };

  const todayList = scheduleData.today || [];
  const tomorrowList = scheduleData.tomorrow || [];
  const upcomingList = scheduleData.upcoming || [];
  const weather = scheduleData.weather_summary;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold text-gray-900">Deterministic Watering Engine</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Phase 3 Active
            </span>
          </div>
          <p className="text-gray-600">
            Agronomic hydration calibrated by plant species, growth stage, soil type, and live weather telemetry.
          </p>
        </div>
        <button
          onClick={fetchSchedule}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Calculations</span>
        </button>
      </div>

      {/* Success Notification */}
      {logSuccessMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{logSuccessMessage}</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today&apos;s Need</p>
            <p className="text-2xl font-bold text-gray-900">{scheduleData.today_volume_ml} ml</p>
            <p className="text-xs text-gray-500">{todayList.length} plants scheduled today</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tomorrow</p>
            <p className="text-2xl font-bold text-gray-900">{tomorrowList.length} Plants</p>
            <p className="text-xs text-gray-500">Anticipated watering batch</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Telemetry Driver</p>
            <p className="text-2xl font-bold text-gray-900">
              {weather ? `${weather.temperature}°C • ${weather.humidity}%` : 'Live Telemetry'}
            </p>
            <p className="text-xs text-gray-500">{weather?.condition || 'Real-time adjustments'}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Plants needing water today */}
          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-500" />
                Plants Needing Water Today ({todayList.length})
              </h2>
            </div>

            {loading ? (
              <div className="py-12 text-center text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                <p className="text-sm">Calculating agronomic soil-water balances...</p>
              </div>
            ) : todayList.length === 0 ? (
              <div className="bg-blue-50/50 border border-dashed border-blue-200 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-gray-800 text-base mb-1">All Plants Adequately Hydrated</p>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  No plants are due for irrigation today based on recent rainfall, humidity, and species requirements.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayList.map((p) => (
                  <WateringPlantRow
                    key={p.id}
                    plant={p}
                    onLog={() => handleQuickLog(p)}
                    isLogging={loggingPlantId === p.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Tomorrow & Upcoming Schedule */}
          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Upcoming Irrigation Forecast
            </h2>

            {tomorrowList.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Due Tomorrow</h3>
                <div className="space-y-3">
                  {tomorrowList.map((p) => (
                    <WateringPlantRow
                      key={p.id}
                      plant={p}
                      onLog={() => handleQuickLog(p)}
                      isLogging={loggingPlantId === p.id}
                      subtle
                    />
                  ))}
                </div>
              </div>
            )}

            {upcomingList.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Later This Week</h3>
                <div className="space-y-3">
                  {upcomingList.map((p) => (
                    <WateringPlantRow
                      key={p.id}
                      plant={p}
                      onLog={() => handleQuickLog(p)}
                      isLogging={loggingPlantId === p.id}
                      subtle
                    />
                  ))}
                </div>
              </div>
            )}

            {tomorrowList.length === 0 && upcomingList.length === 0 && !loading && (
              <p className="text-xs text-gray-400">No other plants registered in this garden.</p>
            )}
          </section>
        </div>

        {/* Why this recommendation sidebar */}
        <div className="space-y-8">
          <section className="bg-blue-50/80 p-6 md:p-8 rounded-3xl border border-blue-100">
            <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Why this recommendation?
            </h2>
            <div className="space-y-4">
              <div className="bg-white/90 p-4 rounded-xl text-sm text-gray-700 shadow-2xs backdrop-blur-sm">
                <p className="font-semibold text-gray-900 mb-1">Weather & Evapotranspiration</p>
                <p className="text-xs text-gray-600">
                  {weather ? (
                    `Adjusted for ${weather.temperature}°C, ${weather.humidity}% humidity, and recent precipitation (${weather.rainfall || 0}mm).`
                  ) : (
                    'Dynamic telemetry from Open-Meteo regulates evaporation curves.'
                  )}
                </p>
              </div>

              <div className="bg-white/90 p-4 rounded-xl text-sm text-gray-700 shadow-2xs backdrop-blur-sm">
                <p className="font-semibold text-gray-900 mb-1">Active Pathology Throttling</p>
                <p className="text-xs text-gray-600">
                  Plants with active fungal or root-rot diagnoses automatically have their irrigation throttled to prevent root suffocation.
                </p>
              </div>

              <div className="bg-white/90 p-4 rounded-xl text-sm text-gray-700 shadow-2xs backdrop-blur-sm">
                <p className="font-semibold text-gray-900 mb-1">Deterministic Formula</p>
                <p className="text-xs text-gray-600">
                  Base volume × Growth Stage × Sunlight Zone × Soil Factor × Temp Factor × (1 - Rain Reduction).
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function WateringPlantRow({ plant, onLog, isLogging, subtle = false }) {
  const urgencyColor = {
    high: 'bg-rose-100 text-rose-800 border-rose-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
  }[plant.urgency] || 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <div
      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        subtle
          ? 'bg-gray-50/60 border-gray-200/60 hover:bg-gray-50'
          : 'bg-white border-gray-100 hover:shadow-md'
      }`}
    >
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Droplets className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-900">{plant.name}</h4>
            {plant.species && <span className="text-xs text-gray-400 italic">({plant.species})</span>}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${urgencyColor}`}>
              {plant.urgency}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Target: <strong className="text-gray-900">{plant.amount_ml} ml</strong> • Schedule: {plant.recommended_date}
            {plant.days_since_watered !== null && plant.days_since_watered !== undefined && (
              <span> • Last watered {plant.days_since_watered}d ago</span>
            )}
          </p>
          <p className="text-[11px] text-gray-600 mt-1 italic">{plant.reason}</p>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <button
          onClick={onLog}
          disabled={isLogging}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
        >
          {isLogging ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Logging...</span>
            </>
          ) : (
            <>
              <Droplets className="w-3.5 h-3.5" />
              <span>Log Water</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
