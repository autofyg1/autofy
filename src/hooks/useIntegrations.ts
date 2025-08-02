import { useState, useEffect } from 'react';
import { supabase, Integration } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateAuthUrl } from '../lib/oauth';

export const useIntegrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchIntegrations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .order('connected_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const connectIntegration = async (serviceName: string, credentials: Record<string, any>) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.id,
          service_name: serviceName.toLowerCase(),
          credentials,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setIntegrations(prev => {
        const existing = prev.find(i => i.service_name === serviceName.toLowerCase());
        if (existing) {
          return prev.map(i => i.id === existing.id ? data : i);
        }
        return [...prev, data];
      });

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect integration';
      setError(errorMessage);
      return { error: errorMessage };
    }
  };

  const disconnectIntegration = async (serviceName: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('service_name', serviceName.toLowerCase());

      if (error) throw error;

      // Update local state
      setIntegrations(prev => prev.filter(i => i.service_name !== serviceName.toLowerCase()));

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect integration';
      setError(errorMessage);
      return { error: errorMessage };
    }
  };

  const isConnected = (serviceName: string) => {
    return integrations.some(i => i.service_name === serviceName.toLowerCase());
  };

  const getIntegration = (serviceName: string) => {
    return integrations.find(i => i.service_name === serviceName.toLowerCase());
  };

  const initiateOAuth = (serviceName: string) => {
    try {
      console.log('=== INITIATING OAUTH ===');
      console.log('Service:', serviceName);
      console.log('Current URL:', window.location.href);
      console.log('SessionStorage before OAuth:', JSON.stringify(sessionStorage));
      
      const authUrl = generateAuthUrl(serviceName.toLowerCase());
      console.log('Generated auth URL:', authUrl);
      console.log('About to redirect to:', authUrl);
      
      // Add a small delay to ensure state is saved
      setTimeout(() => {
        console.log('SessionStorage just before redirect:', JSON.stringify(sessionStorage));
      }, 100);
      
      window.location.href = authUrl;
      return { error: null };
    } catch (error) {
      console.error('=== OAUTH INITIATION ERROR ===');
      console.error('Error:', error);
      return { error: error instanceof Error ? error.message : 'Failed to start OAuth flow' };
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [user]);

  return {
    integrations,
    loading,
    error,
    connectIntegration,
    disconnectIntegration,
    isConnected,
    getIntegration,
    refetch: fetchIntegrations,
    initiateOAuth,
  };
};