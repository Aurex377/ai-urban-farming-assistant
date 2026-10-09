import { Link } from 'react-router-dom';
import { mockPlants } from '../data/mockPlants';
import { mockActivities } from '../data/mockActivities';
import { Droplets, Heart, Leaf, AlertCircle, ArrowRight, Activity } from 'lucide-react';
import BackendStatus from '../components/BackendStatus';

export default function Dashboard() {
  const healthyCount = mockPlants.filter(p => p.health === 'Healthy').length;
  const attentionCount = mockPlants.filter(p => p.health !== 'Healthy').length;
  const wateringCount = mockPlants.filter(p => p.nextWatering === 'Today').length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Good morning 👋</h1>
        <p className="text-gray-600 text-lg">Let's take care of your garden today.</p>
      </header>

      {/* Backend & Database Connection Test Status */}
      <BackendStatus />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
        <StatCard icon={Leaf} label="Total Plants" value={mockPlants.length} color="bg-green-100 text-green-700" />
        <StatCard icon={Heart} label="Healthy" value={healthyCount} color="bg-emerald-100 text-emerald-700" />
        <StatCard icon={AlertCircle} label="Needs Attention" value={attentionCount} color="bg-amber-100 text-amber-700" />
        <StatCard icon={Droplets} label="Need Water" value={wateringCount} color="bg-blue-100 text-blue-700" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Plants</h2>
              <Link to="/plants" className="text-primary font-medium flex items-center gap-1 hover:underline">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {mockPlants.slice(0, 4).map(plant => (
                <div key={plant.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all">
                  <div className="h-40 overflow-hidden">
                    <img src={plant.image} alt={plant.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{plant.name}</h3>
                        <p className="text-sm text-gray-500 italic">{plant.species}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        plant.health === 'Healthy' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {plant.health}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                      <Droplets className="w-4 h-4 text-blue-500" />
                      Water: <span className="font-medium text-gray-900">{plant.nextWatering}</span>
                    </div>
                    
                    <Link 
                      to={`/plants/${plant.id}`}
                      className="mt-5 block w-full text-center py-2 bg-gray-50 text-primary font-medium rounded-xl hover:bg-primary hover:text-white transition-colors"
                    >
                      View Plant →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Today's Tasks
            </h2>
            <div className="space-y-4">
              <TaskItem icon="💧" text="Water Tomato" />
              <TaskItem icon="🌱" text="Check Mint leaves" />
              <TaskItem icon="🔍" text="Review Rose diagnosis" />
              <TaskItem icon="☀️" text="Move Basil to sunlight" />
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Activity
            </h2>
            <div className="space-y-6">
              {mockActivities.slice(0, 3).map(activity => (
                <div key={activity.id} className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary"></div>
                  <div>
                    <p className="text-gray-900 font-medium">{activity.title}</p>
                    <p className="text-sm text-gray-500">{activity.plant} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/activity" className="block mt-6 text-center text-sm text-primary font-medium hover:underline">
              View all activity
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-500 font-medium">{label}</div>
    </div>
  );
}

function TaskItem({ icon, text }) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-100 transition-colors">
      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary accent-primary" />
      <span className="text-lg">{icon}</span>
      <span className="text-gray-700 font-medium">{text}</span>
    </label>
  );
}
