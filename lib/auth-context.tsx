import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Store } from './types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  store: Store | null;
  loading: boolean;
  storeLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, storeName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshStore: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeLoading, setStoreLoading] = useState(false);

  const fetchStore = useCallback(async (userId: string) => {
    setStoreLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching store:', error);
        setStore(null);
      } else {
        setStore(data as Store | null);
      }
    } catch (e) {
      console.error('Failed to fetch store:', e);
      setStore(null);
    } finally {
      setStoreLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchStore(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await fetchStore(session.user.id);
        })();
      } else {
        setStore(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchStore]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: getAuthErrorMessage(error) };
      return { error: null };
    } catch (e: any) {
      return { error: 'No se pudo iniciar sesión. Verifique su conexión.' };
    }
  };

  const signUp = async (email: string, password: string, storeName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: getAuthErrorMessage(error) };
      if (data.user) {
        const { error: storeError } = await supabase
          .from('stores')
          .insert({ owner_id: data.user.id, name: storeName });
        if (storeError) {
          return { error: 'Se creó la cuenta pero hubo un problema creando la tienda. Intente nuevamente.' };
        }
      }
      return { error: null };
    } catch (e: any) {
      return { error: 'No se pudo crear la cuenta. Verifique su conexión.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setStore(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) return { error: getAuthErrorMessage(error) };
      return { error: null };
    } catch (e: any) {
      return { error: 'No se pudo enviar el correo de recuperación.' };
    }
  };

  const refreshStore = async () => {
    if (user) {
      await fetchStore(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, store, loading, storeLoading, signIn, signUp, signOut, resetPassword, refreshStore }}>
      {children}
    </AuthContext.Provider>
  );
}

function getAuthErrorMessage(error: any): string {
  const msg = error?.message || '';
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('User already registered')) return 'Ya existe una cuenta con este correo.';
  if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (msg.includes('Unable to validate email')) return 'El correo electrónico no es válido.';
  if (msg.includes('rate limit')) return 'Demasiados intentos. Espere unos minutos.';
  return msg || 'Ocurrió un error inesperado.';
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
