import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { AGORA_APP_ID, getChannelName } from '@/lib/agora';

const IS_WEB = Platform.OS === 'web';

export default function CallScreen() {
  const { id, type = 'video', userName = 'User', avatar } = useLocalSearchParams<{
    id: string;
    type: 'video' | 'voice';
    userName: string;
    avatar: string;
  }>();

  const [joined, setJoined]             = useState(false);
  const [remoteUid, setRemoteUid]       = useState<number | null>(null);
  const [muted, setMuted]               = useState(false);
  const [videoOff, setVideoOff]         = useState(false);
  const [speakerOn, setSpeakerOn]       = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const engineRef = useRef<any>(null);
  const timerRef  = useRef<any>(null);
  const channelName = getChannelName(id);

  useEffect(() => {
    if (IS_WEB) return;
    initAgora();
    return () => { endCall(false); };
  }, []);

  useEffect(() => {
    if (joined) {
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [joined]);

  const initAgora = async () => {
    try {
      const {
        createAgoraRtcEngine,
        ChannelProfileType,
        ClientRoleType,
      } = require('react-native-agora');

      const engine = createAgoraRtcEngine();
      engineRef.current = engine;

      engine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      engine.registerEventHandler({
        onJoinChannelSuccess: () => setJoined(true),
        onUserJoined: (_connection: any, uid: number) => setRemoteUid(uid),
        onUserOffline: () => { setRemoteUid(null); endCall(false); },
        onError: (err: any) => console.error('Agora error:', err),
      });

      if (type === 'video') {
        engine.enableVideo();
        engine.startPreview();
      }

      engine.joinChannel(null, channelName, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    } catch (err) {
      console.error('Agora init error:', err);
    }
  };

  const endCall = async (navigate = true) => {
    clearInterval(timerRef.current);
    if (engineRef.current) {
      engineRef.current.leaveChannel();
      engineRef.current.release();
      engineRef.current = null;
    }
    if (navigate) router.back();
  };

  const toggleMute = () => {
    engineRef.current?.muteLocalAudioStream(!muted);
    setMuted(!muted);
  };

  const toggleVideo = () => {
    engineRef.current?.muteLocalVideoStream(!videoOff);
    setVideoOff(!videoOff);
  };

  const toggleSpeaker = () => {
    engineRef.current?.setEnableSpeakerphone(!speakerOn);
    setSpeakerOn(!speakerOn);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Web fallback ─────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[Colors.purple + '44', Colors.bg, Colors.bg]} style={StyleSheet.absoluteFill} />
        <View style={styles.webFallback}>
          <Ionicons name="videocam-off-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.webFallbackTitle}>Video calls not supported on web</Text>
          <Text style={styles.webFallbackText}>Install the LinkerX mobile app to make video calls.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Mobile call UI ────────────────────────────────────────────────────────
  const { RtcSurfaceView, VideoSourceType } = require('react-native-agora');

  return (
    <View style={styles.container}>
      {/* Remote video */}
      {type === 'video' && remoteUid !== null ? (
        <RtcSurfaceView
          style={StyleSheet.absoluteFill}
          canvas={{ uid: remoteUid, sourceType: VideoSourceType.VideoSourceRemote }}
        />
      ) : (
        <LinearGradient
          colors={[Colors.purple + '55', Colors.bg]}
          style={[StyleSheet.absoluteFill, styles.noVideoBackground]}
        >
          <Avatar uri={avatar} name={userName} size={100} />
          <Text style={styles.callerName}>{userName}</Text>
          <Text style={styles.callStatus}>
            {!joined ? 'Connecting...' : remoteUid === null ? 'Ringing...' : formatDuration(callDuration)}
          </Text>
          {!joined && <ActivityIndicator color={Colors.purple} style={{ marginTop: 12 }} />}
        </LinearGradient>
      )}

      {/* Local video preview */}
      {type === 'video' && joined && !videoOff && (
        <View style={styles.localVideo}>
          <RtcSurfaceView
            style={StyleSheet.absoluteFill}
            canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
          />
        </View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="chevron-down" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.topInfo}>
          <Text style={styles.topName}>{userName}</Text>
          {joined && remoteUid !== null && (
            <Text style={styles.topDuration}>{formatDuration(callDuration)}</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={toggleMute}>
          <View style={[styles.controlBtnInner, muted && styles.controlBtnActive]}>
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color={Colors.white} />
          </View>
          <Text style={styles.controlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        {type === 'video' && (
          <TouchableOpacity style={styles.controlBtn} onPress={toggleVideo}>
            <View style={[styles.controlBtnInner, videoOff && styles.controlBtnActive]}>
              <Ionicons name={videoOff ? 'videocam-off' : 'videocam'} size={24} color={Colors.white} />
            </View>
            <Text style={styles.controlLabel}>{videoOff ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.controlBtn} onPress={toggleSpeaker}>
          <View style={[styles.controlBtnInner, !speakerOn && styles.controlBtnActive]}>
            <Ionicons name={speakerOn ? 'volume-high' : 'volume-mute'} size={24} color={Colors.white} />
          </View>
          <Text style={styles.controlLabel}>{speakerOn ? 'Speaker' : 'Earpiece'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={() => endCall(true)}>
          <View style={styles.endCallBtn}>
            <Ionicons name="call" size={26} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
          </View>
          <Text style={styles.controlLabel}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  noVideoBackground: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  callerName: { color: Colors.white, fontSize: 26, fontWeight: '700', marginTop: 16 },
  callStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
  localVideo: {
    position: 'absolute', top: 100, right: 16,
    width: 100, height: 140, borderRadius: 14,
    overflow: 'hidden', borderWidth: 2, borderColor: Colors.white,
  },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topInfo: { flex: 1, alignItems: 'center' },
  topName: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  topDuration: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-end',
    paddingBottom: 48, paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  controlBtn: { alignItems: 'center', gap: 8 },
  controlBtnInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: 'rgba(255,255,255,0.4)' },
  controlLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  endCallBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
  },
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  webFallbackTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  webFallbackText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
  backBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  backBtnText: { color: Colors.purple, fontWeight: '600' },
});
