import React, { useRef, useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Loader2, 
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { validateJsonFile, parseJsonFile, downloadZapAsJson } from '../lib/zaps';
import type { Zap } from '../lib/zaps';

interface ZapJsonUploadProps {
  onImport: (file: File) => Promise<{ data: any; error: string | null }>;
  isLoading?: boolean;
  onClose?: () => void;
  className?: string;
}

interface FilePreview {
  name: string;
  description?: string;
  stepCount: number;
  services: string[];
}

const ZapJsonUpload: React.FC<ZapJsonUploadProps> = ({ 
  onImport, 
  isLoading = false, 
  onClose,
  className = '' 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setValidationError(null);
    setFilePreview(null);

    // Validate file
    const validation = validateJsonFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid file');
      return;
    }

    // Parse and preview file content
    const parseResult = await parseJsonFile(file);
    if (parseResult.error) {
      setValidationError(parseResult.error);
      return;
    }

    // Generate preview
    const data = parseResult.data;
    const services = [...new Set(data.steps?.map((step: any) => step.service_name) || [])];
    
    setSelectedFile(file);
    setFilePreview({
      name: data.name,
      description: data.description,
      stepCount: data.steps?.length || 0,
      services
    });

    // Store content for preview modal
    setPreviewContent(JSON.stringify(data, null, 2));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const handleImport = useCallback(async () => {
    if (!selectedFile || isLoading) return;

    try {
      const result = await onImport(selectedFile);
      if (result.error) {
        setValidationError(result.error);
      } else {
        // Success - reset form
        setSelectedFile(null);
        setFilePreview(null);
        setValidationError(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Import failed');
    }
  }, [selectedFile, isLoading, onImport]);

  const resetSelection = useCallback(() => {
    setSelectedFile(null);
    setFilePreview(null);
    setValidationError(null);
    setPreviewContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const downloadExampleFile = useCallback(() => {
    const exampleZap: Zap = {
      id: 'example',
      user_id: 'example',
      name: 'AI Email Summarizer Example',
      description: 'Summarize important emails with AI and save to Notion',
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_runs: 0,
      steps: [
        {
          id: 'example-trigger',
          zap_id: 'example',
          step_order: 0,
          step_type: 'trigger',
          service_name: 'gmail',
          event_type: 'new_email',
          configuration: {
            keywords: 'important, urgent, meeting'
          },
          created_at: new Date().toISOString()
        },
        {
          id: 'example-action-1',
          zap_id: 'example',
          step_order: 1,
          step_type: 'action',
          service_name: 'openrouter',
          event_type: 'process_with_ai',
          configuration: {
            model: 'meta-llama/llama-3.2-3b-instruct:free',
            prompt: 'Summarize this email in 2-3 bullet points: {{body}}',
            max_tokens: 200,
            temperature: 0.3
          },
          created_at: new Date().toISOString()
        },
        {
          id: 'example-action-2',
          zap_id: 'example',
          step_order: 2,
          step_type: 'action',
          service_name: 'notion',
          event_type: 'create_page',
          configuration: {
            database_id: 'your-notion-database-id-here',
            title_template: '📧 {{subject}} - Summary',
            content_template: '**From:** {{sender}}\n**Date:** {{timestamp}}\n\n**AI Summary:**\n{{ai_content}}\n\n**Original:**\n{{body}}'
          },
          created_at: new Date().toISOString()
        }
      ]
    };

    downloadZapAsJson(exampleZap);
  }, []);

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-600/30 p-6 ${className}`}>
      {onClose && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Import Zap from JSON</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-500/10'
            : selectedFile
            ? 'border-green-400 bg-green-500/10'
            : 'border-gray-600 bg-gray-700/20'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />

        {!selectedFile ? (
          <div className="space-y-4">
            <Upload className={`w-12 h-12 mx-auto ${dragActive ? 'text-blue-400' : 'text-gray-400'}`} />
            <div>
              <p className="text-white font-medium mb-1">
                {dragActive ? 'Drop your JSON file here' : 'Upload Zap JSON File'}
              </p>
              <p className="text-gray-400 text-sm">
                Drag and drop or click to select a JSON file (max 1MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto text-green-400" />
            <div>
              <p className="text-white font-medium">File Selected</p>
              <p className="text-green-300 text-sm">{selectedFile.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* File Preview */}
      {filePreview && (
        <div className="mt-4 bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {filePreview.name}
              </h4>
              {filePreview.description && (
                <p className="text-gray-300 text-sm mb-3">{filePreview.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Steps:</span>
                  <span className="text-white ml-2">{filePreview.stepCount}</span>
                </div>
                <div>
                  <span className="text-gray-400">Services:</span>
                  <span className="text-white ml-2">{filePreview.services.join(', ')}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-600/30"
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {showPreview && (
            <div className="mt-4">
              <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all">
                  {previewContent}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="mt-4 bg-red-500/10 border border-red-400/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-300 font-medium">Import Error</p>
              <p className="text-red-200 text-sm mt-1">{validationError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-600/30">
        <button
          onClick={downloadExampleFile}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
        >
          <Download className="w-4 h-4" />
          Download Example
        </button>

        <div className="flex items-center gap-3">
          {selectedFile && (
            <button
              onClick={resetSelection}
              disabled={isLoading}
              className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleImport}
            disabled={!selectedFile || isLoading || !!validationError}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Import Zap
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZapJsonUpload;
