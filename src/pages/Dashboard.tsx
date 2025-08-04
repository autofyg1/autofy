import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import Sidebar from '../components/Sidebar';
import { useZaps } from '../hooks/useZaps';
import { 
  Plus, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Mail, 
  MessageSquare, 
  Calendar,
  Database,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';

// Icon mapping for services
const serviceIcons: Record<string, React.ElementType> = {
  gmail: Mail,
  slack: MessageSquare,
  'google calendar': Calendar,
  notion: FileText,
  database: Database,
  schedule: Clock,
  notifications: AlertCircle
};

const Dashboard: React.FC = () => {
  const cardsRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const [searchParams] = useSearchParams();
  const { zaps, loading, toggleZapStatus, deleteZap: removeZap } = useZaps();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    // Check if we just created a zap
    if (searchParams.get('created') === 'true') {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
    
    // Animate Zap cards
    if (cardsRef.current) {
      gsap.fromTo('.zap-card',
        { y: 50, opacity: 0, scale: 0.9 },
        { 
          y: 0, 
          opacity: 1, 
          scale: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out"
        }
      );
    }

    // Animate FAB
    if (fabRef.current) {
      gsap.fromTo(fabRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)", delay: 0.5 }
      );

      // Pulse animation
      gsap.to(fabRef.current, {
        scale: 1.1,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut"
      });
    }
  }, [searchParams]);

  const handleToggleZap = (id: string) => {
    toggleZapStatus(id);
  };

  const handleDeleteZap = (id: string) => {
    if (confirm('Are you sure you want to delete this zap?')) {
      removeZap(id);
    }
  };

  const getServiceIcon = (serviceName: string) => {
    return serviceIcons[serviceName.toLowerCase()] || AlertCircle;
  };

  const formatLastRun = (lastRunAt?: string) => {
    if (!lastRunAt) return 'Never';
    
    const date = new Date(lastRunAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar />
      
      <div className="flex-1">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
          {/* Success Message */}
          {showSuccessMessage && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-green-400">Zap created successfully!</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">My Zaps</h1>
              <p className="text-gray-400 mt-1">Manage your automation workflows</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-gray-700 px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-300">Active: </span>
                <span className="text-green-400 font-semibold">
                  {zaps.filter(z => z.is_active).length}
                </span>
              </div>
              <div className="bg-gray-700 px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-300">Total Runs: </span>
                <span className="text-blue-400 font-semibold">
                  {zaps.reduce((sum, z) => sum + z.total_runs, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your zaps...</p>
            </div>
          ) : (
          <div ref={cardsRef} className="grid gap-6">
            {zaps.map((zap) => {
              const triggerStep = zap.steps?.find(s => s.step_type === 'trigger');
              const actionStep = zap.steps?.find(s => s.step_type === 'action');
              
              const TriggerIcon = triggerStep ? getServiceIcon(triggerStep.service_name) : AlertCircle;
              const ActionIcon = actionStep ? getServiceIcon(actionStep.service_name) : AlertCircle;
              
              return (
                <div 
                  key={zap.id}
                  className="zap-card bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-blue-500/50 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {zap.name}
                        </h3>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          zap.is_active 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {zap.is_active ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          <span>{zap.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-8 mb-4">
                        {/* Trigger */}
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <TriggerIcon className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white capitalize">
                              {triggerStep?.service_name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-400">
                              {triggerStep?.event_type?.replace(/_/g, ' ') || 'Unknown event'}
                            </p>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex-1 border-t border-dashed border-gray-600 relative">
                          <div className="absolute -top-2 right-0 w-4 h-4 border-t border-r border-gray-600 transform rotate-45"></div>
                        </div>

                        {/* Action */}
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <ActionIcon className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white capitalize">
                              {actionStep?.service_name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-400">
                              {actionStep?.event_type?.replace(/_/g, ' ') || 'Unknown event'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-sm">
                        <span className="text-gray-400">
                          Last run: <span className="text-white">{formatLastRun(zap.last_run_at)}</span>
                        </span>
                        <span className="text-gray-400">
                          Total runs: <span className="text-white">{zap.total_runs}</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-6">
                      <button
                        onClick={() => handleToggleZap(zap.id)}
                        className={`p-2 rounded-lg transition-all duration-300 ${
                          zap.is_active
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                        }`}
                        title={zap.is_active ? 'Pause Zap' : 'Start Zap'}
                      >
                        {zap.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      
                      <Link
                        to={`/builder?edit=${zap.id}`}
                        className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all duration-300"
                        title="Edit Zap"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      
                      <button
                        onClick={() => handleDeleteZap(zap.id)}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all duration-300"
                        title="Delete Zap"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {zaps.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Zaps yet</h3>
              <p className="text-gray-400 mb-6">Create your first automation to get started</p>
              <Link
                to="/builder"
                className="bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-3 rounded-lg font-medium hover:scale-105 transition-transform duration-300 inline-block"
              >
                Create Your First Zap
              </Link>
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <Link
          ref={fabRef}
          to="/builder"
          className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300 z-50"
          title="Create New Zap"
        >
          <Plus className="w-8 h-8 text-white" />
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;