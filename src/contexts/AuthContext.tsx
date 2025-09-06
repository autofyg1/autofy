import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
      } else {
        // Profile doesn't exist, try to create one
        await createProfile(userId);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const createProfile = async (userId: string) => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) return;

      const newProfile = {
        id: userId,
        email: authUser.user.email!,
        full_name: authUser.user.user_metadata?.full_name || null,
        avatar_url: authUser.user.user_metadata?.avatar_url || null,
        timezone: 'UTC',
        plan_type: 'free',
        credits_used: 0,
        credits_limit: 1000,
        onboarding_completed: false,
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in createProfile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let sessionCheckTimeout: NodeJS.Timeout;
    
    // Get initial session with better error handling
    const getInitialSession = async () => {
      try {
        console.log('🔑 AuthContext: Getting initial session...');
        
        // Check for stale OAuth data (older than 5 minutes) and clean it up
        const oauthPreservedAuth = sessionStorage.getItem('oauth-preserved-auth');
        const oauthInProgress = sessionStorage.getItem('oauth-in-progress');
        
        if (oauthPreservedAuth) {
          try {
            const preservedData = JSON.parse(oauthPreservedAuth);
            const age = Date.now() - (preservedData.timestamp || 0);
            const maxAge = 5 * 60 * 1000; // 5 minutes
            
            if (age > maxAge) {
              console.warn('⚠️ AuthContext: Clearing stale OAuth data (age:', Math.round(age / 1000), 'seconds)');
              sessionStorage.removeItem('oauth-preserved-auth');
              sessionStorage.removeItem('oauth-in-progress');
              // Don't process stale OAuth data
              return;
            }
          } catch (parseErr) {
            console.error('❌ AuthContext: Failed to parse OAuth timestamp, clearing:', parseErr);
            sessionStorage.removeItem('oauth-preserved-auth');
            sessionStorage.removeItem('oauth-in-progress');
          }
        }
        
        if (oauthPreservedAuth && oauthInProgress) {
          console.log('🔄 AuthContext: Restoring OAuth-preserved authentication...');
          
          // Add timeout for OAuth restoration to prevent infinite loading
          const oauthTimeout = setTimeout(() => {
            console.warn('⚠️ AuthContext: OAuth restoration timed out, clearing loading state');
            if (isMounted) {
              setLoading(false);
            }
            // Clean up OAuth data on timeout
            sessionStorage.removeItem('oauth-preserved-auth');
            sessionStorage.removeItem('oauth-in-progress');
          }, 10000); // 10 second timeout
          
          try {
            const preservedData = JSON.parse(oauthPreservedAuth);
            console.log('✅ AuthContext: Found OAuth-preserved auth data:', {
              hasToken: !!preservedData.accessToken,
              hasUser: !!preservedData.user
            });
            
            // Restore the preserved authentication
            if (preservedData.accessToken && preservedData.refreshToken) {
              sessionStorage.setItem('auth-token', preservedData.accessToken);
              sessionStorage.setItem('refresh-token', preservedData.refreshToken);
              console.log('✅ AuthContext: Tokens restored to sessionStorage');
              
              // Create a proper session object
              const sessionObj = {
                access_token: preservedData.accessToken,
                refresh_token: preservedData.refreshToken,
                expires_at: preservedData.expiresAt,
                expires_in: preservedData.expiresAt ? preservedData.expiresAt - Math.floor(Date.now() / 1000) : 3600,
                token_type: 'bearer',
                user: preservedData.user
              };
              
              // Set the auth state and clear loading immediately
              setSession(sessionObj as any);
              setUser(preservedData.user as any);
              setLoading(false);
              console.log('✅ AuthContext: Auth state and loading state updated immediately');
              
              // Set Supabase session synchronously with a timeout
              try {
                const supabaseSetPromise = supabase.auth.setSession({
                  access_token: preservedData.accessToken,
                  refresh_token: preservedData.refreshToken,
                });
                
                // Wait for Supabase session with timeout
                const supabaseTimeout = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Supabase timeout')), 3000)
                );
                
                await Promise.race([supabaseSetPromise, supabaseTimeout]);
                console.log('✅ AuthContext: Supabase session set successfully during OAuth restore');
                
                // Update tokens in sessionStorage after successful Supabase session
                sessionStorage.setItem('auth-token', preservedData.accessToken);
                sessionStorage.setItem('refresh-token', preservedData.refreshToken);
                
              } catch (supabaseErr) {
                console.warn('⚠️ AuthContext: Supabase session failed during OAuth restore:', supabaseErr);
                // Even if Supabase fails, keep our manual state
              }
              
              // Fetch profile in background (don't await)
              if (preservedData.user?.id) {
                fetchProfile(preservedData.user.id).catch((profileErr) => {
                  console.warn('⚠️ AuthContext: Profile fetch failed during OAuth restore:', profileErr);
                });
              }
              
              // Clean up OAuth preservation data
              sessionStorage.removeItem('oauth-preserved-auth');
              sessionStorage.removeItem('oauth-in-progress');
              clearTimeout(oauthTimeout);
              
              console.log('✅ AuthContext: OAuth restoration completed successfully');
              return; // Exit early since we've restored the session
            } else {
              console.warn('⚠️ AuthContext: OAuth preserved data missing tokens');
              clearTimeout(oauthTimeout);
            }
          } catch (parseErr) {
            console.error('❌ AuthContext: Failed to parse OAuth-preserved auth:', parseErr);
            clearTimeout(oauthTimeout);
          }
          
          // Clean up corrupted or incomplete OAuth data
          sessionStorage.removeItem('oauth-preserved-auth');
          sessionStorage.removeItem('oauth-in-progress');
        }
        
        // Check if we have direct tokens in sessionStorage (our primary auth method)
        const directToken = sessionStorage.getItem('auth-token');
        const directRefreshToken = sessionStorage.getItem('refresh-token');
        
        if (directToken && directRefreshToken) {
          console.log('🔑 AuthContext: Found direct tokens, attempting to restore session...');
          try {
            await supabase.auth.setSession({
              access_token: directToken,
              refresh_token: directRefreshToken,
            });
            console.log('✅ AuthContext: Direct token restoration successful');
            // The onAuthStateChange will handle the rest
            if (isMounted) {
              setLoading(false);
            }
            return;
          } catch (directErr) {
            console.warn('⚠️ AuthContext: Direct token restoration failed, falling back to Supabase session:', directErr);
          }
        }
        
        // Try Supabase session with shorter timeout, but don't fail completely if it times out
        console.log('🔄 AuthContext: Attempting Supabase session retrieval...');
        let session = null;
        
        try {
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), 5000) // Reduced to 5 seconds
          );
          
          const sessionResult = await Promise.race([
            supabase.auth.getSession(),
            timeoutPromise
          ]);
          
          const { data: sessionData, error } = sessionResult;
          
          if (error) {
            console.warn('⚠️ AuthContext: Supabase session error (continuing anyway):', error);
          } else {
            session = sessionData.session;
            console.log('✅ AuthContext: Supabase session retrieved successfully');
          }
        } catch (sessionErr) {
          console.warn('⚠️ AuthContext: Supabase session timeout (continuing anyway):', sessionErr);
          // Don't fail completely - we'll continue without Supabase session
        }
        
        console.log('✅ AuthContext: Session retrieved:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          isExpired: session?.expires_at ? Math.floor(Date.now() / 1000) >= session.expires_at : null
        });
        
        // Check if session is expired and try to refresh
        if (session && session.expires_at && Math.floor(Date.now() / 1000) >= session.expires_at) {
          console.log('🔄 AuthContext: Session expired, attempting refresh...');
          try {
            const { data: refreshResult, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshResult.session) {
              console.error('❌ AuthContext: Session refresh failed:', refreshError);
              throw new Error('Session refresh failed');
            }
            console.log('✅ AuthContext: Session refreshed successfully');
            if (isMounted) {
              setSession(refreshResult.session);
              setUser(refreshResult.session?.user ?? null);
              if (refreshResult.session?.user?.id) {
                await fetchProfile(refreshResult.session.user.id);
              }
            }
          } catch (refreshErr) {
            console.error('❌ AuthContext: Session refresh failed:', refreshErr);
            if (isMounted) {
              setSession(null);
              setUser(null);
              setProfile(null);
            }
          }
        } else {
          if (isMounted) {
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user?.id) {
              await fetchProfile(session.user.id);
            }
          }
        }
        
      } catch (error) {
        console.error('❌ AuthContext: Session error:', error);
        // Continue without session (user will need to log in)
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Debounce the initial session check to prevent rapid calls
    sessionCheckTimeout = setTimeout(() => {
      getInitialSession();
    }, 100);

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 AuthContext: Auth state change:', event, {
        hasSession: !!session,
        hasUser: !!session?.user
      });
      
      if (!isMounted) return;
      
      // Don't override auth state if we're in the middle of OAuth restoration
      const oauthInProgress = sessionStorage.getItem('oauth-in-progress');
      if (oauthInProgress && event === 'SIGNED_IN') {
        console.log('⚠️ AuthContext: Ignoring SIGNED_IN event during OAuth restoration');
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user?.id) {
        try {
          await fetchProfile(session.user.id);
        } catch (error) {
          console.error('❌ AuthContext: Error fetching profile on auth change:', error);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      isMounted = false;
      if (sessionCheckTimeout) {
        clearTimeout(sessionCheckTimeout);
      }
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { apiClient } = await import('../lib/api-client');
      
      const response = await apiClient.signUp({
        email,
        password,
        full_name: fullName,
      });
      
      if (response.success) {
        return { error: null };
      } else {
        return { error: { message: response.message || 'Failed to create account' } };
      }
    } catch (error: any) {
      return { error: { message: error.message || 'Failed to create account' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 AuthContext: Starting sign in process...');
      const { apiClient } = await import('../lib/api-client');
      
      // Add a timeout to the sign-in process
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Sign-in timeout')), 30000) // 30 second timeout
      );
      
      const signInPromise = apiClient.signIn({
        email,
        password,
      });
      
      const response = await Promise.race([signInPromise, timeoutPromise]);
      
      if (response.success && response.session) {
        // Store token directly in a reliable way
        console.log('🔑 AuthContext: Storing auth token directly...');
        sessionStorage.setItem('auth-token', response.session.access_token);
        sessionStorage.setItem('refresh-token', response.session.refresh_token);
        console.log('✅ AuthContext: Tokens stored in sessionStorage');
        
        // Create user object from response
        const user = response.user;
        const sessionObj = {
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token,
          expires_in: response.session.expires_in,
          expires_at: Math.floor(Date.now() / 1000) + response.session.expires_in,
          token_type: response.session.token_type,
          user: user
        };
        
        // Set a maximum wait time for Supabase session setting
        const supabaseTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Supabase session timeout')), 5000) // 5 second timeout
        );
        
        try {
          // Try to set Supabase session but don't fail if it doesn't work
          await Promise.race([
            supabase.auth.setSession({
              access_token: response.session.access_token,
              refresh_token: response.session.refresh_token,
            }),
            supabaseTimeout
          ]);
          console.log('✅ AuthContext: Supabase session set successfully');
          
          // Wait briefly for auth state change to trigger
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (supabaseErr) {
          console.warn('⚠️ AuthContext: Supabase session failed, manually setting state:', supabaseErr);
          // Manually update auth state if Supabase session setting fails or times out
          setSession(sessionObj as any);
          setUser(user as any);
          setLoading(false);
          
          // Fetch profile for this user
          if (user?.id) {
            try {
              await fetchProfile(user.id);
            } catch (profileErr) {
              console.warn('⚠️ AuthContext: Profile fetch failed:', profileErr);
            }
          }
        }
        
        // Ensure loading state is cleared
        if (loading) {
          console.log('🔄 AuthContext: Forcing loading state to false');
          setLoading(false);
        }
        
        console.log('✅ AuthContext: Sign-in process completed successfully');
        return { error: null };
      } else {
        return { error: { message: response.message || 'Invalid email or password' } };
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Sign-in error:', error);
      // Ensure loading state is cleared even on error
      setLoading(false);
      return { error: { message: error.message || 'Failed to sign in' } };
    }
  };

  const signOut = async () => {
    console.log('🚪 AuthContext: Signing out...');
    
    // Clear our direct storage
    sessionStorage.removeItem('auth-token');
    sessionStorage.removeItem('refresh-token');
    
    // Clear OAuth preservation data
    sessionStorage.removeItem('oauth-preserved-auth');
    sessionStorage.removeItem('oauth-in-progress');
    
    // Clear all local state immediately
    setSession(null);
    setUser(null);
    setProfile(null);
    setLoading(false);
    
    try {
      await supabase.auth.signOut();
      console.log('✅ AuthContext: Supabase signOut successful');
    } catch (error) {
      console.warn('⚠️ AuthContext: Supabase signOut failed, but continuing:', error);
    }
    
    // Emergency cleanup of all auth-related storage
    try {
      const keys = Object.keys(localStorage);
      const authKeys = keys.filter(key => 
        key.includes('supabase') || 
        key.includes('auth') || 
        key.includes('oauth') ||
        key.includes('session')
      );
      authKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`🧡 AuthContext: Cleared localStorage key: ${key}`);
        } catch (err) {
          console.warn(`⚠️ AuthContext: Failed to clear ${key}:`, err);
        }
      });
      
      // Also clear sessionStorage of auth-related items
      const sessionKeys = Object.keys(sessionStorage);
      const authSessionKeys = sessionKeys.filter(key => 
        key.includes('auth') || 
        key.includes('oauth') ||
        key.includes('session') ||
        key.includes('token')
      );
      authSessionKeys.forEach(key => {
        try {
          sessionStorage.removeItem(key);
          console.log(`🧡 AuthContext: Cleared sessionStorage key: ${key}`);
        } catch (err) {
          console.warn(`⚠️ AuthContext: Failed to clear ${key}:`, err);
        }
      });
      
    } catch (error) {
      console.warn('⚠️ AuthContext: Failed to clear storage:', error);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};