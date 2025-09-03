import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ReactFlow, Background, Node, Edge, Position, Handle } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Sidebar from '../components/Sidebar';
import ZapJsonUpload from '../components/ZapJsonUpload';
import { useZaps } from '../hooks/useZaps';
import { downloadZapAsJson } from '../lib/zaps';
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
  FileText,
  Globe,
  Share2,
  Bot,
  Workflow,
  ArrowRight,
  Activity,
  Zap,
  Timer,
  Target,
  Send,
  Brain,
  Sparkles,
  RefreshCw,
  Upload,
  Download,
  X
} from 'lucide-react';

// Service icons and colors - simplified
const serviceIcons: Record<string, React.ElementType> = {
  gmail: Mail,
  slack: MessageSquare,
  'google calendar': Calendar,
  notion: FileText,
  database: Database,
  schedule: Clock,
  notifications: AlertCircle,
  reddit: Globe,
  webhook: Share2,
  openrouter: Brain,
  ai: Sparkles,
  telegram: Send,
  discord: MessageSquare,
  twitter: MessageSquare,
  facebook: MessageSquare,
  instagram: MessageSquare,
  linkedin: MessageSquare,
  youtube: Globe,
  spotify: Globe,
  github: Globe,
  dropbox: Database,
  google_drive: Database,
  trello: Database,
  asana: Database,
  monday: Database,
  clickup: Database,
  salesforce: Database,
  hubspot: Database,
  mailchimp: Mail,
  sendgrid: Mail,
  twilio: MessageSquare,
  zoom: MessageSquare,
  microsoft_teams: MessageSquare,
  whatsapp: MessageSquare,
  sms: MessageSquare
};

// Simplified color scheme for better performance
const serviceColors: Record<string, { bg: string; border: string; text: string }> = {
  gmail: { bg: 'bg-red-500/20', border: 'border-red-400/50', text: 'text-red-300' },
  slack: { bg: 'bg-purple-500/20', border: 'border-purple-400/50', text: 'text-purple-300' },
  'google calendar': { bg: 'bg-blue-500/20', border: 'border-blue-400/50', text: 'text-blue-300' },
  notion: { bg: 'bg-gray-600/20', border: 'border-gray-400/50', text: 'text-gray-300' },
  reddit: { bg: 'bg-orange-500/20', border: 'border-orange-400/50', text: 'text-orange-300' },
  openrouter: { bg: 'bg-emerald-500/20', border: 'border-emerald-400/50', text: 'text-emerald-300' },
  telegram: { bg: 'bg-cyan-500/20', border: 'border-cyan-400/50', text: 'text-cyan-300' },
  discord: { bg: 'bg-indigo-500/20', border: 'border-indigo-400/50', text: 'text-indigo-300' },
  webhook: { bg: 'bg-violet-500/20', border: 'border-violet-400/50', text: 'text-violet-300' },
  default: { bg: 'bg-gray-500/20', border: 'border-gray-400/50', text: 'text-gray-300' }
};

