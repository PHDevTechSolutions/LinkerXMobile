import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import PostCard, { Post } from '@/components/PostCard';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/lib/toast';
import api from '@/lib/api';

type UserProfile = {
  _id: string;
  userName: string;
  avatar?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [userRes, postsRes] = await Promise.all([
          api.get(`/api/users/${id}`),
          api.get(`/api/profile/${id}/posts`),
        ]);
        setProfile(userRes.data.user);
        setPosts(postsRes.data.posts || []);
      } catch (_) {
        toast.error('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      const { data } = await api.post(`/api/users/${id}/follow`);
      setIsFollowing(data.following);
      setProfile((prev) =>
        prev
          ? { ...prev, followersCount: prev.followersCount + (data.following ? 1 : -1) }
          : prev
      );
      toast.success(data.following ? `Following ${profile.userName}!` : 'Unfollowed.');
    } catch (_) {
      toast.error('Failed to follow.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    try {
      const { data } = await api.post('/api/chat/start', { userId: id });
      router.push(`/chat/${data.chatId}`);
    } catch (_) {
      toast.error('Could not start conversation.');
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await api.post('/api/posts/like', { postId });
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? {
                ...p,
                likes: p.likes.includes(me!._id)
                  ? p.likes.filter((lid) => lid !== me!._id)
                  : [...p.likes, me!._id],
              }
            : p
        )
      );
    } catch (_) {}
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.purple} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.notFound}>User not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isMe = profile._id === me?._id;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.userName}</Text>
        <View style={{ width: 38 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* Cover gradient */}
            <LinearGradient
              colors={[Colors.purple + '40', Colors.cyan + '20', 'transparent']}
              style={styles.coverGradient}
            />

            {/* Profile info */}
            <View style={styles.profileSection}>
              <Avatar uri={profile.avatar} name={profile.userName} size={84} />
              <Text style={styles.userName}>{profile.userName}</Text>
              {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{posts.length}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile.followersCount}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile.followingCount}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>

              {/* Action buttons */}
              {!isMe && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={handleFollow}
                    disabled={followLoading}
                    style={styles.actionBtnWrap}
                  >
                    {isFollowing ? (
                      <View style={[styles.actionBtn, styles.followingBtn]}>
                        {followLoading
                          ? <ActivityIndicator size="small" color={Colors.textMuted} />
                          : <Text style={styles.followingText}>Following</Text>
                        }
                      </View>
                    ) : (
                      <LinearGradient
                        colors={[Colors.purple, Colors.cyan]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.actionBtn}
                      >
                        {followLoading
                          ? <ActivityIndicator size="small" color={Colors.white} />
                          : <Text style={styles.followText}>Follow</Text>
                        }
                      </LinearGradient>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.msgBtnWrap} onPress={handleMessage}>
                    <View style={styles.msgBtn}>
                      <Ionicons name="chatbubble-outline" size={18} color={Colors.purple} />
                      <Text style={styles.msgText}>Message</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {isMe && (
                <TouchableOpacity
                  style={styles.editOwnBtn}
                  onPress={() => router.push('/edit-profile')}
                >
                  <Ionicons name="pencil-outline" size={15} color={Colors.purple} />
                  <Text style={styles.editOwnText}>Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Posts header */}
            <View style={styles.postsHeader}>
              <Ionicons name="grid-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.postsHeaderText}>POSTS</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={me?._id || ''}
            onLike={handleLike}
            onComment={() => {}}
            onShare={() => {}}
          />
        )}
        ListEmptyComponent={
          <View style={styles.noPosts}>
            <Ionicons name="newspaper-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.noPostsText}>No posts yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound: { color: Colors.textMuted, fontSize: 16 },
  backLink: { marginTop: 8 },
  backLinkText: { color: Colors.purple, fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700' },

  list: { paddingBottom: 32 },
  coverGradient: { height: 120, marginBottom: -60 },

  profileSection: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  userName: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 10 },
  bio: { color: Colors.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center', maxWidth: 280 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    marginTop: 18, width: '100%', overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDivider: { width: 1, height: '60%', backgroundColor: Colors.border },
  statValue: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  statLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  actionBtnWrap: { flex: 1 },
  actionBtn: {
    height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  followingBtn: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.border,
  },
  followText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  followingText: { color: Colors.textMuted, fontWeight: '600', fontSize: 14 },
  msgBtnWrap: { flex: 1 },
  msgBtn: {
    height: 42, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.purpleDim,
    borderWidth: 1, borderColor: Colors.purpleDim,
  },
  msgText: { color: Colors.purple, fontWeight: '700', fontSize: 14 },

  editOwnBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.purpleDim,
  },
  editOwnText: { color: Colors.purple, fontWeight: '600', fontSize: 13 },

  postsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
    marginTop: 8,
  },
  postsHeaderText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },

  noPosts: { alignItems: 'center', marginTop: 40, gap: 10, padding: 16 },
  noPostsText: { color: Colors.textMuted, fontSize: 14 },
});
