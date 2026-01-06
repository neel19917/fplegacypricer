/**
 * Custom React Hook for Supabase Authentication
 * Handles sign-up, sign-in, logout, and user profile management
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, isEmailDomainAllowed, ALLOWED_DOMAIN } from '../supabaseConfig';

export function useSupabaseAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and check for existing session
  useEffect(() => {
    if (!supabase) {
      console.log('[Supabase Auth] ℹ️ Supabase not configured');
      setIsLoading(false);
      return;
    }

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleAuthSuccess(session.user);
      } else {
        console.log('[Supabase Auth] ℹ️ No existing session found');
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleAuthSuccess(session.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = useCallback(async (supabaseUser) => {
    const email = supabaseUser.email;
    
    console.log('[Supabase Auth] 🔍 Validating user:', { email });
    
    // Validate domain
    if (!isEmailDomainAllowed(email)) {
      console.warn(`[Supabase Auth] ❌ Domain not allowed: ${email}`);
      setError(`Access denied. Only @${ALLOWED_DOMAIN} email addresses are allowed.`);
      setIsAuthenticated(false);
      setUser(null);
      // Sign out the user
      if (supabase) {
        supabase.auth.signOut();
      }
    } else {
      console.log('[Supabase Auth] ✅ User authenticated successfully');
      
      // Update or create user profile with email and app access
      try {
        const appName = 'fppricing'; // This app's identifier
        
        // Check if user profile exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('allowed_apps, email')
          .eq('id', supabaseUser.id)
          .single();
        
        if (existingProfile) {
          // Update existing profile: add app to allowed_apps if not already there
          const currentApps = existingProfile.allowed_apps || [];
          if (!currentApps.includes(appName)) {
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({ 
                allowed_apps: [...currentApps, appName],
                email: email // Update email if changed
              })
              .eq('id', supabaseUser.id);
            
            if (updateError) {
              console.warn('[Supabase Auth] ⚠️ Failed to update user profile:', updateError);
            } else {
              console.log('[Supabase Auth] ✅ User profile updated with app access');
            }
          }
        } else {
          // Create new profile
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              id: supabaseUser.id,
              email: email,
              full_name: supabaseUser.user_metadata?.full_name || email.split('@')[0],
              allowed_apps: [appName]
            });
          
          if (insertError) {
            console.warn('[Supabase Auth] ⚠️ Failed to create user profile:', insertError);
          } else {
            console.log('[Supabase Auth] ✅ User profile created with app access');
          }
        }
      } catch (profileError) {
        console.warn('[Supabase Auth] ⚠️ User profile error:', profileError);
        // Continue with authentication even if profile update fails
      }
      
      setIsAuthenticated(true);
      setUser({
        name: supabaseUser.user_metadata?.full_name || email.split('@')[0],
        email: email,
        id: supabaseUser.id,
      });
      setError('');
    }
  }, []);

  // Sign in with email/password
  const signIn = useCallback(async (email, password) => {
    if (!supabase) {
      setError('Supabase is not configured');
      return { success: false };
    }

    try {
      setIsLoading(true);
      setError('');
      
      console.log('[Supabase Auth] 🔐 Attempting sign in...');
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        handleAuthSuccess(data.user);
        return { success: true };
      }

      return { success: false };
      
    } catch (err) {
      console.error('[Supabase Auth] ❌ Sign in error:', err);
      setError(err.message || 'Failed to sign in');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthSuccess]);

  // Sign up with email/password
  const signUp = useCallback(async (email, password, fullName = '') => {
    if (!supabase) {
      setError('Supabase is not configured');
      return { success: false };
    }

    try {
      setIsLoading(true);
      setError('');
      
      // Validate domain before signing up
      if (!isEmailDomainAllowed(email)) {
        throw new Error(`Only @${ALLOWED_DOMAIN} email addresses are allowed`);
      }
      
      console.log('[Supabase Auth] 📝 Attempting sign up...');
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        console.log('[Supabase Auth] ✅ Sign up successful');
        return { 
          success: true, 
          needsConfirmation: data.user.identities?.length === 0 
        };
      }

      return { success: false };
      
    } catch (err) {
      console.error('[Supabase Auth] ❌ Sign up error:', err);
      setError(err.message || 'Failed to sign up');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign in with Magic Link (passwordless)
  const signInWithMagicLink = useCallback(async (email) => {
    if (!supabase) {
      setError('Supabase is not configured');
      return { success: false };
    }

    try {
      setIsLoading(true);
      setError('');
      
      // Validate domain
      if (!isEmailDomainAllowed(email)) {
        throw new Error(`Only @${ALLOWED_DOMAIN} email addresses are allowed`);
      }
      
      console.log('[Supabase Auth] 🔗 Sending magic link...');
      
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (magicLinkError) throw magicLinkError;

      console.log('[Supabase Auth] ✅ Magic link sent');
      return { success: true };
      
    } catch (err) {
      console.error('[Supabase Auth] ❌ Magic link error:', err);
      setError(err.message || 'Failed to send magic link');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    if (!supabase) return;

    try {
      console.log('[Supabase Auth] 🚪 Signing out...');
      
      await supabase.auth.signOut();
      
      setIsAuthenticated(false);
      setUser(null);
      setError('');
      
      console.log('[Supabase Auth] ✅ Sign out complete');
      
    } catch (err) {
      console.error('[Supabase Auth] ❌ Sign out error:', err);
    }
  }, []);

  // Sign in with Microsoft OAuth
  const signInWithMicrosoft = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured');
      return { success: false };
    }

    try {
      setIsLoading(true);
      setError('');
      
      console.log('[Supabase Auth] 🔐 Initiating Microsoft OAuth...');
      
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: window.location.origin,
          scopes: 'email',
        }
      });

      if (oauthError) throw oauthError;

      console.log('[Supabase Auth] ✅ Microsoft OAuth initiated');
      return { success: true };
      
    } catch (err) {
      console.error('[Supabase Auth] ❌ Microsoft OAuth error:', err);
      setError(err.message || 'Failed to sign in with Microsoft');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign in with Google OAuth
  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured');
      return { success: false };
    }

    try {
      setIsLoading(true);
      setError('');
      
      console.log('[Supabase Auth] 🔐 Initiating Google OAuth...');
      
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });

      if (oauthError) throw oauthError;

      console.log('[Supabase Auth] ✅ Google OAuth initiated');
      return { success: true };
      
    } catch (err) {
      console.error('[Supabase Auth] ❌ Google OAuth error:', err);
      setError(err.message || 'Failed to sign in with Google');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email) => {
    if (!supabase) {
      setError('Supabase is not configured');
      return { success: false };
    }

    try {
      setError('');
      
      console.log('[Supabase Auth] 🔑 Sending password reset email...');
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      console.log('[Supabase Auth] ✅ Password reset email sent');
      return { success: true };
      
    } catch (err) {
      console.error('[Supabase Auth] ❌ Password reset error:', err);
      setError(err.message || 'Failed to send password reset email');
      return { success: false, error: err.message };
    }
  }, []);

  return {
    isAuthenticated,
    user,
    error,
    isLoading,
    signIn,
    signUp,
    signInWithMagicLink,
    signInWithMicrosoft,
    signInWithGoogle,
    signOut,
    resetPassword,
  };
}

