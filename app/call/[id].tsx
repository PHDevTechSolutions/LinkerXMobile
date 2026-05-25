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

// Generate Jitsi room URL — no API key needed, 100% free
function getJitsiUrl(id: string, displayName?: string): string {
  const roomName = `LinkerX-${id}`.replace(/[^a-zA-Z0-9-]/g, '-');
  const name = encodeURIComponent(displayName || 'User');
  return `https://meet.jit.si/${roomName}#userInfo.displayName="${name}"`;
}

export default function CallScreen() {
  const { id, type = 'video', userName = 'User', avatar } = useLocalSearchParams<{
    id: string;
    type: 'video' | 'voice';
    userName: string;
    avatar: string;
  }>();

  const [loading, setLoading] = useState(true);
  const callUrl = getJitsiUrl(id, userName);

  useEffect(() => {
    openCall();
  }, []);

  const openCall = async () => {
    try {
      if (Platform.OS === 'web') {
        window.open(callUrl, '_blank');
        setTimeout(() => router.back(), 500);
      } else {
        await WebBrowser.openBrowserAsync(callUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
        router.back();
      }
    } catch {
      await Linking.openURL(callUrl);
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
          {loading ? 'Starting video call...' : 'Opening Jitsi Meet...'}
        </Text>
        <ActivityIndicator color={Colors.purple} size="large" style={{ marginTop: 16 }} />

        {/* Manual open button in case auto-open fails */}
        <TouchableOpacity style={styles.openBtn} onPress={openCall}>
          <Ionicons name="videocam" size={16} color={Colors.white} />
          <Text style={styles.openBtnText}>Open Call</Text>
        </TouchableOpacity>

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
