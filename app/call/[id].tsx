import React, { useEffect, useState } from 'react';
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
import { toast } from '@/lib/toast';
import api from '@/lib/api';

// Sanitize room name for Daily.co
function getRoomName(id: string): string {
  return `linkerx-${id}`.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 100);
}

export default function CallScreen() {
  const { id, type = 'video', userName = 'User', avatar } = useLocalSearchParams<{
    id: string;
    type: 'video' | 'voice';
    userName: string;
    avatar: string;
  }>();

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [roomUrl, setRoomUrl]   = useState<string | null>(null);
  const roomName = getRoomName(id);

  useEffect(() => {
    startCall();
  }, []);

  const startCall = async () => {
    try {
      const { data } = await api.post('/api/calls/room', { roomName });
      setRoomUrl(data.url);
      await openCall(data.url);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Could not start call.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const openCall = async (url: string) => {
    if (Platform.OS === 'web') {
      // Web: navigate to the call URL in same tab
      window.location.href = url;
    } else {
      // Mobile: open in in-app browser
      try {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
      } catch {
        // Fallback: open in system browser
        await Linking.openURL(url);
      }
      router.back();
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    startCall();
  };

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[Colors.purple + '33', Colors.bg]} style={StyleSheet.absoluteFill} />
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons name="videocam-off-outline" size={40} color={Colors.error} />
          </View>
          <Text style={styles.callerName}>{userName}</Text>
          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Ionicons name="refresh" size={16} color={Colors.white} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading / connecting state
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.purple + '55', Colors.bg]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.center}>
        <Avatar uri={avatar} name={userName} size={90} />
        <Text style={styles.callerName}>{userName}</Text>
        <Text style={styles.callStatus}>
          {loading ? 'Starting call...' : 'Opening call room...'}
        </Text>
        <ActivityIndicator color={Colors.purple} size="large" style={{ marginTop: 16 }} />

        {roomUrl && (
          <TouchableOpacity style={styles.openBtn} onPress={() => openCall(roomUrl)}>
            <Ionicons name="videocam" size={16} color={Colors.white} />
            <Text style={styles.openBtnText}>Open Call</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  callerName: { color: Colors.white, fontSize: 24, fontWeight: '700' },
  callStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  errorIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.error + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  errorText: { color: Colors.error, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.purple, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  retryText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.purple, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  openBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  cancelText: { color: Colors.textMuted, fontSize: 14 },
});
