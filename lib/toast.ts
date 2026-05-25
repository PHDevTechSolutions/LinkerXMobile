import { create } from 'zustand';
import { ToastType } from '@/components/Toast';

type ToastState = {
  visible: boolean;
  message: string;
  type: ToastType;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'info',

  show: (message, type = 'info') => {
    set({ visible: false }); // reset first so re-trigger works
    setTimeout(() => set({ visible: true, message, type }), 50);
  },

  hide: () => set({ visible: false }),
}));

// Convenience helpers — call these anywhere without hooks
export const toast = {
  success: (msg: string) => useToastStore.getState().show(msg, 'success'),
  error:   (msg: string) => useToastStore.getState().show(msg, 'error'),
  warning: (msg: string) => useToastStore.getState().show(msg, 'warning'),
  info:    (msg: string) => useToastStore.getState().show(msg, 'info'),
};