// Simplified Service Icon Component - no animations
const ServiceIcon = React.memo(({ serviceName }: { serviceName: string }) => {
  const Icon = serviceIcons[serviceName?.toLowerCase()] || AlertCircle;
  const colors = serviceColors[serviceName?.toLowerCase()] || serviceColors.default;
  
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg} ${colors.border} border-2`}>
      <Icon className={`w-5 h-5 ${colors.text}`} />
    </div>
  );
});

// Enhanced Node Component with model information
const WorkflowNode = React.memo(({ data }: { data: any }) => {
  const { step } = data;
  const colors = serviceColors[step.service_name?.toLowerCase()] || serviceColors.default;

  const getDisplayName = () => {
    if (step.service_name === 'openrouter') {
      return step.configuration?.model ? 
        `AI (${step.configuration.model.split('/').pop()?.split(':')[0] || 'Model'})` : 
        'AI (No Model)';
    }
    return step.service_name?.charAt(0).toUpperCase() + step.service_name?.slice(1) || 'Unknown';
  };

  const getSubtitle = () => {
    const eventText = step.event_type?.replace(/_/g, ' ') || 'Event';
    
    if (step.service_name === 'openrouter' && step.configuration?.model) {
      return step.configuration.model.includes(':free') ? 'Free Model' : 'Premium Model';
    }
    
    return eventText;
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-400" />
      <div className={`px-6 py-4 rounded-2xl border-2 ${colors.bg} ${colors.border} min-w-[160px] max-w-[240px]`}>
        <div className="flex items-center gap-3">
          <ServiceIcon serviceName={step.service_name} />
          <div className="flex flex-col min-w-0 flex-1">
            <span className={`font-bold text-sm ${colors.text} truncate`}>
              {getDisplayName()}
            </span>
            <span className="text-xs text-gray-400 truncate">
              {getSubtitle()}
            </span>
            {step.service_name === 'openrouter' && !step.configuration?.model && (
              <span className="text-xs text-red-400 font-medium">
                ⚠️ Model not specified
              </span>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-400" />
    </>
  );
});

const nodeTypes = { workflow: WorkflowNode };

// Simplified Workflow Card - removed heavy animations and gradients
const WorkflowCard = React.memo(({ zap, onToggle, onDelete }: { 
  zap: any; 
  onToggle: (id: string) => void; 
  onDelete: (id: string) => void; 
}) => {
  const steps = zap.steps || [];
  
  const formatLastRun = useCallback((lastRunAt?: string) => {
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
  }, []);

  // Simplified nodes and edges
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    
    steps.forEach((step, index) => {
      const xPosition = 80 + (index * 200);
      const yPosition = 60 + (index * 90);
      
      flowNodes.push({
        id: `${zap.id}-step-${step.id}`,
        position: { x: xPosition, y: yPosition },
        data: { step },
        type: 'workflow',
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      if (index < steps.length - 1) {
        const nextStep = steps[index + 1];
        flowEdges.push({
          id: `${zap.id}-edge-${step.id}-to-${nextStep.id}`,
          source: `${zap.id}-step-${step.id}`,
          target: `${zap.id}-step-${nextStep.id}`,
          type: 'smoothstep',
          style: { 
            stroke: zap.is_active ? '#3b82f6' : '#6b7280',
            strokeWidth: 2,
          },
        });
      }
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [steps, zap.is_active, zap.id]);

  const handleToggleClick = useCallback(() => {
    onToggle(zap.id);
  }, [onToggle, zap.id]);

  const handleDeleteClick = useCallback(() => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      onDelete(zap.id);
    }
  }, [onDelete, zap.id]);

  return (
    <div className={`
      bg-gray-800 rounded-2xl border-2 overflow-hidden
      ${zap.is_active ? 'border-blue-400/50' : 'border-gray-600/30'}
    `}>
      {/* Simplified Header */}
      <div className="p-6 border-b border-gray-700/30 bg-gray-800/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-bold text-white">
                {zap.name || 'Untitled Workflow'}
              </h3>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                zap.is_active 
                  ? 'bg-green-500/20 text-green-300 border border-green-400/40' 
                  : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
              }`}>
                {zap.is_active ? <Zap className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span>{zap.is_active ? 'LIVE' : 'PAUSED'}</span>
              </div>
            </div>

            <p className="text-gray-300 text-sm mb-4">
              {zap.description || 'No description provided'}
            </p>

            {/* Simplified Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-xl border border-blue-400/20">
                <Timer className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs text-blue-300/70">Last Run</div>
                  <div className="text-xs font-semibold text-blue-200">
                    {formatLastRun(zap.last_run_at)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-xl border border-green-400/20">
                <Activity className="w-4 h-4 text-green-400" />
                <div>
                  <div className="text-xs text-green-300/70">Total Runs</div>
                  <div className="text-xs font-semibold text-green-200">{zap.total_runs || 0}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-xl border border-purple-400/20">
                <Target className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-xs text-purple-300/70">Steps</div>
                  <div className="text-xs font-semibold text-purple-200">{steps.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Simplified Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleToggleClick}
              className={`p-3 rounded-xl border ${
                zap.is_active
                  ? 'bg-green-500/20 text-green-300 border-green-400/30'
                  : 'bg-gray-600/20 text-gray-400 border-gray-500/30'
              } hover:opacity-80`}
              title={zap.is_active ? 'Pause Workflow' : 'Start Workflow'}
            >
              {zap.is_active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <Link
              to={`/builder?edit=${zap.id}`}
              className="p-3 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 hover:opacity-80"
              title="Edit Workflow"
            >
              <Edit className="w-5 h-5" />
            </Link>
            
            <button
              onClick={() => downloadZapAsJson(zap)}
              className="p-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30 hover:opacity-80"
              title="Export as JSON"
            >
              <Download className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleDeleteClick}
              className="p-3 rounded-xl bg-red-500/20 text-red-300 border border-red-400/30 hover:opacity-80"
              title="Delete Workflow"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Fixed React Flow - Prevents scroll capture */}
      <div 
        className="h-96 bg-gray-900 relative rounded-2xl m-4 border border-gray-600/20 overflow-hidden"
        style={{ pointerEvents: 'none' }} // This prevents React Flow from capturing scroll events
      >
        {steps.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1, minZoom: 0.6 }}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            panOnScroll={false}
            zoomOnPinch={false}
            panOnDrag={false}
            preventScrolling={true}
            className="workflow-flow"
            style={{ pointerEvents: 'none' }} // Additional protection
          >
            <Background color="#374151" variant="dots" gap={40} size={1} />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 flex items-center gap-2">
              <Workflow className="w-5 h-5" />
              <span>No steps configured</span>
            </div>
          </div>
        )}

        {/* Simple Status Indicator */}
        {zap.is_active && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-500/20 text-green-300 px-3 py-1 rounded-full border border-green-400/30">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-bold">ACTIVE</span>
          </div>
        )}
        
        {/* Overlay to ensure no pointer events */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ zIndex: 10 }}
        />
      </div>

      {/* Simplified Workflow Summary */}
      <div className="p-4 bg-gray-700/20 border-t border-gray-600/30">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-300 mb-2">Flow Path</div>
          <div className="text-xs text-gray-400 flex items-center justify-center gap-2 flex-wrap">
            {steps.length > 0 ? (
              <>
                <span className="text-blue-400 font-semibold bg-blue-500/10 px-2 py-1 rounded-full">
                  {steps.find(s => s.step_type === 'trigger')?.service_name?.toUpperCase() || 'TRIGGER'}
                </span>
                {steps.filter(s => s.step_type === 'action').map((step, index) => (
                  <React.Fragment key={step.id}>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="text-white font-semibold bg-purple-500/10 px-2 py-1 rounded-full">
                      {step.service_name === 'openrouter' ? 'AI' : step.service_name?.toUpperCase() || 'ACTION'}
                    </span>
                  </React.Fragment>
                ))}
              </>
            ) : (
              <span className="text-gray-500">No workflow configured</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const Dashboard: React.FC = () => {
  const fabRef = useRef<HTMLAnchorElement>(null);
  const [searchParams] = useSearchParams();
  const { zaps, loading, error, toggleZapStatus, deleteZap, refreshZaps, importZap } = useZaps();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('created') === 'true' || searchParams.get('updated') === 'true') {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [searchParams]);

  const handleToggleZap = useCallback((id: string) => {
    toggleZapStatus(id);
  }, [toggleZapStatus]);

  const handleDeleteZap = useCallback((id: string) => {
    deleteZap(id);
  }, [deleteZap]);

  const handleRefresh = useCallback(() => {
    refreshZaps();
  }, [refreshZaps]);

  const handleImport = useCallback(async (file: File) => {
    setImportLoading(true);
    try {
      const result = await importZap(file);
      if (result.error) {
        throw new Error(result.error);
      }
      
      setImportSuccess(true);
      setShowImportModal(false);
      
      // Show success message
      setTimeout(() => setImportSuccess(false), 5000);
      
      return { data: result.data, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Import failed' 
      };
    } finally {
      setImportLoading(false);
    }
  }, [importZap]);

  const closeImportModal = useCallback(() => {
    setShowImportModal(false);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Simplified Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-8 py-6 flex-shrink-0">
          {(showSuccessMessage || importSuccess) && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-400/30 rounded-xl">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-green-300 font-medium">
                  {importSuccess
                    ? 'Zap imported successfully!'
                    : searchParams.get('updated') === 'true' 
                    ? 'Workflow updated successfully!' 
                    : 'Workflow created successfully!'
                  }
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-400/30 rounded-xl">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-300 font-medium">Error: {error}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Workflow Dashboard</h1>
                <p className="text-gray-400">Manage your automation workflows</p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg border border-blue-400/30"
                  title="Refresh Workflows"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium">Refresh</span>
                </button>
                
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded-lg border border-purple-400/30"
                  title="Import Zap from JSON"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-medium">Import JSON</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-green-500/10 px-4 py-2 rounded-xl border border-green-400/30">
                <span className="text-sm text-green-300">Active: </span>
                <span className="text-green-200 font-bold text-lg">
                  {zaps.filter(z => z.is_active).length}
                </span>
              </div>
              <div className="bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-400/30">
                <span className="text-sm text-blue-300">Total: </span>
                <span className="text-blue-200 font-bold text-lg">
                  {zaps.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Optimized Scrolling */}
        <div 
          className="flex-1 overflow-y-auto" 
          style={{ 
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="p-8">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading workflows...</p>
                </div>
              </div>
            ) : zaps.length > 0 ? (
              <div className="grid gap-6 grid-cols-1 2xl:grid-cols-2">
                {zaps.map((zap) => (
                  <WorkflowCard
                    key={zap.id}
                    zap={zap}
                    onToggle={handleToggleZap}
                    onDelete={handleDeleteZap}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Workflow className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">No Workflows Yet</h3>
                  <p className="text-gray-400 mb-6">
                    Create your first automation workflow or import an existing one
                  </p>
                  <div className="flex items-center gap-4 justify-center">
                    <Link
                      to="/builder"
                      className="inline-flex items-center gap-2 bg-blue-500 px-6 py-3 rounded-lg font-medium text-white hover:bg-blue-600"
                    >
                      <Plus className="w-5 h-5" />
                      Create Workflow
                    </Link>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="inline-flex items-center gap-2 bg-purple-500 px-6 py-3 rounded-lg font-medium text-white hover:bg-purple-600"
                    >
                      <Upload className="w-5 h-5" />
                      Import JSON
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Simplified FAB */}
        <Link
          ref={fabRef}
          to="/builder"
          className="fixed bottom-8 right-8 w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-xl hover:bg-blue-600 z-50"
          title="Create New Workflow"
        >
          <Plus className="w-6 h-6 text-white" />
        </Link>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-600/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <ZapJsonUpload
              onImport={handleImport}
              isLoading={importLoading}
              onClose={closeImportModal}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;