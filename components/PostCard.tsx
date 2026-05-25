import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Modal, TextInput, FlatList, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
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
  linkPreview?: { title: string; description: string; image: string; url: string };
  likes: string[];
  commentsCount: number;
  createdAt: string;
};

type Comment = {
  _id: string;
  author: { _id: string; userName: string; avatar?: string };
  text: string;
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
};

export default function PostCard({
  post, currentUserId, onLike, onDelete, onEdit,
}: Props) {
  const isLiked = post.likes.includes(currentUserId);
  const isOwner = post.author?._id === currentUserId;
  const timeAgo = formatTimeAgo(post.createdAt);

  // Comments modal
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [savingEdit, setSavingEdit] = useState(false);

  // Options menu
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
      const { data } = await api.post('/api/comments', { postId: post._id, text: commentText.trim() });
      setComments((prev) => [...prev, data.comment]);
      setCommentsCount((c) => c + 1);
      setCommentText('');
      toast.success('Comment posted!');
    } catch (_) {
      toast.error('Failed to post comment.');
    } finally { setPostingComment(false); }
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
    if (confirmed) {
      onDelete?.(post._id);
      toast.success('Post deleted.');
    }
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
    } catch (_) {
      toast.error('Failed to update post.');
    } finally { setSavingEdit(false); }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar uri={post.author?.avatar} name={post.author?.userName} size={38} />
        <View style={styles.headerText}>
          <Text style={styles.userName}>{post.author?.userName}</Text>
          <Text style={styles.time}>{timeAgo}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={() => setShowOptions(true)}>
            <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {post.content ? <Text style={styles.content}>{post.content}</Text> : null}

      {/* Link */}
      {post.linkUrl && (
        <View style={styles.linkChip}>
          <Ionicons name="link-outline" size={14} color={Colors.cyan} />
          <Text style={styles.linkChipText} numberOfLines={1}>{post.linkUrl}</Text>
        </View>
      )}

      {/* Media */}
      {post.mediaUrl && post.type === 'image' && (
        <Image source={{ uri: post.mediaUrl }} style={styles.media} resizeMode="cover" />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={() => onLike(post._id)}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? '#e05c8a' : Colors.textSecondary}
          />
          <Text style={[styles.actionText, isLiked && { color: '#e05c8a' }]}>
            {post.likes.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={openComments}>
          <Ionicons name="chatbubble-outline" size={19} color={Colors.textSecondary} />
          <Text style={styles.actionText}>{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Options Modal (Edit / Delete) */}
      <Modal visible={showOptions} transparent animationType="fade" onRequestClose={() => setShowOptions(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowOptions(false)}>
          <View style={styles.optionsMenu}>
            <TouchableOpacity style={styles.optionItem} onPress={() => { setShowOptions(false); setShowEdit(true); }}>
              <Ionicons name="pencil-outline" size={18} color={Colors.textPrimary} />
              <Text style={styles.optionText}>Edit Post</Text>
            </TouchableOpacity>
            <View style={styles.optionDivider} />
            <TouchableOpacity style={styles.optionItem} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={[styles.optionText, { color: Colors.error }]}>Delete Post</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.overlay}>
          <View style={styles.editModal}>
            <Text style={styles.modalTitle}>Edit Post</Text>
            <TextInput
              style={styles.editInput}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              placeholderTextColor={Colors.textMuted}
              placeholder="Edit your post..."
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEdit(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} disabled={savingEdit}>
                <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.saveBtn}>
                  {savingEdit
                    ? <ActivityIndicator color={Colors.white} size="small" />
                    : <Text style={styles.saveText}>Save</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={showComments} transparent animationType="slide" onRequestClose={() => setShowComments(false)}>
        <View style={styles.overlay}>
          <View style={styles.commentsModal}>
            <View style={styles.commentsHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator color={Colors.purple} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item._id}
                style={styles.commentsList}
                ListEmptyComponent={
                  <Text style={styles.noComments}>No comments yet. Be the first!</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <Avatar uri={item.author?.avatar} name={item.author?.userName} size={30} />
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentUser}>{item.author?.userName}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            {/* Comment input */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor={Colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity onPress={submitComment} disabled={postingComment || !commentText.trim()}>
                <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.sendBtn}>
                  {postingComment
                    ? <ActivityIndicator color={Colors.white} size="small" />
                    : <Ionicons name="send" size={16} color={Colors.white} />
                  }
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
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  headerText: { flex: 1, marginLeft: 10 },
  userName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 },
  time: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  content: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cyanDim,
  },
  linkChipText: { color: Colors.cyan, fontSize: 12, flex: 1 },
  media: { width: '100%', height: 200, borderRadius: 12, marginBottom: 10 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { color: Colors.textSecondary, fontSize: 13 },

  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  // Options menu
  optionsMenu: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    width: '90%',
    marginBottom: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  optionText: { color: Colors.textPrimary, fontSize: 15 },
  optionDivider: { height: 1, backgroundColor: Colors.border },

  // Edit modal
  editModal: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    width: '90%',
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 14 },
  editInput: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: { color: Colors.textMuted, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, minWidth: 70, alignItems: 'center' },
  saveText: { color: Colors.white, fontWeight: '700' },

  // Comments modal
  commentsModal: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    maxHeight: '75%',
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  commentsList: { flex: 1 },
  noComments: { color: Colors.textMuted, textAlign: 'center', marginTop: 20, fontSize: 13 },
  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  commentBubble: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentUser: { color: Colors.purple, fontWeight: '600', fontSize: 12, marginBottom: 3 },
  commentText: { color: Colors.textSecondary, fontSize: 13 },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
