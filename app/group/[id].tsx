import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, ScrollView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/lib/toast';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';

type Member = { _id: string; userName: string; avatar?: string; isAdmin: boolean };
type GroupMessage = {
  _id: string;
  senderId: string;
  text: string;
  createdAt: string;
  pending?: boolean;
  sender: { _id: string; userName: string; avatar?: string } | null;
};
type GroupInfo = {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  type: 'group' | 'community';
  adminIds: string[];
  memberIds: string[];
  members: Member[];
};

export default function GroupConversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuthStore();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<any>(null);

  const isAdmin = group?.adminIds.includes(user?._id || '') || false;

  const fetchGroup = useCallback(async () => {
    try {
      const [groupRes, msgRes] = await Promise.all([
        api.get(`/api/groups/${id}`),
        api.get(`/api/groups/${id}/messages`),
      ]);
      setGroup(groupRes.data.group);
      setMessages(msgRes.data.messages || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchGroup();
    if (!token) return;
    const socket = getSocket(token);
    socket.emit('join_group', id);

    socket.on('new_group_message', (msg: GroupMessage) => {
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.pending || m.text !== msg.text);
        return [...filtered, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    socket.on('group_typing', ({ userName }: { userName: string }) => {
      if (userName !== user?.userName) {
        setIsTyping(userName);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setIsTyping(null), 2000);
      }
    });

    return () => {
      socket.off('new_group_message');
      socket.off('group_typing');
      socket.emit('leave_group', id);
    };
  }, [id, token]);

  const handleTextChange = (val: string) => {
    setText(val);
    if (!token) return;
    const socket = getSocket(token);
    socket.emit('group_typing', { groupId: id, userName: user?.userName });
  };

  const sendMessage = useCallback(() => {
    if (!text.trim() || !token) return;
    const msgText = text.trim();
    setText('');

    const optimistic: GroupMessage = {
      _id: `temp_${Date.now()}`,
      senderId: user!._id,
      text: msgText,
      createdAt: new Date().toISOString(),
      pending: true,
      sender: { _id: user!._id, userName: user!.userName, avatar: user!.avatar },
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const socket = getSocket(token);
    socket.emit('send_group_message', { groupId: id, text: msgText });
  }, [text, id, token, user]);

  const handleLeave = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Leave this group?')) return;
    try {
      await api.post(`/api/groups/${id}/members/remove`, { userId: user?._id });
      toast.info('Left the group.');
      router.replace('/(tabs)/chat');
    } catch (_) { toast.error('Failed to leave.'); }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (typeof window !== 'undefined' && !window.confirm(`Remove ${memberName}?`)) return;
    try {
      await api.post(`/api/groups/${id}/members/remove`, { userId: memberId });
      toast.success(`${memberName} removed.`);
      fetchGroup();
    } catch (_) { toast.error('Failed to remove member.'); }
  };

  const handlePromote = async (memberId: string, memberName: string) => {
    try {
      await api.post(`/api/groups/${id}/admin/promote`, { userId: memberId });
      toast.success(`${memberName} is now an admin.`);
      fetchGroup();
    } catch (_) { toast.error('Failed to promote.'); }
  };

  const renderMessage = ({ item, index }: { item: GroupMessage; index: number }) => {
    const isMe = item.senderId === user?._id;
    const prev = messages[index - 1];
    const showSenderName = !isMe && (!prev || prev.senderId !== item.senderId);
    const showTime = !messages[index + 1] ||
      new Date(messages[index + 1].createdAt).getTime() - new Date(item.createdAt).getTime() > 5 * 60 * 1000;

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <View style={styles.avatarSlot}>
            {showSenderName && (
              <Avatar uri={item.sender?.avatar} name={item.sender?.userName} size={28} />
            )}
          </View>
        )}
        <View style={styles.msgContent}>
          {showSenderName && !isMe && (
            <Text style={styles.senderName}>{item.sender?.userName}</Text>
          )}
          <View style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleThem,
            item.pending && styles.bubblePending,
          ]}>
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
            {showTime && (
              <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                {formatTime(item.createdAt)}{isMe ? (item.pending ? ' ·' : ' ✓') : ''}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.purple} size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={() => setShowSettings(true)}>
          {group?.avatar ? (
            <Avatar uri={group.avatar} name={group.name} size={36} />
          ) : (
            <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.groupIconSmall}>
              <Ionicons name={group?.type === 'community' ? 'globe' : 'people'} size={16} color={Colors.white} />
            </LinearGradient>
          )}
          <View>
            <Text style={styles.headerName}>{group?.name}</Text>
            <Text style={styles.headerSub}>
              {isTyping ? `${isTyping} is typing...` : `${group?.memberIds.length} members`}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction} onPress={() => setShowSettings(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.emptyChatIcon}>
              <Ionicons name={group?.type === 'community' ? 'globe' : 'people'} size={32} color={Colors.white} />
            </LinearGradient>
            <Text style={styles.emptyChatName}>{group?.name}</Text>
            <Text style={styles.emptyChatText}>
              {group?.description || 'Say hello to the group!'}
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={Colors.textMuted}
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
            onSubmitEditing={Platform.OS === 'web' ? sendMessage : undefined}
          />
        </View>
        <TouchableOpacity onPress={sendMessage} disabled={!text.trim()}>
          <LinearGradient
            colors={text.trim() ? [Colors.purple, Colors.cyan] : [Colors.bgElevated, Colors.bgElevated]}
            style={styles.sendBtn}
          >
            <Ionicons name="send" size={18} color={text.trim() ? Colors.white : Colors.textMuted} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <View style={styles.settingsContainer}>
          <View style={styles.settingsHeader}>
            <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.settingsTitle}>Group Info</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Group avatar + name */}
            <View style={styles.settingsProfile}>
              {group?.avatar ? (
                <Avatar uri={group.avatar} name={group.name} size={80} />
              ) : (
                <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.settingsGroupIcon}>
                  <Ionicons name={group?.type === 'community' ? 'globe' : 'people'} size={36} color={Colors.white} />
                </LinearGradient>
              )}
              <Text style={styles.settingsGroupName}>{group?.name}</Text>
              {group?.description ? (
                <Text style={styles.settingsGroupDesc}>{group.description}</Text>
              ) : null}
              <View style={styles.settingsTypeBadge}>
                <Ionicons name={group?.type === 'community' ? 'globe-outline' : 'people-outline'} size={12} color={Colors.cyan} />
                <Text style={styles.settingsTypeBadgeText}>
                  {group?.type === 'community' ? 'Community' : 'Group'} · {group?.memberIds.length} members
                </Text>
              </View>
            </View>

            {/* Members */}
            <Text style={styles.settingsSectionLabel}>MEMBERS</Text>
            {group?.members.map((member) => (
              <View key={member._id} style={styles.memberRow}>
                <Avatar uri={member.avatar} name={member.userName} size={42} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.userName}</Text>
                  {member.isAdmin && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
                {isAdmin && member._id !== user?._id && (
                  <View style={styles.memberActions}>
                    {!member.isAdmin && (
                      <TouchableOpacity
                        style={styles.memberActionBtn}
                        onPress={() => handlePromote(member._id, member.userName)}
                      >
                        <Ionicons name="shield-outline" size={16} color={Colors.cyan} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.memberActionBtn}
                      onPress={() => handleRemoveMember(member._id, member.userName)}
                    >
                      <Ionicons name="person-remove-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            {/* Actions */}
            <View style={styles.settingsActions}>
              <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
                <Ionicons name="exit-outline" size={18} color={Colors.error} />
                <Text style={styles.leaveBtnText}>Leave {group?.type === 'community' ? 'Community' : 'Group'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 52, paddingBottom: 12,
    backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupIconSmall: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerName: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
  headerSub: { color: Colors.cyan, fontSize: 11, marginTop: 1 },
  headerAction: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  messageList: { padding: 12, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 4 },
  msgRowMe: { flexDirection: 'row-reverse' },
  avatarSlot: { width: 28, alignItems: 'center', justifyContent: 'flex-end' },
  msgContent: { maxWidth: '75%' },
  senderName: { color: Colors.purpleLight, fontSize: 11, fontWeight: '600', marginBottom: 3, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingVertical: 8, paddingHorizontal: 14 },
  bubbleMe: { backgroundColor: Colors.purple, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubblePending: { opacity: 0.7 },
  bubbleText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: Colors.white },
  bubbleTime: { color: Colors.textMuted, fontSize: 10, marginTop: 3 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  emptyChat: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyChatIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyChatName: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  emptyChatText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 260 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.border, gap: 8,
  },
  inputWrapper: {
    flex: 1, backgroundColor: Colors.bgElevated, borderRadius: 22,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10, maxHeight: 120, minHeight: 42, justifyContent: 'center',
  },
  input: { color: Colors.textPrimary, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },

  // Settings modal
  settingsContainer: { flex: 1, backgroundColor: Colors.bg },
  settingsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  settingsTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  settingsProfile: { alignItems: 'center', padding: 24, gap: 8 },
  settingsGroupIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  settingsGroupName: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700' },
  settingsGroupDesc: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 280 },
  settingsTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.cyanDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  settingsTypeBadgeText: { color: Colors.cyan, fontSize: 12, fontWeight: '600' },
  settingsSectionLabel: {
    color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    paddingHorizontal: 16, marginBottom: 4, marginTop: 8,
  },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  memberInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  adminBadge: { backgroundColor: Colors.purpleDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  adminBadgeText: { color: Colors.purpleLight, fontSize: 10, fontWeight: '700' },
  memberActions: { flexDirection: 'row', gap: 8 },
  memberActionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  settingsActions: { padding: 16, marginTop: 8 },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.error + '40',
  },
  leaveBtnText: { color: Colors.error, fontWeight: '600', fontSize: 15 },
});
