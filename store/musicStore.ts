import { create } from 'zustand';
import { getItem, setItem } from '@/lib/storage';

export type MusicTrack = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
};

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

export const useMusicStore = create<MusicState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  isVisible: false,
  isMinimized: false,

  playTrack: (track) => {
    set({ currentTrack: track, isPlaying: true, isVisible: true, isMinimized: false });
  },

  togglePlay: () => {
    set((s) => ({ isPlaying: !s.isPlaying }));
  },

  closePlayer: () => {
    set({ currentTrack: null, isPlaying: false, isVisible: false, isMinimized: false });
  },

  toggleMinimize: () => {
    set((s) => ({ isMinimized: !s.isMinimized }));
  },
}));
