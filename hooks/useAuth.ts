import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '@/lib/types';
import * as Sentry from '@sentry/react';

const { logger } = Sentry;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    return Sentry.startSpan(
      {
        op: "auth.signin",
        name: "User Sign In",
      },
      async (span) => {
        span.setAttribute("email", email);
        logger.info('User sign in attempt', { email });
        
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
        
        if (error) {
          logger.warn('Sign in failed', { email, error: error.message });
          span.setAttribute("success", false);
        } else {
          logger.info('Sign in successful', { email, userId: data.user?.id });
          span.setAttribute("success", true);
          span.setAttribute("user_id", data.user?.id || '');
          
          // Set user context for Sentry
          Sentry.setUser({
            id: data.user?.id,
            email: data.user?.email,
          });
        }
        
    return { data, error };
      }
    );
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    return Sentry.startSpan(
      {
        op: "auth.signup",
        name: "User Sign Up",
      },
      async (span) => {
        span.setAttribute("email", email);
        span.setAttribute("full_name", fullName);
        logger.info('User sign up attempt', { email, fullName });
        
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (data.user && !error) {
      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          email: email,
        });

      if (profileError) {
          logger.error('Error creating user profile', { 
            userId: data.user.id,
            error: profileError.message
          });
          Sentry.captureException(profileError);
      }
    }

        if (error) {
          logger.warn('Sign up failed', { email, error: error.message });
          span.setAttribute("success", false);
        } else {
          logger.info('Sign up successful', { email, userId: data.user?.id });
          span.setAttribute("success", true);
          span.setAttribute("user_id", data.user?.id || '');
        }
        
    return { data, error };
      }
    );
  };

  const signOut = async () => {
    logger.info('User sign out');
    Sentry.setUser(null); // Clear user context
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('Sign out failed', { error: error.message });
      Sentry.captureException(error);
    } else {
      logger.info('Sign out successful');
    }
    
    return { error };
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No user logged in') };

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (data && !error) {
      setProfile(data);
    }

    return { data, error };
  };

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    fetchProfile,
  };
}