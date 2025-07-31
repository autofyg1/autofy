import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Sidebar from '../components/Sidebar';
import { useIntegrations } from '../hooks/useIntegrations';
import { 
  Search, 
  Filter,
  Star,
  ExternalLink,
  Mail, 
  MessageSquare, 
  Calendar,
  Database,
  Bell,
  FileText,
  Users,
  Settings,
  Github,
  Twitter,
  Slack,
  Music,
  Camera,
  ShoppingCart,
  CreditCard,
  Cloud
} from 'lucide-react';

interface IntegrationApp {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  category: string;
  popularity: number;
  totalAutomations: number;
}

const Integrations: React.FC = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const { integrations, connectIntegration, disconnectIntegration, isConnected, loading: integrationsLoading, initiateOAuth } = useIntegrations();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('popularity');
  const [connectingService, setConnectingService] = useState<string | null>(null);

  const availableApps: IntegrationApp[] = [
    {
      id: '1',
      name: 'Gmail',
      description: 'Send and receive emails, manage your inbox automatically',
      icon: Mail,
      color: 'bg-red-500',
      category: 'Email',
      popularity: 98,
      totalAutomations: 234
    },
    {
      id: '2',
      name: 'Slack',
      description: 'Send messages, create channels, manage your team communication',
      icon: MessageSquare,
      color: 'bg-purple-500',
      category: 'Communication',
      popularity: 95,
      totalAutomations: 187
    },
    {
      id: '3',
      name: 'Google Calendar',
      description: 'Create events, manage schedules, set reminders automatically',
      icon: Calendar,
      color: 'bg-blue-500',
      category: 'Productivity',
      popularity: 89,
      totalAutomations: 156
    },
    {
      id: '4',
      name: 'GitHub',
      description: 'Manage repositories, issues, pull requests, and deployments',
      icon: Github,
      color: 'bg-gray-600',
      category: 'Developer Tools',
      popularity: 92,
      totalAutomations: 143
    },
    {
      id: '5',
      name: 'Twitter',
      description: 'Post tweets, monitor mentions, track hashtags and trends',
      icon: Twitter,
      color: 'bg-blue-400',
      category: 'Social Media',
      popularity: 85,
      totalAutomations: 98
    },
    {
      id: '6',
      name: 'Notion',
      description: 'Create pages, update databases, manage your workspace',
      icon: FileText,
      color: 'bg-gray-800',
      category: 'Productivity',
      popularity: 88,
      totalAutomations: 112
    },
    {
      id: '7',
      name: 'Spotify',
      description: 'Control playback, manage playlists, discover new music',
      icon: Music,
      color: 'bg-green-500',
      category: 'Entertainment',
      popularity: 76,
      totalAutomations: 67
    },
    {
      id: '8',
      name: 'Shopify',
      description: 'Manage orders, inventory, customers, and store analytics',
      icon: ShoppingCart,
      color: 'bg-green-600',
      category: 'E-commerce',
      popularity: 81,
      totalAutomations: 89
    },
    {
      id: '9',
      name: 'Stripe',
      description: 'Handle payments, subscriptions, and financial transactions',
      icon: CreditCard,
      color: 'bg-indigo-600',
      category: 'Finance',
      popularity: 84,
      totalAutomations: 76
    },
    {
      id: '10',
      name: 'Google Drive',
      description: 'Manage files, folders, sharing permissions automatically',
      icon: Cloud,
      color: 'bg-yellow-500',
      category: 'File Storage',
      popularity: 79,
      totalAutomations: 54
    },
    {
      id: '11',
      name: 'Instagram',
      description: 'Post photos, stories, manage your social media presence',
      icon: Camera,
      color: 'bg-pink-500',
      category: 'Social Media',
      popularity: 73,
      totalAutomations: 43
    },
    {
      id: '12',
      name: 'Discord',
      description: 'Send messages, manage servers, moderate communities',
      icon: Users,
      color: 'bg-indigo-500',
      category: 'Communication',
      popularity: 70,
      totalAutomations: 38
    }
  ];

  const categories = ['All', 'Email', 'Communication', 'Productivity', 'Developer Tools', 'Social Media', 'Entertainment', 'E-commerce', 'Finance', 'File Storage'];

  useEffect(() => {
    if (gridRef.current) {
      gsap.fromTo('.integration-card',
        { y: 50, opacity: 0, scale: 0.9 },
        { 
          y: 0, 
          opacity: 1, 
          scale: 1,
          duration: 0.6,
          stagger: 0.05,
          ease: "power2.out"
        }
      );
    }
  }, [selectedCategory]);

  const filteredApps = availableApps
    .filter(app => 
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedCategory === 'All' || app.category === selectedCategory)
    )
    .sort((a, b) => {
      if (sortBy === 'popularity') return b.popularity - a.popularity;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'automations') return b.totalAutomations - a.totalAutomations;
      return 0;
    });

  const handleConnectIntegration = async (app: IntegrationApp) => {
    // Check if this service supports OAuth
    const oauthServices = ['gmail', 'notion'];
    const serviceName = app.name.toLowerCase();
    
    if (oauthServices.includes(serviceName)) {
      // Initiate OAuth flow
      const { error } = initiateOAuth(serviceName);
      if (error) {
        console.error('Failed to initiate OAuth:', error);
        // You could show a toast notification here
      }
    } else {
      // Fallback to mock credentials for other services
      setConnectingService(app.name);
      
      const mockCredentials = {
        access_token: `mock_token_${Date.now()}`,
        refresh_token: `mock_refresh_${Date.now()}`,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        connected_at: new Date().toISOString(),
      };

      const { error } = await connectIntegration(app.name, mockCredentials);
      
      if (error) {
        console.error('Failed to connect integration:', error);
      }
      
      setConnectingService(null);
    }
  };

  const handleDisconnectIntegration = async (app: IntegrationApp) => {
    const { error } = await disconnectIntegration(app.name);
    
    if (error) {
      console.error('Failed to disconnect integration:', error);
      // You could show a toast notification here
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar />
      
      <div className="flex-1">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Integrations</h1>
              <p className="text-gray-400 mt-1">Connect your favorite apps and services</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-gray-700 px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-300">Connected: </span>
                <span className="text-green-400 font-semibold">
                  {integrations.length}
                </span>
              </div>
              <div className="bg-gray-700 px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-300">Available: </span>
                <span className="text-blue-400 font-semibold">
                  {availableApps.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 border-b border-gray-700 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search integrations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none w-80"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="popularity">Most Popular</option>
                <option value="name">Name A-Z</option>
                <option value="automations">Most Used</option>
              </select>
            </div>
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="p-8">
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredApps.map((app) => {
              const Icon = app.icon;
              const connected = isConnected(app.name);
              const connecting = connectingService === app.name;
              
              return (
                <div
                  key={app.id}
                  className="integration-card bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-blue-500/50 hover:scale-105 transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 ${app.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {connected && (
                      <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                        Connected
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    {app.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {app.description}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-300">{app.popularity}%</span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {app.totalAutomations} automations
                    </span>
                  </div>

                  <button
                    onClick={() => connected ? handleDisconnectIntegration(app) : handleConnectIntegration(app)}
                    disabled={connecting || integrationsLoading}
                    className={`w-full py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      connected
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : connecting
                          ? 'bg-gray-600 text-white'
                          : 'bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:scale-105'
                    }`}
                  >
                    {connecting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : connected ? (
                      <>
                        <span>Disconnect</span>
                      </>
                    ) : (
                      <>
                        <span>Connect</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {filteredApps.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No integrations found</h3>
              <p className="text-gray-400">Try adjusting your search terms or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Integrations;