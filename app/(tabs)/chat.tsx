import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

type Chat = {
  _id: string;
  participants: { _id: string; userName: string; avatar?: string }[];
  lastMessage: { text: string; createdAt: string } | null;
  unreadCount: number;
};

export default function ChatScreen() {
  const { user } = useAuthStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/chat/fetch')
      .then(({ data }) => setChats(data.chats || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getOtherUser = (chat: Chat) =>
    chat.participants.find((p) => p._id !== user?._id);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.purple} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.newChat} onPress={() => router.push('/new-chat')}>
          <Ionicons name="create-outline" size={22} color={Colors.purple} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const other = getOtherUser(item);
          if (!other) return null;
          return (
            <TouchableOpacity
              style={styles.chatRow}
              onPress={() => router.push(`/chat/${item._id}`)}
            >
              <Avatar uri={other.avatar} name={other.userName} size={50} />
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{other.userName}</Text>
                <Text style={styles.lastMsg} numberOfLines={1}>
                  {item.lastMessage?.text || 'No messages yet'}
                </Text>
              </View>
              <View style={styles.chatMeta}>
                {item.lastMessage && (
                  <Text style={styles.chatTime}>
                    {formatTime(item.lastMessage.createdAt)}
                  </Text>
                )}
                {item.unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No conversations yet</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700' },
  newChat: {
    backgroundColor: Colors.bgCard,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  chatInfo: { flex: 1 },
  chatName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
  lastMsg: { color: Colors.textMuted, fontSize: 13, marginTop: 3 },
  chatMeta: { alignItems: 'flex-end', gap: 6 },
  chatTime: { color: Colors.textMuted, fontSize: 11 },
  badge: {
    backgroundColor: Colors.purple,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
