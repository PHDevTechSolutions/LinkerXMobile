import { create } from 'zustand';
import { setItem, getItem, removeItem } from '@/lib/storage';

export type User = {
  _id: string;
  userName: string;
  email: string;
  avatar?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setAuth: async (user, token) => {
    await setItem('token', token);
    await setItem('user', JSON.stringify(user));
    set({ user, token });
  },

  clearAuth: async () => {
    await removeItem('token');
    await removeItem('user');
    set({ user: null, token: null });
  },

  loadAuth: async () => {
    try {
      const token = await getItem('token');
      const userStr = await getItem('user');
      if (token && userStr) {
        set({ user: JSON.parse(userStr), token });
      }
    } catch (_) {
      // ignore
    } finally {
      set({ isLoading: false });
    }
  },
}));
