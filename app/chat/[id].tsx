import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';

type Message = {
  _id: string;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
  pending?: boolean; // optimistic
};

export default function ChatConversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<{ _id: string; userName: string; avatar?: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<any>(null);

  useEffect(() => {
    // Fetch existing messages
    api.get(`/api/chat/messages?chatId=${id}`)
      .then(({ data }) => {
        setMessages(data.messages || []);
        setOtherUser(data.otherUser || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    if (!token) return;
    const socket = getSocket(token);
    socket.emit('join_room', id);

    // Receive new messages
    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => {
        // Remove optimistic duplicate if exists
        const filtered = prev.filter((m) => !m.pending || m.text !== msg.text);
        return [...filtered, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    // Typing indicator
    socket.on('typing', ({ userId }: { userId: string }) => {
      if (userId !== user?._id) {
        setIsTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setIsTyping(false), 2000);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('typing');
      socket.emit('leave_room', id);
    };
  }, [id, token]);

  const handleTextChange = (val: string) => {
    setText(val);
    if (!token) return;
    const socket = getSocket(token);
    socket.emit('typing', { chatId: id, userId: user?._id });
  };

  const sendMessage = useCallback(() => {
    if (!text.trim() || !token) return;
    const msgText = text.trim();
    setText('');

    // Optimistic message — show immediately
    const optimistic: Message = {
      _id: `temp_${Date.now()}`,
      senderId: user!._id,
      text: msgText,
      createdAt: new Date().toISOString(),
      read: false,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Send via socket (real-time) — backend will broadcast back
    const socket = getSocket(token);
    socket.emit('send_message', { chatId: id, text: msgText });
  }, [text, id, token, user]);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === user?._id;
    const prev = messages[index - 1];
    const showAvatar = !isMe && (!prev || prev.senderId !== item.senderId);
    const showTime = !messages[index + 1] ||
      new Date(messages[index + 1].createdAt).getTime() - new Date(item.createdAt).getTime() > 5 * 60 * 1000;

    return (
      <View>
        <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
          {/* Avatar placeholder to keep alignment */}
          {!isMe && (
            <View style={styles.avatarSlot}>
              {showAvatar && <Avatar uri={otherUser?.avatar} name={otherUser?.userName} size={28} />}
            </View>
          )}

          <View style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleThem,
            item.pending && styles.bubblePending,
          ]}>
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
            {showTime && (
              <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                {formatTime(item.createdAt)}
                {isMe && (
                  <Text> {item.pending ? ' ·' : ' ✓'}</Text>
                )}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

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
        <View style={styles.headerUser}>
          {otherUser && <Avatar uri={otherUser.avatar} name={otherUser.userName} size={36} />}
          <View>
            <Text style={styles.headerName}>{otherUser?.userName || '...'}</Text>
            {isTyping && <Text style={styles.typingText}>typing...</Text>}
          </View>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call-outline" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.purple} /></View>
      ) : (
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
              <Avatar uri={otherUser?.avatar} name={otherUser?.userName} size={64} />
              <Text style={styles.emptyChatName}>{otherUser?.userName}</Text>
              <Text style={styles.emptyChatText}>Say hi! Start the conversation.</Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.attachBtn}>
          <Ionicons name="add-circle-outline" size={26} color={Colors.textMuted} />
        </TouchableOpacity>

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

        <TouchableOpacity
          onPress={sendMessage}
          disabled={!text.trim()}
          style={[styles.sendBtnWrap, !text.trim() && styles.sendBtnDisabled]}
        >
          <LinearGradient
            colors={text.trim() ? [Colors.purple, Colors.cyan] : [Colors.bgElevated, Colors.bgElevated]}
            style={styles.sendBtn}
          >
            <Ionicons
              name="send"
              size={18}
              color={text.trim() ? Colors.white : Colors.textMuted}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 52, paddingBottom: 12,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { color: Colors.textPrimary, fontWeight: '700', fontSize: 16 },
  typingText: { color: Colors.cyan, fontSize: 11, marginTop: 1 },
  headerAction: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },

  messageList: { padding: 12, paddingBottom: 8, gap: 2 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 2 },
  msgRowMe: { flexDirection: 'row-reverse' },

  avatarSlot: { width: 28, alignItems: 'center', justifyContent: 'flex-end' },

  bubble: {
    maxWidth: '75%', borderRadius: 18,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  bubbleMe: {
    backgroundColor: Colors.purple,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: Colors.bgCard,
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  bubblePending: { opacity: 0.7 },
  bubbleText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: Colors.white },
  bubbleTime: { color: Colors.textMuted, fontSize: 10, marginTop: 3 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },

  emptyChat: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyChatName: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  emptyChatText: { color: Colors.textMuted, fontSize: 13 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1, borderTopColor: Colors.border,
    gap: 8,
  },
  attachBtn: { paddingBottom: 4 },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: 22, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
    maxHeight: 120, minHeight: 42,
    justifyContent: 'center',
  },
  input: { color: Colors.textPrimary, fontSize: 14, maxHeight: 100 },
  sendBtnWrap: {},
  sendBtnDisabled: { opacity: 0.5 },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
});
