import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Sidebar from '../components/Sidebar';
import { 
  Plus, 
  Play, 
  Save, 
  ArrowRight,
  Mail, 
  MessageSquare, 
  Calendar,
  Database,
  Bell,
  FileText,
  Users,
  Settings
} from 'lucide-react';

interface Step {
  id: string;
  type: 'trigger' | 'action';
  app?: string;
  event?: string;
  icon?: React.ElementType;
  isConfigured: boolean;
}

const ZapBuilder: React.FC = () => {
  const builderRef = useRef<HTMLDivElement>(null);
  const [steps, setSteps] = useState<Step[]>([
    { id: '1', type: 'trigger', isConfigured: false },
    { id: '2', type: 'action', isConfigured: false }
  ]);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showApps, setShowApps] = useState(false);

  const apps = [
    { name: 'Gmail', icon: Mail, color: 'bg-red-500' },
    { name: 'Slack', icon: MessageSquare, color: 'bg-purple-500' },
    { name: 'Google Calendar', icon: Calendar, color: 'bg-blue-500' },
    { name: 'Database', icon: Database, color: 'bg-green-500' },
    { name: 'Notifications', icon: Bell, color: 'bg-yellow-500' },
    { name: 'Google Docs', icon: FileText, color: 'bg-blue-600' },
    { name: 'Teams', icon: Users, color: 'bg-indigo-500' },
    { name: 'Webhooks', icon: Settings, color: 'bg-gray-500' }
  ];

  useEffect(() => {
    if (builderRef.current) {
      gsap.fromTo('.builder-step',
        { x: -50, opacity: 0 },
        { 
          x: 0, 
          opacity: 1,
          duration: 0.6,
          stagger: 0.2,
          ease: "power2.out"
        }
      );

      gsap.fromTo('.app-card',
        { y: 30, opacity: 0 },
        { 
          y: 0, 
          opacity: 1,
          duration: 0.4,
          stagger: 0.1,
          ease: "power2.out",
          delay: 0.3
        }
      );
    }
  }, []);

  const configureStep = (stepId: string, app: string, icon: React.ElementType) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, app, icon, isConfigured: true, event: `New ${app} Event` }
        : step
    ));
    setSelectedStep(null);
    setShowApps(false);
  };

  const addStep = () => {
    const newStep: Step = {
      id: Date.now().toString(),
      type: 'action',
      isConfigured: false
    };
    setSteps(prev => [...prev, newStep]);
  };

  const selectStep = (stepId: string) => {
    setSelectedStep(stepId);
    setShowApps(true);
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar />
      
      <div className="flex-1">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Zap Builder</h1>
              <p className="text-gray-400 mt-1">Create your automation workflow</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-300 flex items-center space-x-2">
                <Play className="w-4 h-4" />
                <span>Test Zap</span>
              </button>
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-300 flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>Save Zap</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1">
          {/* Apps Sidebar */}
          <div className="w-80 bg-gray-800 border-r border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Available Apps</h2>
            <div className="grid grid-cols-2 gap-3">
              {apps.map((app, index) => {
                const Icon = app.icon;
                return (
                  <div
                    key={app.name}
                    className="app-card p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-blue-500/50 cursor-pointer transition-all duration-300 group"
                    onClick={() => selectedStep && configureStep(selectedStep, app.name, app.icon)}
                  >
                    <div className={`w-10 h-10 ${app.color} rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-medium text-white">{app.name}</p>
                  </div>
                );
              })}
            </div>

            {selectedStep && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-400 mb-2">
                  {steps.find(s => s.id === selectedStep)?.type === 'trigger' 
                    ? 'Select a trigger app' 
                    : 'Select an action app'
                  }
                </p>
                <p className="text-xs text-gray-400">
                  Click on an app above to configure this step
                </p>
              </div>
            )}
          </div>

          {/* Builder Canvas */}
          <div ref={builderRef} className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-semibold text-white mb-8">Workflow Steps</h2>
              
              <div className="space-y-6">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isLast = index === steps.length - 1;
                  
                  return (
                    <div key={step.id} className="builder-step">
                      <div 
                        className={`bg-gray-800 rounded-xl border-2 p-6 cursor-pointer transition-all duration-300 ${
                          selectedStep === step.id 
                            ? 'border-blue-500 bg-blue-500/5' 
                            : step.isConfigured 
                              ? 'border-green-500/50 bg-green-500/5' 
                              : 'border-gray-700 hover:border-gray-600'
                        }`}
                        onClick={() => selectStep(step.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              step.type === 'trigger' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-green-500/20 text-green-400'
                            }`}>
                              {Icon ? <Icon className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">
                                {step.type === 'trigger' ? 'Trigger' : 'Action'} {index + 1}
                              </h3>
                              {step.isConfigured ? (
                                <div>
                                  <p className="text-gray-300">{step.app}</p>
                                  <p className="text-sm text-gray-400">{step.event}</p>
                                </div>
                              ) : (
                                <p className="text-gray-400">
                                  Choose a {step.type === 'trigger' ? 'trigger' : 'action'} app
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {step.isConfigured && (
                            <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                              Configured
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {!isLast && (
                        <div className="flex justify-center py-4">
                          <div className="flex items-center space-x-2 text-gray-400">
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Add Step Button */}
                <div className="flex justify-center pt-6">
                  <button
                    onClick={addStep}
                    className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-300"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Action</span>
                  </button>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 mt-12 pt-8 border-t border-gray-700">
                <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-lg font-medium hover:scale-105 transition-transform duration-300">
                  Save & Activate Zap
                </button>
                <button className="px-8 py-3 border border-gray-600 text-gray-300 rounded-lg font-medium hover:border-gray-500 transition-colors duration-300">
                  Save as Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZapBuilder;