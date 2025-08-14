import React, { useState } from 'react';
import { getServiceConfig, generateTelegramMessageTemplate } from '../lib/zaps';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';

interface ZapStepConfigProps {
  stepType: 'trigger' | 'action';
  serviceName: string;
  eventType: string;
  configuration: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
  onEventChange: (eventType: string) => void;
  allSteps?: { step_type: string; service_name: string; event_type: string; configuration: Record<string, any> }[];
}

const ZapStepConfig: React.FC<ZapStepConfigProps> = ({
  stepType,
  serviceName,
  eventType,
  configuration,
  onConfigChange,
  onEventChange,
  allSteps = []
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const serviceConfig = getServiceConfig(serviceName);
  
  if (!serviceConfig) return null;

  const availableEvents = stepType === 'trigger' ? serviceConfig.triggers : serviceConfig.actions;
  const selectedEvent = availableEvents.find(event => event.id === eventType);

  // Check if AI processing step exists in the workflow
  const hasAiProcessing = allSteps.some(step => 
    step.service_name === 'openrouter' && step.event_type === 'process_with_ai'
  );

  const handleFieldChange = (fieldKey: string, value: any) => {
    let newConfig = {
      ...configuration,
      [fieldKey]: value
    };

    // Special handling for Telegram message title - auto-generate template
    if (serviceName === 'telegram' && eventType === 'send_message' && fieldKey === 'message_title') {
      const messageTemplate = generateTelegramMessageTemplate(value, hasAiProcessing);
      newConfig = {
        ...newConfig,
        message_template: messageTemplate
      };
    }

    onConfigChange(newConfig);
  };

  return (
    <div className="bg-gray-700 rounded-lg border border-gray-600 overflow-hidden">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-600/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <Settings className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="font-medium text-white">Configure {stepType}</h3>
            <p className="text-sm text-gray-400">
              {serviceConfig.name} - {selectedEvent?.name || 'Select event'}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-gray-600 space-y-4">
          {/* Event Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {stepType === 'trigger' ? 'Trigger Event' : 'Action'}
            </label>
            <select
              value={eventType}
              onChange={(e) => onEventChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select {stepType === 'trigger' ? 'trigger' : 'action'}</option>
              {availableEvents.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            {selectedEvent && (
              <p className="text-xs text-gray-400 mt-1">{selectedEvent.description}</p>
            )}
          </div>

          {/* Configuration Fields */}
          {selectedEvent && selectedEvent.fields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              
              {field.type === 'select' && field.options ? (
  <select
    value={configuration[field.key] || ''}
    onChange={(e) => handleFieldChange(field.key, e.target.value)}
    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:border-blue-500 focus:outline-none"
  >
    <option value="">{field.placeholder}</option>
    {field.options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
) : field.type === 'textarea' ? (
  <textarea
    value={configuration[field.key] || ''}
    onChange={(e) => handleFieldChange(field.key, e.target.value)}
    placeholder={field.placeholder}
    rows={3}
    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
  />
) : field.type === 'number' ? (
  <input
    type="number"
    value={configuration[field.key] || ''}
    onChange={(e) => handleFieldChange(field.key, e.target.value ? parseFloat(e.target.value) : '')}
    placeholder={field.placeholder}
    step={field.key === 'temperature' ? '0.1' : '1'}
    min={field.key === 'temperature' ? '0' : field.key === 'max_tokens' ? '1' : undefined}
    max={field.key === 'temperature' ? '2' : undefined}
    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
  />
) : (
  <input
    type={field.type}
    value={configuration[field.key] || ''}
    onChange={(e) => handleFieldChange(field.key, e.target.value)}
    placeholder={field.placeholder}
    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
  />
)}
              
              
              {field.description && (
                <p className="text-xs text-gray-400 mt-1">{field.description}</p>
              )}

              {/* Show preview for Telegram message template */}
              {serviceName === 'telegram' && eventType === 'send_message' && field.key === 'message_title' && configuration.message_title && (
                <div className="mt-3 p-3 bg-gray-600/50 rounded-lg border border-gray-500">
                  <p className="text-xs font-medium text-gray-300 mb-2">Message Preview:</p>
                  <div className="text-xs text-gray-400 whitespace-pre-wrap font-mono">
                    {generateTelegramMessageTemplate(configuration.message_title, hasAiProcessing)}
                  </div>
                  <p className="text-xs text-blue-400 mt-2">
                    {hasAiProcessing ? 'Using AI content ({{ai_content}})' : 'Using email body ({{body}})'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ZapStepConfig;