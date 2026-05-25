import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';

type Props = {
  uri?: string;
  name?: string;
  size?: number;
  style?: ViewStyle;
};

export default function Avatar({ uri, name, size = 40, style }: Props) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (uri) {
    return (
      <View style={[{ width: size, height: size, borderRadius: size / 2 }, style]}>
        <LinearGradient
          colors={[Colors.purple, Colors.cyan]}
          style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2, padding: 2 }]}
        />
        <Image
          source={{ uri }}
          style={{
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
            margin: 2,
          }}
        />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.purple, Colors.cyan]}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Text style={{ color: Colors.white, fontSize: size * 0.35, fontWeight: '700' }}>
        {initials}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({});
