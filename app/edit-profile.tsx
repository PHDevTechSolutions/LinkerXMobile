import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/lib/toast';
import { uploadImage, uploadImageFromWeb } from '@/lib/cloudinary';
import api from '@/lib/api';

export default function EditProfileScreen() {
  const { user, setAuth, token } = useAuthStore();
  const C = useColors();
  const [userName, setUserName]   = useState(user?.userName || '');
  const [bio, setBio]             = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarUri(URL.createObjectURL(file));
        setUploading(true);
        try {
          const { url } = await uploadImageFromWeb(file, 'linkerx/avatars');
          setAvatarUrl(url); toast.success('Photo uploaded!');
        } catch (err: any) { toast.error(err.message || 'Upload failed.'); setAvatarUri(null); }
        finally { setUploading(false); }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, allowsEditing: true, aspect: [1, 1] as [number,number], quality: 0.8 });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setAvatarUri(uri); setUploading(true);
      try {
        const { url } = await uploadImage(uri, 'linkerx/avatars');
        setAvatarUrl(url); toast.success('Photo uploaded!');
      } catch (err: any) { toast.error(err.message || 'Upload failed.'); setAvatarUri(null); }
      finally { setUploading(false); }
    }
  };

  const handleSave = async () => {
    if (!userName.trim()) return toast.warning('Username cannot be empty.');
    if (uploading) return toast.warning('Please wait for photo to finish uploading.');
    setSaving(true);
    try {
      const { data } = await api.put('/api/profile/update', { userName, bio, avatar: avatarUrl });
      await setAuth({ ...user!, ...data.user }, token!);
      toast.success('Profile updated!');
      setTimeout(() => router.back(), 800);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to update profile.'); }
    finally { setSaving(false); }
  };

  const previewUri = avatarUri || avatarUrl;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Edit Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrap} disabled={uploading}>
            {previewUri ? <Image source={{ uri: previewUri }} style={styles.avatarImg} /> : <Avatar uri={user?.avatar} name={user?.userName} size={90} />}
            <LinearGradient colors={[C.purple, C.cyan]} style={[styles.cameraBadge, { borderColor: C.bg }]}>
              {uploading ? <ActivityIndicator size="small" color={C.white} /> : <Ionicons name="camera" size={14} color={C.white} />}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={[styles.changePhotoText, { color: C.purple }]}>{uploading ? 'Uploading...' : 'Tap to change photo'}</Text>
        </View>

        {/* Username */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: C.textMuted }]}>USERNAME</Text>
          <View style={[styles.inputWrapper, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <Ionicons name="person-outline" size={18} color={C.textMuted} />
            <TextInput style={[styles.input, { color: C.textPrimary }]} value={userName} onChangeText={setUserName}
              placeholder="Enter username" placeholderTextColor={C.textMuted} autoCapitalize="none" />
          </View>
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: C.textMuted }]}>BIO</Text>
          <View style={[styles.inputWrapper, styles.bioWrapper, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <TextInput style={[styles.input, styles.bioInput, { color: C.textPrimary }]} value={bio} onChangeText={setBio}
              placeholder="Tell people about yourself..." placeholderTextColor={C.textMuted}
              multiline maxLength={160} textAlignVertical="top" />
          </View>
          <Text style={[styles.charCount, { color: C.textMuted }]}>{bio.length}/160</Text>
        </View>

        {/* Email read-only */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: C.textMuted }]}>EMAIL</Text>
          <View style={[styles.inputWrapper, { backgroundColor: C.bgCard, borderColor: C.border, opacity: 0.6 }]}>
            <Ionicons name="mail-outline" size={18} color={C.textMuted} />
            <Text style={[styles.input, { color: C.textMuted }]}>{user?.email}</Text>
            <Ionicons name="lock-closed-outline" size={14} color={C.textMuted} />
          </View>
          <Text style={[styles.fieldHint, { color: C.textMuted }]}>Email cannot be changed</Text>
        </View>

        {/* Save */}
        <TouchableOpacity onPress={handleSave} disabled={saving || uploading} activeOpacity={0.85}>
          <LinearGradient colors={[C.purple, C.gradientMid, C.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.saveBtn, (saving || uploading) && { opacity: 0.7 }]}>
            {saving ? <ActivityIndicator color={C.white} /> : <Text style={[styles.saveBtnText, { color: C.white }]}>Save Changes</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn:         { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 18, fontWeight: '700' },
  content:         { padding: 20, paddingBottom: 40 },
  avatarSection:   { alignItems: 'center', marginBottom: 32 },
  avatarWrap:      { position: 'relative', width: 90, height: 90 },
  avatarImg:       { width: 90, height: 90, borderRadius: 45 },
  cameraBadge:     { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  changePhotoText: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  fieldGroup:      { marginBottom: 18 },
  fieldLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  inputWrapper:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 50 },
  bioWrapper:      { height: 100, alignItems: 'flex-start', paddingVertical: 12 },
  input:           { flex: 1, fontSize: 14 },
  bioInput:        { height: 76 },
  charCount:       { fontSize: 11, textAlign: 'right', marginTop: 4 },
  fieldHint:       { fontSize: 11, marginTop: 4 },
  saveBtn:         { borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText:     { fontWeight: '700', fontSize: 16 },
});
