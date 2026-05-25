import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  glowColor?: string;
};

export default function GlowCard({ children, style, glowColor = Colors.purple }: Props) {
  return (
    <View style={[styles.wrapper, style]}>
      {/* Glow border via gradient */}
      <LinearGradient
        colors={[glowColor + '80', Colors.cyan + '40', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    padding: 1,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
  },
  inner: {
    borderRadius: 15,
    backgroundColor: Colors.bgCard,
    overflow: 'hidden',
  },
});
