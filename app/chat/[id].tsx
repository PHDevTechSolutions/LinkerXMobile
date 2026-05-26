import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, Pressable, Image, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import EmojiPicker from '@/components/EmojiPicker';
import { useColors } from '@/hooks/useColors';
import { uploadImage, uploadFile, uploadImageFromWeb, uploadFileFromWeb } from '@/lib/cloudinary';
import LinkPreview from '@/components/LinkPreview';

// Detect URLs in message text
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;
function extractUrl(text: string): string | null {
  const m = text?.match(URL_REGEX);
  return m ? m[0] : null;
}

type Attachment = { url: string; type: 'image' | 'file'; fileName?: string };

type Message = {
  _id: string;
  senderId: string;
  text: string;
  attachment?: Attachment | null;
  createdAt: string;
  read: boolean;
  pending?: boolean;
  edited?: boolean;
  pinned?: boolean;
};

type ContextMenu = { msg: Message; x: number; y: number } | null;

export default function ChatConversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuthStore();
  const C = useColors();

  const [messages, setMessages]       = useState<Message[]>([]);
  const [text, setText]               = useState('');
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [otherUser, setOtherUser]     = useState<{ _id: string; userName: string; avatar?: string } | null>(null);
  const [isTyping, setIsTyping]       = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Message actions state
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [editingMsg, setEditingMsg]   = useState<Message | null>(null);
  const [editText, setEditText]       = useState('');
  const [pinnedMsg, setPinnedMsg]     = useState<Message | null>(null);

  const flatListRef   = useRef<FlatList>(null);
  const typingTimeout = useRef<any>(null);
  const webFileInput  = useRef<HTMLInputElement | null>(null);
  const webImageInput = useRef<HTMLInputElement | null>(null);

  // ── Socket + fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    api.get(`/api/chat/messages?chatId=${id}`)
      .then(({ data }) => {
        const msgs: Message[] = data.messages || [];
        setMessages(msgs);
        setOtherUser(data.otherUser || null);
        const pinned = msgs.find((m) => m.pinned);
        if (pinned) setPinnedMsg(pinned);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    if (!token) return;
    const socket = getSocket(token);
    socket.emit('join_room', id);

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => {
        const filtered = prev.filter(
          (m) => !m.pending || m.text !== msg.text || m.attachment?.url !== msg.attachment?.url
        );
        return [...filtered, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

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

  // ── Send ───────────────────────────────────────────────────────────────────
  const sendMessage = useCallback((msgText = text, attachment: Attachment | null = null) => {
    if (!msgText.trim() && !attachment) return;
    if (!token) return;
    const trimmed = msgText.trim();
    setText('');
    const optimistic: Message = {
      _id: `temp_${Date.now()}`, senderId: user!._id, text: trimmed,
      attachment, createdAt: new Date().toISOString(), read: false, pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    const socket = getSocket(token);
    socket.emit('send_message', { chatId: id, text: trimmed, attachment });
  }, [text, id, token, user]);

  const handleTextChange = (val: string) => {
    setText(val);
    if (!token) return;
    const socket = getSocket(token);
    socket.emit('typing', { chatId: id, userId: user?._id });
  };

  // ── Message actions ─────────────────────────────────────────────────────────
  const openContextMenu = (msg: Message) => {
    setContextMenu({ msg, x: 0, y: 0 });
  };

  const handleEdit = (msg: Message) => {
    setContextMenu(null);
    setEditingMsg(msg);
    setEditText(msg.text);
  };

  const submitEdit = async () => {
    if (!editingMsg || !editText.trim()) return;
    try {
      await api.put(`/api/chat/messages/${editingMsg._id}`, { text: editText.trim() });
      setMessages((prev) => prev.map((m) =>
        m._id === editingMsg._id ? { ...m, text: editText.trim(), edited: true } : m
      ));
      setEditingMsg(null);
      setEditText('');
    } catch (_) {}
  };

  const handleDeleteForEveryone = async (msg: Message) => {
    setContextMenu(null);
    try {
      await api.delete(`/api/chat/messages/${msg._id}`);
      setMessages((prev) => prev.filter((m) => m._id !== msg._id));
      if (pinnedMsg?._id === msg._id) setPinnedMsg(null);
    } catch (_) {}
  };

  const handleDeleteForMe = async (msg: Message) => {
    setContextMenu(null);
    try {
      await api.post(`/api/chat/messages/${msg._id}/hide`);
      setMessages((prev) => prev.filter((m) => m._id !== msg._id));
      if (pinnedMsg?._id === msg._id) setPinnedMsg(null);
    } catch (_) {}
  };

  const handlePin = async (msg: Message) => {
    setContextMenu(null);
    try {
      const { data } = await api.post(`/api/chat/messages/${msg._id}/pin`);
      setMessages((prev) => prev.map((m) =>
        m._id === msg._id ? { ...m, pinned: data.pinned } : { ...m, pinned: false }
      ));
      setPinnedMsg(data.pinned ? { ...msg, pinned: true } : null);
    } catch (_) {}
  };

  // ── Image / File pickers ────────────────────────────────────────────────────
  const pickImage = async () => {
    setShowAttachMenu(false);
    try {
      setUploading(true);
      if (Platform.OS === 'web') { webImageInput.current?.click(); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;
      const { url } = await uploadImage(result.assets[0].uri, 'linkerx/chat');
      sendMessage('', { url, type: 'image' });
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  const pickFile = async () => {
    setShowAttachMenu(false);
    try {
      setUploading(true);
      if (Platform.OS === 'web') { webFileInput.current?.click(); return; }
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const { url, fileName } = await uploadFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream', 'linkerx/chat');
      sendMessage('', { url, type: 'file', fileName: fileName || asset.name });
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  const handleWebImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { setUploading(true); const { url } = await uploadImageFromWeb(file, 'linkerx/chat'); sendMessage('', { url, type: 'image' }); }
    catch (err) { console.error(err); }
    finally { setUploading(false); if (webImageInput.current) webImageInput.current.value = ''; }
  };

  const handleWebFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setUploading(true);
      if (file.type.startsWith('image/')) { const { url } = await uploadImageFromWeb(file, 'linkerx/chat'); sendMessage('', { url, type: 'image' }); }
      else { const { url, fileName } = await uploadFileFromWeb(file, 'linkerx/chat'); sendMessage('', { url, type: 'file', fileName }); }
    } catch (err) { console.error(err); }
    finally { setUploading(false); if (webFileInput.current) webFileInput.current.value = ''; }
  };

  // ── Render message ──────────────────────────────────────────────────────────
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === user?._id;
    const prev = messages[index - 1];
    const showAvatar = !isMe && (!prev || prev.senderId !== item.senderId);
    const showTime = !messages[index + 1] ||
      new Date(messages[index + 1].createdAt).getTime() - new Date(item.createdAt).getTime() > 5 * 60 * 1000;

    return (
      <View>
        <TouchableOpacity
          onLongPress={() => openContextMenu(item)}
          activeOpacity={0.85}
          delayLongPress={350}
        >
          <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
            {!isMe && (
              <View style={styles.avatarSlot}>
                {showAvatar && <Avatar uri={otherUser?.avatar} name={otherUser?.userName} size={28} />}
              </View>
            )}
            <View style={[
              styles.bubble,
              isMe ? [styles.bubbleMe, { backgroundColor: C.purple }] : [styles.bubbleThem, { backgroundColor: C.bgCard, borderColor: C.border }],
              item.pending && styles.bubblePending,
              item.attachment?.type === 'image' && !item.text && styles.bubbleImage,
              item.pinned && styles.bubblePinned,
            ]}>
              {item.pinned && (
                <View style={styles.pinnedBadge}>
                  <Ionicons name="pin" size={10} color={C.cyan} />
                  <Text style={[styles.pinnedBadgeText, { color: C.cyan }]}>Pinned</Text>
                </View>
              )}
              {item.attachment?.type === 'image' && (
                <TouchableOpacity onPress={() => Linking.openURL(item.attachment!.url)} activeOpacity={0.9}>
                  <Image source={{ uri: item.attachment.url }} style={styles.attachedImage} resizeMode="cover" />
                </TouchableOpacity>
              )}
              {item.attachment?.type === 'file' && (
                <TouchableOpacity style={[styles.fileAttach, isMe && styles.fileAttachMe]} onPress={() => Linking.openURL(item.attachment!.url)}>
                  <View style={styles.fileIcon}><Ionicons name="document-outline" size={20} color={isMe ? C.white : C.purple} /></View>
                  <Text style={[styles.fileName, { color: isMe ? C.white : C.textSecondary }]} numberOfLines={2}>{item.attachment.fileName || 'File'}</Text>
                  <Ionicons name="download-outline" size={16} color={isMe ? 'rgba(255,255,255,0.7)' : C.textMuted} />
                </TouchableOpacity>
              )}
              {!!item.text && (
                <Text style={[styles.bubbleText, isMe ? { color: C.white } : { color: C.textSecondary }]}>{item.text}</Text>
              )}
              {/* Link preview for messages containing URLs */}
              {!!item.text && extractUrl(item.text) && (
                <LinkPreview url={extractUrl(item.text)!} compact={true} />
              )}
              {showTime && (
                <Text style={[styles.bubbleTime, isMe ? { color: 'rgba(255,255,255,0.6)', textAlign: 'right' } : { color: C.textMuted }]}>
                  {formatTime(item.createdAt)}{item.edited ? ' · edited' : ''}{isMe && <Text> {item.pending ? '·' : '✓'}</Text>}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const isMe = contextMenu ? contextMenu.msg.senderId === user?._id : false;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: C.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>

      {Platform.OS === 'web' && (
        <>
          <input ref={webImageInput as any} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleWebImageChange as any} />
          <input ref={webFileInput as any} type="file" accept="*/*" style={{ display: 'none' }} onChange={handleWebFileChange as any} />
        </>
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerUser}>
          {otherUser && <Avatar uri={otherUser.avatar} name={otherUser.userName} size={36} />}
          <View>
            <Text style={[styles.headerName, { color: C.textPrimary }]}>{otherUser?.userName || '...'}</Text>
            {isTyping && <Text style={[styles.typingText, { color: C.cyan }]}>typing...</Text>}
          </View>
        </View>
        <TouchableOpacity style={[styles.headerAction, { backgroundColor: C.bgElevated }]}
          onPress={() => router.push(`/call/${otherUser?._id}?type=video&userName=${encodeURIComponent(otherUser?.userName || '')}&avatar=${encodeURIComponent(otherUser?.avatar || '')}` as any)}>
          <Ionicons name="videocam-outline" size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Pinned message banner */}
      {pinnedMsg && (
        <TouchableOpacity style={[styles.pinnedBanner, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}
          onPress={() => {}} activeOpacity={0.8}>
          <Ionicons name="pin" size={14} color={C.cyan} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pinnedBannerLabel, { color: C.cyan }]}>Pinned Message</Text>
            <Text style={[styles.pinnedBannerText, { color: C.textSecondary }]} numberOfLines={1}>{pinnedMsg.text}</Text>
          </View>
          <TouchableOpacity onPress={() => setPinnedMsg(null)}>
            <Ionicons name="close" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Messages */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.purple} /></View>
      ) : (
        <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => item._id}
          renderItem={renderMessage} contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Avatar uri={otherUser?.avatar} name={otherUser?.userName} size={64} />
              <Text style={[styles.emptyChatName, { color: C.textPrimary }]}>{otherUser?.userName}</Text>
              <Text style={[styles.emptyChatText, { color: C.textMuted }]}>Say hi! Start the conversation.</Text>
            </View>
          }
        />
      )}

      {uploading && (
        <View style={[styles.uploadingBar, { backgroundColor: C.bgCard, borderTopColor: C.border }]}>
          <ActivityIndicator size="small" color={C.purple} />
          <Text style={[styles.uploadingText, { color: C.textMuted }]}>Uploading...</Text>
        </View>
      )}

      {/* Input bar — edit mode or normal */}
      {editingMsg ? (
        <View style={[styles.editBar, { backgroundColor: C.bgCard, borderTopColor: C.border }]}>
          <View style={[styles.editIndicator, { backgroundColor: C.purpleDim }]}>
            <Ionicons name="pencil" size={14} color={C.purple} />
            <Text style={[styles.editIndicatorText, { color: C.purple }]}>Editing message</Text>
            <TouchableOpacity onPress={() => { setEditingMsg(null); setEditText(''); }} style={{ marginLeft: 'auto' as any }}>
              <Ionicons name="close" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.editInputRow}>
            <View style={[styles.inputWrapper, { backgroundColor: C.bgElevated, borderColor: C.purple }]}>
              <TextInput style={[styles.input, { color: C.textPrimary }]} value={editText}
                onChangeText={setEditText} multiline autoFocus placeholderTextColor={C.textMuted} />
            </View>
            <TouchableOpacity onPress={submitEdit} disabled={!editText.trim()}>
              <LinearGradient colors={editText.trim() ? [C.purple, C.cyan] : [C.bgElevated, C.bgElevated]} style={styles.sendBtn}>
                <Ionicons name="checkmark" size={20} color={editText.trim() ? C.white : C.textMuted} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.inputRow, { backgroundColor: C.bgCard, borderTopColor: C.border }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={() => setShowAttachMenu(true)} disabled={uploading}>
            <Ionicons name="add-circle-outline" size={26} color={uploading ? C.textMuted : C.purple} />
          </TouchableOpacity>
          <EmojiPicker onSelect={(emoji) => setText((prev) => prev + emoji)} />
          <View style={[styles.inputWrapper, { backgroundColor: C.bgElevated, borderColor: C.border }]}>
            <TextInput style={[styles.input, { color: C.textPrimary }]} placeholder="Message..."
              placeholderTextColor={C.textMuted} value={text} onChangeText={handleTextChange}
              multiline maxLength={1000}
              onSubmitEditing={Platform.OS === 'web' ? () => sendMessage() : undefined} />
          </View>
          <TouchableOpacity onPress={() => sendMessage()} disabled={!text.trim() || uploading}
            style={[styles.sendBtnWrap, !text.trim() && styles.sendBtnDisabled]}>
            <LinearGradient colors={text.trim() ? [C.purple, C.cyan] : [C.bgElevated, C.bgElevated]} style={styles.sendBtn}>
              <Ionicons name="send" size={18} color={text.trim() ? C.white : C.textMuted} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Context menu modal ── */}
      <Modal visible={!!contextMenu} transparent animationType="fade" onRequestClose={() => setContextMenu(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setContextMenu(null)}>
          <Pressable style={[styles.contextMenu, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <View style={[styles.contextHandle, { backgroundColor: C.border }]} />

            {/* Pin / Unpin */}
            <TouchableOpacity style={styles.contextItem} onPress={() => handlePin(contextMenu!.msg)}>
              <View style={[styles.contextIcon, { backgroundColor: C.cyanDim }]}>
                <Ionicons name={contextMenu?.msg.pinned ? 'pin-outline' : 'pin'} size={18} color={C.cyan} />
              </View>
              <Text style={[styles.contextLabel, { color: C.textPrimary }]}>
                {contextMenu?.msg.pinned ? 'Unpin Message' : 'Pin Message'}
              </Text>
            </TouchableOpacity>

            {/* Edit — only sender */}
            {isMe && !!contextMenu?.msg.text && (
              <TouchableOpacity style={styles.contextItem} onPress={() => handleEdit(contextMenu!.msg)}>
                <View style={[styles.contextIcon, { backgroundColor: C.purpleDim }]}>
                  <Ionicons name="pencil-outline" size={18} color={C.purple} />
                </View>
                <Text style={[styles.contextLabel, { color: C.textPrimary }]}>Edit Message</Text>
              </TouchableOpacity>
            )}

            {/* Delete for me */}
            <TouchableOpacity style={styles.contextItem} onPress={() => handleDeleteForMe(contextMenu!.msg)}>
              <View style={[styles.contextIcon, { backgroundColor: '#f59e0b22' }]}>
                <Ionicons name="eye-off-outline" size={18} color="#f59e0b" />
              </View>
              <Text style={[styles.contextLabel, { color: C.textPrimary }]}>Delete for Me</Text>
            </TouchableOpacity>

            {/* Delete for everyone — only sender */}
            {isMe && (
              <TouchableOpacity style={styles.contextItem} onPress={() => handleDeleteForEveryone(contextMenu!.msg)}>
                <View style={[styles.contextIcon, { backgroundColor: '#ef444422' }]}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </View>
                <Text style={[styles.contextLabel, { color: '#ef4444' }]}>Delete for Everyone</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.contextCancel, { backgroundColor: C.bgElevated }]} onPress={() => setContextMenu(null)}>
              <Text style={[styles.contextCancelText, { color: C.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Attach menu */}
      <Modal visible={showAttachMenu} transparent animationType="slide" onRequestClose={() => setShowAttachMenu(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAttachMenu(false)}>
          <Pressable style={[styles.attachMenu, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <View style={[styles.attachMenuHandle, { backgroundColor: C.border }]} />
            <Text style={[styles.attachMenuTitle, { color: C.textMuted }]}>Add to message</Text>
            <View style={styles.attachGrid}>
              <TouchableOpacity style={styles.attachGridItem} onPress={pickImage}>
                <LinearGradient colors={['#8b5cf6', '#6d28d9']} style={styles.attachGridIcon}>
                  <Ionicons name="image" size={26} color={C.white} />
                </LinearGradient>
                <Text style={[styles.attachGridLabel, { color: C.textSecondary }]}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachGridItem} onPress={pickFile}>
                <LinearGradient colors={['#3b82f6', '#1d4ed8']} style={styles.attachGridIcon}>
                  <Ionicons name="document" size={26} color={C.white} />
                </LinearGradient>
                <Text style={[styles.attachGridLabel, { color: C.textSecondary }]}>File</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachGridItem} onPress={() => { setShowAttachMenu(false); router.push(`/call/${otherUser?._id}?type=video&userName=${encodeURIComponent(otherUser?.userName || '')}&avatar=${encodeURIComponent(otherUser?.avatar || '')}` as any); }}>
                <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.attachGridIcon}>
                  <Ionicons name="videocam" size={26} color={C.white} />
                </LinearGradient>
                <Text style={[styles.attachGridLabel, { color: C.textSecondary }]}>Video Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachGridItem} onPress={() => { setShowAttachMenu(false); router.push(`/call/${otherUser?._id}?type=voice&userName=${encodeURIComponent(otherUser?.userName || '')}&avatar=${encodeURIComponent(otherUser?.avatar || '')}` as any); }}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.attachGridIcon}>
                  <Ionicons name="call" size={26} color={C.white} />
                </LinearGradient>
                <Text style={[styles.attachGridLabel, { color: C.textSecondary }]}>Voice Call</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: C.bgElevated }]} onPress={() => setShowAttachMenu(false)}>
              <Text style={[styles.cancelText, { color: C.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 52, paddingBottom: 12,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  headerUser:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName:   { color: Colors.textPrimary, fontWeight: '700', fontSize: 16 },
  typingText:   { color: Colors.cyan, fontSize: 11, marginTop: 1 },
  headerAction: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },

  // Pinned banner
  pinnedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1,
  },
  pinnedBannerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  pinnedBannerText:  { fontSize: 13, marginTop: 1 },

  messageList: { padding: 12, paddingBottom: 8, gap: 2 },

  msgRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 2 },
  msgRowMe:  { flexDirection: 'row-reverse' },
  avatarSlot:{ width: 28, alignItems: 'center', justifyContent: 'flex-end' },

  bubble: {
    maxWidth: '75%', borderRadius: 18,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  bubbleMe:      { backgroundColor: Colors.purple, borderBottomRightRadius: 4 },
  bubbleThem:    { backgroundColor: Colors.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubblePending: { opacity: 0.7 },
  bubbleImage:   { padding: 0, overflow: 'hidden' },
  bubblePinned:  { borderWidth: 1, borderColor: Colors.cyan + '55' },

  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginBottom: 4,
  },
  pinnedBadgeText: { fontSize: 10, fontWeight: '600' },

  attachedImage: { width: 220, height: 180, borderRadius: 14 },

  fileAttach:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10 },
  fileAttachMe: { backgroundColor: 'rgba(255,255,255,0.15)' },
  fileIcon:     { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  fileName:     { flex: 1, color: Colors.textSecondary, fontSize: 13 },

  bubbleText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  bubbleTime: { color: Colors.textMuted, fontSize: 10, marginTop: 3 },

  emptyChat:     { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyChatName: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  emptyChatText: { color: Colors.textMuted, fontSize: 13 },

  uploadingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  uploadingText: { color: Colors.textMuted, fontSize: 13 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1, borderTopColor: Colors.border, gap: 8,
  },
  attachBtn: { paddingBottom: 4 },
  inputWrapper: {
    flex: 1, backgroundColor: Colors.bgElevated,
    borderRadius: 22, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
    maxHeight: 120, minHeight: 42, justifyContent: 'center',
  },
  input:           { color: Colors.textPrimary, fontSize: 14, maxHeight: 100 },
  sendBtnWrap:     {},
  sendBtnDisabled: { opacity: 0.5 },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },

  // Edit bar
  editBar: {
    paddingHorizontal: 10, paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    borderTopWidth: 1, gap: 6,
  },
  editIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  editIndicatorText: { fontSize: 12, fontWeight: '600', flex: 1 },
  editInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },

  // Context menu
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  contextMenu: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1, gap: 4,
  },
  contextHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 12,
  },
  contextItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  contextIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  contextLabel:      { fontSize: 15, fontWeight: '500' },
  contextCancel: {
    marginTop: 8, paddingVertical: 14,
    borderRadius: 14, alignItems: 'center',
  },
  contextCancelText: { fontSize: 15, fontWeight: '600' },

  // Attach menu
  attachMenu: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1, borderColor: Colors.border,
  },
  attachMenuHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16,
  },
  attachMenuTitle: {
    color: Colors.textMuted, fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 20, textAlign: 'center',
  },
  attachGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 8 },
  attachGridItem:  { alignItems: 'center', gap: 8, width: 72 },
  attachGridIcon:  { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  attachGridLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' },
  cancelBtn:  { marginTop: 12, paddingVertical: 14, backgroundColor: Colors.bgElevated, borderRadius: 14, alignItems: 'center' },
  cancelText: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
});
