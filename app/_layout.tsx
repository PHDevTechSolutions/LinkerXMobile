import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/authStore';
import { useCallStore } from '@/store/callStore';
import { Colors } from '@/constants/Colors';
import Toast from '@/components/Toast';
import IncomingCall from '@/components/IncomingCall';
import { useToastStore } from '@/lib/toast';
import { getSocket } from '@/lib/socket';

function GlobalToast() {
  const { visible, message, type, hide } = useToastStore();
  return <Toast visible={visible} message={message} type={type} onHide={hide} />;
}

function GlobalIncomingCall() {
  const { incomingCall, setIncomingCall } = useCallStore();
  if (!incomingCall) return null;

  const handleAccept = () => {
    setIncomingCall(null);
    router.push(`/call/${incomingCall.callerId}?type=${incomingCall.callType}&userName=${encodeURIComponent(incomingCall.callerName)}&incoming=true&callId=${incomingCall.callId}` as any);
  };

  const handleDecline = () => {
    const { token } = useAuthStore.getState();
    if (token) {
      const socket = getSocket(token);
      socket.emit('webrtc_end_call', { targetUserId: incomingCall.callerId, callId: incomingCall.callId });
    }
    setIncomingCall(null);
  };

  return (
    <IncomingCall
      callerName={incomingCall.callerName}
      callerAvatar={incomingCall.callerAvatar}
      callType={incomingCall.callType}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
}

export default function RootLayout() {
  const loadAuth = useAuthStore((s) => s.loadAuth);
  const token    = useAuthStore((s) => s.token);
  const { setIncomingCall } = useCallStore();

  useEffect(() => { loadAuth(); }, []);

  // Listen for incoming calls globally
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    socket.emit('join_user_room');

    socket.on('webrtc_incoming_call', (data: any) => {
      setIncomingCall(data);
    });

    return () => { socket.off('webrtc_incoming_call'); };
  }, [token]);

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
        <Stack.Screen name="chat/[id]" />
      </Stack>
      <GlobalToast />
      <GlobalIncomingCall />
    </GestureHandlerRootView>
  );
}
