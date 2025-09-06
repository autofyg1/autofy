import { useState, useEffect } from 'react';
import { Integration } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateAuthUrl, oauthConfigs } from '../lib/oauth';
import { useTelegram } from './useTelegram';
import { apiClient } from '../lib/api-client';

export const useIntegrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session, loading: authLoading } = useAuth();
  const telegram = useTelegram();

  const fetchIntegrations = async () => {
    // Only check for user and session
    if (!user || !session) {
      console.log('⏳ fetchIntegrations: User or session not ready:', {
        hasUser: !!user,
        hasSession: !!session
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await apiClient.getIntegrations();
      
      // Transform API response to match expected format
      const transformedIntegrations: Integration[] = data.map(integration => ({
        id: integration.id,
        user_id: user.id,
        service_name: integration.service,
        display_name: integration.name,
        credentials: {}, // Don't expose credentials in frontend
        configuration: {},
        status: integration.status,
        last_tested_at: integration.last_tested_at,
        error_message: integration.error_message,
        metadata: {},
        created_at: integration.connected_at,
        updated_at: integration.connected_at,
      }));
      
      setIntegrations(transformedIntegrations);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch integrations');
    } finally {
      setLoading(false);
    }
  };

  const connectIntegration = async (serviceName: string, credentials: Record<string, any>) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const integration = await apiClient.createIntegration({
        service_name: serviceName.toLowerCase(),
        display_name: serviceName,
        credentials: credentials,
        configuration: {},
      });

      // Transform and add to local state
      const transformedIntegration: Integration = {
        id: integration.id,
        user_id: user.id,
        service_name: integration.service || integration.service_name,
        display_name: integration.name || integration.display_name,
        credentials: {}, // Don't expose credentials
        configuration: {},
        status: integration.status,
        last_tested_at: integration.last_tested_at,
        error_message: integration.error_message,
        metadata: {},
        created_at: integration.connected_at || integration.created_at,
        updated_at: integration.connected_at || integration.updated_at,
      };

      // Update local state
      setIntegrations(prev => {
        const existing = prev.find(i => i.service_name === serviceName.toLowerCase());
        if (existing) {
          return prev.map(i => i.id === existing.id ? transformedIntegration : i);
        }
        return [...prev, transformedIntegration];
      });

      return { data: transformedIntegration, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect integration';
      setError(errorMessage);
      return { error: errorMessage };
    }
  };

  const disconnectIntegration = async (serviceName: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const integration = integrations.find(i => i.service_name === serviceName.toLowerCase());
      if (!integration) {
        return { error: 'Integration not found' };
      }

      await apiClient.deleteIntegration(integration.id);
      
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
    if (serviceName.toLowerCase() === 'telegram') {
      return telegram.isConnected();
    }
    return integrations.some(i => i.service_name === serviceName.toLowerCase());
  };

  const getIntegration = (serviceName: string) => {
    if (serviceName.toLowerCase() === 'telegram') {
      // Return a mock integration object for Telegram since it uses a different data structure
      return telegram.isConnected() ? {
        id: 'telegram',
        user_id: user?.id || '',
        service_name: 'telegram',
        credentials: { chat_count: telegram.getActiveChatCount() },
        connected_at: telegram.chats[0]?.linked_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } : undefined;
    }
    return integrations.find(i => i.service_name === serviceName.toLowerCase());
  };

  const initiateOAuth = (serviceName: string) => {
    try {
      console.log('=== INITIATING OAUTH ===');
      console.log('Service:', serviceName);
      console.log('Current URL:', window.location.href);
      console.log('User authenticated:', !!user);
      console.log('User ID:', user?.id);
      console.log('SessionStorage before OAuth:', Object.keys(sessionStorage).map(key => `${key}: ${key.includes('token') ? '[REDACTED]' : sessionStorage.getItem(key)}`));
      
      const authUrl = generateAuthUrl(serviceName.toLowerCase());
      console.log('Generated auth URL:', authUrl);
      console.log('Expected callback URL:', window.location.origin + `/oauth/callback/${serviceName.toLowerCase()}`);
      
      // Verify OAuth configuration before redirecting
      const oauthConfig = oauthConfigs[serviceName.toLowerCase()];
      if (!oauthConfig) {
        console.error('OAuth configuration missing for service:', serviceName);
        return { error: 'OAuth configuration not found' };
      }
      
      console.log('OAuth config found:', {
        hasClientId: !!oauthConfig.clientId,
        authUrl: oauthConfig.authUrl
      });
      
      console.log('About to redirect to OAuth provider:', authUrl.substring(0, 100) + '...');
      
      // Add a small delay to ensure state is saved
      setTimeout(() => {
        console.log('Final check - SessionStorage just before redirect:', Object.keys(sessionStorage).length + ' items');
      }, 100);
      
      window.location.href = authUrl;
      return { error: null };
    } catch (error) {
      console.error('=== OAUTH INITIATION ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Stack:', error?.stack);
      return { error: error instanceof Error ? error.message : 'Failed to start OAuth flow' };
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [user, session]);

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