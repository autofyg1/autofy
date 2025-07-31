import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useIntegrations } from '../hooks/useIntegrations';
import { validateState } from '../lib/oauth';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const OAuthCallback: React.FC = () => {
  const { service } = useParams<{ service: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connectIntegration } = useIntegrations();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Handle OAuth errors
        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        // Validate required parameters
        if (!code || !state || !service) {
          throw new Error('Missing required OAuth parameters');
        }

        // Validate state parameter for CSRF protection
        if (!validateState(state)) {
          throw new Error('Invalid state parameter. Possible CSRF attack.');
        }

        // Ensure user is authenticated
        if (!user) {
          throw new Error('User not authenticated');
        }

        setMessage('Exchanging authorization code for tokens...');

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
            state
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to exchange tokens');
        }

        const { credentials } = await response.json();

        setMessage('Saving integration credentials...');

        // Store the credentials in Supabase
        const { error: integrationError } = await connectIntegration(service, credentials);

        if (integrationError) {
          throw new Error(integrationError);
        }

        setStatus('success');
        setMessage(`Successfully connected ${service.charAt(0).toUpperCase() + service.slice(1)}!`);

        // Redirect to integrations page after success
        setTimeout(() => {
          navigate('/integrations');
        }, 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
        
        // Redirect to integrations page after error
        setTimeout(() => {
          navigate('/integrations');
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, service, user, connectIntegration, navigate]);

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