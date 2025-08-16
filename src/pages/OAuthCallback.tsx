import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useIntegrations } from '../hooks/useIntegrations';
import { supabase } from '../lib/supabase';
import { oauthConfigs, getConfigRedirectUri } from '../lib/oauth';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const OAuthCallback: React.FC = () => {
  const { service } = useParams<{ service: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connectIntegration } = useIntegrations();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');
  const isProcessing = useRef(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Prevent multiple executions
      if (isProcessing.current) {
        console.log('OAuth callback already processing, skipping...');
        return;
      }

      // Check if we've already processed this exact URL
      const currentUrl = window.location.href;
      const processedKey = `processed_${btoa(currentUrl)}`;
      if (sessionStorage.getItem(processedKey)) {
        console.log('OAuth callback already processed for this URL, skipping...');
        return;
      }

      // Check if we're in the middle of processing (e.g., after page refresh)
      const processingKey = `processing_${service}`;
      if (sessionStorage.getItem(processingKey)) {
        console.log('OAuth callback was interrupted, redirecting to integrations...');
        navigate('/integrations');
        return;
      }

      isProcessing.current = true;
      sessionStorage.setItem(processingKey, 'true');

      try {
        console.log('=== OAUTH CALLBACK STARTED ===');
        console.log('Current URL:', window.location.href);
        console.log('Service from params:', service);
        console.log('Current sessionStorage:', JSON.stringify(sessionStorage));
        
        // Mark this URL as being processed
        sessionStorage.setItem(processedKey, 'true');
        
        // Clean up processed markers after 5 minutes to prevent sessionStorage buildup
        setTimeout(() => {
          sessionStorage.removeItem(processedKey);
        }, 5 * 60 * 1000);
        
        // Get parameters from URL using URLSearchParams directly
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        console.log('URL Parameters:');
        console.log('- code:', code ? 'present' : 'missing');
        console.log('- state:', state);
        console.log('- error:', error);

        // Handle OAuth errors
        if (error) {
          console.error('OAuth error from provider:', error);
          throw new Error(`OAuth error: ${error}`);
        }

        // Validate required parameters
        if (!code || !service) {
          console.error('Missing required parameters:', { code: !!code, service });
          throw new Error('Missing required OAuth parameters');
        }

        console.log('=== CHECKING STORED STATES ===');
        const storedStateGeneric = sessionStorage.getItem('oauth_state');
        const storedStateSpecific = sessionStorage.getItem(`oauth_state_${service}`);
        console.log('Stored state (generic):', storedStateGeneric);
        console.log('Stored state (service-specific):', storedStateSpecific);
        console.log('Received state:', state);
        
        // Check if we have any stored state
        if (!storedStateGeneric && !storedStateSpecific) {
          console.warn('No stored state found. This could indicate:');
          console.warn('1. OAuth flow was initiated from different browser session');
          console.warn('2. SessionStorage was cleared during redirect');
          console.warn('3. Cross-origin issues');
          console.warn('4. Browser security restrictions');
        }

        // Ensure user is authenticated
        if (!user) {
          console.error('User not authenticated');
          throw new Error('User not authenticated');
        }

        setMessage('Exchanging authorization code for tokens...');
        console.log('=== CALLING EDGE FUNCTION ===');

        // Call our edge function to exchange code for tokens
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-exchange`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service,
            code,
            state,
            redirectUri: getConfigRedirectUri(oauthConfigs[service]), // Get the redirectUri using helper function
            debug: true // Add debug flag
          })
        });

        console.log('Edge function response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Edge function error:', errorData);
          
          // Handle specific OAuth errors
          if (errorData.error && errorData.error.includes('invalid_grant')) {
            throw new Error('Authorization code has expired or been used. Please try connecting again.');
          }
          
          throw new Error(errorData.error || 'Failed to exchange tokens');
        }

        const { credentials } = await response.json();
        console.log('Received credentials from edge function:', credentials ? 'present' : 'missing');

        setMessage('Saving integration credentials...');
        console.log('=== SAVING TO SUPABASE ===');

        // Store the credentials in Supabase
        const { error: integrationError } = await connectIntegration(service, credentials);

        if (integrationError) {
          console.error('Integration save error:', integrationError);
          throw new Error(integrationError);
        }

        // Clear OAuth state after successful processing
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem(`oauth_state_${service}`);
        sessionStorage.removeItem(processingKey);

        console.log('=== SUCCESS ===');
        setStatus('success');
        setMessage(`Successfully connected ${service.charAt(0).toUpperCase() + service.slice(1)}!`);

        // Redirect to integrations page after success
        setTimeout(() => {
          navigate('/integrations');
        }, 2000);

      } catch (error) {
        console.error('=== OAUTH CALLBACK ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
        
        // Clear OAuth state on error as well
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem(`oauth_state_${service}`);
        sessionStorage.removeItem(processingKey);
        
        // Redirect to integrations page after error
        setTimeout(() => {
          navigate('/integrations');
        }, 3000);
      } finally {
        isProcessing.current = false;
      }
    };

    handleOAuthCallback();
  }, [service, user, connectIntegration, navigate]); // Removed searchParams from dependencies

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-12 h-12 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mb-6">
          {getStatusIcon()}
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">
          {status === 'loading' && 'Connecting Integration'}
          {status === 'success' && 'Integration Connected!'}
          {status === 'error' && 'Connection Failed'}
        </h1>
        <p className={`text-lg ${getStatusColor()} mb-6`}>
          {message}
        </p>
        {status === 'loading' && (
          <div className="text-gray-400 text-sm">
            Please wait while we securely connect your account...
          </div>
        )}
        {status === 'success' && (
          <div className="text-gray-400 text-sm">
            Redirecting you back to integrations...
          </div>
        )}
        {status === 'error' && (
          <button
            onClick={() => navigate('/integrations')}
            className="bg-gradient-to-r from-blue-500 to-violet-500 text-white px-6 py-3 rounded-lg font-medium hover:scale-105 transition-transform duration-300"
          >
            Back to Integrations
          </button>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;