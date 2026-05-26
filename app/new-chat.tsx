import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import Avatar from '@/components/Avatar';
import { toast } from '@/lib/toast';
import api from '@/lib/api';

type UserResult = { _id: string; userName: string; avatar?: string; bio?: string };

export default function NewChatScreen() {
  const C = useColors();
  const [query, setQuery]     = useState('');
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
    } catch {}
    finally { setLoading(false); }
  };

  const startChat = async (userId: string) => {
    setStarting(userId);
    try {
      const { data } = await api.post('/api/chat/start', { userId });
      router.replace(`/chat/${data.chatId}`);
    } catch { toast.error('Could not start conversation.'); }
    finally { setStarting(null); }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>New Message</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.searchWrapper}>
        <View style={[styles.searchBar, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={18} color={C.textMuted} />
          <TextInput style={[styles.searchInput, { color: C.textPrimary }]} placeholder="Search people..."
            placeholderTextColor={C.textMuted} value={query} onChangeText={handleSearch} autoCapitalize="none" autoFocus />
          {loading && <ActivityIndicator size="small" color={C.purple} />}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.length > 1 && !loading ? (
            <View style={styles.empty}>
              <Ionicons name="person-outline" size={40} color={C.textMuted} />
              <Text style={[styles.emptyText, { color: C.textMuted }]}>No users found</Text>
            </View>
          ) : query.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={C.textMuted} />
              <Text style={[styles.emptyText, { color: C.textMuted }]}>Search for someone to message</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.userRow, { backgroundColor: C.bgCard, borderColor: C.border }]}
            onPress={() => startChat(item._id)} disabled={starting === item._id}>
            <Avatar uri={item.avatar} name={item.userName} size={48} />
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: C.textPrimary }]}>{item.userName}</Text>
              {item.bio ? <Text style={[styles.bio, { color: C.textMuted }]} numberOfLines={1}>{item.bio}</Text> : null}
            </View>
            {starting === item._id
              ? <ActivityIndicator size="small" color={C.purple} />
              : <View style={[styles.msgBtn, { backgroundColor: C.purpleDim }]}>
                  <Ionicons name="chatbubble-outline" size={18} color={C.purple} />
                </View>
            }
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  searchWrapper: { padding: 16, paddingBottom: 8 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  list:        { padding: 16, paddingTop: 8 },
  empty:       { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText:   { fontSize: 14, textAlign: 'center' },
  userRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1 },
  userInfo:    { flex: 1 },
  userName:    { fontWeight: '600', fontSize: 15 },
  bio:         { fontSize: 12, marginTop: 2 },
  msgBtn:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
