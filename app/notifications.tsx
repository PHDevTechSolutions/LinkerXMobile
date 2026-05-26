import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import Avatar from '@/components/Avatar';
import { useNotificationStore, AppNotification } from '@/store/notificationStore';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsScreen() {
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotificationStore();
  const C = useColors();

  useEffect(() => { if (unreadCount > 0) markAllRead(); }, []);

  const iconFor = (type: AppNotification['type']) => {
    switch (type) {
      case 'message': return { name: 'chatbubble'    as const, color: C.cyan };
      case 'follow':  return { name: 'person-add'    as const, color: C.success };
      case 'comment': return { name: 'chatbubbles'   as const, color: C.purple };
      case 'like':    return { name: 'heart'          as const, color: '#e05c8a' };
      case 'call':    return { name: 'call'           as const, color: C.warning };
      default:        return { name: 'notifications' as const, color: C.textMuted };
    }
  };

  const handlePress = (notif: AppNotification) => {
    markRead(notif.id);
    if (notif.type === 'message' && notif.targetId)                          router.push(`/chat/${notif.targetId}` as any);
    else if (notif.type === 'follow' && notif.fromUserId)                    router.push(`/user/${notif.fromUserId}` as any);
    else if ((notif.type === 'comment' || notif.type === 'like') && notif.targetId) router.push(`/post/${notif.targetId}` as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Notifications</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
            <Text style={[styles.clearText, { color: C.error }]}>Clear all</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 70 }} />}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const icon = iconFor(item.type);
          return (
            <TouchableOpacity
              style={[
                styles.item,
                { backgroundColor: item.read ? C.bgCard : C.purpleDim, borderColor: item.read ? C.border : C.purple + '44' },
              ]}
              onPress={() => handlePress(item)}
              activeOpacity={0.75}
            >
              <View style={styles.avatarWrap}>
                <Avatar uri={item.fromUserAvatar} name={item.fromUserName || '?'} size={46} />
                <View style={[styles.typeIcon, { backgroundColor: icon.color, borderColor: C.bgCard }]}>
                  <Ionicons name={icon.name} size={11} color={C.white} />
                </View>
              </View>
              <View style={styles.textWrap}>
                <Text style={[styles.title, { color: C.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.body, { color: C.textSecondary }]} numberOfLines={2}>{item.body}</Text>
                <Text style={[styles.time, { color: C.textMuted }]}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.read && <View style={[styles.unreadDot, { backgroundColor: C.purple }]} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={52} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No notifications yet</Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>You'll see messages, follows, and comments here.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  clearBtn:    { paddingHorizontal: 8, paddingVertical: 6 },
  clearText:   { fontSize: 13, fontWeight: '600' },
  list:        { padding: 12, paddingBottom: 32, gap: 8 },
  item:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12, borderWidth: 1 },
  avatarWrap:  { position: 'relative' },
  typeIcon:    { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  textWrap:    { flex: 1 },
  title:       { fontSize: 14, fontWeight: '700' },
  body:        { fontSize: 13, marginTop: 2, lineHeight: 18 },
  time:        { fontSize: 11, marginTop: 4 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4 },
  empty:       { alignItems: 'center', marginTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyTitle:  { fontSize: 17, fontWeight: '700' },
  emptySub:    { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
