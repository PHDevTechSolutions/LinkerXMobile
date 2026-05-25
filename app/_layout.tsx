import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/Colors';
import Toast from '@/components/Toast';
import { useToastStore } from '@/lib/toast';

function GlobalToast() {
  const { visible, message, type, hide } = useToastStore();
  return <Toast visible={visible} message={message} type={type} onHide={hide} />;
}

export default function RootLayout() {
  const loadAuth = useAuthStore((s) => s.loadAuth);

  useEffect(() => {
    loadAuth();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar style="light" backgroundColor={Colors.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="new-chat" />
        <Stack.Screen name="new-group" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="call/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="post/[id]" options={{ presentation: 'modal' }} />
      </Stack>
      <GlobalToast />
    </GestureHandlerRootView>
  );
}
