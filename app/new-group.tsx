import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import Avatar from '@/components/Avatar';
import { toast } from '@/lib/toast';
import { uploadImageFromWeb, uploadImage } from '@/lib/cloudinary';
import api from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';

type UserResult = { _id: string; userName: string; avatar?: string };

export default function NewGroupScreen() {
  const { type = 'group' } = useLocalSearchParams<{ type: string }>();
  const isGroup = type === 'group';
  const C = useColors();

  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar]           = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [creating, setCreating]       = useState(false);
  const [query, setQuery]             = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserResult[]>([]);
  const [searching, setSearching]     = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await api.get(`/api/users/search?q=${encodeURIComponent(text)}`);
      setSearchResults(data.users || []);
    } catch {}
    finally { setSearching(false); }
  };

  const toggleMember = (u: UserResult) =>
    setSelectedMembers((prev) =>
      prev.find((m) => m._id === u._id) ? prev.filter((m) => m._id !== u._id) : [...prev, u]
    );

  const pickAvatar = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarPreview(URL.createObjectURL(file));
        setUploading(true);
        try { const { url } = await uploadImageFromWeb(file, 'linkerx/groups'); setAvatar(url); }
        catch { toast.error('Upload failed.'); }
        finally { setUploading(false); }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1] as [number,number], quality: 0.8 });
      if (result.canceled) return;
      setAvatarPreview(result.assets[0].uri); setUploading(true);
      try { const { url } = await uploadImage(result.assets[0].uri, 'linkerx/groups'); setAvatar(url); }
      catch { toast.error('Upload failed.'); }
      finally { setUploading(false); }
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return toast.warning('Name is required.');
    setCreating(true);
    try {
      const { data } = await api.post('/api/groups/create', { name, description, type, avatar, memberIds: selectedMembers.map((m) => m._id) });
      toast.success(`${isGroup ? 'Group' : 'Community'} created!`);
      router.replace(`/group/${data.group._id}`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to create.'); }
    finally { setCreating(false); }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>New {isGroup ? 'Group' : 'Community'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarBtn} disabled={uploading}>
            {avatarPreview
              ? <Avatar uri={avatarPreview} name={name || '?'} size={80} />
              : <LinearGradient colors={[C.purple + '44', C.cyan + '44']} style={styles.avatarPlaceholder}>
                  <Ionicons name={isGroup ? 'people' : 'globe'} size={32} color={C.purple} />
                </LinearGradient>
            }
            <View style={[styles.cameraBadge, { backgroundColor: C.purple, borderColor: C.bg }]}>
              {uploading ? <ActivityIndicator size="small" color={C.white} /> : <Ionicons name="camera" size={13} color={C.white} />}
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: C.purple }]}>Add {isGroup ? 'group' : 'community'} photo</Text>
        </View>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: C.textMuted }]}>{isGroup ? 'GROUP' : 'COMMUNITY'} NAME</Text>
          <View style={[styles.inputWrapper, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <Ionicons name={isGroup ? 'people-outline' : 'globe-outline'} size={18} color={C.textMuted} />
            <TextInput style={[styles.input, { color: C.textPrimary }]} value={name} onChangeText={setName}
              placeholder={`Enter ${isGroup ? 'group' : 'community'} name`} placeholderTextColor={C.textMuted} maxLength={50} />
          </View>
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: C.textMuted }]}>DESCRIPTION</Text>
          <View style={[styles.inputWrapper, styles.descWrapper, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <TextInput style={[styles.input, styles.descInput, { color: C.textPrimary }]} value={description}
              onChangeText={setDescription} placeholder="What's this about?" placeholderTextColor={C.textMuted}
              multiline maxLength={200} textAlignVertical="top" />
          </View>
          <Text style={[styles.charCount, { color: C.textMuted }]}>{description.length}/200</Text>
        </View>

        {/* Add Members */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: C.textMuted }]}>ADD MEMBERS</Text>
          <View style={[styles.inputWrapper, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <Ionicons name="search-outline" size={18} color={C.textMuted} />
            <TextInput style={[styles.input, { color: C.textPrimary }]} value={query} onChangeText={handleSearch}
              placeholder="Search people..." placeholderTextColor={C.textMuted} autoCapitalize="none" />
            {searching && <ActivityIndicator size="small" color={C.purple} />}
          </View>

          {searchResults.map((u) => {
            const selected = !!selectedMembers.find((m) => m._id === u._id);
            return (
              <TouchableOpacity key={u._id} style={[styles.memberRow, { borderBottomColor: C.border }]} onPress={() => toggleMember(u)}>
                <Avatar uri={u.avatar} name={u.userName} size={38} />
                <Text style={[styles.memberName, { color: C.textPrimary }]}>{u.userName}</Text>
                <View style={[styles.checkBox, { borderColor: C.border }, selected && { backgroundColor: C.purple, borderColor: C.purple }]}>
                  {selected && <Ionicons name="checkmark" size={14} color={C.white} />}
                </View>
              </TouchableOpacity>
            );
          })}

          {selectedMembers.length > 0 && (
            <View style={styles.selectedWrap}>
              <Text style={[styles.selectedLabel, { color: C.textMuted }]}>{selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected</Text>
              <View style={styles.selectedAvatars}>
                {selectedMembers.map((m) => (
                  <TouchableOpacity key={m._id} onPress={() => toggleMember(m)} style={styles.selectedAvatar}>
                    <Avatar uri={m.avatar} name={m.userName} size={36} />
                    <View style={[styles.removeBtn, { backgroundColor: C.error }]}>
                      <Ionicons name="close" size={10} color={C.white} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={handleCreate} disabled={creating || uploading} activeOpacity={0.85}>
          <LinearGradient colors={[C.purple, C.gradientMid, C.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.createBtn, (creating || uploading) && { opacity: 0.7 }]}>
            {creating
              ? <ActivityIndicator color={C.white} />
              : <><Ionicons name={isGroup ? 'people' : 'globe'} size={18} color={C.white} />
                  <Text style={[styles.createBtnText, { color: C.white }]}>Create {isGroup ? 'Group' : 'Community'}</Text></>
            }
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn:        { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { fontSize: 18, fontWeight: '700' },
  content:        { padding: 20, paddingBottom: 40 },
  avatarSection:  { alignItems: 'center', marginBottom: 28 },
  avatarBtn:      { position: 'relative' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cameraBadge:    { position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarHint:     { fontSize: 12, fontWeight: '600', marginTop: 8 },
  fieldGroup:     { marginBottom: 18 },
  fieldLabel:     { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  inputWrapper:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 50 },
  descWrapper:    { height: 90, alignItems: 'flex-start', paddingVertical: 12 },
  input:          { flex: 1, fontSize: 14 },
  descInput:      { height: 66 },
  charCount:      { fontSize: 11, textAlign: 'right', marginTop: 4 },
  memberRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  memberName:     { flex: 1, fontSize: 14 },
  checkBox:       { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  selectedWrap:   { marginTop: 14 },
  selectedLabel:  { fontSize: 12, marginBottom: 8 },
  selectedAvatars:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedAvatar: { position: 'relative' },
  removeBtn:      { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  createBtn:      { borderRadius: 14, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  createBtnText:  { fontWeight: '700', fontSize: 16 },
});
