import React from 'react';
import { View, Image, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

type Props = {
  uri?: string;
  name?: string;
  size?: number;
  style?: ViewStyle;
};

export default function Avatar({ uri, name, size = 40, style }: Props) {
  const C = useColors();
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (uri) {
    return (
      <View style={[{ width: size, height: size, borderRadius: size / 2 }, style]}>
        <LinearGradient
          colors={[C.purple, C.cyan]}
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: size / 2, padding: 2 }]}
        />
        <Image
          source={{ uri }}
          style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2, margin: 2 }}
        />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[C.purple, C.cyan]}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Text style={{ color: C.white, fontSize: size * 0.35, fontWeight: '700' }}>
        {initials}
      </Text>
    </LinearGradient>
  );
}
