declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      // Client-side environment variables are no longer needed for ElevenLabs
      // as the API keys are now securely stored in Supabase Edge Functions
    }
  }
}

// Ensure this file is treated as a module
export {};