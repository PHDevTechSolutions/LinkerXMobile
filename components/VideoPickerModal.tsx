import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Image, Modal, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useYouTubeSearch, YouTubeSearchResult } from '@/hooks/useYouTubeSearch';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (video: YouTubeSearchResult) => void;
  selectedVideoId?: string | null;
};

const QUICK_SEARCHES = [
  'Trending Philippines', 'OPM 2024', 'Funny videos', 'Gaming highlights',
  'K-drama clips', 'Tech reviews', 'Cooking tutorials', 'Vlog',
];

export default function VideoPickerModal({ visible, onClose, onSelect, selectedVideoId }: Props) {
  const C = useColors();
  const { results, loading, error, search, clear } = useYouTubeSearch();
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) { clear(); return; }
    debounceRef.current = setTimeout(() => search(text), 500);
  }, [search, clear]);

  const handleQuickSearch = useCallback((q: string) => {
    setQuery(q);
    search(q);
  }, [search]);

  const handleSelect = useCallback((video: YouTubeSearchResult) => {
    onSelect(video);
    onClose();
  }, [onSelect, onClose]);

  const handleClose = () => {
    setQuery('');
    clear();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.bgCard, borderColor: C.border }]}>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: C.border }]}>
            <LinearGradient colors={['#FF0000', '#FF6B6B']} style={styles.headerIcon}>
              <Ionicons name="logo-youtube" size={18} color="#fff" />
            </LinearGradient>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Pick a Video</Text>
            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: C.bgElevated }]}>
              <Ionicons name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: C.bgElevated, borderColor: C.border }]}>
            <Ionicons name="search-outline" size={18} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.textPrimary }]}
              placeholder="Search YouTube videos..."
              placeholderTextColor={C.textMuted}
              value={query}
              onChangeText={handleChangeText}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => query.trim() && search(query)}
              autoFocus
            />
            {loading
              ? <ActivityIndicator size="small" color={C.purple} />
              : query.length > 0
                ? <TouchableOpacity onPress={() => { setQuery(''); clear(); }}>
                    <Ionicons name="close-circle" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                : null
            }
          </View>

          {/* Quick search chips */}
          {results.length === 0 && !loading && (
            <View style={styles.quickSearchRow}>
              {QUICK_SEARCHES.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.chip, { backgroundColor: C.bgElevated, borderColor: C.border }]}
                  onPress={() => handleQuickSearch(q)}
                >
                  <Text style={[styles.chipText, { color: C.textSecondary }]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorWrap}>
              <Ionicons name="alert-circle-outline" size={20} color={C.error} />
              <Text style={[styles.errorText, { color: C.error }]}>{error}</Text>
            </View>
          )}

          {/* Results */}
          <FlatList
            data={results}
            keyExtractor={(item) => item.videoId}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !loading && query.length >= 2 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="videocam-outline" size={40} color={C.textMuted} />
                  <Text style={[styles.emptyText, { color: C.textMuted }]}>No videos found</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const isSelected = selectedVideoId === item.videoId;
              return (
                <TouchableOpacity
                  style={[
                    styles.resultRow,
                    { borderBottomColor: C.border },
                    isSelected && { backgroundColor: C.purpleDim },
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.75}
                >
                  {/* Thumbnail */}
                  <View style={styles.thumbWrap}>
                    <Image source={{ uri: item.thumbnail }} style={styles.thumb} resizeMode="cover" />
                    <View style={styles.playOverlay}>
                      <Ionicons name="play" size={14} color="#fff" />
                    </View>
                    {isSelected && (
                      <View style={styles.selectedOverlay}>
                        <Ionicons name="checkmark-circle" size={22} color={C.purple} />
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.resultInfo}>
                    <Text
                      style={[styles.resultTitle, { color: isSelected ? C.purpleLight : C.textPrimary }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.resultChannel, { color: C.textMuted }]} numberOfLines={1}>
                      {item.channelTitle}
                    </Text>
                  </View>

                  {/* Select button */}
                  <TouchableOpacity onPress={() => handleSelect(item)} style={styles.selectBtn}>
                    <LinearGradient
                      colors={isSelected ? [C.purple, C.cyan] : [C.bgElevated, C.bgElevated]}
                      style={styles.selectBtnGradient}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'add'}
                        size={18}
                        color={isSelected ? '#fff' : C.textMuted}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  quickSearchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '500' },
  errorWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 12,
  },
  errorText: { fontSize: 13 },
  list: { marginTop: 8 },
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 80, height: 56,
    borderRadius: 8, backgroundColor: '#1a1a2e',
  },
  playOverlay: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10, padding: 3,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(124,58,237,0.4)',
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  resultInfo: { flex: 1, gap: 3 },
  resultTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  resultChannel: { fontSize: 11 },
  selectBtn: { borderRadius: 20, overflow: 'hidden' },
  selectBtnGradient: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
});
