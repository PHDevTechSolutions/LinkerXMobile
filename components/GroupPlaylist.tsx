import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useMusicStore } from '@/store/musicStore';
import { useAuthStore } from '@/store/authStore';
import { useYouTubeSearch } from '@/hooks/useYouTubeSearch';
import MusicSearchModal from './MusicSearchModal';
import api from '@/lib/api';
import { toast } from '@/lib/toast';
import { getSocket } from '@/lib/socket';

type PlaylistTrack = {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  addedBy: { _id: string; userName: string };
  addedAt: string;
};

type Props = {
  groupId: string;
  visible: boolean;
  onClose: () => void;
};

export default function GroupPlaylist({ groupId, visible, onClose }: Props) {
  const C = useColors();
  const { user, token } = useAuthStore();
  const { playTrack, currentTrack } = useMusicStore();
  const [tracks, setTracks]     = useState<PlaylistTrack[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const fetchPlaylist = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/groups/${groupId}/playlist`);
      setTracks(data.playlist || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [groupId]);

  useEffect(() => {
    if (visible) fetchPlaylist();
  }, [visible, fetchPlaylist]);

  // Listen for real-time playlist updates
  useEffect(() => {
    if (!token || !visible) return;
    const socket = getSocket(token);
    const onUpdate = (data: any) => {
      if (data.groupId !== groupId) return;
      if (data.action === 'add') {
        setTracks((prev) => [...prev, data.track]);
      } else if (data.action === 'remove') {
        setTracks((prev) => prev.filter((t) => t.id !== data.trackId));
      }
    };
    socket.on('playlist_updated', onUpdate);
    return () => { socket.off('playlist_updated', onUpdate); };
  }, [token, groupId, visible]);

  const handleAddTrack = async (track: { videoId: string; title: string; channelTitle: string; thumbnail: string }) => {
    try {
      await api.post(`/api/groups/${groupId}/playlist`, track);
      toast.success('Added to playlist!');
      setShowSearch(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add track.');
    }
  };

  const handleRemove = async (trackId: string) => {
    try {
      await api.delete(`/api/groups/${groupId}/playlist/${trackId}`);
      toast.success('Removed from playlist.');
    } catch (_) {
      toast.error('Failed to remove.');
    }
  };

  const handlePlay = (track: PlaylistTrack) => {
    playTrack({
      videoId: track.videoId,
      title: track.title,
      channelTitle: track.channelTitle,
      thumbnail: track.thumbnail,
    });
    toast.info(`Playing: ${track.title}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.bgCard, borderColor: C.border }]}>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: C.border }]}>
            <LinearGradient colors={[C.purple, C.cyan]} style={styles.headerIcon}>
              <Ionicons name="musical-notes" size={18} color="#fff" />
            </LinearGradient>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Group Playlist</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: C.purple }]}
              onPress={() => setShowSearch(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: C.bgElevated }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Currently playing banner */}
          {currentTrack && (
            <View style={[styles.nowPlaying, { backgroundColor: C.purpleDim, borderColor: C.purple + '44' }]}>
              <Ionicons name="musical-note" size={13} color={C.purple} />
              <Text style={[styles.nowPlayingText, { color: C.purpleLight }]} numberOfLines={1}>
                Now playing: {currentTrack.title}
              </Text>
            </View>
          )}

          {/* Track list */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={C.purple} />
            </View>
          ) : (
            <FlatList
              data={tracks}
              keyExtractor={(item) => item.id}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="musical-notes-outline" size={40} color={C.textMuted} />
                  <Text style={[styles.emptyText, { color: C.textMuted }]}>No tracks yet</Text>
                  <Text style={[styles.emptySub, { color: C.textMuted }]}>Tap + to add songs</Text>
                </View>
              }
              renderItem={({ item, index }) => {
                const isPlaying = currentTrack?.videoId === item.videoId;
                return (
                  <View style={[styles.trackRow, { borderBottomColor: C.border }, isPlaying && { backgroundColor: C.purpleDim }]}>
                    <Text style={[styles.trackNum, { color: C.textMuted }]}>{index + 1}</Text>
                    <TouchableOpacity onPress={() => handlePlay(item)} style={styles.thumbWrap}>
                      <Image source={{ uri: item.thumbnail }} style={styles.thumb} resizeMode="cover" />
                      {isPlaying && (
                        <View style={styles.playingOverlay}>
                          <Ionicons name="musical-note" size={14} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.trackInfo}>
                      <Text style={[styles.trackTitle, { color: isPlaying ? C.purpleLight : C.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.trackChannel, { color: C.textMuted }]} numberOfLines={1}>
                        {item.channelTitle} · Added by {item.addedBy.userName}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handlePlay(item)} style={styles.playBtn}>
                      <LinearGradient
                        colors={isPlaying ? [C.purple, C.cyan] : [C.bgElevated, C.bgElevated]}
                        style={styles.playBtnGradient}
                      >
                        <Ionicons name="play" size={14} color={isPlaying ? '#fff' : C.textMuted} />
                      </LinearGradient>
                    </TouchableOpacity>
                    {item.addedBy._id === user?._id && (
                      <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.removeBtn}>
                        <Ionicons name="trash-outline" size={16} color={C.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>

      {/* YouTube search to add tracks */}
      <MusicSearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectForPlaylist={handleAddTrack}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, maxHeight: '85%' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerIcon:   { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { flex: 1, fontSize: 17, fontWeight: '700' },
  addBtn:       { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  closeBtn:     { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  nowPlaying:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  nowPlayingText: { flex: 1, fontSize: 12, fontWeight: '500' },
  center:       { padding: 40, alignItems: 'center' },
  list:         { marginTop: 8 },
  empty:        { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText:    { fontSize: 15, fontWeight: '600' },
  emptySub:     { fontSize: 13 },
  trackRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  trackNum:     { width: 20, fontSize: 12, textAlign: 'center' },
  thumbWrap:    { position: 'relative' },
  thumb:        { width: 48, height: 36, borderRadius: 6 },
  playingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(124,58,237,0.6)', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  trackInfo:    { flex: 1 },
  trackTitle:   { fontSize: 13, fontWeight: '600' },
  trackChannel: { fontSize: 11, marginTop: 2 },
  playBtn:      { borderRadius: 16, overflow: 'hidden' },
  playBtnGradient: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  removeBtn:    { padding: 4 },
});
