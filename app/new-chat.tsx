import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { toast } from '@/lib/toast';
import api from '@/lib/api';

type UserResult = {
  _id: string;
  userName: string;
  avatar?: string;
  bio?: string;
};

export default function NewChatScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

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

  const startChat = async (userId: string) => {
    setStarting(userId);
    try {
      const { data } = await api.post('/api/chat/start', { userId });
      router.replace(`/chat/${data.chatId}`);
    } catch (_) {
      toast.error('Could not start conversation.');
    } finally {
      setStarting(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoFocus
          />
          {loading && <ActivityIndicator size="small" color={Colors.purple} />}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.length > 1 && !loading ? (
            <View style={styles.empty}>
              <Ionicons name="person-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : query.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Search for someone to message</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => startChat(item._id)}
            disabled={starting === item._id}
          >
            <Avatar uri={item.avatar} name={item.userName} size={48} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.userName}</Text>
              {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
            </View>
            {starting === item._id ? (
              <ActivityIndicator size="small" color={Colors.purple} />
            ) : (
              <View style={styles.msgBtn}>
                <Ionicons name="chatbubble-outline" size={18} color={Colors.purple} />
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  searchWrapper: { padding: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgCard, borderRadius: 14,
    paddingHorizontal: 14, height: 48,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  list: { padding: 16, paddingTop: 8 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 14,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  userInfo: { flex: 1 },
  userName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
  bio: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  msgBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.purpleDim,
    alignItems: 'center', justifyContent: 'center',
  },
});
