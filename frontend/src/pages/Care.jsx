import { mockRecommendations } from '../data/mockRecommendations';
import { Sun, Droplets, Bug, Wind } from 'lucide-react';

const iconMap = {
  sun: Sun,
  droplets: Droplets,
  bug: Bug,
  wind: Wind
};

export default function Care() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in pb-24">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Plant Care Recommendations</h1>
        <p className="text-gray-600">Tailored advice to keep your urban garden healthy.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <FilterBadge label="All" active={true} />
        <FilterBadge label="Watering" />
        <FilterBadge label="Sunlight" />
        <FilterBadge label="Soil" />
        <FilterBadge label="Nutrition" />
        <FilterBadge label="Disease Prevention" />
        <FilterBadge label="General Care" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockRecommendations.map(rec => (
          <RecommendationCard key={rec.id} data={rec} />
        ))}
      </div>
    </div>
  );
}

function FilterBadge({ label, active }) {
  return (
    <button className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
      active 
        ? 'bg-gray-900 text-white' 
        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    }`}>
      {label}
    </button>
  );
}

function RecommendationCard({ data }) {
  const Icon = iconMap[data.icon] || Sun;
  
  const priorityColor = {
    'High': 'bg-red-100 text-red-700',
    'Medium': 'bg-amber-100 text-amber-700',
    'Low': 'bg-blue-100 text-blue-700'
  }[data.priority] || 'bg-gray-100 text-gray-700';

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 text-gray-500 font-medium">
          <Icon className="w-5 h-5 text-primary" />
          {data.category}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${priorityColor}`}>
          {data.priority}
        </span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{data.title}</h3>
      <p className="text-gray-600 leading-relaxed flex-1">{data.description}</p>
    </div>
  );
}
