import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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

  const [roomUrl, setRoomUrl]       = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
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
        // Web: use Daily.co iframe
        initDailyWeb(data.url);
      } else {
        // Mobile: open in system browser
        await WebBrowser.openBrowserAsync(data.url);
        router.back();
      }
    } catch {
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
        },
        showLeaveButton: false,
        showFullscreenButton: true,
      });

      callFrameRef.current.on('left-meeting', () => router.back());
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

  // Loading
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[Colors.purple + '55', Colors.bg]} style={StyleSheet.absoluteFill} />
        <View style={styles.center}>
          <Avatar uri={avatar} name={userName} size={90} />
          <Text style={styles.callerName}>{userName}</Text>
          <Text style={styles.callStatus}>Starting call...</Text>
          <ActivityIndicator color={Colors.purple} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  // Web — Daily.co iframe
  if (IS_WEB) {
    return (
      <View style={styles.container}>
        <div
          id="daily-call-container"
          style={{ width: '100%', height: '100%', backgroundColor: '#0D0D1A' }}
        />
        <View style={styles.endCallOverlay}>
          <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
            <Ionicons
              name="call"
              size={26}
              color={Colors.white}
              style={{ transform: [{ rotate: '135deg' }] }}
            />
          </TouchableOpacity>
          <Text style={styles.endCallLabel}>End Call</Text>
        </View>
      </View>
    );
  }

  // Mobile — opened in browser, show waiting screen
  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.purple + '55', Colors.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <Avatar uri={avatar} name={userName} size={90} />
        <Text style={styles.callerName}>{userName}</Text>
        <Text style={styles.callStatus}>Call opened in browser</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back to Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  callerName: { color: Colors.white, fontSize: 24, fontWeight: '700' },
  callStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  endCallOverlay: {
    position: 'absolute', bottom: 40,
    left: 0, right: 0, alignItems: 'center', gap: 8,
  },
  endCallBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  endCallLabel: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  backBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  backBtnText: { color: Colors.purple, fontWeight: '600' },
});
