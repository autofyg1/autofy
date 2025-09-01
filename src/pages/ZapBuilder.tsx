import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import Sidebar from '../components/Sidebar';
import ZapStepConfig from '../components/ZapStepConfig';
import TestModelDropdown from '../components/TestModelDropdown';
import { useZaps } from '../hooks/useZaps';
import { useIntegrations } from '../hooks/useIntegrations';
import { getServiceConfig } from '../lib/zaps';
import { 
  Plus, 
  Play, 
  Save, 
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
  Mail, 
  MessageSquare, 
  Calendar,
  Database,
  Bell,
  FileText,
  Users,
  Settings,
  Brain,
  Send
} from 'lucide-react';

interface Step {
  id: string;
  type: 'trigger' | 'action';
  app?: string;
  event?: string;
  icon?: React.ElementType;
  isConfigured: boolean;
  configuration: Record<string, any>;
}

const ZapBuilder: React.FC = () => {
  const builderRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createZap, updateZap, getZap } = useZaps();
  const { integrations, isConnected } = useIntegrations();
  
  // Edit mode state
  const editZapId = searchParams.get('edit');
  const isEditMode = !!editZapId;
  const [loadingZap, setLoadingZap] = useState(isEditMode);
  
  const [steps, setSteps] = useState<Step[]>([
    { id: '1', type: 'trigger', isConfigured: false, configuration: {} },
    { id: '2', type: 'action', isConfigured: false, configuration: {} }
  ]);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [zapName, setZapName] = useState('');
  const [zapDescription, setZapDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apps = [
    { name: 'Gmail', icon: Mail, color: 'bg-red-500' },
    { name: 'AI Processing', icon: Brain, color: 'bg-purple-600' },
    { name: 'Notion', icon: Database, color: 'bg-green-500' },
    { name: 'Telegram', icon: Send, color: 'bg-blue-400' },
    { name: 'Slack', icon: MessageSquare, color: 'bg-purple-500' },
    { name: 'Google Calendar', icon: Calendar, color: 'bg-blue-500' },
    { name: 'Notifications', icon: Bell, color: 'bg-yellow-500' },
    { name: 'Google Docs', icon: FileText, color: 'bg-blue-600' },
    { name: 'Teams', icon: Users, color: 'bg-indigo-500' },
    { name: 'Webhooks', icon: Settings, color: 'bg-gray-500' }
  ];

  // Function to convert service name back to app name and get icon
  const getAppFromServiceName = (serviceName: string) => {
    const mappings: Record<string, string> = {
      'gmail': 'Gmail',
      'openrouter': 'AI Processing',
      'notion': 'Notion',
      'telegram': 'Telegram',
      'slack': 'Slack',
      'google calendar': 'Google Calendar',
      'googlecalendar': 'Google Calendar',
      'notifications': 'Notifications',
      'google docs': 'Google Docs',
      'googledocs': 'Google Docs',
      'teams': 'Teams',
      'webhooks': 'Webhooks'
    };
    
    const appName = mappings[serviceName.toLowerCase()] || serviceName;
    const app = apps.find(a => a.name === appName);
    return {
      name: appName,
      icon: app?.icon || Settings
    };
  };

  // Reset loading state when editZapId changes
  useEffect(() => {
    hasLoadedRef.current = false;
  }, [editZapId]);

  // Load existing zap data for edit mode
  useEffect(() => {
    const loadZapForEdit = async () => {
      if (!isEditMode || !editZapId || hasLoadedRef.current) {
        setLoadingZap(false);
        return;
      }
      
      hasLoadedRef.current = true;

      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.error('Zap loading timed out');
        setError('Loading timed out. The workflow might not exist or there may be a connection issue.');
        setLoadingZap(false);
      }, 10000); // 10 second timeout

      try {
        console.log('Loading zap for edit:', editZapId);
        setLoadingZap(true);
        setError(null); // Clear any previous errors
        
        const { data, error } = await getZap(editZapId);
        console.log('getZap result:', { data, error });
        
        // Clear timeout since we got a response
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('Error loading zap:', error);
          setError(`Failed to load workflow: ${error}`);
          return;
        }

        if (data) {
          console.log('Loading zap data:', data);
          // Populate form fields
          setZapName(data.name || '');
          setZapDescription(data.description || '');
          
          // Convert zap steps to builder steps
          if (data.steps && data.steps.length > 0) {
            console.log('Processing steps:', data.steps);
            const sortedSteps = data.steps.sort((a, b) => a.step_order - b.step_order);
            const builderSteps: Step[] = sortedSteps.map((zapStep, index) => {
              const appInfo = getAppFromServiceName(zapStep.service_name);
              console.log('Processing step:', zapStep.service_name, '-> app:', appInfo.name);
              return {
                id: zapStep.id,
                type: zapStep.step_type,
                app: appInfo.name,
                event: zapStep.event_type,
                icon: appInfo.icon,
                isConfigured: true,
                configuration: zapStep.configuration
              };
            });
            setSteps(builderSteps);
            console.log('Final builder steps:', builderSteps);
          } else {
            console.log('No steps found in zap data');
            // Keep default steps if no steps in the zap
          }
        } else {
          console.log('No zap data returned');
          setError('Workflow not found');
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('Exception loading zap:', err);
        setError(err instanceof Error ? err.message : 'Failed to load zap for editing');
      } finally {
        setLoadingZap(false);
        console.log('Finished loading zap, loadingZap set to false');
      }
    };

    loadZapForEdit();
  }, [isEditMode, editZapId, getZap]);

  useEffect(() => {
    // Only run animations after content is loaded and not in loading state
    if (builderRef.current && !loadingZap) {
      // Use timeout to ensure DOM elements exist
      const timer = setTimeout(() => {
        const builderSteps = document.querySelectorAll('.builder-step');
        const appCards = document.querySelectorAll('.app-card');
        
        if (builderSteps.length > 0) {
          gsap.fromTo(builderSteps,
            { x: -50, opacity: 0 },
            { 
              x: 0, 
              opacity: 1,
              duration: 0.6,
              stagger: 0.2,
              ease: "power2.out"
            }
          );
        }

        if (appCards.length > 0) {
          gsap.fromTo(appCards,
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
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loadingZap, steps]); // Re-run when loading state or steps change

  const configureStep = (stepId: string, app: string, icon: React.ElementType) => {
    let serviceName = app.toLowerCase().replace(/\s+/g, '');
    
    // Map AI Processing to openrouter service name
    if (serviceName === 'aiprocessing') {
      serviceName = 'openrouter';
    }
    
    // AI Processing (openrouter) is a built-in service and doesn't require connection
    const builtInServices = ['openrouter'];
    
    // Check if user has connected this service (skip for built-in services)
    if (!builtInServices.includes(serviceName) && !isConnected(serviceName)) {
      setError(`Please connect ${app} first in the Integrations page`);
      return;
    }
    
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, app, icon, isConfigured: false, event: '', configuration: {} }
        : step
    ));
    setSelectedStep(null);
    setError(null);
  };

  const addStep = () => {
    const newStep: Step = {
      id: Date.now().toString(),
      type: 'action',
      isConfigured: false,
      configuration: {}
    };
    setSteps(prev => [...prev, newStep]);
  };

  const selectStep = (stepId: string) => {
    setSelectedStep(stepId);
  };

  const updateStepConfig = (stepId: string, configuration: Record<string, any>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, configuration, isConfigured: isStepConfigured(step, configuration) }
        : step
    ));
  };

  const updateStepEvent = (stepId: string, eventType: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, event: eventType, configuration: {}, isConfigured: false }
        : step
    ));
  };

  const isStepConfigured = (step: Step, config?: Record<string, any>) => {
    if (!step.app || !step.event) return false;
    
    let serviceName = step.app.toLowerCase().replace(/\s+/g, '');
    
    // Map AI Processing to openrouter service name
    if (serviceName === 'aiprocessing') {
      serviceName = 'openrouter';
    }
    
    const serviceConfig = getServiceConfig(serviceName);
    if (!serviceConfig) return false;

    const events = step.type === 'trigger' ? serviceConfig.triggers : serviceConfig.actions;
    const eventConfig = events.find(e => e.id === step.event);
    if (!eventConfig) return false;

    const configuration = config || step.configuration;
    
    // Check if all required fields are filled
    return eventConfig.fields.every(field => {
      if (!field.required) return true;
      const value = configuration[field.key];
      return value && value.toString().trim() !== '';
    });
  };

  const canSaveZap = () => {
    return zapName.trim() !== '' && 
           steps.length >= 2 && 
           steps.every(step => step.isConfigured);
  };

  const handleSaveZap = async () => {
    if (!canSaveZap()) {
      setError('Please complete all steps and provide a zap name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const zapConfig = {
        name: zapName,
        description: zapDescription,
        steps: steps.map(step => {
          let serviceName = step.app!.toLowerCase().replace(/\s+/g, '');
          
          // Map AI Processing to openrouter service name
          if (serviceName === 'aiprocessing') {
            serviceName = 'openrouter';
          }
          
          return {
            step_type: step.type,
            service_name: serviceName,
            event_type: step.event!,
            configuration: step.configuration
          };
        })
      };

      let result;
      if (isEditMode && editZapId) {
        result = await updateZap(editZapId, zapConfig);
      } else {
        result = await createZap(zapConfig);
      }
      
      const { data, error } = result;
      
      if (error) {
        setError(error);
        return;
      }

      // Redirect to dashboard with appropriate success message
      const successParam = isEditMode ? 'updated=true' : 'created=true';
      navigate(`/dashboard?${successParam}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'save'} zap`);
    } finally {
      setSaving(false);
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
              <h1 className="text-2xl font-bold text-white">
                {isEditMode ? 'Edit Workflow' : 'Zap Builder'}
              </h1>
              <p className="text-gray-400 mt-1">
                {isEditMode ? 'Modify your automation workflow' : 'Create your automation workflow'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
  <button
    onClick={handleSaveZap}
    disabled={saving}
    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
    <span>
      {saving 
        ? (isEditMode ? 'Updating...' : 'Saving...') 
        : (isEditMode ? 'Update & Activate' : 'Save & Activate')
      }
    </span>
  </button>
</div>

          </div>
        </div>

        <div className="flex flex-1">
          {/* Apps Sidebar */}
          <div className="w-80 bg-gray-800 border-r border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Available Apps</h2>
            
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              {apps.map((app, index) => {
                const Icon = app.icon;
                const serviceName = app.name.toLowerCase().replace(/\s+/g, '');
                const builtInServices = ['aiprocessing'];
                
                // Map AI Processing to openrouter for built-in service check
                const normalizedServiceName = serviceName === 'aiprocessing' ? 'openrouter' : serviceName;
                const connected = builtInServices.includes(serviceName) || isConnected(normalizedServiceName);
                
                return (
                  <div
                    key={app.name}
                    className={`app-card p-4 bg-gray-700 rounded-lg border transition-all duration-300 group ${
                      connected 
                        ? 'border-gray-600 hover:border-blue-500/50 cursor-pointer' 
                        : 'border-gray-600 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => selectedStep && configureStep(selectedStep, app.name, app.icon)}
                  >
                    <div className={`w-10 h-10 ${app.color} rounded-lg flex items-center justify-center mb-2 ${connected ? 'group-hover:scale-110' : ''} transition-transform duration-300 relative`}>
                      <Icon className="w-5 h-5 text-white" />
                      {connected && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <p className={`text-sm font-medium ${connected ? 'text-white' : 'text-gray-400'}`}>
                      {app.name}
                    </p>
                    {!connected && (
                      <p className="text-xs text-red-400 mt-1">Not connected</p>
                    )}
                    {builtInServices.includes(serviceName) && (
                      <p className="text-xs text-green-400 mt-1">Built-in</p>
                    )}
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
              {/* Loading state for edit mode */}
              {loadingZap && (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
                    <p className="text-gray-400">Loading workflow for editing...</p>
                  </div>
                </div>
              )}
              
              {!loadingZap && (
                <>
              {/* Zap Details */}
              <div className="mb-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4">Zap Details</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Zap Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={zapName}
                      onChange={(e) => setZapName(e.target.value)}
                      placeholder="e.g., Gmail to Notion Integration"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={zapDescription}
                      onChange={(e) => setZapDescription(e.target.value)}
                      placeholder="Brief description of what this zap does"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

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
                      
                      {/* Step Configuration */}
                      {step.app && step.app !== '' && (
                        <div className="mt-4">
                          <ZapStepConfig
                            stepType={step.type}
                            serviceName={(() => {
                              let serviceName = step.app!.toLowerCase().replace(/\s+/g, '');
                              if (serviceName === 'aiprocessing') {
                                serviceName = 'openrouter';
                              }
                              return serviceName;
                            })()}
                            eventType={step.event || ''}
                            configuration={step.configuration}
                            onConfigChange={(config) => updateStepConfig(step.id, config)}
                            onEventChange={(eventType) => updateStepEvent(step.id, eventType)}
                            allSteps={steps.map(s => ({
                              step_type: s.type,
                              service_name: (() => {
                                let serviceName = s.app?.toLowerCase().replace(/\s+/g, '') || '';
                                if (serviceName === 'aiprocessing') {
                                  serviceName = 'openrouter';
                                }
                                return serviceName;
                              })(),
                              event_type: s.event || '',
                              configuration: s.configuration
                            }))}
                          />
                        </div>
                      )}
                      
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
                <button 
                  onClick={handleSaveZap}
                  disabled={!canSaveZap() || saving}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-lg font-medium hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center space-x-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>
                    {saving 
                      ? (isEditMode ? 'Updating Zap...' : 'Saving Zap...') 
                      : (isEditMode ? 'Update & Activate Zap' : 'Save & Activate Zap')
                    }
                  </span>
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="px-8 py-3 border border-gray-600 text-gray-300 rounded-lg font-medium hover:border-gray-500 transition-colors duration-300"
                >
                  Cancel
                </button>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZapBuilder;