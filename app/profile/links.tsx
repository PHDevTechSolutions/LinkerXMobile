import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Linking, Modal, Pressable, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { toast } from '@/lib/toast';
import api from '@/lib/api';

type Link = { _id: string; title: string; url: string; createdAt: string };

export default function MyLinksScreen() {
  const C = useColors();
  const [links, setLinks]           = useState<Link[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [title, setTitle]           = useState('');
  const [url, setUrl]               = useState('');
  const [saving, setSaving]         = useState(false);

  const fetchLinks = useCallback(async () => {
    try { const { data } = await api.get('/api/profile/links'); setLinks(data.links || []); }
    catch { toast.error('Failed to load links.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchLinks(); }, []);

  const addLink = async () => {
    if (!title.trim()) return toast.warning('Title is required.');
    if (!url.trim())   return toast.warning('URL is required.');
    const finalUrl = url.startsWith('http') ? url.trim() : `https://${url.trim()}`;
    setSaving(true);
    try {
      const { data } = await api.post('/api/profile/links', { title: title.trim(), url: finalUrl });
      setLinks((prev) => [data.link, ...prev]); setTitle(''); setUrl(''); setShowModal(false); toast.success('Link added!');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to add link.'); }
    finally { setSaving(false); }
  };

  const deleteLink = async (id: string) => {
    try { await api.delete(`/api/profile/links/${id}`); setLinks((p) => p.filter((l) => l._id !== id)); toast.success('Link deleted.'); }
    catch { toast.error('Failed to delete link.'); }
  };

  const confirmDelete = (id: string) => {
    if (typeof window !== 'undefined') { if (window.confirm('Delete this link?')) deleteLink(id); }
    else Alert.alert('Delete Link', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteLink(id) }]);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>My Links</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: C.purple }]} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={22} color={C.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.purple} size="large" /></View>
      ) : (
        <FlatList
          data={links}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLinks(); }} tintColor={C.purple} />}
          renderItem={({ item }) => (
            <View style={[styles.linkCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <View style={[styles.linkIcon, { backgroundColor: C.purpleDim }]}>
                <Ionicons name="link" size={18} color={C.purple} />
              </View>
              <View style={styles.linkInfo}>
                <Text style={[styles.linkTitle, { color: C.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.linkUrl, { color: C.textMuted }]} numberOfLines={1}>{item.url}</Text>
              </View>
              <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(item.url)}>
                <Ionicons name="open-outline" size={18} color={C.cyan} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(item._id)}>
                <Ionicons name="trash-outline" size={18} color={C.error} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="link-outline" size={52} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No links yet</Text>
              <Text style={[styles.emptySub, { color: C.textMuted }]}>Tap + to add your first link.</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowModal(true)}>
                <LinearGradient colors={[C.purple, C.cyan]} style={styles.emptyAddGradient}>
                  <Ionicons name="add" size={18} color={C.white} />
                  <Text style={[styles.emptyAddText, { color: C.white }]}>Add Link</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={[styles.modal, { backgroundColor: C.bgCard }]}>
            <View style={[styles.modalHandle, { backgroundColor: C.border }]} />
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>Add Link</Text>

            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>TITLE</Text>
            <View style={[styles.inputWrap, { backgroundColor: C.bgElevated, borderColor: C.border }]}>
              <Ionicons name="text-outline" size={16} color={C.textMuted} />
              <TextInput style={[styles.input, { color: C.textPrimary }]} placeholder="e.g. My Portfolio"
                placeholderTextColor={C.textMuted} value={title} onChangeText={setTitle} />
            </View>

            <Text style={[styles.fieldLabel, { color: C.textMuted, marginTop: 14 }]}>URL</Text>
            <View style={[styles.inputWrap, { backgroundColor: C.bgElevated, borderColor: C.border }]}>
              <Ionicons name="link-outline" size={16} color={C.textMuted} />
              <TextInput style={[styles.input, { color: C.textPrimary }]} placeholder="https://example.com"
                placeholderTextColor={C.textMuted} value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" />
            </View>

            <TouchableOpacity onPress={addLink} disabled={saving} style={{ marginTop: 20 }}>
              <LinearGradient colors={[C.purple, C.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color={C.white} /> : <Text style={[styles.saveBtnText, { color: C.white }]}>Save Link</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn:        { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { fontSize: 17, fontWeight: '700' },
  addBtn:         { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  list:           { padding: 16, paddingBottom: 32, gap: 10 },
  linkCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  linkIcon:       { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkInfo:       { flex: 1 },
  linkTitle:      { fontSize: 14, fontWeight: '600' },
  linkUrl:        { fontSize: 12, marginTop: 2 },
  iconBtn:        { padding: 6 },
  empty:          { alignItems: 'center', marginTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyTitle:     { fontSize: 17, fontWeight: '700' },
  emptySub:       { fontSize: 13, textAlign: 'center' },
  emptyAddBtn:    { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  emptyAddGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12 },
  emptyAddText:   { fontWeight: '700', fontSize: 14 },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:          { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:     { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  fieldLabel:     { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  inputWrap:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 50 },
  input:          { flex: 1, fontSize: 14 },
  saveBtn:        { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText:    { fontWeight: '700', fontSize: 15 },
});
