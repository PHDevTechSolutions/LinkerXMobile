import { create } from 'zustand';
import { MusicTrack } from './musicStore';

// Stores "now playing" status for other users
type ActivityState = {
  nowPlaying: Record<string, MusicTrack | null>; // userId -> track
  setNowPlaying: (userId: string, track: MusicTrack | null) => void;
  getNowPlaying: (userId: string) => MusicTrack | null;
};

export const useActivityStore = create<ActivityState>((set, get) => ({
  nowPlaying: {},

  setNowPlaying: (userId, track) => {
    set((s) => ({ nowPlaying: { ...s.nowPlaying, [userId]: track } }));
  },

  getNowPlaying: (userId) => {
    return get().nowPlaying[userId] ?? null;
  },
}));
