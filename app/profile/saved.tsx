import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import PostCard, { Post } from '@/components/PostCard';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/lib/toast';
import api from '@/lib/api';

export default function SavedPostsScreen() {
  const { user } = useAuthStore();
  const C = useColors();
  const [posts, setPosts]           = useState<Post[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSaved = useCallback(async () => {
    try { const { data } = await api.get('/api/profile/saved'); setPosts(data.posts || []); }
    catch { toast.error('Failed to load saved posts.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchSaved(); }, []);

  const handleUnsave = async (postId: string) => {
    try { await api.post(`/api/profile/saved/${postId}`); setPosts((p) => p.filter((x) => x._id !== postId)); toast.success('Removed from saved.'); }
    catch { toast.error('Failed to unsave post.'); }
  };

  const handleLike = async (postId: string) => {
    try {
      await api.post('/api/posts/like', { postId });
      setPosts((prev) => prev.map((p) => p._id === postId ? {
        ...p, likes: p.likes.includes(user!._id) ? p.likes.filter((id) => id !== user!._id) : [...p.likes, user!._id],
      } : p));
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Saved Posts</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.purple} size="large" /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSaved(); }} tintColor={C.purple} />}
          renderItem={({ item }) => (
            <View>
              <PostCard post={item} currentUserId={user?._id || ''} onLike={handleLike}
                onComment={() => router.push(`/post/${item._id}` as any)} onShare={() => {}} />
              <TouchableOpacity style={[styles.unsaveBtn, { backgroundColor: C.purpleDim }]} onPress={() => handleUnsave(item._id)}>
                <Ionicons name="bookmark" size={14} color={C.purple} />
                <Text style={[styles.unsaveText, { color: C.purple }]}>Remove from saved</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bookmark-outline" size={52} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No saved posts yet</Text>
              <Text style={[styles.emptySub, { color: C.textMuted }]}>Tap the bookmark icon on any post to save it here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  list:        { padding: 12, paddingBottom: 32 },
  unsaveBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: -4, marginBottom: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  unsaveText:  { fontSize: 12, fontWeight: '600' },
  empty:       { alignItems: 'center', marginTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyTitle:  { fontSize: 17, fontWeight: '700' },
  emptySub:    { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
