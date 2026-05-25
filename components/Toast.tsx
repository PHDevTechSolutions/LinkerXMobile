import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastProps = {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
};

const config: Record<ToastType, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  success: { icon: 'checkmark-circle',  color: Colors.success,  bg: Colors.success + '22' },
  error:   { icon: 'close-circle',      color: Colors.error,    bg: Colors.error + '22'   },
  warning: { icon: 'warning',           color: Colors.warning,  bg: Colors.warning + '22' },
  info:    { icon: 'information-circle', color: Colors.cyan,    bg: Colors.cyanDim        },
};

export default function Toast({ visible, message, type = 'info', duration = 3000, onHide }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 250, useNativeDriver: true }),
        ]).start(() => onHide());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const { icon, color, bg } = config[type];

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.toast, { backgroundColor: Colors.bgCard, borderColor: color + '55' }]}>
        <View style={[styles.iconWrap, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.message} numberOfLines={3}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
});
