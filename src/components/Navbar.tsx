import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { Zap, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const navRef = useRef<HTMLNavElement>(null);
  const location = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (navRef.current) {
      gsap.fromTo(navRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }
      );
    }
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav ref={navRef} className="bg-gray-800/80 backdrop-blur-md border-b border-gray-700 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            Autofy
          </span>
        </Link>

        <div className="flex items-center space-x-6">
          <Link
            to="/dashboard"
            className={`px-4 py-2 rounded-lg transition-all duration-300 ${isActive('/dashboard')
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
          >
            Dashboard
          </Link>
          <Link
            to="/integrations"
            className={`px-4 py-2 rounded-lg transition-all duration-300 ${isActive('/integrations')
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
          >
            Integrations
          </Link>

          <div className="flex items-center space-x-3 ml-6 pl-6 border-l border-gray-700">
            {user && (
              <div className="text-sm text-gray-300">
                {user.email}
              </div>
            )}
            <button className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-300">
              <Settings className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-300">
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-300 text-red-400"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;