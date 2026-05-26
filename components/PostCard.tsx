import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Modal, TextInput, FlatList, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { useColors } from '@/hooks/useColors';
import Avatar from './Avatar';
import api from '@/lib/api';
import { toast } from '@/lib/toast';

export type Post = {
  _id: string;
  author: { _id: string; userName: string; avatar?: string };
  type: 'text' | 'link' | 'image' | 'video' | 'file';
  content: string;
  mediaUrl?: string;
  linkUrl?: string;
  likes: string[];
  commentsCount: number;
  createdAt: string;
};

type Comment = {
  _id: string;
  author: { _id: string; userName: string; avatar?: string };
  text: string;
  likes: string[];
  parentId: string | null;
  createdAt: string;
};

type Props = {
  post: Post;
  currentUserId: string;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (postId: string, newContent: string) => void;
  savedPostIds?: string[]; // optional list of saved post IDs from parent
};

const REACTIONS = [
  { key: 'like',  emoji: '👍', color: '#4A90E2' },
  { key: 'love',  emoji: '❤️', color: '#E05C8A' },
  { key: 'haha',  emoji: '😂', color: '#F5A623' },
  { key: 'wow',   emoji: '😮', color: '#F5A623' },
  { key: 'sad',   emoji: '😢', color: '#4A90E2' },
  { key: 'angry', emoji: '😡', color: '#EF4444' },
];

