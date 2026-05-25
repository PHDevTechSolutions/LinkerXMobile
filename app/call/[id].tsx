import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { getRoomName } from '@/lib/daily';
import { toast } from '@/lib/toast';
import api from '@/lib/api';

const IS_WEB = Platform.OS === 'web';

export default function CallScreen() {
  const { id, type = 'video', userName = 'User', avatar } = useLocalSearchParams<{
    id: string;
    type: 'video' | 'voice';
    userName: string;
    avatar: string;
  }>();

  const [roomUrl, setRoomUrl]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [callActive, setCallActive] = useState(false);
  const callFrameRef = useRef<any>(null);
  const roomName = getRoomName(id);

  useEffect(() => {
    createRoom();
    return () => { leaveCall(); };
  }, []);

  const createRoom = async () => {
    try {
      const { data } = await api.post('/api/calls/room', { roomName });
      setRoomUrl(data.url);
      if (IS_WEB) {
        initDailyWeb(data.url);
      }
    } catch (err) {
      toast.error('Could not start call.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const initDailyWeb = async (url: string) => {
    try {
      const DailyIframe = (await import('@daily-co/daily-js')).default;
      const container = document.getElementById('daily-call-container');
      if (!container) return;

      callFrameRef.current = DailyIframe.createFrame(container, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '0px',
        },
        showLeaveButton: false,
        showFullscreenButton: true,
      });

      callFrameRef.current.on('joined-meeting', () => setCallActive(true));
      callFrameRef.current.on('left-meeting', () => { setCallActive(false); router.back(); });
      callFrameRef.current.on('error', () => { toast.error('Call error.'); router.back(); });

      await callFrameRef.current.join({ url });
    } catch (err) {
      console.error('Daily init error:', err);
    }
  };

  const leaveCall = () => {
    if (callFrameRef.current) {
      callFrameRef.current.leave();
      callFrameRef.current.destroy();
      callFrameRef.current = null;
    }
  };

  const handleEndCall = () => {
    leaveCall();
    router.back();
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[Colors.purple + '55', Colors.bg]} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingWrap}>
          <Avatar uri={avatar} name={userName} size={90} />
          <Text style={styles.callerName}>{userName}</Text>
          <Text style={styles.callStatus}>Starting call...</Text>
          <ActivityIndicator color={Colors.purple} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  // ── Web — Daily.co iframe ─────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <View style={styles.container}>
        {/* Daily.co iframe container */}
        <div
          id="daily-call-container"
          style={{ width: '100%', height: '100%', backgroundColor: '#0D0D1A' }}
        />

        {/* End call overlay button */}
        <View style={styles.endCallOverlay}>
          <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
            <Ionicons name="call" size={26} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          <Text style={styles.endCallLabel}>End Call</Text>
        </View>
      </View>
    );
  }

  // ── Mobile — WebView with Daily.co ────────────────────────────────────────
  // Use expo-web-browser or WebView to open the Daily room
  const { WebView } = require('react-native-webview');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.mobileHeader}>
        <TouchableOpacity onPress={handleEndCall} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.mobileHeaderTitle}>{userName}</Text>
        <TouchableOpacity style={styles.endCallBtnSmall} onPress={handleEndCall}>
          <Ionicons name="call" size={18} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>

      {roomUrl ? (
        <WebView
          source={{ uri: roomUrl }}
          style={{ flex: 1 }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          onError={() => { toast.error('Call error.'); router.back(); }}
        />
      ) : (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.purple} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  loadingWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  callerName: { color: Colors.white, fontSize: 24, fontWeight: '700' },
  callStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },

  endCallOverlay: {
    position: 'absolute', bottom: 40,
    left: 0, right: 0,
    alignItems: 'center', gap: 8,
  },
  endCallBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  endCallLabel: { color: Colors.white, fontSize: 13, fontWeight: '600' },

  mobileHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 52, paddingBottom: 12,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  mobileHeaderTitle: { flex: 1, color: Colors.textPrimary, fontWeight: '700', fontSize: 16 },
  endCallBtnSmall: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
  },
});
