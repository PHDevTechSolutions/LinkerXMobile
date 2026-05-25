import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
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

  const displayList = query.length >= 2 ? results : suggested;
  const isSearching = query.length >= 2;

  const renderUser = ({ item }: { item: UserResult }) => {
    const isFollowing = followingIds.has(item._id);
    const isMe = item._id === user?._id;

    return (
      <TouchableOpacity
        style={styles.userRow}
        onPress={() => router.push(`/user/${item._id}`)}
        activeOpacity={0.8}
      >
        <Avatar uri={item.avatar} name={item.userName} size={50} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.userName}</Text>
          {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
          <Text style={styles.followers}>
            <Ionicons name="people-outline" size={11} color={Colors.cyan} /> {item.followersCount} followers
          </Text>
        </View>
        {!isMe && (
          <TouchableOpacity
            onPress={() => handleFollow(item._id)}
            activeOpacity={0.8}
          >
            {isFollowing ? (
              <View style={styles.followingBtn}>
                <Text style={styles.followingText}>Following</Text>
              </View>
            ) : (
              <LinearGradient
                colors={[Colors.purple, Colors.cyan]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.followBtn}
              >
                <Text style={styles.followText}>Follow</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerArea}>
        <Text style={styles.title}>Explore</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {loading
            ? <ActivityIndicator size="small" color={Colors.purple} />
            : query.length > 0
              ? <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              : null
          }
        </View>
      </View>

      <FlatList
        data={displayList}
        keyExtractor={(item) => item._id}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          !isSearching ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchSuggested(); }}
              tintColor={Colors.purple}
            />
          ) : undefined
        }
        ListHeaderComponent={
          !isSearching ? (
            <Text style={styles.sectionLabel}>SUGGESTED PEOPLE</Text>
          ) : results.length > 0 ? (
            <Text style={styles.sectionLabel}>SEARCH RESULTS</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {isSearching ? (
              <>
                <Ionicons name="person-outline" size={44} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No users found for "{query}"</Text>
              </>
            ) : (
              <>
                <Ionicons name="people-outline" size={44} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No suggestions yet</Text>
                <Text style={styles.emptySubText}>Search for people to connect with</Text>
              </>
            )}
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
