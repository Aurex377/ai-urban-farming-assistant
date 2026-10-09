import { Droplets, Info } from 'lucide-react';

export default function Watering() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto fade-in pb-24">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Watering</h1>
        <p className="text-gray-600">Personalized watering recommendations based on AI insights.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              Plants needing water today
            </h2>
            <div className="space-y-4">
              <WaterCard name="Tomato" amount="500 ml" time="Today" image="https://images.pexels.com/photos/5330050/pexels-photo-5330050.jpeg?auto=compress&cs=tinysrgb&w=800" />
              <WaterCard name="Basil" amount="250 ml" time="Today" image="https://images.pexels.com/photos/10850731/pexels-photo-10850731.jpeg?auto=compress&cs=tinysrgb&w=800" />
              <WaterCard name="Mint" amount="300 ml" time="Tomorrow" image="https://images.pexels.com/photos/7750106/pexels-photo-7750106.jpeg?auto=compress&cs=tinysrgb&w=800" opacity="opacity-60" />
            </div>
          </section>

          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
             <h2 className="text-xl font-bold text-gray-900 mb-6">Weekly Overview</h2>
             <div className="overflow-x-auto pb-4">
               <div className="min-w-[500px] flex justify-between text-center gap-2">
                 <DayCol day="MON" icon="💧" active={true} />
                 <DayCol day="TUE" icon="-" />
                 <DayCol day="WED" icon="💧" active={true} />
                 <DayCol day="THU" icon="💧" active={true} />
                 <DayCol day="FRI" icon="-" />
                 <DayCol day="SAT" icon="💧" active={true} />
                 <DayCol day="SUN" icon="-" />
               </div>
             </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-blue-50 p-6 md:p-8 rounded-3xl border border-blue-100">
            <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Why this recommendation?
            </h2>
            <div className="space-y-4">
              <div className="bg-white/80 p-4 rounded-xl text-sm text-gray-700 shadow-sm backdrop-blur-sm">
                <p className="font-semibold text-gray-900 mb-1">Tomato</p>
                <p>High temperature + low humidity + no recent rainfall.</p>
              </div>
              <div className="bg-white/80 p-4 rounded-xl text-sm text-gray-700 shadow-sm backdrop-blur-sm">
                <p className="font-semibold text-gray-900 mb-1">Basil</p>
                <p>High sun exposure today requires extra hydration.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function WaterCard({ name, amount, time, image, opacity = "" }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow bg-white ${opacity}`}>
      <div className="flex items-center gap-4">
        <img src={image} alt={name} className="w-16 h-16 rounded-xl object-cover" />
        <div>
          <h3 className="font-bold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500">{amount} • {time}</p>
        </div>
      </div>
      <button className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors">
        Log Watering
      </button>
    </div>
  );
}

function DayCol({ day, icon, active }) {
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="text-xs font-bold text-gray-400">{day}</div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
        active ? 'bg-blue-100' : 'bg-gray-50'
      }`}>
        {icon}
      </div>
    </div>
  );
}
