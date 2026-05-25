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
import { toast } from '@/lib/toast';
import { uploadImage, uploadImageFromWeb } from '@/lib/cloudinary';
import api from '@/lib/api';

type PostType = 'text' | 'link' | 'image' | 'file';

export default function PostScreen() {
  const [type, setType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [image, setImage] = useState<string | null>(null);       // local preview URI
  const [imageUrl, setImageUrl] = useState<string | null>(null); // cloudinary URL
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

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
    if (!content && !linkUrl && !imageUrl) {
      return toast.warning('Add some content to post.');
    }
    if (uploading) return toast.warning('Please wait for image to finish uploading.');
    setLoading(true);
    try {
      await api.post('/api/posts/create', {
        type,
        content,
        linkUrl,
        mediaUrl: imageUrl || null,
      });
      toast.success('Your post is live!');
      setContent('');
      setLinkUrl('');
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
    { label: 'Text', value: 'text', icon: 'text-outline' },
    { label: 'Link', value: 'link', icon: 'link-outline' },
    { label: 'Image', value: 'image', icon: 'image-outline' },
    { label: 'File', value: 'file', icon: 'document-outline' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Create Post</Text>

      {/* Type selector */}
      <View style={styles.typeRow}>
        {typeButtons.map((btn) => (
          <TouchableOpacity
            key={btn.value}
            style={[styles.typeBtn, type === btn.value && styles.typeBtnActive]}
            onPress={() => setType(btn.value)}
          >
            {type === btn.value ? (
              <LinearGradient colors={[Colors.purple, Colors.cyan]} style={styles.typeBtnGradient}>
                <Ionicons name={btn.icon} size={16} color={Colors.white} />
                <Text style={styles.typeLabelActive}>{btn.label}</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name={btn.icon} size={16} color={Colors.textMuted} />
                <Text style={styles.typeLabel}>{btn.label}</Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content input */}
      <View style={styles.inputCard}>
        <TextInput
          style={styles.textArea}
          placeholder="What's on your mind?"
          placeholderTextColor={Colors.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      {/* Link input */}
      {type === 'link' && (
        <View style={styles.linkInput}>
          <Ionicons name="link-outline" size={18} color={Colors.cyan} />
          <TextInput
            style={styles.linkText}
            placeholder="Paste URL here..."
            placeholderTextColor={Colors.textMuted}
            value={linkUrl}
            onChangeText={setLinkUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
      )}

      {/* Image picker */}
      {type === 'image' && (
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
          {image ? (
            <>
              <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color={Colors.white} size="large" />
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              )}
              {!uploading && imageUrl && (
                <View style={styles.uploadDone}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                </View>
              )}
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={32} color={Colors.purple} />
              <Text style={styles.imagePickerText}>Tap to select image</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Post button */}
      <TouchableOpacity onPress={handlePost} disabled={loading} activeOpacity={0.85}>
        <LinearGradient
          colors={[Colors.purple, Colors.gradientMid, Colors.cyan]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.postBtn}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.postBtnText}>Post Now</Text>
          }
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 20 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeBtnActive: { borderColor: Colors.purple },
  typeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeLabel: { color: Colors.textMuted, fontSize: 12 },
  typeLabelActive: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  inputCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 14,
    minHeight: 120,
  },
  textArea: { color: Colors.textPrimary, fontSize: 15, lineHeight: 22 },
  linkInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cyanDim,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 14,
    gap: 10,
  },
  linkText: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  imagePicker: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.purpleDim,
    borderStyle: 'dashed',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%' },
  imagePickerText: { color: Colors.textMuted, fontSize: 13, marginTop: 8 },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  uploadingText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  uploadDone: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 2,
  },
  postBtn: {
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  postBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
