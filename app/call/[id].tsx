import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/lib/socket';

const IS_WEB = Platform.OS === 'web';
const WHEREBY_URL = 'https://whereby.com/linkerx';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function CallScreen() {
  const {
    id,
    type = 'video',
    userName = 'User',
    avatar,
    incoming = 'false',   // 'true' when receiver accepts from IncomingCall UI
    callId: paramCallId,  // passed by GlobalIncomingCall when incoming='true'
  } = useLocalSearchParams<{
    id: string;
    type: 'video' | 'voice';
    userName: string;
    avatar: string;
    incoming: string;
    callId: string;
  }>();

  const { user, token } = useAuthStore();
  const [status, setStatus]     = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [muted, setMuted]       = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);

  const localVideoRef  = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialized  = useRef(false);

  // Callee must reuse the callId from the offer so end_call matches
  const callId = useRef(
    incoming === 'true' && paramCallId
      ? paramCallId
      : `call_${id}_${Date.now()}`
  ).current;

  // Buffer ICE candidates that arrive before remote description is set
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSet     = useRef(false);

  const drainIceCandidates = useCallback(async (pc: RTCPeerConnection) => {
    while (iceCandidateQueue.current.length > 0) {
      const candidate = iceCandidateQueue.current.shift()!;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('ICE candidate error:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!IS_WEB) {
      openMobile();
      return;
    }
    const timeout = setTimeout(() => {
      isInitialized.current = true;
      initWebRTC();
    }, 100);
    return () => {
      clearTimeout(timeout);
      if (isInitialized.current) cleanup(false);
    };
  }, []);

  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const openMobile = async () => {
    const url = `${WHEREBY_URL}?displayName=${encodeURIComponent(
      user?.userName || userName
    )}&skipMediaPermissionPrompt=on`;
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch {
      await Linking.openURL(url);
    }
    router.back();
  };

  const initWebRTC = async () => {
    if (!token) return;
    const socket = getSocket(token);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type !== 'voice',
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(STUN_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setStatus('connected');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            targetUserId: id,
            candidate: event.candidate,
            callId,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('WebRTC state:', pc.connectionState);
        if (pc.connectionState === 'failed') endCall();
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE state:', pc.iceConnectionState);
      };

      // ── Socket listeners ──────────────────────────────────────────────

      // Callee path: receive offer → send answer
      socket.on('webrtc_offer', async ({ fromUserId, offer }: any) => {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        remoteDescSet.current = true;
        await drainIceCandidates(pcRef.current);
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit('webrtc_answer', { targetUserId: fromUserId, answer, callId });
        setStatus('connected');
      });

      // Caller path: receive answer
      socket.on('webrtc_answer', async ({ answer }: any) => {
        if (!pcRef.current || remoteDescSet.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        remoteDescSet.current = true;
        await drainIceCandidates(pcRef.current);
        setStatus('connected');
      });

      // Queue candidates if remote desc not ready yet
      socket.on('webrtc_ice_candidate', async ({ candidate }: any) => {
        if (!pcRef.current) return;
        if (remoteDescSet.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('ICE add error:', e);
          }
        } else {
          iceCandidateQueue.current.push(candidate);
        }
      });

      socket.on('webrtc_end_call', ({ callId: endedCallId }: any) => {
        if (endedCallId === callId) endCall();
      });

      socket.emit('join_user_room');

      // Caller sends offer; callee (incoming=true) just waits for it
      if (incoming !== 'true') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', {
          targetUserId: id,
          offer,
          callId,
          callerName: user?.userName || 'Unknown',
          callerAvatar: user?.avatar || null,
          callType: type,
        });
      }
      setStatus('ringing');

    } catch (err: any) {
      console.error('WebRTC error:', err);
      if (err.name === 'NotAllowedError') {
        setStatus('ended');
        setTimeout(() => router.back(), 500);
      } else {
        setStatus('ringing');
      }
    }
  };

  const endCall = useCallback(() => {
    cleanup(true);
    setStatus('ended');
    setTimeout(() => router.back(), 1000);
  }, []);

  // Always remove socket listeners regardless of sendEndSignal
  const cleanup = (sendEndSignal = true) => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;

    if (token) {
      const socket = getSocket(token);
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('webrtc_end_call');

      if (sendEndSignal && isInitialized.current) {
        socket.emit('webrtc_end_call', { targetUserId: id, callId });
      }
    }
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted(!muted);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = videoOff; });
    setVideoOff(!videoOff);
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60)
      .toString()
      .padStart(2, '0')}`;

  // ── Mobile UI ─────────────────────────────────────────────────────────
  if (!IS_WEB) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.purple + '55', Colors.bg]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.center}>
          <Avatar uri={avatar} name={userName} size={90} />
          <Text style={styles.callerName}>{userName}</Text>
          <Text style={styles.callStatus}>Opening video call...</Text>
          <ActivityIndicator color={Colors.purple} size="large" style={{ marginTop: 16 }} />
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Web WebRTC UI ─────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {status === 'connected' ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', backgroundColor: '#000',
          } as any}
        />
      ) : (
        <LinearGradient
          colors={[Colors.purple + '55', Colors.bg]}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.center}>
            <Avatar uri={avatar} name={userName} size={90} />
            <Text style={styles.callerName}>{userName}</Text>
            <Text style={styles.callStatus}>
              {status === 'connecting' ? 'Connecting...' :
               status === 'ringing'    ? (incoming === 'true' ? 'Connecting to caller...' : 'Ringing...') :
               status === 'ended'      ? 'Call ended' : ''}
            </Text>
            {status !== 'ended' && (
              <ActivityIndicator color={Colors.purple} style={{ marginTop: 12 }} />
            )}
          </View>
        </LinearGradient>
      )}

      {status === 'connected' && !videoOff && type !== 'voice' && (
        <View style={styles.localVideoWrap}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', borderRadius: 12,
            } as any}
          />
        </View>
      )}

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="chevron-down" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.topInfo}>
          <Text style={styles.topName}>{userName}</Text>
          {status === 'connected' && (
            <Text style={styles.topDuration}>{formatDuration(duration)}</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={toggleMute}>
          <View style={[styles.controlBtnInner, muted && styles.controlBtnActive]}>
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color={Colors.white} />
          </View>
          <Text style={styles.controlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        {type !== 'voice' && (
          <TouchableOpacity style={styles.controlBtn} onPress={toggleVideo}>
            <View style={[styles.controlBtnInner, videoOff && styles.controlBtnActive]}>
              <Ionicons
                name={videoOff ? 'videocam-off' : 'videocam'}
                size={24}
                color={Colors.white}
              />
            </View>
            <Text style={styles.controlLabel}>{videoOff ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.controlBtn} onPress={endCall}>
          <View style={styles.endCallBtn}>
            <Ionicons
              name="call"
              size={26}
              color={Colors.white}
              style={{ transform: [{ rotate: '135deg' }] }}
            />
          </View>
          <Text style={styles.controlLabel}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  callerName: { color: Colors.white, fontSize: 24, fontWeight: '700' },
  callStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  localVideoWrap: {
    position: 'absolute', top: 100, right: 16,
    width: 100, height: 140, borderRadius: 12,
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
  cancelBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  cancelText: { color: Colors.textMuted, fontSize: 14 },
});