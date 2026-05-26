import { useState, useCallback } from 'react';
import { MusicTrack } from '@/store/musicStore';

const API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

export type YouTubeSearchResult = MusicTrack;

export function useYouTubeSearch() {
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); return; }

    if (!API_KEY) {
      setError('YouTube API key not configured.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        // Removed videoCategoryId — it's too restrictive and causes errors
        // when combined with certain queries or regions
        maxResults: '15',
        key: API_KEY,
      });

      const res = await fetch(`${SEARCH_URL}?${params}`);
      const data = await res.json();

      if (!res.ok) {
        // Surface the actual Google API error message
        const msg = data?.error?.message || data?.error?.errors?.[0]?.reason || `API error ${res.status}`;
        console.error('[YouTube Search] API error:', JSON.stringify(data));
        throw new Error(msg);
      }

      console.log('[YouTube Search] success, items:', data.items?.length);

      const tracks: YouTubeSearchResult[] = (data.items || [])
        .filter((item: any) => item?.id?.videoId) // skip playlists/channels
        .map((item: any) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnail:
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url ||
            '',
        }));

      setResults(tracks);
    } catch (e: any) {
      console.error('[YouTube Search] caught error:', e);
      setError(e.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, search, clear };
}
