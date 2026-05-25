import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Image, Dimensions, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import Avatar from './Avatar';
import { useAuthStore } from '@/store/authStore';
import { uploadImageFromWeb, uploadImage } from '@/lib/cloudinary';
import { toast } from '@/lib/toast';
import api from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Story = {
  _id: string;
  mediaUrl?: string;
  text?: string;
  backgroundColor: string;
  author: { _id: string; userName: string; avatar?: string };
  views: string[];
  viewed: boolean;
  createdAt: string;
};

type StoryGroup = {
  author: { _id: string; userName: string; avatar?: string };
  stories: Story[];
  hasUnviewed: boolean;
};

type Props = {
  onRefresh?: () => void;
};

export default function Stories({ onRefresh }: Props) {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewing, setViewing] = useState<{ group: StoryGroup; index: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [bgColor, setBgColor] = useState('#7C3AED');
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const progressRef = useRef<any>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => { fetchStories(); }, []);

  const fetchStories = async () => {
    try {
      const { data } = await api.get('/api/stories');
      setGroups(data.storyGroups || []);
    } catch (_) {}
  };

  // Auto-advance story every 5 seconds
  useEffect(() => {
    if (!viewing) { clearInterval(progressRef.current); setProgress(0); return; }
    setProgress(0);
    clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          nextStory();
          return 0;
        }
        return p + 2; // 100 / 2 = 50 ticks * 100ms = 5 seconds
      });
    }, 100);
    return () => clearInterval(progressRef.current);
  }, [viewing?.group._id, viewing?.index]);

  const viewStory = (group: StoryGroup, index = 0) => {
    setViewing({ group, index });
    api.post(`/api/stories/${group.stories[index]._id}/view`).catch(() => {});
  };

  const nextStory = () => {
    if (!viewing) return;
    const { group, index } = viewing;
    if (index + 1 < group.stories.length) {
      setViewing({ group, index: index + 1 });
      api.post(`/api/stories/${group.stories[index + 1]._id}/view`).catch(() => {});
    } else {
      // Next group
      const groupIdx = groups.findIndex((g) => g.author._id === group.author._id);
      if (groupIdx + 1 < groups.length) {
        viewStory(groups[groupIdx + 1]);
      } else {
        setViewing(null);
      }
    }
  };

  const prevStory = () => {
    if (!viewing) return;
    const { group, index } = viewing;
    if (index > 0) setViewing({ group, index: index - 1 });
  };

  const pickAndCreateStory = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
          const { url } = await uploadImageFromWeb(file, 'linkerx/stories');
          await api.post('/api/stories', { mediaUrl: url });
          toast.success('Story posted!');
          fetchStories();
          setCreating(false);
        } catch (_) { toast.error('Failed to post story.'); }
        finally { setUploading(false); }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (result.canceled) return;
      setUploading(true);
      try {
        const { url } = await uploadImage(result.assets[0].uri, 'linkerx/stories');
        await api.post('/api/stories', { mediaUrl: url });
        toast.success('Story posted!');
        fetchStories();
        setCreating(false);
      } catch (_) { toast.error('Failed to post story.'); }
      finally { setUploading(false); }
    }
  };

  const postTextStory = async () => {
    if (!storyText.trim()) return;
    setPosting(true);
    try {
      await api.post('/api/stories', { text: storyText, backgroundColor: bgColor });
      toast.success('Story posted!');
      fetchStories();
      setCreating(false);
      setStoryText('');
    } catch (_) { toast.error('Failed to post story.'); }
    finally { setPosting(false); }
  };

  const BG_COLORS = ['#7C3AED', '#06B6D4', '#10B981', '#EF4444', '#F59E0B', '#EC4899', '#1E1E3A'];

  const currentStory = viewing ? viewing.group.stories[viewing.index] : null;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.scroll}>
        {/* Add story button */}
        <TouchableOpacity style={styles.addStoryBtn} onPress={() => setCreating(true)}>
          <View style={styles.addStoryAvatar}>
            <Avatar uri={user?.avatar} name={user?.userName} size={56} />
            <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.addBadge}>
              <Ionicons name="add" size={14} color={Colors.white} />
            </LinearGradient>
          </View>
          <Text style={styles.storyLabel} numberOfLines={1}>Your Story</Text>
        </TouchableOpacity>

        {/* Story groups */}
        {groups.map((group) => (
          <TouchableOpacity key={group.author._id} style={styles.storyBtn} onPress={() => viewStory(group)}>
            <View style={[styles.storyRing, group.hasUnviewed ? styles.storyRingActive : styles.storyRingViewed]}>
              <Avatar uri={group.author.avatar} name={group.author.userName} size={52} />
            </View>
            <Text style={styles.storyLabel} numberOfLines={1}>{group.author.userName}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Story viewer */}
      <Modal visible={!!viewing} animationType="fade" onRequestClose={() => setViewing(null)}>
        {currentStory && (
          <View style={styles.viewer}>
            {/* Progress bars */}
            <View style={styles.progressBars}>
              {viewing!.group.stories.map((_, i) => (
                <View key={i} style={styles.progressBarBg}>
                  <View style={[
                    styles.progressBarFill,
                    i < viewing!.index ? { width: '100%' } :
                    i === viewing!.index ? { width: `${progress}%` } :
                    { width: '0%' }
                  ]} />
                </View>
              ))}
            </View>

            {/* Story content */}
            {currentStory.mediaUrl ? (
              <Image source={{ uri: currentStory.mediaUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: currentStory.backgroundColor, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={styles.storyText}>{currentStory.text}</Text>
              </View>
            )}

            {/* Overlay gradient */}
            <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.3)']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.viewerHeader}>
              <Avatar uri={viewing!.group.author.avatar} name={viewing!.group.author.userName} size={36} />
              <Text style={styles.viewerName}>{viewing!.group.author.userName}</Text>
              <Text style={styles.viewerTime}>{formatTimeAgo(currentStory.createdAt)}</Text>
              <TouchableOpacity onPress={() => setViewing(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* Tap areas */}
            <View style={styles.tapAreas}>
              <TouchableOpacity style={styles.tapLeft} onPress={prevStory} />
              <TouchableOpacity style={styles.tapRight} onPress={nextStory} />
            </View>
          </View>
        )}
      </Modal>

      {/* Create story modal */}
      <Modal visible={creating} animationType="slide" onRequestClose={() => setCreating(false)}>
        <View style={styles.createContainer}>
          <View style={styles.createHeader}>
            <TouchableOpacity onPress={() => setCreating(false)} style={styles.closeBtn2}>
              <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.createTitle}>Create Story</Text>
            <View style={{ width: 38 }} />
          </View>

          <View style={styles.createBody}>
            {/* Photo option */}
            <TouchableOpacity style={styles.createOption} onPress={pickAndCreateStory} disabled={uploading}>
              <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.createOptionIcon}>
                {uploading ? <ActivityIndicator color={Colors.white} /> : <Ionicons name="image" size={28} color={Colors.white} />}
              </LinearGradient>
              <Text style={styles.createOptionLabel}>Photo Story</Text>
              <Text style={styles.createOptionSub}>Share a photo for 24 hours</Text>
            </TouchableOpacity>

            {/* Text option */}
            <View style={styles.textStorySection}>
              <Text style={styles.textStoryLabel}>Text Story</Text>
              <View style={[styles.textPreview, { backgroundColor: bgColor }]}>
                <TextInput
                  style={styles.textStoryInput}
                  placeholder="Write something..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={storyText}
                  onChangeText={setStoryText}
                  multiline
                  maxLength={150}
                  textAlign="center"
                />
              </View>

              {/* Color picker */}
              <View style={styles.colorPicker}>
                {BG_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c }, bgColor === c && styles.colorDotSelected]}
                    onPress={() => setBgColor(c)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.postStoryBtn, !storyText.trim() && { opacity: 0.5 }]}
                onPress={postTextStory}
                disabled={!storyText.trim() || posting}
              >
                {posting
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.postStoryBtnText}>Post Story</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`;
  return `${hrs}h ago`;
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  scroll: { paddingHorizontal: 16, gap: 12 },
  addStoryBtn: { alignItems: 'center', gap: 6, width: 68 },
  addStoryAvatar: { position: 'relative' },
  addBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.bg,
  },
  storyBtn: { alignItems: 'center', gap: 6, width: 68 },
  storyRing: { padding: 2, borderRadius: 32, borderWidth: 2 },
  storyRingActive: { borderColor: Colors.purple },
  storyRingViewed: { borderColor: Colors.textMuted },
  storyLabel: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', width: 64 },

  // Viewer
  viewer: { flex: 1, backgroundColor: '#000' },
  progressBars: {
    position: 'absolute', top: 52, left: 8, right: 8,
    flexDirection: 'row', gap: 3, zIndex: 10,
  },
  progressBarBg: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 1 },
  progressBarFill: { height: '100%', backgroundColor: Colors.white, borderRadius: 1 },
  viewerHeader: {
    position: 'absolute', top: 62, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10,
  },
  viewerName: { flex: 1, color: Colors.white, fontWeight: '700', fontSize: 14 },
  viewerTime: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  closeBtn: { padding: 4 },
  storyText: { color: Colors.white, fontSize: 24, fontWeight: '700', textAlign: 'center', padding: 24 },
  tapAreas: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', top: 100 },
  tapLeft: { flex: 1 },
  tapRight: { flex: 1 },

  // Create
  createContainer: { flex: 1, backgroundColor: Colors.bg },
  createHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  closeBtn2: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  createTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  createBody: { padding: 20, gap: 24 },
  createOption: {
    backgroundColor: Colors.bgCard, borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  createOptionIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  createOptionLabel: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  createOptionSub: { color: Colors.textMuted, fontSize: 13 },
  textStorySection: { gap: 12 },
  textStoryLabel: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  textPreview: {
    borderRadius: 16, height: 160,
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  textStoryInput: { color: Colors.white, fontSize: 20, fontWeight: '600', textAlign: 'center', width: '100%' },
  colorPicker: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.white },
  postStoryBtn: {
    backgroundColor: Colors.purple, borderRadius: 12,
    height: 48, alignItems: 'center', justifyContent: 'center',
  },
  postStoryBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
