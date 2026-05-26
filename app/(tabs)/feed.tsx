import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColors } from '@/hooks/useColors';
import PostCard, { Post } from '@/components/PostCard';
import RssCard, { RssItem } from '@/components/RssCard';
import Avatar from '@/components/Avatar';
import Stories from '@/components/Stories';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

type FeedItem =
  | { kind: 'post'; data: Post }
  | { kind: 'rss';  data: RssItem };

export default function FeedScreen() {
  const { user } = useAuthStore();
  const C = useColors();

  const [posts, setPosts]         = useState<Post[]>([]);
  const [rssItems, setRssItems]   = useState<RssItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);

  const flatListRef   = useRef<FlatList>(null);
  const scrollY       = useRef(new Animated.Value(0)).current;
  const lastFetchTime = useRef(Date.now());
  const isAtTop       = useRef(true);

  // ── Fetch posts ─────────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async (silent = false) => {
    try {
      const { data } = await api.get('/api/feed/feed');
      const fresh: Post[] = data.posts || [];
      if (silent) {
        // Count new posts since last fetch
        const newCount = fresh.filter(
          (p) => new Date(p.createdAt).getTime() > lastFetchTime.current
        ).length;
        if (newCount > 0) setNewPostsCount((prev) => prev + newCount);
      } else {
        setPosts(fresh);
        setNewPostsCount(0);
      }
      lastFetchTime.current = Date.now();
    } catch (_) {}
  }, []);

  // ── Fetch RSS ────────────────────────────────────────────────────────────────
  const fetchRss = useCallback(async () => {
    try {
      const { data } = await api.get('/api/rss/feed');
      setRssItems(data.items || []);
    } catch (_) {}
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchPosts(), fetchRss()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchPosts, fetchRss]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Auto-refresh every 60s (silent) ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAtTop.current) fetchPosts(true); // silent check for new posts
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  // ── Merge posts + RSS into a single feed ─────────────────────────────────────
  const feedItems: FeedItem[] = React.useMemo(() => {
    const postItems: FeedItem[] = posts.map((p) => ({ kind: 'post', data: p }));
    const rssFeeds: FeedItem[]  = rssItems.map((r) => ({ kind: 'rss',  data: r }));

    // Interleave: every 3 posts, insert 1 RSS item
    const merged: FeedItem[] = [];
    let rssIdx = 0;
    postItems.forEach((item, i) => {
      merged.push(item);
      if ((i + 1) % 3 === 0 && rssIdx < rssFeeds.length) {
        merged.push(rssFeeds[rssIdx++]);
      }
    });
    // Append remaining RSS items
    while (rssIdx < rssFeeds.length) merged.push(rssFeeds[rssIdx++]);
    return merged;
  }, [posts, rssItems]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleLike = async (postId: string) => {
    try {
      await api.post('/api/posts/like', { postId });
      setPosts((prev) => prev.map((p) =>
        p._id === postId
          ? { ...p, likes: p.likes.includes(user!._id) ? p.likes.filter((id) => id !== user!._id) : [...p.likes, user!._id] }
          : p
      ));
    } catch (_) {}
  };

  const handleDelete = async (postId: string) => {
    try { await api.delete(`/api/posts/${postId}`); setPosts((prev) => prev.filter((p) => p._id !== postId)); }
    catch (_) {}
  };

  const handleEdit = (postId: string, newContent: string) => {
    setPosts((prev) => prev.map((p) => p._id === postId ? { ...p, content: newContent } : p));
  };

  const handleScrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setNewPostsCount(0);
    fetchAll();
  };

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    isAtTop.current = y < 50;
    // When user scrolls back to top, auto-refresh
    if (y < 10 && newPostsCount > 0) {
      setNewPostsCount(0);
      fetchAll();
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.purple} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* New posts banner */}
      {newPostsCount > 0 && (
        <TouchableOpacity style={styles.newPostsBanner} onPress={handleScrollToTop} activeOpacity={0.9}>
          <LinearGradient colors={[C.purple, C.cyan]} style={styles.newPostsGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="arrow-up" size={14} color="#fff" />
            <Text style={styles.newPostsText}>{newPostsCount} new post{newPostsCount > 1 ? 's' : ''}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={feedItems}
        keyExtractor={(item, index) =>
          item.kind === 'post' ? item.data._id : `rss_${index}_${item.data.link}`
        }
        renderItem={({ item }) => {
          if (item.kind === 'post') {
            return (
              <PostCard
                post={item.data}
                currentUserId={user?._id || ''}
                onLike={handleLike}
                onComment={() => {}}
                onShare={() => {}}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            );
          }
          return <RssCard item={item.data} />;
        }}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.greeting, { color: C.textPrimary }]}>Hi, {user?.userName} 👋</Text>
                <Text style={[styles.subGreeting, { color: C.textMuted }]}>What's on your mind?</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.rssBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
                  onPress={() => router.push('/rss' as any)}
                >
                  <Ionicons name="newspaper-outline" size={18} color={C.purple} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/profile' as any)}>
                  <Avatar uri={user?.avatar} name={user?.userName} size={40} />
                </TouchableOpacity>
              </View>
            </View>
            <Stories />
            {/* RSS section label if there are RSS items */}
            {rssItems.length > 0 && (
              <View style={styles.sectionRow}>
                <Ionicons name="newspaper-outline" size={13} color={C.textMuted} />
                <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Posts & News Feed</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="newspaper-outline" size={48} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>No posts yet. Be the first to post!</Text>
            <TouchableOpacity
              style={[styles.rssEmptyBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
              onPress={() => router.push('/rss' as any)}
            >
              <Ionicons name="newspaper-outline" size={16} color={C.purple} />
              <Text style={[styles.rssEmptyBtnText, { color: C.purple }]}>Subscribe to RSS feeds</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll(); }}
            tintColor={C.purple}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center:    { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: 16, paddingBottom: 32 },

  newPostsBanner: {
    position: 'absolute', top: 12, alignSelf: 'center',
    zIndex: 100, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  newPostsGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  newPostsText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  greeting:    { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  subGreeting: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rssBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },

  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  empty:        { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText:    { color: Colors.textMuted, fontSize: 14, textAlign: 'center', maxWidth: 240 },
  rssEmptyBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
  rssEmptyBtnText: { fontSize: 13, fontWeight: '600' },
});
