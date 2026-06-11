import { create } from 'zustand';
import { User } from '@/types';
import { setSupabaseToken } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  loadSession: () => Promise<void>;
  login: (mobileNumber: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, mobileNumber: string, password: string, role: 'customer' | 'provider', serviceCategory?: string) => Promise<{ success: boolean; otp?: string; error?: string }>;
  verifyOtp: (mobileNumber: string, otpCode: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
  setError: (error: string | null) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setError: (error) => set({ error }),

  loadSession: async () => {
    set({ isLoading: true });
    try {
      const storedToken = localStorage.getItem('qf_token');
      const storedUser = localStorage.getItem('qf_user');
      
      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser) as User;
        await setSupabaseToken(storedToken);
        set({
          token: storedToken,
          user,
          isAuthenticated: true,
          error: null,
        });
      }
    } catch (e) {
      console.error('Failed to load auth session:', e);
      localStorage.removeItem('qf_token');
      localStorage.removeItem('qf_user');
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (mobileNumber, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      localStorage.setItem('qf_token', data.token);
      document.cookie = `qf_token=${data.token}; path=/; max-age=2592000; SameSite=Strict`;
      localStorage.setItem('qf_user', JSON.stringify(data.user));
      await setSupabaseToken(data.token);

      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        error: null,
      });
      
      return { success: true };
    } catch (err: any) {
      set({ error: err.message });
      return { success: false, error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (fullName, mobileNumber, password, role, serviceCategory) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, mobileNumber, password, role, serviceCategory }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      return { success: true, otp: data.otp };
    } catch (err: any) {
      set({ error: err.message });
      return { success: false, error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOtp: async (mobileNumber, otpCode) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, otpCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed.');
      }

      localStorage.setItem('qf_token', data.token);
      document.cookie = `qf_token=${data.token}; path=/; max-age=2592000; SameSite=Strict`;
      localStorage.setItem('qf_user', JSON.stringify(data.user));
      await setSupabaseToken(data.token);

      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        error: null,
      });

      return { success: true, user: data.user };
    } catch (err: any) {
      set({ error: err.message });
      return { success: false, error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('qf_token');
    document.cookie = 'qf_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    localStorage.removeItem('qf_user');
    setSupabaseToken(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));
