import React, { useState, useEffect } from 'react';
import WorkflowBotChat from '../components/WorkflowBotChat';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Zap, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DemoStats {
  totalSessions: number;
  totalMessages: number;
  totalZapsCreated: number;
  activeUsers: number;
}

const WorkflowBotDemo: React.FC = () => {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<DemoStats>({
    totalSessions: 0,
    totalMessages: 0,
    totalZapsCreated: 0,
    activeUsers: 0
  });
  const [recentZaps, setRecentZaps] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Load demo statistics (you can implement actual queries)
      setStats({
        totalSessions: 42,
        totalMessages: 156,
        totalZapsCreated: 18,
        activeUsers: 7
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleZapCreated = (zap: any) => {
    console.log('New zap created:', zap);
    setRecentZaps(prev => [zap, ...prev.slice(0, 4)]); // Keep last 5
    
    // Update stats
    setStats(prev => ({
      ...prev,
      totalZapsCreated: prev.totalZapsCreated + 1
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">AI Workflow Bot</h1>
                <p className="text-sm text-gray-400">Create automations through conversation</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-300">
                Welcome, {user?.email}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Chat Interface - Full Width */}
          <WorkflowBotChat
            userId={user?.id || ''}
            onZapCreated={handleZapCreated}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkflowBotDemo;
