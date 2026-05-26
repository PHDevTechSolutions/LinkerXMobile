import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColors } from '@/hooks/useColors';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/lib/toast';
import api from '@/lib/api';

type UserResult = {
  _id: string;
  userName: string;
  avatar?: string;
  bio?: string;
  followersCount: number;
  isFollowing?: boolean;
};

export default function ExploreScreen() {
  const { user } = useAuthStore();
  const C = useColors();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [suggested, setSuggested] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const fetchSuggested = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users/suggested');
      setSuggested(data.users || []);
    } catch (_) {}
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { fetchSuggested(); }, [fetchSuggested]);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/api/users/search?q=${encodeURIComponent(text)}`);
      setResults(data.users || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const handleFollow = async (userId: string) => {
    try {
      const { data } = await api.post(`/api/users/${userId}/follow`);
      const newSet = new Set(followingIds);
      if (data.following) {
        newSet.add(userId);
        toast.success('Following!');
      } else {
        newSet.delete(userId);
        toast.info('Unfollowed.');
      }
      setFollowingIds(newSet);

      // Update counts in list
      const update = (list: UserResult[]) =>
        list.map((u) =>
          u._id === userId
            ? { ...u, followersCount: u.followersCount + (data.following ? 1 : -1) }
            : u
        );
      setResults(update);
      setSuggested(update);
    } catch (_) {
      toast.error('Failed to follow.');
    }
  };

  const isSearching = query.trim().length >= 2;
  const displayList = isSearching ? results : suggested;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={styles.headerArea}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Explore</Text>
        <View style={[styles.searchBar, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={18} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.textPrimary }]}
            placeholder="Search people..."
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {loading
            ? <ActivityIndicator size="small" color={C.purple} />
            : query.length > 0
              ? <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
                  <Ionicons name="close-circle" size={18} color={C.textMuted} />
                </TouchableOpacity>
              : null
          }
        </View>
      </View>

      <FlatList
        data={displayList}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const isFollowing = followingIds.has(item._id);
          const isMe = item._id === user?._id;
          return (
            <TouchableOpacity style={[styles.userRow, { backgroundColor: C.bgCard, borderColor: C.border }]}
              onPress={() => router.push(`/user/${item._id}`)} activeOpacity={0.8}>
              <Avatar uri={item.avatar} name={item.userName} size={50} />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: C.textPrimary }]}>{item.userName}</Text>
                {item.bio ? <Text style={[styles.bio, { color: C.textMuted }]} numberOfLines={1}>{item.bio}</Text> : null}
                <Text style={[styles.followers, { color: C.cyan }]}>
                  <Ionicons name="people-outline" size={11} color={C.cyan} /> {item.followersCount} followers
                </Text>
              </View>
              {!isMe && (
                <TouchableOpacity onPress={() => handleFollow(item._id)} activeOpacity={0.8}>
                  {isFollowing ? (
                    <View style={[styles.followingBtn, { borderColor: C.border, backgroundColor: C.bgElevated }]}>
                      <Text style={[styles.followingText, { color: C.textMuted }]}>Following</Text>
                    </View>
                  ) : (
                    <LinearGradient colors={[C.purple, C.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.followBtn}>
                      <Text style={[styles.followText, { color: C.white }]}>Follow</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={!isSearching ? (
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSuggested(); }} tintColor={C.purple} />
        ) : undefined}
        ListHeaderComponent={
          !isSearching ? <Text style={[styles.sectionLabel, { color: C.textMuted }]}>SUGGESTED PEOPLE</Text>
          : results.length > 0 ? <Text style={[styles.sectionLabel, { color: C.textMuted }]}>SEARCH RESULTS</Text>
          : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name={isSearching ? 'person-outline' : 'people-outline'} size={44} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>
              {isSearching ? `No users found for "${query}"` : 'No suggestions yet'}
            </Text>
            {!isSearching && <Text style={[styles.emptySubText, { color: C.textMuted }]}>Search for people to connect with</Text>}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerArea: { padding: 16, paddingBottom: 8 },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgCard, borderRadius: 14,
    paddingHorizontal: 14, height: 48,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  sectionLabel: {
    color: Colors.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 10, marginLeft: 2,
  },
  list: { padding: 16, paddingTop: 8 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 14,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  userInfo: { flex: 1 },
  userName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
  bio: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  followers: { color: Colors.cyan, fontSize: 11, marginTop: 4 },
  followBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10,
  },
  followText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  followingBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgElevated,
  },
  followingText: { color: Colors.textMuted, fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
  emptySubText: { color: Colors.textMuted, fontSize: 12 },
});
