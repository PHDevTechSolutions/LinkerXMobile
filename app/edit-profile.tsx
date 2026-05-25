import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/lib/toast';
import { uploadImage, uploadImageFromWeb } from '@/lib/cloudinary';
import api from '@/lib/api';

export default function EditProfileScreen() {
  const { user, setAuth, token } = useAuthStore();
  const [userName, setUserName] = useState(user?.userName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null); // local preview
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar || null); // cloudinary url
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      // Web: use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const localUrl = URL.createObjectURL(file);
        setAvatarUri(localUrl);
        setUploading(true);
        try {
          const { url } = await uploadImageFromWeb(file, 'linkerx/avatars');
          setAvatarUrl(url);
          toast.success('Photo uploaded!');
        } catch (err: any) {
          toast.error(err.message || 'Upload failed.');
          setAvatarUri(null);
        } finally {
          setUploading(false);
        }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      setUploading(true);
      try {
        const { url } = await uploadImage(uri, 'linkerx/avatars');
        setAvatarUrl(url);
        toast.success('Photo uploaded!');
      } catch (err: any) {
        toast.error(err.message || 'Upload failed.');
        setAvatarUri(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!userName.trim()) return toast.warning('Username cannot be empty.');
    if (uploading) return toast.warning('Please wait for photo to finish uploading.');
    setSaving(true);
    try {
      const { data } = await api.put('/api/profile/update', {
        userName,
        bio,
        avatar: avatarUrl,
      });
      await setAuth(data.user, token!);
      toast.success('Profile updated!');
      setTimeout(() => router.back(), 800);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const previewUri = avatarUri || avatarUrl;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrap} disabled={uploading}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.avatarImg} />
            ) : (
              <Avatar uri={user?.avatar} name={user?.userName} size={90} />
            )}
            <LinearGradient
              colors={[Colors.purple, Colors.cyan]}
              style={styles.cameraBadge}
            >
              {uploading
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <Ionicons name="camera" size={14} color={Colors.white} />
              }
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>
            {uploading ? 'Uploading...' : 'Tap to change photo'}
          </Text>
        </View>

        {/* Username */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>USERNAME</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={userName}
              onChangeText={setUserName}
              placeholder="Enter username"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>BIO</Text>
          <View style={[styles.inputWrapper, styles.bioWrapper]}>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={160}
              textAlignVertical="top"
            />
          </View>
          <Text style={styles.charCount}>{bio.length}/160</Text>
        </View>

        {/* Email (read-only) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={[styles.inputWrapper, styles.disabledInput]}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.disabledText}>{user?.email}</Text>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.textMuted} />
          </View>
          <Text style={styles.fieldHint}>Email cannot be changed</Text>
        </View>

        {/* Save */}
        <TouchableOpacity onPress={handleSave} disabled={saving || uploading} activeOpacity={0.85}>
          <LinearGradient
            colors={[Colors.purple, Colors.gradientMid, Colors.cyan]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.saveBtn, (saving || uploading) && { opacity: 0.7 }]}
          >
            {saving
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrap: { position: 'relative', width: 90, height: 90 },
  avatarImg: { width: 90, height: 90, borderRadius: 45 },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.bg,
  },
  changePhotoText: { color: Colors.purple, fontSize: 13, fontWeight: '600', marginTop: 10 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: {
    color: Colors.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, height: 50,
  },
  bioWrapper: { height: 100, alignItems: 'flex-start', paddingVertical: 12 },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  bioInput: { height: 76 },
  charCount: { color: Colors.textMuted, fontSize: 11, textAlign: 'right', marginTop: 4 },
  disabledInput: { opacity: 0.6 },
  disabledText: { flex: 1, color: Colors.textMuted, fontSize: 14 },
  fieldHint: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  saveBtn: { borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
