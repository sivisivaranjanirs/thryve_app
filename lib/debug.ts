import { supabase } from './supabase';
import * as Sentry from '@sentry/react';

const { logger } = Sentry;

export class SupabaseDebugger {
  static async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing Supabase connection');
      
      // Test basic Supabase connection
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.error('Supabase auth connection failed', { error: error.message });
        return false;
      }
      
      logger.info('Supabase connection successful', { 
        hasSession: !!data.session,
        userId: data.session?.user?.id 
      });
      
      return true;
    } catch (error) {
      logger.error('Supabase connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      Sentry.captureException(error);
      return false;
    }
  }

  static async testEdgeFunction(functionName: 'elevenlabs-tts' | 'elevenlabs-stt'): Promise<boolean> {
    try {
      logger.info(`Testing Edge Function: ${functionName}`);
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !anonKey) {
        logger.error('Missing Supabase environment variables', {
          hasUrl: !!supabaseUrl,
          hasKey: !!anonKey
        });
        return false;
      }

      const testPayload = functionName === 'elevenlabs-tts' 
        ? { text: 'Test message' }
        : { audio: 'test' }; // This will fail but should reach the function

      const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify(testPayload),
      });

      logger.info(`Edge Function ${functionName} response`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Even if the function returns an error (expected for test data),
      // a 400/500 response means the function was reached
      if (response.status >= 200 && response.status < 600) {
        logger.info(`Edge Function ${functionName} is reachable`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Edge Function ${functionName} test failed`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      Sentry.captureException(error);
      return false;
    }
  }

  static async runFullDiagnostic(): Promise<{
    supabaseConnection: boolean;
    edgeFunctionsTTS: boolean;
    edgeFunctionsSTT: boolean;
    environmentVariables: boolean;
  }> {
    logger.info('Starting full Supabase diagnostic');

    const results = {
      supabaseConnection: false,
      edgeFunctionsTTS: false,
      edgeFunctionsSTT: false,
      environmentVariables: false,
    };

    // Check environment variables
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    results.environmentVariables = !!(supabaseUrl && anonKey);
    
    logger.info('Environment variables check', {
      hasSupabaseUrl: !!supabaseUrl,
      hasAnonKey: !!anonKey,
      supabaseUrlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing'
    });

    if (results.environmentVariables) {
      // Test Supabase connection
      results.supabaseConnection = await this.testConnection();

      // Test Edge Functions
      results.edgeFunctionsTTS = await this.testEdgeFunction('elevenlabs-tts');
      results.edgeFunctionsSTT = await this.testEdgeFunction('elevenlabs-stt');
    }

    logger.info('Diagnostic complete', results);
    return results;
  }

  static logEnvironmentInfo(): void {
    logger.info('Environment information', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      url: window.location.href,
      origin: window.location.origin,
    });
  }
}