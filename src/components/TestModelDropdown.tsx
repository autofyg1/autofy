import React, { useState } from 'react';
import { getServiceConfig } from '../lib/zaps';

const TestModelDropdown: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState('');
  
  const openrouterConfig = getServiceConfig('openrouter');
  const processAction = openrouterConfig?.actions.find(action => action.id === 'process_with_ai');
  const modelField = processAction?.fields.find(field => field.key === 'model');

  console.log('OpenRouter Config:', openrouterConfig);
  console.log('Process Action:', processAction);
  console.log('Model Field:', modelField);

  if (!modelField || !modelField.options) {
    return (
      <div className="p-4 bg-red-100 border border-red-300 rounded">
        <h3 className="text-red-800 font-semibold">Debug: Model field not found</h3>
        <pre className="text-sm text-red-700 mt-2">
          {JSON.stringify({ openrouterConfig, processAction, modelField }, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 rounded-lg border border-gray-600">
      <h3 className="text-white font-semibold mb-4">AI Model Selection Test</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {modelField.label}
          {modelField.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">{modelField.placeholder}</option>
          {modelField.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {modelField.description && (
          <p className="text-xs text-gray-400 mt-1">{modelField.description}</p>
        )}
      </div>
      
      <div className="mt-4 p-3 bg-gray-700 rounded">
        <h4 className="text-gray-300 text-sm font-medium">Selected Model:</h4>
        <p className="text-white text-sm mt-1">{selectedModel || 'None selected'}</p>
      </div>
      
      <div className="mt-4 p-3 bg-gray-700 rounded">
        <h4 className="text-gray-300 text-sm font-medium">Available Models:</h4>
        <pre className="text-xs text-gray-300 mt-1 overflow-auto max-h-40">
          {JSON.stringify(modelField.options, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default TestModelDropdown;
