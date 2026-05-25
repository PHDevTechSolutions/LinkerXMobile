import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import Avatar from './Avatar';

type Props = {
  callerName: string;
  callerAvatar?: string;
  callType: 'video' | 'voice';
  onAccept: () => void;
  onDecline: () => void;
};

export default function IncomingCall({ callerName, callerAvatar, callType, onAccept, onDecline }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(124,58,237,0.95)', 'rgba(13,13,26,0.98)']} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        <Text style={styles.callType}>
          {callType === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Voice Call'}
        </Text>

        <Animated.View style={[styles.avatarWrap, { transform: [{ scale: pulse }] }]}>
          <Avatar uri={callerAvatar} name={callerName} size={100} />
        </Animated.View>

        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.callerSub}>is calling you...</Text>

        <View style={styles.buttons}>
          {/* Decline */}
          <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
            <View style={styles.declineBtnInner}>
              <Ionicons name="call" size={28} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
            </View>
            <Text style={styles.btnLabel}>Decline</Text>
          </TouchableOpacity>

          {/* Accept */}
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <LinearGradient colors={[Colors.success, '#059669']} style={styles.acceptBtnInner}>
              <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={28} color={Colors.white} />
            </LinearGradient>
            <Text style={styles.btnLabel}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, justifyContent: 'center', alignItems: 'center',
  },
  content: { alignItems: 'center', gap: 16, padding: 32 },
  callType: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  avatarWrap: {
    borderWidth: 4, borderColor: Colors.purple,
    borderRadius: 60, padding: 4,
  },
  callerName: { color: Colors.white, fontSize: 28, fontWeight: '800' },
  callerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
  buttons: { flexDirection: 'row', gap: 60, marginTop: 24 },
  declineBtn: { alignItems: 'center', gap: 8 },
  declineBtnInner: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.error, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  acceptBtn: { alignItems: 'center', gap: 8 },
  acceptBtnInner: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.success, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  btnLabel: { color: Colors.white, fontSize: 13, fontWeight: '600' },
});
