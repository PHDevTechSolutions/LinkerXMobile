import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useColors } from '@/hooks/useColors';
import { toast } from '@/lib/toast';
import { uploadFile, uploadFileFromWeb, uploadImageFromWeb } from '@/lib/cloudinary';
import api from '@/lib/api';

type UserFile = { _id: string; name: string; url: string; size: number; mimeType: string; createdAt: string };

function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (mimeType.startsWith('image/')) return 'image-outline';
  if (mimeType.startsWith('video/')) return 'videocam-outline';
  if (mimeType.includes('pdf'))      return 'document-text-outline';
  if (mimeType.includes('word'))     return 'document-outline';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'grid-outline';
  return 'document-outline';
}

export default function MyFilesScreen() {
  const C = useColors();
  const [files, setFiles]           = useState<UserFile[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading]   = useState(false);

  const fetchFiles = useCallback(async () => {
    try { const { data } = await api.get('/api/profile/files'); setFiles(data.files || []); }
    catch { toast.error('Failed to load files.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchFiles(); }, []);

  const pickAndUpload = async () => {
    setUploading(true);
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '*/*';
        input.onchange = async (e: any) => {
          const file: File = e.target.files?.[0];
          if (!file) { setUploading(false); return; }
          try {
            const isImage = file.type.startsWith('image/');
            const res = isImage ? await uploadImageFromWeb(file, 'linkerx/files') : await uploadFileFromWeb(file, 'linkerx/files');
            const { data } = await api.post('/api/profile/files', { name: file.name, url: res.url, size: file.size, mimeType: file.type });
            setFiles((prev) => [data.file, ...prev]); toast.success('File uploaded!');
          } catch (err: any) { toast.error(err.message || 'Upload failed.'); }
          finally { setUploading(false); }
        };
        input.click(); return;
      }
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) { setUploading(false); return; }
      const asset = result.assets[0];
      const { url } = await uploadFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream', 'linkerx/files');
      const { data } = await api.post('/api/profile/files', { name: asset.name, url, size: asset.size || 0, mimeType: asset.mimeType || 'application/octet-stream' });
      setFiles((prev) => [data.file, ...prev]); toast.success('File uploaded!');
    } catch (err: any) { toast.error(err.message || 'Upload failed.'); }
    finally { setUploading(false); }
  };

  const deleteFile = async (id: string) => {
    try { await api.delete(`/api/profile/files/${id}`); setFiles((p) => p.filter((f) => f._id !== id)); toast.success('File deleted.'); }
    catch { toast.error('Failed to delete file.'); }
  };

  const confirmDelete = (id: string) => {
    if (typeof window !== 'undefined') { if (window.confirm('Delete this file?')) deleteFile(id); }
    else Alert.alert('Delete File', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteFile(id) }]);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>My Files</Text>
        <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: C.purple }, uploading && { opacity: 0.6 }]}
          onPress={pickAndUpload} disabled={uploading}>
          {uploading ? <ActivityIndicator size="small" color={C.white} /> : <Ionicons name="cloud-upload-outline" size={20} color={C.white} />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.purple} size="large" /></View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFiles(); }} tintColor={C.purple} />}
          renderItem={({ item }) => (
            <View style={[styles.fileCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <View style={[styles.fileIcon, { backgroundColor: C.purpleDim }]}>
                <Ionicons name={fileIcon(item.mimeType)} size={22} color={C.purple} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: C.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.fileMeta, { color: C.textMuted }]}>
                  {formatSize(item.size)}{item.size ? '  ·  ' : ''}{new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(item.url)}>
                <Ionicons name="download-outline" size={20} color={C.cyan} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(item._id)}>
                <Ionicons name="trash-outline" size={20} color={C.error} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={52} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No files yet</Text>
              <Text style={[styles.emptySub, { color: C.textMuted }]}>Tap the upload button to add files.</Text>
              <TouchableOpacity style={styles.emptyUploadBtn} onPress={pickAndUpload} disabled={uploading}>
                <LinearGradient colors={[C.purple, C.cyan]} style={styles.emptyUploadGradient}>
                  {uploading ? <ActivityIndicator color={C.white} />
                    : <><Ionicons name="cloud-upload-outline" size={18} color={C.white} />
                        <Text style={[styles.emptyUploadText, { color: C.white }]}>Upload File</Text></>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1 },
  center:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn:           { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:       { fontSize: 17, fontWeight: '700' },
  uploadBtn:         { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  list:              { padding: 16, paddingBottom: 32, gap: 10 },
  fileCard:          { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  fileIcon:          { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fileInfo:          { flex: 1 },
  fileName:          { fontSize: 14, fontWeight: '600' },
  fileMeta:          { fontSize: 12, marginTop: 3 },
  iconBtn:           { padding: 6 },
  empty:             { alignItems: 'center', marginTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyTitle:        { fontSize: 17, fontWeight: '700' },
  emptySub:          { fontSize: 13, textAlign: 'center' },
  emptyUploadBtn:    { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  emptyUploadGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12 },
  emptyUploadText:   { fontWeight: '700', fontSize: 14 },
});
