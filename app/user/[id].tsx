import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import Avatar from '@/components/Avatar';
import PostCard, { Post } from '@/components/PostCard';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/lib/toast';
import api from '@/lib/api';

type UserProfile = {
  _id: string; userName: string; avatar?: string;
  bio?: string; followersCount: number; followingCount: number;
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuthStore();
  const C = useColors();
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [posts, setPosts]           = useState<Post[]>([]);
  const [loading, setLoading]       = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [userRes, postsRes] = await Promise.all([
          api.get(`/api/users/${id}`),
          api.get(`/api/profile/${id}/posts`),
        ]);
        setProfile(userRes.data.user);
        setPosts(postsRes.data.posts || []);
      } catch { toast.error('Failed to load profile.'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      const { data } = await api.post(`/api/users/${id}/follow`);
      setIsFollowing(data.following);
      setProfile((p) => p ? { ...p, followersCount: p.followersCount + (data.following ? 1 : -1) } : p);
      toast.success(data.following ? `Following ${profile.userName}!` : 'Unfollowed.');
    } catch { toast.error('Failed to follow.'); }
    finally { setFollowLoading(false); }
  };

  const handleMessage = async () => {
    try {
      const { data } = await api.post('/api/chat/start', { userId: id });
      router.push(`/chat/${data.chatId}`);
    } catch { toast.error('Could not start conversation.'); }
  };

  const handleLike = async (postId: string) => {
    try {
      await api.post('/api/posts/like', { postId });
      setPosts((prev) => prev.map((p) => p._id === postId ? {
        ...p, likes: p.likes.includes(me!._id) ? p.likes.filter((l) => l !== me!._id) : [...p.likes, me!._id],
      } : p));
    } catch {}
  };

  if (loading) return <View style={[styles.center, { backgroundColor: C.bg }]}><ActivityIndicator color={C.purple} size="large" /></View>;

  if (!profile) return (
    <View style={[styles.center, { backgroundColor: C.bg }]}>
      <Ionicons name="person-outline" size={48} color={C.textMuted} />
      <Text style={{ color: C.textMuted, fontSize: 16 }}>User not found</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
        <Text style={{ color: C.purple, fontSize: 14 }}>Go back</Text>
      </TouchableOpacity>
    </View>
  );

  const isMe = profile._id === me?._id;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>{profile.userName}</Text>
        <View style={{ width: 38 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <LinearGradient colors={[C.purple + '40', C.cyan + '20', 'transparent']} style={styles.coverGradient} />
            <View style={styles.profileSection}>
              <Avatar uri={profile.avatar} name={profile.userName} size={84} />
              <Text style={[styles.userName, { color: C.textPrimary }]}>{profile.userName}</Text>
              {profile.bio ? <Text style={[styles.bio, { color: C.textMuted }]}>{profile.bio}</Text> : null}

              <View style={[styles.statsRow, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                {[{ label: 'Posts', value: posts.length }, { label: 'Followers', value: profile.followersCount }, { label: 'Following', value: profile.followingCount }]
                  .map((s, i, arr) => (
                    <React.Fragment key={s.label}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: C.textPrimary }]}>{s.value}</Text>
                        <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: C.border }]} />}
                    </React.Fragment>
                  ))}
              </View>

              {!isMe && (
                <View style={styles.actionRow}>
                  <TouchableOpacity onPress={handleFollow} disabled={followLoading} style={styles.actionBtnWrap}>
                    {isFollowing ? (
                      <View style={[styles.actionBtn, { backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border }]}>
                        {followLoading ? <ActivityIndicator size="small" color={C.textMuted} /> : <Text style={{ color: C.textMuted, fontWeight: '600', fontSize: 14 }}>Following</Text>}
                      </View>
                    ) : (
                      <LinearGradient colors={[C.purple, C.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtn}>
                        {followLoading ? <ActivityIndicator size="small" color={C.white} /> : <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>Follow</Text>}
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.msgBtnWrap} onPress={handleMessage}>
                    <View style={[styles.msgBtn, { backgroundColor: C.purpleDim, borderColor: C.purpleDim }]}>
                      <Ionicons name="chatbubble-outline" size={18} color={C.purple} />
                      <Text style={{ color: C.purple, fontWeight: '700', fontSize: 14 }}>Message</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {isMe && (
                <TouchableOpacity style={[styles.editOwnBtn, { backgroundColor: C.bgCard, borderColor: C.purpleDim }]} onPress={() => router.push('/edit-profile')}>
                  <Ionicons name="pencil-outline" size={15} color={C.purple} />
                  <Text style={{ color: C.purple, fontWeight: '600', fontSize: 13 }}>Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.postsHeader, { borderTopColor: C.border }]}>
              <Ionicons name="grid-outline" size={16} color={C.textMuted} />
              <Text style={[styles.postsHeaderText, { color: C.textMuted }]}>POSTS</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <PostCard post={item} currentUserId={me?._id || ''} onLike={handleLike} onComment={() => {}} onShare={() => {}} />
        )}
        ListEmptyComponent={
          <View style={styles.noPosts}>
            <Ionicons name="newspaper-outline" size={40} color={C.textMuted} />
            <Text style={{ color: C.textMuted, fontSize: 14 }}>No posts yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn:        { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { fontSize: 17, fontWeight: '700' },
  list:           { paddingBottom: 32 },
  coverGradient:  { height: 120, marginBottom: -60 },
  profileSection: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  userName:       { fontSize: 22, fontWeight: '700', marginTop: 10 },
  bio:            { fontSize: 13, marginTop: 6, textAlign: 'center', maxWidth: 280 },
  statsRow:       { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, marginTop: 18, width: '100%', overflow: 'hidden' },
  statItem:       { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDivider:    { width: 1, height: '60%' },
  statValue:      { fontSize: 20, fontWeight: '700' },
  statLabel:      { fontSize: 11, marginTop: 2 },
  actionRow:      { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  actionBtnWrap:  { flex: 1 },
  actionBtn:      { height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  msgBtnWrap:     { flex: 1 },
  msgBtn:         { height: 42, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  editOwnBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  postsHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, marginTop: 8 },
  postsHeaderText:{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  noPosts:        { alignItems: 'center', marginTop: 40, gap: 10, padding: 16 },
});
