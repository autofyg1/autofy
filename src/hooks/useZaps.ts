import { useState, useEffect, useCallback } from 'react';
import { getUserZaps, createZap, updateZap, updateZapStatus, deleteZap, getZap, Zap, ZapConfiguration } from '../lib/zaps';
import { useAuth } from '../contexts/AuthContext';

export const useZaps = () => {
  const [zaps, setZaps] = useState<Zap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchZaps = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await getUserZaps();
      
      if (error) throw new Error(error);
      
      setZaps(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch zaps');
    } finally {
      setLoading(false);
    }
  };

  const createNewZap = async (config: ZapConfiguration) => {
    try {
      const { data, error } = await createZap(config);
      
      if (error) throw new Error(error);
      
      if (data) {
        setZaps(prev => [data, ...prev]);
      }
      
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create zap';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  const toggleZapStatus = async (zapId: string) => {
    try {
      const zap = zaps.find(z => z.id === zapId);
      if (!zap) return;

      const { error } = await updateZapStatus(zapId, !zap.is_active);
      
      if (error) throw new Error(error);
      
      setZaps(prev => prev.map(z => 
        z.id === zapId ? { ...z, is_active: !z.is_active } : z
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update zap status');
    }
  };

  const removeZap = async (zapId: string) => {
    try {
      const { error } = await deleteZap(zapId);
      
      if (error) throw new Error(error);
      
      setZaps(prev => prev.filter(z => z.id !== zapId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete zap');
    }
  };

  const fetchZap = useCallback(async (zapId: string) => {
    try {
      const { data, error } = await getZap(zapId);
      
      if (error) throw new Error(error);
      
      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch zap'
      };
    }
  }, []);

  const updateExistingZap = async (zapId: string, config: ZapConfiguration) => {
    try {
      const { data, error } = await updateZap(zapId, config);
      
      if (error) throw new Error(error);
      
      if (data) {
        setZaps(prev => prev.map(z => z.id === zapId ? data : z));
      }
      
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update zap';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  useEffect(() => {
    fetchZaps();
  }, [user]);

  return {
    zaps,
    loading,
    error,
    createZap: createNewZap,
    updateZap: updateExistingZap,
    toggleZapStatus,
    deleteZap: removeZap,
    getZap: fetchZap,
    refetch: fetchZaps,
    refreshZaps: fetchZaps
  };
};