import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// Ensure the URL always has the https:// protocol
const supabaseUrl = (() => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
})();

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});