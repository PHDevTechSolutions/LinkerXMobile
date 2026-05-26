import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Pressable, Image, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { toast } from '@/lib/toast';
import api from '@/lib/api';

type Subscription = { _id: string; feedUrl: string; title: string; favicon: string | null };
type PreviewItem  = { title: string; link: string; description: string; pubDate: string };

const SUGGESTED = [
  { title: 'TechCrunch',       url: 'https://techcrunch.com/feed/' },
  { title: 'The Verge',        url: 'https://www.theverge.com/rss/index.xml' },
  { title: 'Hacker News',      url: 'https://news.ycombinator.com/rss' },
  { title: 'Dev.to',           url: 'https://dev.to/feed' },
  { title: 'CSS-Tricks',       url: 'https://css-tricks.com/feed/' },
  { title: 'Smashing Magazine',url: 'https://www.smashingmagazine.com/feed/' },
];

export default function RssScreen() {
  const C = useColors();
  const [subs, setSubs]           = useState<Subscription[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [feedUrl, setFeedUrl]     = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview]     = useState<{ channelTitle: string; items: PreviewItem[] } | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const fetchSubs = useCallback(async () => {
    try {
      const { data } = await api.get('/api/rss/subscriptions');
      setSubs(data.subscriptions || []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchSubs(); }, []);

  const handlePreview = async () => {
    if (!feedUrl.trim()) return toast.warning('Enter a feed URL.');
    const url = feedUrl.startsWith('http') ? feedUrl.trim() : `https://${feedUrl.trim()}`;
    setPreviewing(true);
    setPreview(null);
    try {
      const { data } = await api.get(`/api/rss/preview?url=${encodeURIComponent(url)}`);
      setPreview(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not load this feed.');
    } finally { setPreviewing(false); }
  };

  const handleSubscribe = async () => {
    const url = feedUrl.startsWith('http') ? feedUrl.trim() : `https://${feedUrl.trim()}`;
    setSubscribing(true);
    try {
      const { data } = await api.post('/api/rss/subscribe', { feedUrl: url });
      setSubs((prev) => [data.subscription, ...prev]);
      setShowAdd(false); setFeedUrl(''); setPreview(null);
      toast.success('Subscribed!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to subscribe.');
    } finally { setSubscribing(false); }
  };

  const handleUnsubscribe = async (id: string) => {
    try {
      await api.delete(`/api/rss/subscriptions/${id}`);
      setSubs((prev) => prev.filter((s) => s._id !== id));
      toast.success('Unsubscribed.');
    } catch (_) { toast.error('Failed to unsubscribe.'); }
  };

  const handleSuggested = (url: string) => {
    setFeedUrl(url);
    setPreview(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>RSS Feeds</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>{subs.length} subscriptions</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: C.purple }]} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={22} color={C.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.purple} size="large" /></View>
      ) : (
        <FlatList
          data={subs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSubs(); }} tintColor={C.purple} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="newspaper-outline" size={52} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No feeds yet</Text>
              <Text style={[styles.emptySub, { color: C.textMuted }]}>Subscribe to blogs and news sites to see their articles in your feed.</Text>
              <TouchableOpacity onPress={() => setShowAdd(true)}>
                <LinearGradient colors={[C.purple, C.cyan]} style={styles.emptyBtn}>
                  <Ionicons name="add" size={18} color={C.white} />
                  <Text style={[styles.emptyBtnText, { color: C.white }]}>Add Feed</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.subCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              {item.favicon
                ? <Image source={{ uri: item.favicon }} style={styles.subFavicon} />
                : <View style={[styles.subFaviconFallback, { backgroundColor: C.purpleDim }]}>
                    <Ionicons name="newspaper-outline" size={16} color={C.purple} />
                  </View>
              }
              <View style={{ flex: 1 }}>
                <Text style={[styles.subTitle, { color: C.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.subUrl, { color: C.textMuted }]} numberOfLines={1}>{item.feedUrl}</Text>
              </View>
              <TouchableOpacity style={styles.iconBtn} onPress={() => handleUnsubscribe(item._id)}>
                <Ionicons name="trash-outline" size={18} color={C.error} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Add feed modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => { setShowAdd(false); setFeedUrl(''); setPreview(null); }}>
        <Pressable style={styles.overlay} onPress={() => { setShowAdd(false); setFeedUrl(''); setPreview(null); }}>
          <Pressable style={[styles.modal, { backgroundColor: C.bgCard }]}>
            <View style={[styles.modalHandle, { backgroundColor: C.border }]} />
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>Add RSS Feed</Text>

            {/* URL input */}
            <View style={[styles.inputRow, { backgroundColor: C.bgElevated, borderColor: preview ? C.success : C.border }]}>
              <Ionicons name="newspaper-outline" size={16} color={C.textMuted} />
              <TextInput
                style={[styles.input, { color: C.textPrimary }]}
                placeholder="https://example.com/feed"
                placeholderTextColor={C.textMuted}
                value={feedUrl}
                onChangeText={(v) => { setFeedUrl(v); setPreview(null); }}
                autoCapitalize="none"
                keyboardType="url"
              />
              {preview && <Ionicons name="checkmark-circle" size={18} color={C.success} />}
            </View>

            {/* Preview button */}
            <TouchableOpacity
              style={[styles.previewBtn, { backgroundColor: C.bgElevated, borderColor: C.border }]}
              onPress={handlePreview}
              disabled={previewing}
            >
              {previewing
                ? <ActivityIndicator size="small" color={C.purple} />
                : <><Ionicons name="eye-outline" size={16} color={C.purple} /><Text style={[styles.previewBtnText, { color: C.purple }]}>Preview Feed</Text></>
              }
            </TouchableOpacity>

            {/* Preview result */}
            {preview && (
              <View style={[styles.previewCard, { backgroundColor: C.bgElevated, borderColor: C.success + '44' }]}>
                <Text style={[styles.previewTitle, { color: C.textPrimary }]}>{preview.channelTitle}</Text>
                <Text style={[styles.previewCount, { color: C.textMuted }]}>{preview.items.length} articles found</Text>
                {preview.items.slice(0, 2).map((item, i) => (
                  <Text key={i} style={[styles.previewItem, { color: C.textSecondary }]} numberOfLines={1}>• {item.title}</Text>
                ))}
              </View>
            )}

            {/* Suggested feeds */}
            {!preview && (
              <>
                <Text style={[styles.suggestedLabel, { color: C.textMuted }]}>SUGGESTED FEEDS</Text>
                <View style={styles.suggestedGrid}>
                  {SUGGESTED.map((s) => (
                    <TouchableOpacity
                      key={s.url}
                      style={[styles.suggestedChip, { backgroundColor: C.bgElevated, borderColor: feedUrl === s.url ? C.purple : C.border }]}
                      onPress={() => handleSuggested(s.url)}
                    >
                      <Text style={[styles.suggestedChipText, { color: feedUrl === s.url ? C.purple : C.textSecondary }]}>{s.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Subscribe button */}
            <TouchableOpacity onPress={handleSubscribe} disabled={subscribing || !feedUrl.trim()} style={{ marginTop: 16 }}>
              <LinearGradient
                colors={feedUrl.trim() ? [C.purple, C.cyan] : [C.bgElevated, C.bgElevated]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.subscribeBtn}
              >
                {subscribing
                  ? <ActivityIndicator color={C.white} />
                  : <Text style={[styles.subscribeBtnText, { color: feedUrl.trim() ? C.white : C.textMuted }]}>Subscribe</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '700' },
  headerSub:    { fontSize: 12, marginTop: 1 },
  addBtn:       { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  list:         { padding: 16, paddingBottom: 32, gap: 10 },
  subCard:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  subFavicon:   { width: 36, height: 36, borderRadius: 8 },
  subFaviconFallback: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  subTitle:     { fontSize: 14, fontWeight: '600' },
  subUrl:       { fontSize: 11, marginTop: 2 },
  iconBtn:      { padding: 6 },
  empty:        { alignItems: 'center', marginTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyTitle:   { fontSize: 18, fontWeight: '700' },
  emptySub:     { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { fontWeight: '700', fontSize: 14 },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 12 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalTitle:   { fontSize: 18, fontWeight: '700' },
  inputRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 50 },
  input:        { flex: 1, fontSize: 14 },
  previewBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, borderWidth: 1, paddingVertical: 10 },
  previewBtnText: { fontSize: 14, fontWeight: '600' },
  previewCard:  { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  previewTitle: { fontSize: 14, fontWeight: '700' },
  previewCount: { fontSize: 12 },
  previewItem:  { fontSize: 12 },
  suggestedLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  suggestedGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestedChip:  { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  suggestedChipText: { fontSize: 12, fontWeight: '500' },
  subscribeBtn:   { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subscribeBtnText: { fontWeight: '700', fontSize: 15 },
});
