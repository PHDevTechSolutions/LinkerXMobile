import { create } from 'zustand';
import { getItem, setItem } from '@/lib/storage';

type SettingsState = {
  theme: 'dark' | 'light';
  notificationsEnabled: boolean;
  postNotifications: boolean;
  commentNotifications: boolean;
  followNotifications: boolean;
  messageNotifications: boolean;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  setTheme: (theme: 'dark' | 'light') => Promise<void>;
  toggleNotifications: (key: keyof Omit<SettingsState, 'theme' | 'loaded' | 'loadSettings' | 'setTheme' | 'toggleNotifications'>) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'dark',
  notificationsEnabled: true,
  postNotifications: true,
  commentNotifications: true,
  followNotifications: true,
  messageNotifications: true,
  loaded: false,

  loadSettings: async () => {
    try {
      const raw = await getItem('settings');
      if (raw) {
        const saved = JSON.parse(raw);
        set({ ...saved, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setTheme: async (theme) => {
    set({ theme });
    const current = get();
    await setItem('settings', JSON.stringify({ ...current, theme }));
  },

  toggleNotifications: async (key) => {
    const current = get();
    const newVal = !current[key as keyof SettingsState];
    set({ [key]: newVal } as any);
    await setItem('settings', JSON.stringify({ ...current, [key]: newVal }));
  },
}));
