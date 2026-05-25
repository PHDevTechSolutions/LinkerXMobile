import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { toast } from '@/lib/toast';
import { uploadImageFromWeb, uploadImage } from '@/lib/cloudinary';
import api from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';

type UserResult = { _id: string; userName: string; avatar?: string };

export default function NewGroupScreen() {
  const { type = 'group' } = useLocalSearchParams<{ type: string }>();
  const isGroup = type === 'group';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Member search
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await api.get(`/api/users/search?q=${encodeURIComponent(text)}`);
      setSearchResults(data.users || []);
    } catch (_) {}
    finally { setSearching(false); }
  };

  const toggleMember = (u: UserResult) => {
    setSelectedMembers((prev) =>
      prev.find((m) => m._id === u._id)
        ? prev.filter((m) => m._id !== u._id)
        : [...prev, u]
    );
  };

  const pickAvatar = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarPreview(URL.createObjectURL(file));
        setUploading(true);
        try {
          const { url } = await uploadImageFromWeb(file, 'linkerx/groups');
          setAvatar(url);
        } catch (_) { toast.error('Upload failed.'); }
        finally { setUploading(false); }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setAvatarPreview(uri);
      setUploading(true);
      try {
        const { url } = await uploadImage(uri, 'linkerx/groups');
        setAvatar(url);
      } catch (_) { toast.error('Upload failed.'); }
      finally { setUploading(false); }
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return toast.warning('Name is required.');
    setCreating(true);
    try {
      const { data } = await api.post('/api/groups/create', {
        name,
        description,
        type,
        avatar,
        memberIds: selectedMembers.map((m) => m._id),
      });
      toast.success(`${isGroup ? 'Group' : 'Community'} created!`);
      router.replace(`/group/${data.group._id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create.');
    } finally { setCreating(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New {isGroup ? 'Group' : 'Community'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarBtn} disabled={uploading}>
            {avatarPreview ? (
              <Avatar uri={avatarPreview} name={name || '?'} size={80} />
            ) : (
              <LinearGradient colors={[Colors.purple + '44', Colors.cyan + '44']} style={styles.avatarPlaceholder}>
                <Ionicons name={isGroup ? 'people' : 'globe'} size={32} color={Colors.purple} />
              </LinearGradient>
            )}
            <View style={styles.cameraBadge}>
              {uploading
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <Ionicons name="camera" size={13} color={Colors.white} />
              }
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Add {isGroup ? 'group' : 'community'} photo</Text>
        </View>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{isGroup ? 'GROUP' : 'COMMUNITY'} NAME</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name={isGroup ? 'people-outline' : 'globe-outline'} size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={`Enter ${isGroup ? 'group' : 'community'} name`}
              placeholderTextColor={Colors.textMuted}
              maxLength={50}
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <View style={[styles.inputWrapper, styles.descWrapper]}>
            <TextInput
              style={[styles.input, styles.descInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="What's this about?"
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
          </View>
          <Text style={styles.charCount}>{description.length}/200</Text>
        </View>

        {/* Add Members */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>ADD MEMBERS</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={handleSearch}
              placeholder="Search people..."
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
            {searching && <ActivityIndicator size="small" color={Colors.purple} />}
          </View>

          {/* Search results */}
          {searchResults.map((u) => {
            const selected = !!selectedMembers.find((m) => m._id === u._id);
            return (
              <TouchableOpacity key={u._id} style={styles.memberRow} onPress={() => toggleMember(u)}>
                <Avatar uri={u.avatar} name={u.userName} size={38} />
                <Text style={styles.memberName}>{u.userName}</Text>
                <View style={[styles.checkBox, selected && styles.checkBoxSelected]}>
                  {selected && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Selected members */}
          {selectedMembers.length > 0 && (
            <View style={styles.selectedWrap}>
              <Text style={styles.selectedLabel}>{selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected</Text>
              <View style={styles.selectedAvatars}>
                {selectedMembers.map((m) => (
                  <TouchableOpacity key={m._id} onPress={() => toggleMember(m)} style={styles.selectedAvatar}>
                    <Avatar uri={m.avatar} name={m.userName} size={36} />
                    <View style={styles.removeBtn}>
                      <Ionicons name="close" size={10} color={Colors.white} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Create button */}
        <TouchableOpacity onPress={handleCreate} disabled={creating || uploading} activeOpacity={0.85}>
          <LinearGradient
            colors={[Colors.purple, Colors.gradientMid, Colors.cyan]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.createBtn, (creating || uploading) && { opacity: 0.7 }]}
          >
            {creating
              ? <ActivityIndicator color={Colors.white} />
              : <>
                  <Ionicons name={isGroup ? 'people' : 'globe'} size={18} color={Colors.white} />
                  <Text style={styles.createBtnText}>Create {isGroup ? 'Group' : 'Community'}</Text>
                </>
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
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarBtn: { position: 'relative' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cameraBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.purple, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.bg,
  },
  avatarHint: { color: Colors.purple, fontSize: 12, fontWeight: '600', marginTop: 8 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, height: 50,
  },
  descWrapper: { height: 90, alignItems: 'flex-start', paddingVertical: 12 },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  descInput: { height: 66 },
  charCount: { color: Colors.textMuted, fontSize: 11, textAlign: 'right', marginTop: 4 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  memberName: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  checkBox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxSelected: { backgroundColor: Colors.purple, borderColor: Colors.purple },
  selectedWrap: { marginTop: 14 },
  selectedLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 8 },
  selectedAvatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedAvatar: { position: 'relative' },
  removeBtn: {
    position: 'absolute', top: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
  },
  createBtn: { borderRadius: 14, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  createBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