export default function PostCard({ post, currentUserId, onLike, onDelete, onEdit, savedPostIds }: Props) {
  const isLiked  = post.likes.includes(currentUserId);
  const isOwner  = post.author?._id === currentUserId;
  const timeAgo  = formatTimeAgo(post.createdAt);
  const C        = useColors();

  // Save state
  const [isSaved, setIsSaved] = useState(() => savedPostIds?.includes(post._id) ?? false);
  const [saving, setSaving]   = useState(false);

  // Reactions
  const [showReactions, setShowReactions]   = useState(false);
  const [myReaction, setMyReaction]         = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, string[]>>({});

  // Comments
  const [showComments, setShowComments]     = useState(false);
  const [comments, setComments]             = useState<Comment[]>([]);
  const [commentText, setCommentText]       = useState('');
  const [replyTo, setReplyTo]               = useState<Comment | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [commentsCount, setCommentsCount]   = useState(post.commentsCount);

  // Edit / Options
  const [showEdit, setShowEdit]     = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data } = await api.get(`/api/comments?postId=${post._id}`);
      setComments(data.comments || []);
    } catch (_) {}
    finally { setLoadingComments(false); }
  };

  const openComments = () => {
    setShowComments(true);
    fetchComments();
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const { data } = await api.post('/api/comments', {
        postId: post._id,
        text: commentText.trim(),
        parentId: replyTo?._id || null,
      });
      setComments((prev) => [...prev, data.comment]);
      if (!replyTo) setCommentsCount((c) => c + 1);
      setCommentText('');
      setReplyTo(null);
      toast.success('Comment posted!');
    } catch (_) { toast.error('Failed to post comment.'); }
    finally { setPostingComment(false); }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      await api.post(`/api/comments/${commentId}/like`);
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? { ...c, likes: c.likes.includes(currentUserId) ? c.likes.filter((id) => id !== currentUserId) : [...c.likes, currentUserId] }
            : c
        )
      );
    } catch (_) {}
  };

  const handleReact = async (reaction: string) => {
    setShowReactions(false);
    try {
      const { data } = await api.post('/api/reactions', { targetId: post._id, targetType: 'post', reaction });
      if (data.action === 'removed') {
        setMyReaction(null);
      } else {
        setMyReaction(reaction);
      }
    } catch (_) {}
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.post(`/api/profile/saved/${post._id}`);
      setIsSaved((prev) => !prev);
      toast.success(isSaved ? 'Removed from saved.' : 'Post saved!');
    } catch {
      toast.error('Failed to save post.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    const text = post.content || 'Check this post on LinkerX!';
    try {
      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({ title: 'LinkerX Post', text });
      } else if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
        toast.info('Copied to clipboard!');
      }
    } catch (_) {}
  };

  const handleDelete = () => {
    const confirmed = Platform.OS === 'web' ? window.confirm('Delete this post?') : true;
    if (confirmed) { onDelete?.(post._id); toast.success('Post deleted.'); }
    setShowOptions(false);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      await api.put(`/api/posts/${post._id}`, { content: editContent });
      onEdit?.(post._id, editContent);
      setShowEdit(false);
      toast.success('Post updated!');
    } catch (_) { toast.error('Failed to update post.'); }
    finally { setSavingEdit(false); }
  };

  const currentReaction = REACTIONS.find((r) => r.key === myReaction);
  const topLevelComments = comments.filter((c) => !c.parentId);
  const getReplies = (commentId: string) => comments.filter((c) => c.parentId === commentId);

  return (
    <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar uri={post.author?.avatar} name={post.author?.userName} size={38} />
        <View style={styles.headerText}>
          <Text style={[styles.userName, { color: C.textPrimary }]}>{post.author?.userName}</Text>
          <Text style={[styles.time, { color: C.textMuted }]}>{timeAgo}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={() => setShowOptions(true)}>
            <Ionicons name="ellipsis-horizontal" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {post.content ? <Text style={[styles.content, { color: C.textSecondary }]}>{post.content}</Text> : null}

      {post.linkUrl && (
        <View style={[styles.linkChip, { backgroundColor: C.bgElevated, borderColor: C.cyanDim }]}>
          <Ionicons name="link-outline" size={14} color={C.cyan} />
          <Text style={[styles.linkChipText, { color: C.cyan }]} numberOfLines={1}>{post.linkUrl}</Text>
        </View>
      )}

      {post.mediaUrl && post.type === 'image' && (
        <Image source={{ uri: post.mediaUrl }} style={styles.media} resizeMode="cover" />
      )}

      {myReaction && (
        <View style={styles.reactionSummary}>
          <Text style={[styles.reactionSummaryText, { color: C.textMuted }]}>
            {currentReaction?.emoji} You reacted with {myReaction}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: C.border }]}>
        <TouchableOpacity style={styles.action} onPress={() => onLike(post._id)} onLongPress={() => setShowReactions(true)}>
          {myReaction
            ? <Text style={{ fontSize: 20 }}>{currentReaction?.emoji}</Text>
            : <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? '#e05c8a' : C.textSecondary} />
          }
          <Text style={[styles.actionText, { color: C.textSecondary }, isLiked && { color: '#e05c8a' }]}>{post.likes.length}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={openComments}>
          <Ionicons name="chatbubble-outline" size={19} color={C.textSecondary} />
          <Text style={[styles.actionText, { color: C.textSecondary }]}>{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={20} color={C.textSecondary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.action} onPress={handleSave} disabled={saving}>
          <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={isSaved ? C.purple : C.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Reactions picker */}
      <Modal visible={showReactions} transparent animationType="fade" onRequestClose={() => setShowReactions(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowReactions(false)}>
          <View style={[styles.reactionPicker, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            {REACTIONS.map((r) => (
              <TouchableOpacity key={r.key} style={styles.reactionBtn} onPress={() => handleReact(r.key)}>
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                <Text style={[styles.reactionLabel, { color: C.textMuted }]}>{r.key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Options Modal */}
      <Modal visible={showOptions} transparent animationType="fade" onRequestClose={() => setShowOptions(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowOptions(false)}>
          <View style={[styles.optionsMenu, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <TouchableOpacity style={styles.optionItem} onPress={() => { setShowOptions(false); setShowEdit(true); }}>
              <Ionicons name="pencil-outline" size={18} color={C.textPrimary} />
              <Text style={[styles.optionText, { color: C.textPrimary }]}>Edit Post</Text>
            </TouchableOpacity>
            <View style={[styles.optionDivider, { backgroundColor: C.border }]} />
            <TouchableOpacity style={styles.optionItem} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={C.error} />
              <Text style={[styles.optionText, { color: C.error }]}>Delete Post</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.overlay}>
          <View style={[styles.editModal, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>Edit Post</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: C.bgElevated, borderColor: C.border, color: C.textPrimary }]}
              value={editContent} onChangeText={setEditContent} multiline placeholderTextColor={C.textMuted}
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: C.bgElevated, borderColor: C.border }]} onPress={() => setShowEdit(false)}>
                <Text style={[styles.cancelText, { color: C.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} disabled={savingEdit}>
                <LinearGradient colors={[C.purple, C.cyan]} style={styles.saveBtn}>
                  {savingEdit ? <ActivityIndicator color={C.white} size="small" /> : <Text style={[styles.saveText, { color: C.white }]}>Save</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={showComments} transparent animationType="slide" onRequestClose={() => setShowComments(false)}>
        <View style={styles.overlay}>
          <View style={[styles.commentsModal, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <View style={styles.commentsHeader}>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>Comments</Text>
              <TouchableOpacity onPress={() => { setShowComments(false); setReplyTo(null); }}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator color={C.purple} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={topLevelComments}
                keyExtractor={(item) => item._id}
                style={styles.commentsList}
                ListEmptyComponent={<Text style={[styles.noComments, { color: C.textMuted }]}>No comments yet. Be the first!</Text>}
                renderItem={({ item }) => {
                  const replies = getReplies(item._id);
                  const commentLiked = item.likes?.includes(currentUserId);
                  return (
                    <View style={styles.commentThread}>
                      <View style={styles.commentRow}>
                        <Avatar uri={item.author?.avatar} name={item.author?.userName} size={30} />
                        <View style={[styles.commentBubble, { backgroundColor: C.bgElevated, borderColor: C.border }]}>
                          <Text style={[styles.commentUser, { color: C.purple }]}>{item.author?.userName}</Text>
                          <Text style={[styles.commentText, { color: C.textSecondary }]}>{item.text}</Text>
                          <View style={styles.commentActions}>
                            <TouchableOpacity style={styles.commentAction} onPress={() => handleLikeComment(item._id)}>
                              <Ionicons name={commentLiked ? 'heart' : 'heart-outline'} size={13} color={commentLiked ? '#e05c8a' : C.textMuted} />
                              {item.likes?.length > 0 && <Text style={[styles.commentActionText, { color: C.textMuted }]}>{item.likes.length}</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.commentAction} onPress={() => setReplyTo(item)}>
                              <Text style={[styles.replyBtn, { color: C.purple }]}>Reply</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                      {replies.map((reply) => (
                        <View key={reply._id} style={styles.replyRow}>
                          <Avatar uri={reply.author?.avatar} name={reply.author?.userName} size={24} />
                          <View style={[styles.commentBubble, styles.replyBubble, { backgroundColor: C.bg, borderColor: C.border }]}>
                            <Text style={[styles.commentUser, { color: C.purple }]}>{reply.author?.userName}</Text>
                            <Text style={[styles.commentText, { color: C.textSecondary }]}>{reply.text}</Text>
                            <View style={styles.commentActions}>
                              <TouchableOpacity style={styles.commentAction} onPress={() => handleLikeComment(reply._id)}>
                                <Ionicons name={reply.likes?.includes(currentUserId) ? 'heart' : 'heart-outline'} size={12} color={C.textMuted} />
                                {reply.likes?.length > 0 && <Text style={[styles.commentActionText, { color: C.textMuted }]}>{reply.likes.length}</Text>}
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                }}
              />
            )}

            {replyTo && (
              <View style={[styles.replyIndicator, { backgroundColor: C.purpleDim }]}>
                <Text style={[styles.replyIndicatorText, { color: C.purpleLight }]}>Replying to {replyTo.author.userName}</Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}>
                  <Ionicons name="close" size={16} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.commentInputRow, { borderTopColor: C.border }]}>
              <TextInput
                style={[styles.commentInput, { backgroundColor: C.bgElevated, borderColor: C.border, color: C.textPrimary }]}
                placeholder={replyTo ? `Reply to ${replyTo.author.userName}...` : 'Write a comment...'}
                placeholderTextColor={C.textMuted} value={commentText} onChangeText={setCommentText}
              />
              <TouchableOpacity onPress={submitComment} disabled={postingComment || !commentText.trim()}>
                <LinearGradient colors={[C.purple, C.cyan]} style={styles.sendBtn}>
                  {postingComment ? <ActivityIndicator color={C.white} size="small" /> : <Ionicons name="send" size={16} color={C.white} />}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  headerText: { flex: 1, marginLeft: 10 },
  userName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 },
  time: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  content: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  linkChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bgElevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, borderWidth: 1, borderColor: Colors.cyanDim },
  linkChipText: { color: Colors.cyan, fontSize: 12, flex: 1 },
  media: { width: '100%', height: 200, borderRadius: 12, marginBottom: 10 },
  reactionSummary: { marginBottom: 6 },
  reactionSummaryText: { color: Colors.textMuted, fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { color: Colors.textSecondary, fontSize: 13 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center' },

  // Reactions picker
  reactionPicker: {
    flexDirection: 'row', gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: 40,
    paddingHorizontal: 16, paddingVertical: 10,
    marginBottom: 80,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  reactionBtn: { alignItems: 'center', gap: 2 },
  reactionEmoji: { fontSize: 28 },
  reactionLabel: { color: Colors.textMuted, fontSize: 9 },

  // Options
  optionsMenu: { backgroundColor: Colors.bgCard, borderRadius: 16, width: '90%', marginBottom: 30, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  optionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  optionText: { color: Colors.textPrimary, fontSize: 15 },
  optionDivider: { height: 1, backgroundColor: Colors.border },

  // Edit
  editModal: { backgroundColor: Colors.bgCard, borderRadius: 20, width: '90%', padding: 20, marginBottom: 30, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 14 },
  editInput: { backgroundColor: Colors.bgElevated, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, padding: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 14 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.textMuted, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, minWidth: 70, alignItems: 'center' },
  saveText: { color: Colors.white, fontWeight: '700' },

  // Comments
  commentsModal: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '100%', maxHeight: '80%', padding: 16, borderWidth: 1, borderColor: Colors.border },
  commentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  commentsList: { flex: 1 },
  noComments: { color: Colors.textMuted, textAlign: 'center', marginTop: 20, fontSize: 13 },

  commentThread: { marginBottom: 12 },
  commentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  replyRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 8, marginLeft: 38 },
  commentBubble: { flex: 1, backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: Colors.border },
  replyBubble: { backgroundColor: Colors.bg },
  commentUser: { color: Colors.purple, fontWeight: '600', fontSize: 12, marginBottom: 3 },
  commentText: { color: Colors.textSecondary, fontSize: 13 },
  commentActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  commentAction: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  commentActionText: { color: Colors.textMuted, fontSize: 11 },
  replyBtn: { color: Colors.purple, fontSize: 12, fontWeight: '600' },

  replyIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.purpleDim, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8 },
  replyIndicatorText: { color: Colors.purpleLight, fontSize: 12 },

  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  commentInput: { flex: 1, backgroundColor: Colors.bgElevated, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, color: Colors.textPrimary, fontSize: 14 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
