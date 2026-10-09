import { mockWeather } from '../data/mockWeather';
import { CloudSun, CloudRain, Sun, Wind, Droplets, MapPin, AlertTriangle } from 'lucide-react';

export default function Weather() {
  const { current, forecast, impact } = mockWeather;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in pb-24">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Weather & Environment</h1>
        <p className="text-gray-600 flex items-center gap-1">
          <MapPin className="w-4 h-4" /> Local conditions affecting your garden
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-gradient-to-br from-blue-400 to-indigo-500 p-8 md:p-10 rounded-3xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20">
              <CloudSun className="w-64 h-64" />
            </div>
            
            <h2 className="text-xl font-medium text-white/80 mb-6">Today's Weather</h2>
            
            <div className="flex items-end gap-6 mb-10 relative z-10">
              <div className="text-7xl md:text-8xl font-bold">{current.temperature}°</div>
              <div className="pb-2">
                <div className="text-3xl font-semibold mb-1">{current.condition}</div>
                <div className="text-white/80">Feels like {current.temperature + 2}°C</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-6 relative z-10">
              <div className="flex flex-col items-center">
                <Droplets className="w-6 h-6 mb-2 text-blue-200" />
                <span className="text-sm text-white/80 mb-1">Humidity</span>
                <span className="font-bold text-lg">{current.humidity}%</span>
              </div>
              <div className="flex flex-col items-center">
                <CloudRain className="w-6 h-6 mb-2 text-blue-200" />
                <span className="text-sm text-white/80 mb-1">Rainfall</span>
                <span className="font-bold text-lg">{current.rainfall} mm</span>
              </div>
              <div className="flex flex-col items-center">
                <Wind className="w-6 h-6 mb-2 text-blue-200" />
                <span className="text-sm text-white/80 mb-1">Wind</span>
                <span className="font-bold text-lg">{current.wind} km/h</span>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">5-Day Forecast</h2>
            <div className="grid grid-cols-5 gap-2 md:gap-4">
              {forecast.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center p-3 rounded-2xl hover:bg-gray-50 transition-colors text-center">
                  <span className="text-sm font-bold text-gray-500 mb-3">{day.day}</span>
                  {day.condition === 'Sunny' ? <Sun className="w-8 h-8 text-amber-400 mb-3" /> : 
                   day.condition === 'Rain' ? <CloudRain className="w-8 h-8 text-blue-400 mb-3" /> : 
                   <CloudSun className="w-8 h-8 text-gray-400 mb-3" />}
                  <span className="font-bold text-gray-900">{day.temp}°</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div>
          <section className="bg-amber-50 p-6 md:p-8 rounded-3xl border border-amber-100 shadow-sm h-full">
            <h2 className="text-xl font-bold text-amber-900 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              Garden Impact
            </h2>
            <div className="bg-white/80 backdrop-blur p-6 rounded-2xl shadow-sm mb-6">
              <p className="text-gray-800 text-lg leading-relaxed">{impact}</p>
            </div>
            
            <h3 className="font-bold text-amber-900 mb-4">Recommended Actions</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-amber-800/80">
                <span className="text-amber-500 mt-0.5">•</span>
                Hold off on watering outdoor plants until Friday
              </li>
              <li className="flex items-start gap-2 text-amber-800/80">
                <span className="text-amber-500 mt-0.5">•</span>
                Move sensitive potted plants under cover
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
