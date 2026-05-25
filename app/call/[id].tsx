import React, { useEffect, useState } from 'react';
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

export default function CallScreen() {
  const { id, type = 'video', userName = 'User', avatar } = useLocalSearchParams<{
    id: string;
    type: 'video' | 'voice';
    userName: string;
    avatar: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const roomName = getRoomName(id);

  useEffect(() => {
    startCall();
  }, []);

  const startCall = async () => {
    try {
      const { data } = await api.post('/api/calls/room', { roomName });
      setRoomUrl(data.url);

      if (Platform.OS === 'web') {
        // Web: open Daily.co in new tab
        window.open(data.url, '_blank');
        router.back();
      } else {
        // Mobile: open in in-app browser
        await WebBrowser.openBrowserAsync(data.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
        router.back();
      }
    } catch {
      toast.error('Could not start call.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

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
          {loading ? 'Starting call...' : 'Opening call...'}
        </Text>
        <ActivityIndicator color={Colors.purple} style={{ marginTop: 16 }} />

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={18} color={Colors.textMuted} />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  callerName: { color: Colors.white, fontSize: 24, fontWeight: '700' },
  callStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  cancelBtn: {
    marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  cancelText: { color: Colors.textMuted, fontSize: 14 },
});
