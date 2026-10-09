import { mockActivities } from '../data/mockActivities';
import { Clock, Activity as ActivityIcon, Droplets, Plus } from 'lucide-react';

const iconMap = {
  diagnosis: <ActivityIcon className="w-5 h-5 text-purple-500" />,
  watering: <Droplets className="w-5 h-5 text-blue-500" />,
  system: <Plus className="w-5 h-5 text-green-500" />
};

const bgMap = {
  diagnosis: 'bg-purple-100',
  watering: 'bg-blue-100',
  system: 'bg-green-100'
};

export default function Activity() {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto fade-in pb-24">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Garden Activity</h1>
        <p className="text-gray-600">History of care and AI diagnosis for all your plants.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 relative">
        {/* Vertical Timeline Line */}
        <div className="absolute left-10 md:left-14 top-10 bottom-10 w-0.5 bg-gray-100"></div>
        
        <div className="space-y-12">
          {mockActivities.reduce((acc, curr, i, arr) => {
            const showDate = i === 0 || arr[i - 1].date !== curr.date;
            
            acc.push(
              <div key={`group-${curr.id}`} className="relative z-10">
                {showDate && (
                  <div className="mb-6 flex items-center gap-4">
                     <div className="w-8 md:w-10 flex justify-center bg-white py-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                     </div>
                     <h3 className="font-bold text-gray-900 bg-gray-100 px-4 py-1.5 rounded-full text-sm">
                        {curr.date}
                     </h3>
                  </div>
                )}
                
                <div className="flex gap-6 md:gap-8 group">
                  <div className="w-8 md:w-10 flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 border-white ring-4 ring-transparent group-hover:ring-gray-50 transition-all ${bgMap[curr.type]}`}>
                      {iconMap[curr.type]}
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <h4 className="font-bold text-gray-900 text-lg">{curr.title}</h4>
                      <span className="text-sm font-medium text-gray-500 whitespace-nowrap">{curr.time}</span>
                    </div>
                    <p className="text-gray-600">
                      Plant: <span className="font-semibold text-gray-900">{curr.plant}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
            
            return acc;
          }, [])}
        </div>
      </div>
    </div>
  );
}
