import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { Zap, Home, Plus, Grid3X3, Settings, BarChart3, Bot } from 'lucide-react';

const Sidebar: React.FC = () => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(sidebarRef.current,
        { x: -300, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: "power2.out" }
      );
    }
  }, []);

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Plus, label: 'Create Zap', path: '/builder' },
    { icon: Bot, label: 'AI Bot', path: '/bot' },
    { icon: Grid3X3, label: 'Integrations', path: '/integrations' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div ref={sidebarRef} className="w-64 bg-gray-800 border-r border-gray-700 min-h-screen p-6">
      <div className="mb-8">
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            AutoFy
          </span>
        </Link>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-12 p-4 bg-gradient-to-r from-blue-600/20 to-violet-600/20 rounded-lg border border-blue-500/30">
        <h3 className="font-semibold text-sm mb-2">Upgrade to Pro</h3>
        <p className="text-gray-400 text-xs mb-3">
          Unlock unlimited Zaps and premium integrations
        </p>
        <button className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white py-2 rounded-lg text-sm font-medium hover:scale-105 transition-transform duration-300">
          Upgrade Now
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
