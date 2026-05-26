import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.text}>Post {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: 20, paddingTop: 60 },
  back: { marginBottom: 20 },
  text: { color: Colors.textPrimary, fontSize: 16 },
});
