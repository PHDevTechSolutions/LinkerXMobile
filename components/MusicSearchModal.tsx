import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Image, Modal, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useMusicStore, MusicTrack } from '@/store/musicStore';
import { useYouTubeSearch } from '@/hooks/useYouTubeSearch';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectForPlaylist?: (track: MusicTrack) => void; // optional — for group playlist
};

const QUICK_SEARCHES = ['Lofi hip hop', 'Chill beats', 'OPM hits', 'Study music', 'K-pop', 'EDM mix'];

export default function MusicSearchModal({ visible, onClose, onSelectForPlaylist }: Props) {
  const C = useColors();
  const { playTrack, currentTrack, isPlaying } = useMusicStore();
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

  const handlePlay = useCallback((track: MusicTrack) => {
    if (onSelectForPlaylist) {
      onSelectForPlaylist(track);
      return;
    }
    playTrack(track);
    onClose();
  }, [playTrack, onClose, onSelectForPlaylist]);

  const handleClose = () => {
    setQuery('');
    clear();
    onClose();
  };

  const isCurrentTrack = (videoId: string) => currentTrack?.videoId === videoId;

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
            <LinearGradient colors={[C.purple, C.cyan]} style={styles.headerIcon}>
              <Ionicons name="musical-notes" size={18} color={C.white} />
            </LinearGradient>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
              {onSelectForPlaylist ? 'Add to Playlist' : 'Music Player'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: C.bgElevated }]}>
              <Ionicons name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Currently playing banner */}
          {currentTrack && (
            <View style={[styles.nowPlaying, { backgroundColor: C.purpleDim, borderColor: C.purple + '44' }]}>
              <Ionicons name={isPlaying ? 'musical-note' : 'pause'} size={14} color={C.purple} />
              <Text style={[styles.nowPlayingText, { color: C.purpleLight }]} numberOfLines={1}>
                {isPlaying ? 'Now playing: ' : 'Paused: '}{currentTrack.title}
              </Text>
            </View>
          )}

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: C.bgElevated, borderColor: C.border }]}>
            <Ionicons name="search-outline" size={18} color={C.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: C.textPrimary }]}
              placeholder="Search songs, artists..."
              placeholderTextColor={C.textMuted}
              value={query}
              onChangeText={handleChangeText}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => query.trim() && search(query)}
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
                  <Ionicons name="musical-notes-outline" size={40} color={C.textMuted} />
                  <Text style={[styles.emptyText, { color: C.textMuted }]}>No results found</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const active = isCurrentTrack(item.videoId);
              return (
                <TouchableOpacity
                  style={[
                    styles.resultRow,
                    { borderBottomColor: C.border },
                    active && { backgroundColor: C.purpleDim },
                  ]}
                  onPress={() => handlePlay(item)}
                  activeOpacity={0.75}
                >
                  <View style={styles.thumbWrap}>
                    <Image source={{ uri: item.thumbnail }} style={styles.thumb} resizeMode="cover" />
                    {active && isPlaying && (
                      <View style={styles.playingOverlay}>
                        <Ionicons name="musical-note" size={16} color={C.white} />
                      </View>
                    )}
                  </View>
                  <View style={styles.resultInfo}>
                    <Text
                      style={[styles.resultTitle, { color: active ? C.purpleLight : C.textPrimary }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.resultChannel, { color: C.textMuted }]} numberOfLines={1}>
                      {item.channelTitle}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handlePlay(item)} style={styles.playIconBtn}>
                    <LinearGradient
                      colors={active ? [C.purple, C.cyan] : [C.bgElevated, C.bgElevated]}
                      style={styles.playIconGradient}
                    >
                      <Ionicons
                        name={onSelectForPlaylist ? 'add' : (active && isPlaying ? 'pause' : 'play')}
                        size={16}
                        color={active || onSelectForPlaylist ? C.white : C.textMuted}
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
    maxHeight: '88%',
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
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  nowPlayingText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
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
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  quickSearchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 13,
  },
  list: {
    marginTop: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 56,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(124,58,237,0.6)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    gap: 3,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  resultChannel: {
    fontSize: 11,
  },
  playIconBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  playIconGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
