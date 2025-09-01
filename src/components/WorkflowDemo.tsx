import React, { useEffect, useState } from 'react';
import { 
  Mail, 
  Bot, 
  MessageSquare, 
  ArrowRight, 
  Sparkles,
  Check,
  Clock,
  ArrowDown
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  status: 'idle' | 'active' | 'completed';
}

const WorkflowDemo: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: 'trigger',
      name: 'Gmail',
      description: 'New email received',
      icon: Mail,
      color: 'bg-red-500',
      status: 'idle'
    },
    {
      id: 'process',
      name: 'AI Analysis',
      description: 'Extract key insights',
      icon: Bot,
      color: 'bg-violet-500',
      status: 'idle'
    },
    {
      id: 'action',
      name: 'Slack',
      description: 'Send notification',
      icon: MessageSquare,
      color: 'bg-green-500',
      status: 'idle'
    }
  ]);

  // Auto-play animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % 4); // 0, 1, 2, 3 (pause), then repeat
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Update step statuses based on current step
  useEffect(() => {
    setSteps(prevSteps => 
      prevSteps.map((step, index) => ({
        ...step,
        status: index < currentStep ? 'completed' : 
                index === currentStep ? 'active' : 'idle'
      }))
    );
  }, [currentStep]);

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8 lg:p-12 relative overflow-hidden max-w-5xl mx-auto w-full">
      {/* Background gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-50/50 via-transparent to-blue-50/50 opacity-60"></div>
      
      <div className="relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <div className="inline-flex items-center space-x-2 bg-violet-100 text-violet-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Live Demo</span>
          </div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 px-2">
            Watch automation in action
          </h3>
          <p className="text-sm sm:text-base text-gray-600 px-4 sm:px-2">
            See how a workflow responds to real-time events
          </p>
        </div>

        {/* Workflow Steps Container */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile Layout (< md) */}
          <div className="flex flex-col md:hidden items-center space-y-4 sm:space-y-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.status === 'active';
              const isCompleted = step.status === 'completed';
              
              return (
                <React.Fragment key={step.id}>
                  <div className="text-center">
                    <div 
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 ${step.color} rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 transition-all duration-500 shadow-lg mx-auto
                        ${isActive ? 'scale-110 shadow-xl' : ''}
                        ${isCompleted ? 'scale-105' : ''}
                      `}
                    >
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                      
                      {/* Active pulse animation */}
                      {isActive && (
                        <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-4 border-white/50 animate-ping"></div>
                      )}
                      
                      {/* Completed check mark */}
                      {isCompleted && (
                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <h4 className={`font-semibold text-sm sm:text-base mb-1 transition-colors duration-300 px-2
                      ${isActive || isCompleted ? 'text-gray-900' : 'text-gray-600'}
                    `}>
                      {step.name}
                    </h4>
                    <p className={`text-xs sm:text-sm transition-colors duration-300 px-4
                      ${isActive ? 'text-violet-600 font-medium' : 'text-gray-500'}
                    `}>
                      {step.description}
                    </p>
                  </div>

                  {/* Mobile connector - only show between steps, not after last step */}
                  {index < steps.length - 1 && (
                    <div className="flex flex-col items-center py-2">
                      <div className={`w-0.5 h-6 sm:h-8 rounded-full transition-colors duration-300
                        ${index < currentStep ? 'bg-green-400' : 
                          index === currentStep ? 'bg-violet-400' : 'bg-gray-300'}`}>
                      </div>
                      <ArrowDown className={`w-4 h-4 mt-1 transition-colors duration-300
                        ${index < currentStep ? 'text-green-500' : 
                          index === currentStep ? 'text-violet-500 animate-pulse' : 'text-gray-400'}`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Desktop Layout (>= md) */}
          <div className="hidden md:flex items-center justify-center gap-8 lg:gap-12 xl:gap-16">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.status === 'active';
              const isCompleted = step.status === 'completed';
              
              return (
                <React.Fragment key={step.id}>
                  <div className="text-center group">
                    <div 
                      className={`relative w-16 h-16 lg:w-20 lg:h-20 ${step.color} rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 shadow-lg
                        ${isActive ? 'scale-110 shadow-xl' : ''}
                        ${isCompleted ? 'scale-105' : ''}
                      `}
                    >
                      <Icon className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
                      
                      {/* Active pulse animation */}
                      {isActive && (
                        <div className="absolute inset-0 rounded-2xl border-4 border-white/50 animate-ping"></div>
                      )}
                      
                      {/* Completed check mark */}
                      {isCompleted && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <h4 className={`font-semibold mb-1 transition-colors duration-300
                      ${isActive || isCompleted ? 'text-gray-900' : 'text-gray-600'}
                    `}>
                      {step.name}
                    </h4>
                    <p className={`text-sm transition-colors duration-300
                      ${isActive ? 'text-violet-600 font-medium' : 'text-gray-500'}
                    `}>
                      {step.description}
                    </p>
                  </div>

                  {/* Desktop connector - only show between steps, not after last step */}
                  {index < steps.length - 1 && (
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 lg:w-12 h-0.5 rounded-full relative overflow-hidden transition-colors duration-300
                        ${index < currentStep ? 'bg-green-400' : 
                          index === currentStep ? 'bg-violet-400' : 'bg-gray-300'}`}>
                        {index === currentStep && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
                        )}
                      </div>
                      <ArrowRight className={`w-4 h-4 lg:w-5 lg:h-5 transition-colors duration-300
                        ${index < currentStep ? 'text-green-500' : 
                          index === currentStep ? 'text-violet-500 animate-pulse' : 'text-gray-400'}`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Status indicator */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2 rounded-full bg-gray-100">
            <div className={`w-2 h-2 rounded-full transition-colors duration-300
              ${currentStep === 3 ? 'bg-green-500' : 'bg-violet-500 animate-pulse'}
            `}></div>
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              {currentStep === 3 ? 'Workflow completed' : 
               currentStep === 0 ? 'Waiting for trigger...' :
               currentStep === 1 ? 'Processing with AI...' :
               'Sending notification...'}
            </span>
            {currentStep < 3 && <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />}
          </div>
        </div>

        {/* Workflow explanation */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-violet-50/50 rounded-lg sm:rounded-xl border border-gray-100">
          <p className="text-gray-700 leading-relaxed text-center text-sm sm:text-base">
            This workflow automatically monitors your Gmail inbox, uses AI to analyze important emails, 
            and sends intelligent summaries to your team's Slack channel — all in seconds.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkflowDemo;