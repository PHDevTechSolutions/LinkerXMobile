import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';

export default function Index() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.purple} size="large" />
      </View>
    );
  }

  return <Redirect href={user ? '/(tabs)/feed' : '/(auth)/login'} />;
}
