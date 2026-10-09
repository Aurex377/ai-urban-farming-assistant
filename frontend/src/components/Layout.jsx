import { Outlet, NavLink } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Home, Leaf, Activity, Droplets, MoreHorizontal } from 'lucide-react';

export default function Layout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 h-full overflow-y-auto relative pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50">
        <MobileNavItem to="/dashboard" icon={Home} label="Home" />
        <MobileNavItem to="/plants" icon={Leaf} label="Plants" />
        <MobileNavItem to="/diagnosis" icon={Activity} label="Health" />
        <MobileNavItem to="/watering" icon={Droplets} label="Water" />
        <MobileNavItem to="/care" icon={MoreHorizontal} label="More" />
      </nav>
    </div>
  );
}

function MobileNavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 ${
          isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
        }`
      }
    >
      <Icon className="w-6 h-6" />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}
