import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

type DirectChat = {
  _id: string;
  participants: { _id: string; userName: string; avatar?: string }[];
  lastMessage: { text: string; createdAt: string } | null;
  unreadCount: number;
};

type Group = {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  type: 'group' | 'community';
  memberIds: string[];
  adminIds: string[];
  lastMessage: { text: string; createdAt: string; senderName?: string } | null;
};

type Tab = 'chats' | 'groups' | 'communities';

export default function ChatScreen() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [chats, setChats] = useState<DirectChat[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [chatsRes, groupsRes] = await Promise.all([
        api.get('/api/chat/fetch'),
        api.get('/api/groups/mine'),
      ]);
      setChats(chatsRes.data.chats || []);
      setGroups(groupsRes.data.groups || []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const getOtherUser = (chat: DirectChat) =>
    chat.participants.find((p) => p._id !== user?._id);

  const displayGroups = groups.filter((g) =>
    activeTab === 'groups' ? g.type === 'group' : g.type === 'community'
  );

  const tabs: { key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: 'chats',       label: 'Chats',       icon: 'chatbubble-outline' },
    { key: 'groups',      label: 'Groups',      icon: 'people-outline' },
    { key: 'communities', label: 'Communities', icon: 'globe-outline' },
  ];

  const renderDirectChat = ({ item }: { item: DirectChat }) => {
    const other = getOtherUser(item);
    if (!other) return null;
    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => router.push(`/chat/${item._id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarWrap}>
          <Avatar uri={other.avatar} name={other.userName} size={50} />
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{other.userName}</Text>
          <Text style={styles.lastMsg} numberOfLines={1}>
            {item.lastMessage?.text || 'Start a conversation'}
          </Text>
        </View>
        <View style={styles.chatMeta}>
          {item.lastMessage && (
            <Text style={styles.chatTime}>{formatTime(item.lastMessage.createdAt)}</Text>
          )}
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroup = ({ item }: { item: Group }) => {
    const isAdmin = item.adminIds.includes(user?._id || '');
    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => router.push(`/group/${item._id}` as any)}
        activeOpacity={0.8}
      >
        <View style={styles.groupAvatarWrap}>
          {item.avatar ? (
            <Avatar uri={item.avatar} name={item.name} size={50} />
          ) : (
            <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.groupAvatarGradient}>
              <Ionicons
                name={item.type === 'community' ? 'globe' : 'people'}
                size={22} color={Colors.white}
              />
            </LinearGradient>
          )}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.groupNameRow}>
            <Text style={styles.chatName}>{item.name}</Text>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={styles.lastMsg} numberOfLines={1}>
            {item.lastMessage
              ? `${item.lastMessage.senderName}: ${item.lastMessage.text}`
              : `${item.memberIds.length} members`
            }
          </Text>
        </View>
        <View style={styles.chatMeta}>
          {item.lastMessage && (
            <Text style={styles.chatTime}>{formatTime(item.lastMessage.createdAt)}</Text>
          )}
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.purple} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push(
            activeTab === 'chats' ? '/new-chat' : (`/new-group?type=${activeTab === 'groups' ? 'group' : 'community'}` as any)
          )}
        >
          <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.newBtnGradient}>
            <Ionicons name="add" size={20} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? Colors.purple : Colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'chats' ? (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={renderDirectChat}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={Colors.purple} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubText}>Tap + to start a new chat</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={displayGroups}
          keyExtractor={(item) => item._id}
          renderItem={renderGroup}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={Colors.purple} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name={activeTab === 'groups' ? 'people-outline' : 'globe-outline'}
                size={48} color={Colors.textMuted}
              />
              <Text style={styles.emptyTitle}>
                No {activeTab === 'groups' ? 'groups' : 'communities'} yet
              </Text>
              <Text style={styles.emptySubText}>Tap + to create one</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
  },
  title: { color: Colors.textPrimary, fontSize: 26, fontWeight: '800' },
  newBtn: { borderRadius: 12, overflow: 'hidden' },
  newBtnGradient: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },

  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: Colors.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, position: 'relative',
  },
  tabActive: { backgroundColor: Colors.purpleDim },
  tabLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
  tabLabelActive: { color: Colors.purple, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '20%', right: '20%',
    height: 2, backgroundColor: Colors.purple, borderRadius: 2,
  },

  list: { padding: 16, paddingTop: 8 },

  chatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 16,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  avatarWrap: { position: 'relative' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2, borderColor: Colors.bgCard,
  },
  groupAvatarWrap: {},
  groupAvatarGradient: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  chatInfo: { flex: 1 },
  groupNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
  adminBadge: {
    backgroundColor: Colors.purple + '33',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  adminBadgeText: { color: Colors.purpleLight, fontSize: 10, fontWeight: '700' },
  lastMsg: { color: Colors.textMuted, fontSize: 13, marginTop: 3 },
  chatMeta: { alignItems: 'flex-end', gap: 5 },
  chatTime: { color: Colors.textMuted, fontSize: 11 },
  badge: {
    backgroundColor: Colors.purple, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  emptySubText: { color: Colors.textMuted, fontSize: 13 },
});
