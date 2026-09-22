import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

const storage = Platform.OS === 'web'
  ? {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      removeItem: (key: string) => localStorage.removeItem(key),
    }
  : {
      getItem: (key: string) => {
        try {
          return (require('react-native').AsyncStorage?.getItem?.(key)) ?? null;
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          require('react-native').AsyncStorage?.setItem?.(key, value);
        } catch {
          // noop
        }
      },
      removeItem: (key: string) => {
        try {
          require('react-native').AsyncStorage?.removeItem?.(key);
        } catch {
          // noop
        }
      },
    };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
