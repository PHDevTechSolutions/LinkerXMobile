import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Image, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColors } from '@/hooks/useColors';
import { toast } from '@/lib/toast';
import { uploadImage, uploadImageFromWeb } from '@/lib/cloudinary';
import { getYoutubeThumbnail } from '@/lib/youtube';
import { YouTubeSearchResult } from '@/hooks/useYouTubeSearch';
import VideoPickerModal from '@/components/VideoPickerModal';
import AiPostPanel from '@/components/AiPostPanel';
import api from '@/lib/api';

type PostType = 'text' | 'link' | 'image' | 'video' | 'file';

export default function PostScreen() {
  const C = useColors();
  const [type, setType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Video state — selected from picker
  const [selectedVideo, setSelectedVideo] = useState<YouTubeSearchResult | null>(null);
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  // AI panel
  const [showAi, setShowAi] = useState(false);

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImage(URL.createObjectURL(file));
        setUploading(true);
        try {
          const { url } = await uploadImageFromWeb(file, 'linkerx/posts');
          setImageUrl(url);
          toast.success('Image uploaded!');
        } catch (err: any) {
          toast.error(err.message || 'Upload failed.');
          setImage(null);
        } finally { setUploading(false); }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setImage(uri);
      setUploading(true);
      try {
        const { url } = await uploadImage(uri, 'linkerx/posts');
        setImageUrl(url);
        toast.success('Image uploaded!');
      } catch (err: any) {
        toast.error(err.message || 'Upload failed.');
        setImage(null);
      } finally { setUploading(false); }
    }
  };

  const handlePost = async () => {
    if (type === 'video') {
      if (!selectedVideo) return toast.warning('Please pick a YouTube video first.');
    } else if (type === 'image') {
      if (!imageUrl) return toast.warning('Please upload an image first.');
      if (uploading) return toast.warning('Please wait for image to finish uploading.');
    } else if (type === 'link') {
      if (!linkUrl.trim()) return toast.warning('Please enter a URL.');
    } else {
      if (!content.trim()) return toast.warning('Add some content to post.');
    }

    setLoading(true);
    try {
      await api.post('/api/posts/create', {
        type,
        content,
        linkUrl: type === 'link' ? linkUrl : undefined,
        mediaUrl: type === 'image'
          ? imageUrl
          : type === 'video' && selectedVideo
            ? `https://www.youtube.com/watch?v=${selectedVideo.videoId}`
            : undefined,
        // Store video metadata for richer display in feed
        videoMeta: type === 'video' && selectedVideo ? {
          videoId: selectedVideo.videoId,
          title: selectedVideo.title,
          channelTitle: selectedVideo.channelTitle,
          thumbnail: selectedVideo.thumbnail,
        } : undefined,
      });
      toast.success('Your post is live!');
      setContent('');
      setLinkUrl('');
      setSelectedVideo(null);
      setImage(null);
      setImageUrl(null);
      setTimeout(() => router.replace('/(tabs)/feed'), 1000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to post.');
    } finally {
      setLoading(false);
    }
  };

  const typeButtons: { label: string; value: PostType; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { label: 'Text',  value: 'text',  icon: 'text-outline' },
    { label: 'Link',  value: 'link',  icon: 'link-outline' },
    { label: 'Image', value: 'image', icon: 'image-outline' },
    { label: 'Video', value: 'video', icon: 'logo-youtube' },
    { label: 'File',  value: 'file',  icon: 'document-outline' },
  ];

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: C.bg }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header row with AI button */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: C.textPrimary }]}>Create Post</Text>
          <TouchableOpacity
            style={[styles.aiBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
            onPress={() => setShowAi(true)}
          >
            <LinearGradient colors={['#4F46E5', '#7C3AED', '#06B6D4']} style={styles.aiBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="sparkles" size={16} color="#fff" />
            </LinearGradient>
            <Text style={[styles.aiBtnText, { color: C.purple }]}>AI</Text>
          </TouchableOpacity>
        </View>

        {/* Type selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow} contentContainerStyle={styles.typeRowContent}>
          {typeButtons.map((btn) => (
            <TouchableOpacity
              key={btn.value}
              style={[styles.typeBtn, { backgroundColor: C.bgCard, borderColor: type === btn.value ? C.purple : C.border }]}
              onPress={() => setType(btn.value)}
            >
              {type === btn.value ? (
                <LinearGradient colors={[C.purple, C.cyan]} style={styles.typeBtnGradient}>
                  <Ionicons name={btn.icon} size={16} color={C.white} />
                  <Text style={[styles.typeLabelActive, { color: C.white }]}>{btn.label}</Text>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons name={btn.icon} size={16} color={C.textMuted} />
                  <Text style={[styles.typeLabel, { color: C.textMuted }]}>{btn.label}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Caption — always shown */}
        <View style={[styles.inputCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <TextInput
            style={[styles.textArea, { color: C.textPrimary }]}
            placeholder="What's on your mind?"
            placeholderTextColor={C.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── Link input ── */}
        {type === 'link' && (
          <View style={[styles.urlInput, { backgroundColor: C.bgCard, borderColor: C.cyanDim }]}>
            <Ionicons name="link-outline" size={18} color={C.cyan} />
            <TextInput
              style={[styles.urlText, { color: C.textPrimary }]}
              placeholder="Paste URL here..."
              placeholderTextColor={C.textMuted}
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        )}

        {/* ── Image picker ── */}
        {type === 'image' && (
          <TouchableOpacity
            style={[styles.mediaPicker, { backgroundColor: C.bgCard, borderColor: C.purpleDim }]}
            onPress={pickImage}
            disabled={uploading}
          >
            {image ? (
              <>
                <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
                {uploading && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator color={C.white} size="large" />
                    <Text style={[styles.uploadingText, { color: C.white }]}>Uploading...</Text>
                  </View>
                )}
                {!uploading && imageUrl && (
                  <View style={styles.uploadDone}>
                    <Ionicons name="checkmark-circle" size={24} color={C.success} />
                  </View>
                )}
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={32} color={C.purple} />
                <Text style={[styles.mediaPickerText, { color: C.textMuted }]}>Tap to select image</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* ── Video picker ── */}
        {type === 'video' && (
          <View style={styles.videoSection}>
            {selectedVideo ? (
              /* Selected video preview card */
              <View style={[styles.selectedVideoCard, { backgroundColor: C.bgCard, borderColor: C.purpleDim }]}>
                <Image source={{ uri: selectedVideo.thumbnail }} style={styles.selectedThumb} resizeMode="cover" />
                <View style={styles.selectedVideoOverlay}>
                  <View style={styles.ytPlayBadge}>
                    <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                  </View>
                </View>
                <View style={[styles.selectedVideoInfo, { backgroundColor: C.bgCard }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectedVideoTitle, { color: C.textPrimary }]} numberOfLines={2}>
                      {selectedVideo.title}
                    </Text>
                    <Text style={[styles.selectedVideoChannel, { color: C.textMuted }]} numberOfLines={1}>
                      {selectedVideo.channelTitle}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowVideoPicker(true)}
                    style={[styles.changeBtn, { backgroundColor: C.bgElevated, borderColor: C.border }]}
                  >
                    <Text style={[styles.changeBtnText, { color: C.textMuted }]}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Pick video button */
              <TouchableOpacity
                style={[styles.pickVideoBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
                onPress={() => setShowVideoPicker(true)}
              >
                <LinearGradient colors={['#FF0000', '#FF6B6B']} style={styles.pickVideoIcon}>
                  <Ionicons name="logo-youtube" size={24} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickVideoLabel, { color: C.textPrimary }]}>Search YouTube Video</Text>
                  <Text style={[styles.pickVideoSub, { color: C.textMuted }]}>Find and attach a video to your post</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Post button */}
        <TouchableOpacity onPress={handlePost} disabled={loading} activeOpacity={0.85}>
          <LinearGradient
            colors={[C.purple, C.gradientMid, C.cyan]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.postBtn}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={[styles.postBtnText, { color: C.white }]}>Post Now</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Video picker modal */}
      <VideoPickerModal
        visible={showVideoPicker}
        onClose={() => setShowVideoPicker(false)}
        onSelect={(video) => setSelectedVideo(video)}
        selectedVideoId={selectedVideo?.videoId}
      />

      {/* AI Post Panel */}
      <AiPostPanel
        visible={showAi}
        onClose={() => setShowAi(false)}
        currentText={content}
        onApplyText={(text) => setContent(text)}
        onApplyImage={(localUri, cloudUrl) => {
          setType('image');
          setImage(localUri);
          setImageUrl(cloudUrl);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700' },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  aiBtnGradient: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  aiBtnText: { fontSize: 13, fontWeight: '700' },

  typeRow: { marginBottom: 16 },
  typeRowContent: { gap: 8, paddingRight: 4 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: Colors.bgCard, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1,
  },
  typeBtnGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  typeLabel: { color: Colors.textMuted, fontSize: 12 },
  typeLabelActive: { color: Colors.white, fontSize: 12, fontWeight: '600' },

  inputCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1,
    padding: 14, marginBottom: 14, minHeight: 110,
  },
  textArea: { color: Colors.textPrimary, fontSize: 15, lineHeight: 22 },

  urlInput: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 50, marginBottom: 14, gap: 10,
  },
  urlText: { flex: 1, color: Colors.textPrimary, fontSize: 14 },

  mediaPicker: {
    backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1,
    borderStyle: 'dashed', height: 160, alignItems: 'center',
    justifyContent: 'center', marginBottom: 14, overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%' },
  mediaPickerText: { color: Colors.textMuted, fontSize: 13, marginTop: 8 },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  uploadingText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  uploadDone: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 2,
  },

  // Video section
  videoSection: { marginBottom: 14 },
  pickVideoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, borderWidth: 1, padding: 16,
  },
  pickVideoIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  pickVideoLabel: { fontSize: 15, fontWeight: '600' },
  pickVideoSub: { fontSize: 12, marginTop: 2 },

  selectedVideoCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  selectedThumb: { width: '100%', height: 180 },
  selectedVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  ytPlayBadge: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
  },
  selectedVideoInfo: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 10,
  },
  selectedVideoTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  selectedVideoChannel: { fontSize: 11, marginTop: 2 },
  changeBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
  },
  changeBtnText: { fontSize: 12, fontWeight: '600' },

  postBtn: {
    borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  postBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
