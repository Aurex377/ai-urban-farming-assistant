import { useState, useEffect } from 'react';
import { getWeatherForecast } from '../services/api';
import { CloudSun, CloudRain, Sun, Wind, Droplets, MapPin, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';

export default function Weather() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWeatherForecast();
      setWeatherData(data);
    } catch (err) {
      console.error('Error fetching weather telemetry:', err);
      setError(err.message || 'Unable to retrieve live weather telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const current = weatherData?.current || {
    temperature: 24,
    condition: 'Partly Cloudy',
    humidity: 62,
    rainfall: 0.0,
    wind: 14,
  };

  const forecast = weatherData?.forecast || [];
  const impact = weatherData?.garden_impact || 'Optimal ambient conditions for vegetative growth. Moderate evaporation rate.';
  const city = weatherData?.city || 'Local Urban Microclimate';

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold text-gray-900">Weather & Environment</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Open-Meteo Live
            </span>
          </div>
          <p className="text-gray-600 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span>{city} — Telemetry affecting your garden beds</span>
          </p>
        </div>

        <button
          onClick={fetchWeather}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="text-sm font-medium">Using cached/deterministic telemetry: {error}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Today's Weather Hero */}
          <section className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 md:p-10 rounded-3xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20 pointer-events-none">
              <CloudSun className="w-64 h-64" />
            </div>

            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-xl font-medium text-white/90">Current Ambient Conditions</h2>
              <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                Hyperlocal Observation
              </span>
            </div>

            <div className="flex flex-wrap items-end gap-6 mb-10 relative z-10">
              <div className="text-7xl md:text-8xl font-bold tracking-tight">
                {Math.round(current.temperature)}°
              </div>
              <div className="pb-2">
                <div className="text-3xl font-semibold mb-1">{current.condition}</div>
                <div className="text-white/80 text-sm">
                  Feels like {Math.round(current.temperature + 1)}°C in garden microclimate
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-6 relative z-10">
              <div className="flex flex-col items-center text-center">
                <Droplets className="w-6 h-6 mb-2 text-blue-200" />
                <span className="text-xs text-white/80 mb-1">Humidity</span>
                <span className="font-bold text-lg">{Math.round(current.humidity)}%</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <CloudRain className="w-6 h-6 mb-2 text-blue-200" />
                <span className="text-xs text-white/80 mb-1">Precipitation</span>
                <span className="font-bold text-lg">{current.rainfall || 0} mm</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <Wind className="w-6 h-6 mb-2 text-blue-200" />
                <span className="text-xs text-white/80 mb-1">Wind Speed</span>
                <span className="font-bold text-lg">{Math.round(current.wind)} km/h</span>
              </div>
            </div>
          </section>

          {/* 5-Day Forecast */}
          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">5-Day Agricultural Weather Forecast</h2>
            {forecast.length === 0 ? (
              <p className="text-sm text-gray-400">Forecast telemetry loading...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-4">
                {forecast.map((day, idx) => {
                  const cond = (day.condition || '').toLowerCase();
                  const isRain = cond.includes('rain') || (day.rainfall && day.rainfall > 0);
                  const isSun = cond.includes('clear') || cond.includes('sun');

                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center p-4 rounded-2xl bg-gray-50/70 hover:bg-gray-100/70 transition-colors text-center border border-gray-100"
                    >
                      <span className="text-xs font-bold text-gray-500 mb-2">{day.day}</span>
                      <div className="my-2">
                        {isRain ? (
                          <CloudRain className="w-8 h-8 text-blue-500" />
                        ) : isSun ? (
                          <Sun className="w-8 h-8 text-amber-500" />
                        ) : (
                          <CloudSun className="w-8 h-8 text-indigo-400" />
                        )}
                      </div>
                      <span className="font-bold text-gray-900 text-base">
                        {Math.round(day.temp ?? day.temp_max ?? 20)}°
                      </span>
                      <span className="text-[10px] text-gray-500 mt-1 capitalize truncate max-w-full">
                        {day.condition}
                      </span>
                      {day.rainfall > 0 && (
                        <span className="text-[10px] text-blue-600 font-semibold mt-1">
                          {day.rainfall}mm
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Garden Impact Card */}
        <div>
          <section className="bg-amber-50/80 p-6 md:p-8 rounded-3xl border border-amber-100 shadow-sm flex flex-col justify-between h-full">
            <div>
              <h2 className="text-xl font-bold text-amber-900 mb-6 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                Garden Impact Analysis
              </h2>
              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-2xs mb-6 border border-amber-100/60">
                <p className="text-gray-800 text-sm leading-relaxed">{impact}</p>
              </div>

              <h3 className="font-bold text-amber-900 mb-3 text-sm">Deterministic Agricultural Rules</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-xs text-amber-900/90 leading-relaxed">
                  <span className="text-amber-500 font-bold mt-0.5">•</span>
                  <span>
                    <strong>Rain Suppression:</strong> If forecast precipitation &gt; 5mm, watering engine automatically postpones irrigation cycles.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-amber-900/90 leading-relaxed">
                  <span className="text-amber-500 font-bold mt-0.5">•</span>
                  <span>
                    <strong>Evaporation Multiplier:</strong> Ambient temperature above 28°C scales plant hydration by up to 1.35x.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-amber-900/90 leading-relaxed">
                  <span className="text-amber-500 font-bold mt-0.5">•</span>
                  <span>
                    <strong>Foliar Disease Protection:</strong> High humidity (&gt;75%) flags alerts to cease late-afternoon overhead watering.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-amber-200/50 text-[11px] text-amber-800/80">
              Live data powered by Open-Meteo AG API.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
