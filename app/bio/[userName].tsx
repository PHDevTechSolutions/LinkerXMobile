import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Linking, Share, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import Avatar from '@/components/Avatar';
import api from '@/lib/api';
import { BASE_URL } from '@/lib/api';

type BioLink = { _id: string; title: string; url: string };
type BioPost = { _id: string; type: string; content: string; mediaUrl?: string; createdAt: string };
type BioUser = {
  _id: string; userName: string; avatar?: string;
  coverPhoto?: string; bio?: string;
  followersCount: number; followingCount: number;
};

export default function BioPage() {
  const { userName } = useLocalSearchParams<{ userName: string }>();
  const C = useColors();
  const [user, setUser]   = useState<BioUser | null>(null);
  const [links, setLinks] = useState<BioLink[]>([]);
  const [posts, setPosts] = useState<BioPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/api/links/bio/${userName}`)
      .then(({ data }) => {
        setUser(data.user);
        setLinks(data.links || []);
        setPosts(data.recentPosts || []);
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [userName]);

  const handleShare = async () => {
    const url = `${BASE_URL}/bio/${userName}`;
    try {
      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({ title: `${userName} on LinkerX`, url });
      } else if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(url);
      } else {
        await Share.share({ message: `Check out ${userName} on LinkerX: ${url}` });
      }
    } catch (_) {}
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.purple} size="large" />
      </View>
    );
  }

  if (notFound || !user) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Ionicons name="person-outline" size={52} color={C.textMuted} />
        <Text style={[styles.notFoundText, { color: C.textPrimary }]}>User not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtnCenter, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Text style={[styles.backBtnCenterText, { color: C.textMuted }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.bg }]} showsVerticalScrollIndicator={false}>
      {/* Cover */}
      <View style={styles.coverWrap}>
        {user.coverPhoto
          ? <Image source={{ uri: user.coverPhoto }} style={styles.cover} resizeMode="cover" />
          : <LinearGradient colors={[C.purple + '99', C.cyan + '66', C.bg]} style={styles.cover} />
        }
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.shareBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarWrap, { borderColor: C.bg, backgroundColor: C.bg }]}>
            <Avatar uri={user.avatar} name={user.userName} size={88} />
          </View>
          <Text style={[styles.userName, { color: C.textPrimary }]}>@{user.userName}</Text>
          {user.bio ? <Text style={[styles.bio, { color: C.textMuted }]}>{user.bio}</Text> : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{user.followersCount}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Followers</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{user.followingCount}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Following</Text>
            </View>
          </View>
        </View>

        {/* Links */}
        {links.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>LINKS</Text>
            <View style={styles.linksGrid}>
              {links.map((link) => (
                <TouchableOpacity
                  key={link._id}
                  style={[styles.linkBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
                  onPress={() => Linking.openURL(link.url)}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={[C.purple, C.cyan]} style={styles.linkBtnIcon}>
                    <Ionicons name="link" size={16} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.linkBtnText, { color: C.textPrimary }]} numberOfLines={1}>
                    {link.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Recent posts */}
        {posts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>RECENT POSTS</Text>
            <View style={styles.postsGrid}>
              {posts.filter((p) => p.type === 'image' && p.mediaUrl).map((post) => (
                <TouchableOpacity key={post._id} style={styles.postThumb}
                  onPress={() => router.push(`/post/${post._id}` as any)}>
                  <Image source={{ uri: post.mediaUrl }} style={styles.postThumbImg} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
            {posts.filter((p) => p.type !== 'image').slice(0, 3).map((post) => (
              <TouchableOpacity key={post._id}
                style={[styles.postTextCard, { backgroundColor: C.bgCard, borderColor: C.border }]}
                onPress={() => router.push(`/post/${post._id}` as any)}>
                <Text style={[styles.postTextContent, { color: C.textSecondary }]} numberOfLines={2}>
                  {post.content}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Share bio link */}
        <TouchableOpacity style={[styles.shareBioBtn, { backgroundColor: C.bgCard, borderColor: C.border }]} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={18} color={C.purple} />
          <Text style={[styles.shareBioBtnText, { color: C.purple }]}>Share this page</Text>
        </TouchableOpacity>

        <Text style={[styles.poweredBy, { color: C.textMuted }]}>Powered by LinkerX</Text>
      </View>
    </ScrollView>
  );
}

const COVER_H = 180;
const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 18, fontWeight: '700' },
  backBtnCenter: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  backBtnCenterText: { fontSize: 14, fontWeight: '600' },

  coverWrap: { height: COVER_H, position: 'relative' },
  cover:     { width: '100%', height: COVER_H },
  backBtn:   { position: 'absolute', top: 52, left: 16, width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  shareBtn:  { position: 'absolute', top: 52, right: 16, width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  content: { paddingHorizontal: 20, paddingBottom: 48 },

  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrap:    { marginTop: -44, borderWidth: 4, borderRadius: 50 },
  userName:      { fontSize: 22, fontWeight: '800', marginTop: 10 },
  bio:           { fontSize: 13, marginTop: 6, textAlign: 'center', maxWidth: 280, lineHeight: 18 },

  statsRow:    { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 14 },
  statItem:    { alignItems: 'center' },
  statValue:   { fontSize: 18, fontWeight: '700' },
  statLabel:   { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 28 },

  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },

  linksGrid: { gap: 10 },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  linkBtnIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkBtnText: { flex: 1, fontSize: 14, fontWeight: '600' },

  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  postThumb:    { width: '32%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden' },
  postThumbImg: { width: '100%', height: '100%' },
  postTextCard: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 8 },
  postTextContent: { fontSize: 13, lineHeight: 18 },

  shareBioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 16,
  },
  shareBioBtnText: { fontSize: 14, fontWeight: '600' },
  poweredBy: { textAlign: 'center', fontSize: 11, marginBottom: 8 },
});
