import { create } from 'zustand';

export type MusicTrack = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
};

// Broadcast now_playing to socket (lazy import to avoid circular deps)
function broadcastNowPlaying(track: MusicTrack | null) {
  try {
    const { useAuthStore } = require('@/store/authStore');
    const { getSocket } = require('@/lib/socket');
    const token = useAuthStore.getState().token;
    if (!token) return;
    const socket = getSocket(token);
    socket.emit('now_playing', { track });
  } catch (_) {}
}

type MusicState = {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  isVisible: boolean;
  isMinimized: boolean;

  // Actions
  playTrack: (track: MusicTrack) => void;
  togglePlay: () => void;
  closePlayer: () => void;
  toggleMinimize: () => void;
};

export const useMusicStore = create<MusicState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  isVisible: false,
  isMinimized: false,

  playTrack: (track) => {
    set({ currentTrack: track, isPlaying: true, isVisible: true, isMinimized: false });
    broadcastNowPlaying(track);
  },

  togglePlay: () => {
    set((s) => {
      const isPlaying = !s.isPlaying;
      broadcastNowPlaying(isPlaying ? s.currentTrack : null);
      return { isPlaying };
    });
  },

  closePlayer: () => {
    set({ currentTrack: null, isPlaying: false, isVisible: false, isMinimized: false });
    broadcastNowPlaying(null);
  },

  toggleMinimize: () => {
    set((s) => ({ isMinimized: !s.isMinimized }));
  },
}));
