import React, { useEffect, useState } from 'react';
import { 
  Mail, 
  Bot, 
  MessageSquare, 
  ArrowRight, 
  Sparkles,
  Check,
  Clock
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 relative overflow-hidden">
      {/* Background gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-50/50 via-transparent to-blue-50/50 opacity-60"></div>
      
      <div className="relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Live Demo</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Watch automation in action
          </h3>
          <p className="text-gray-600">
            See how a workflow responds to real-time events
          </p>
        </div>

        {/* Workflow Steps */}
        <div className="flex items-center justify-center space-x-8 md:space-x-16 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.status === 'active';
            const isCompleted = step.status === 'completed';
            
            return (
              <React.Fragment key={step.id}>
                <div className="text-center group">
                  <div 
                    className={`relative w-16 h-16 md:w-20 md:h-20 ${step.color} rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 shadow-lg
                      ${isActive ? 'scale-110 shadow-xl' : ''}
                      ${isCompleted ? 'scale-105' : ''}
                    `}
                  >
                    <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    
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

                {/* Connecting arrows */}
                {index < steps.length - 1 && (
                  <div className="flex items-center space-x-2">
                    <div 
                      className={`w-12 h-0.5 transition-all duration-500 relative overflow-hidden
                        ${isCompleted ? 'bg-green-400' : isActive ? 'bg-violet-400' : 'bg-gray-300'}
                      `}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
                      )}
                    </div>
                    <ArrowRight 
                      className={`w-5 h-5 transition-all duration-500
                        ${isCompleted ? 'text-green-500' : isActive ? 'text-violet-500 animate-pulse' : 'text-gray-400'}
                      `} 
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Status indicator */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-100">
            <div className={`w-2 h-2 rounded-full transition-colors duration-300
              ${currentStep === 3 ? 'bg-green-500' : 'bg-violet-500 animate-pulse'}
            `}></div>
            <span className="text-sm font-medium text-gray-700">
              {currentStep === 3 ? 'Workflow completed' : 
               currentStep === 0 ? 'Waiting for trigger...' :
               currentStep === 1 ? 'Processing with AI...' :
               'Sending notification...'}
            </span>
            {currentStep < 3 && <Clock className="w-4 h-4 text-gray-500" />}
          </div>
        </div>

        {/* Workflow explanation */}
        <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-violet-50/50 rounded-xl border border-gray-100">
          <p className="text-gray-700 leading-relaxed text-center">
            This workflow automatically monitors your Gmail inbox, uses AI to analyze important emails, 
            and sends intelligent summaries to your team's Slack channel — all in seconds.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkflowDemo;
