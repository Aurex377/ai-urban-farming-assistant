import { NavLink } from 'react-router-dom';
import { Home, Leaf, Activity, Droplets, Heart, CloudSun, Clock, Settings, Sparkles } from 'lucide-react';

import NotificationCenter from './NotificationCenter';

export default function Sidebar() {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: '👑 Best Plant for Home', path: '/recommendations', icon: Sparkles },
    { name: 'My Plants', path: '/plants', icon: Leaf },
    { name: 'Plant Health', path: '/diagnosis', icon: Activity },
    { name: 'Watering', path: '/watering', icon: Droplets },
    { name: 'Care', path: '/care', icon: Heart },
    { name: 'Weather', path: '/weather', icon: CloudSun },
    { name: 'Activity', path: '/activity', icon: Clock },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full hidden md:flex">
      <div className="p-6 flex items-center justify-between border-b border-gray-50">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Leaf className="w-6 h-6 text-primary" />
          PlantCare AI
        </h1>
        <NotificationCenter />
      </div>
      
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary-light/10 text-primary font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 w-full rounded-xl transition-colors">
          <Settings className="w-5 h-5" />
          Settings
        </button>
        <div className="mt-4 flex items-center gap-3 px-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            JD
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-900">John Doe</p>
            <p className="text-gray-500 text-xs">Urban Gardener</p>
          </div>
        </div>
      </div>
    </div>
  );
}
