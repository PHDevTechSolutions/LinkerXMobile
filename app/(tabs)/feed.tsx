import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import PostCard, { Post } from '@/components/PostCard';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function FeedScreen() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const { data } = await api.get('/api/feed/feed');
      setPosts(data.posts || []);
    } catch (_) {
      // handle error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const handleLike = async (postId: string) => {
    try {
      await api.post('/api/posts/like', { postId });
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? {
                ...p,
                likes: p.likes.includes(user!._id)
                  ? p.likes.filter((id) => id !== user!._id)
                  : [...p.likes, user!._id],
              }
            : p
        )
      );
    } catch (_) {}
  };

  const handleDelete = async (postId: string) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (_) {}
  };

  const handleEdit = (postId: string, newContent: string) => {
    setPosts((prev) =>
      prev.map((p) => p._id === postId ? { ...p, content: newContent } : p)
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Hi, {user?.userName} 👋</Text>
        <Text style={styles.subGreeting}>What's on your mind?</Text>
      </View>
      <TouchableOpacity>
        <Avatar uri={user?.avatar} name={user?.userName} size={40} />
      </TouchableOpacity>
    </View>
  );

  const renderStory = () => (
    <View style={styles.storyBar}>
      <TouchableOpacity style={styles.addStory}>
        <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.addStoryGradient}>
          <Ionicons name="add" size={22} color={Colors.white} />
        </LinearGradient>
        <Text style={styles.storyLabel}>Your Story</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.purple} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?._id || ''}
            onLike={handleLike}
            onComment={() => {}}
            onShare={() => {}}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderStory()}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="newspaper-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No posts yet. Be the first to post!</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchFeed(); }}
            tintColor={Colors.purple}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  subGreeting: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  storyBar: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  addStory: { alignItems: 'center', gap: 6 },
  addStoryGradient: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  storyLabel: { color: Colors.textMuted, fontSize: 11 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', maxWidth: 240 },
});
