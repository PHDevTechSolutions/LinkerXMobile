import { create } from 'zustand';

export type AppNotification = {
  id: string;
  type: 'message' | 'follow' | 'comment' | 'like' | 'call';
  title: string;
  body: string;
  fromUserId?: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  targetId?: string; // chatId, postId, etc.
  read: boolean;
  createdAt: string;
};

type NotificationState = {
  notifications: AppNotification[];
  unreadCount: number;
  unreadMessages: number; // separate badge for chat tab

  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
  incrementUnreadMessages: () => void;
  resetUnreadMessages: () => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  unreadMessages: 0,

  addNotification: (n) => {
    const notification: AppNotification = {
      ...n,
      id: `notif_${Date.now()}_${Math.random()}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 100), // keep last 100
      unreadCount: state.unreadCount + 1,
    }));
  },

  markRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    });
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  incrementUnreadMessages: () =>
    set((state) => ({ unreadMessages: state.unreadMessages + 1 })),

  resetUnreadMessages: () => set({ unreadMessages: 0 }),
}));
