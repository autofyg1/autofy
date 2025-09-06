import { useState, useEffect, useCallback } from 'react';
import { Zap } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';

export interface ZapConfiguration {
  name: string;
  description?: string;
  trigger_type?: string;
  trigger_config?: Record<string, any>;
  tags?: string[];
  steps?: any[];
}

export const useZaps = () => {
  const [zaps, setZaps] = useState<Zap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session, loading: authLoading } = useAuth();

  const fetchZaps = async () => {
    console.log('🔍 fetchZaps: Current state:', {
      authLoading,
      hasUser: !!user,
      hasSession: !!session,
      sessionExpiry: session?.expires_at,
      currentTime: Math.floor(Date.now() / 1000)
    });
    
    // Only check for user and session, ignore authLoading to prevent infinite waiting
    if (!user || !session) {
      console.log('⏳ fetchZaps: User or session not ready:', {
        hasUser: !!user,
        hasSession: !!session
      });
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 fetchZaps: Starting fetch for user:', user.id);
      setLoading(true);
      setError(null);
      
      const workflows = await apiClient.getWorkflows();
      console.log('✅ fetchZaps: Successfully fetched', workflows.length, 'workflows');
      
      // Transform workflows to zap format for backward compatibility
      const transformedZaps = workflows.map(workflow => ({
        ...workflow,
        is_active: workflow.status === 'active',
        total_runs: workflow.total_executions || 0,
        last_run_at: workflow.last_executed_at,
        steps: [], // Will be loaded separately if needed
      }));
      
      setZaps(transformedZaps);
      setError(null);
      console.log('🎉 fetchZaps: Successfully set', transformedZaps.length, 'zaps');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch workflows';
      console.error('❌ fetchZaps error:', err);
      console.error('❌ fetchZaps error message:', errorMessage);
      setError(errorMessage);
      
      // Additional debugging info
      if (err instanceof Error) {
        console.error('❌ Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
    } finally {
      setLoading(false);
      console.log('🏁 fetchZaps: Completed (loading set to false)');
    }
  };

  const createNewZap = async (config: ZapConfiguration) => {
    try {
      const workflow = await apiClient.createWorkflow({
        name: config.name,
        description: config.description,
        trigger_type: config.trigger_type || 'manual',
        trigger_config: config.trigger_config || {},
        tags: config.tags || [],
      });
      
      // Transform to zap format
      const transformedZap = {
        ...workflow,
        is_active: workflow.status === 'active',
        total_runs: workflow.total_executions || 0,
        last_run_at: workflow.last_executed_at,
        steps: [],
      };
      
      setZaps(prev => [transformedZap, ...prev]);
      return { data: transformedZap, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workflow';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  const toggleZapStatus = async (zapId: string) => {
    try {
      const zap = zaps.find(z => z.id === zapId);
      if (!zap) return;

      // Note: Backend doesn't have a toggle endpoint, so we simulate it
      // In a real implementation, you might want to add this endpoint to the backend
      // For now, just update the local state
      
      setZaps(prev => prev.map(z => 
        z.id === zapId ? { ...z, is_active: !z.is_active, status: !z.is_active ? 'active' : 'paused' } : z
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workflow status');
    }
  };

  const removeZap = async (zapId: string) => {
    try {
      await apiClient.deleteWorkflow(zapId);
      setZaps(prev => prev.filter(z => z.id !== zapId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workflow');
    }
  };

  const fetchZap = useCallback(async (zapId: string) => {
    try {
      const workflow = await apiClient.getWorkflow(zapId);
      
      // Transform to zap format
      const transformedZap = {
        ...workflow,
        is_active: workflow.status === 'active',
        total_runs: workflow.total_executions || 0,
        last_run_at: workflow.last_executed_at,
        steps: workflow.steps || [],
      };
      
      return { data: transformedZap, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch workflow'
      };
    }
  }, []);

  const updateExistingZap = async (zapId: string, config: ZapConfiguration) => {
    try {
      // Note: Backend doesn't have an update workflow endpoint in the main.py
      // For now, we'll simulate the update by refreshing the list
      // In a real implementation, you'd want to add this endpoint
      
      await fetchZaps(); // Refresh the list
      
      return { data: null, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update workflow';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  const importZap = async (file: File) => {
    try {
      setError(null);
      
      // Read the file content
      const fileContent = await file.text();
      const zapData = JSON.parse(fileContent);
      
      // Create workflow from imported data
      const workflow = await apiClient.createWorkflow({
        name: zapData.name || 'Imported Workflow',
        description: zapData.description || 'Imported from JSON',
        trigger_type: 'manual',
        tags: zapData.tags || ['imported'],
      });
      
      // Transform to zap format
      const transformedZap = {
        ...workflow,
        is_active: workflow.status === 'active',
        total_runs: workflow.total_executions || 0,
        last_run_at: workflow.last_executed_at,
        steps: zapData.steps || [],
      };
      
      setZaps(prev => [transformedZap, ...prev]);
      return { data: transformedZap, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import workflow';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  useEffect(() => {
    fetchZaps();
  }, [user, session]);

  return {
    zaps,
    loading,
    error,
    createZap: createNewZap,
    updateZap: updateExistingZap,
    toggleZapStatus,
    deleteZap: removeZap,
    getZap: fetchZap,
    importZap,
    refetch: fetchZaps,
    refreshZaps: fetchZaps
  };
};