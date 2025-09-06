import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import NewLandingPage from './pages/NewLandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ZapBuilder from './pages/ZapBuilder';
import Integrations from './pages/Integrations';
import OAuthCallback from './pages/OAuthCallback';
import WorkflowBotDemo from './pages/WorkflowBotDemo';

gsap.registerPlugin(ScrollTrigger);

// Debug component to track URL changes
const DebugTracker: React.FC = () => {
  const location = useLocation();
  
  useEffect(() => {
    console.log('🧭 NAVIGATION DEBUG:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      timestamp: new Date().toISOString(),
      sessionStorage: Object.keys(sessionStorage).map(key => 
        `${key}: ${key.includes('token') || key.includes('auth') ? '[REDACTED]' : sessionStorage.getItem(key)}`
      ),
      localStorage: Object.keys(localStorage).filter(key => key.includes('supabase')).length + ' supabase keys'
    });
  }, [location]);
  
  return null;
};

function App() {
  useEffect(() => {
    // Initialize GSAP ScrollTrigger
    ScrollTrigger.refresh();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <DebugTracker />
          <div className="min-h-screen bg-gray-900 text-white font-['Plus_Jakarta_Sans',_sans-serif]">
            <Routes>
              <Route path="/" element={<div className="bg-white"><NewLandingPage /></div>} />
              <Route path="/old" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/builder" element={
                <ProtectedRoute>
                  <ZapBuilder />
                </ProtectedRoute>
              } />
              <Route path="/integrations" element={
                <ProtectedRoute>
                  <Integrations />
                </ProtectedRoute>
              } />
              <Route path="/oauth/callback/:service" element={<OAuthCallback />} />
              <Route path="/bot" element={
                <ProtectedRoute>
                  <WorkflowBotDemo />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;