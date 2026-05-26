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
  const { incomingCall, setIncomingCall, setPendingOffer } = useCallStore();
  if (!incomingCall) return null;

  const handleAccept = () => {
    // Save the offer into the store BEFORE navigating.
    // By the time CallScreen mounts, the socket event is already gone —
    // so CallScreen reads the offer from the store instead.
    setPendingOffer({
      offer: incomingCall.offer,
      fromUserId: incomingCall.callerId,
      callId: incomingCall.callId,
    });

    // Clear the incoming call banner first
    setIncomingCall(null);

    // Navigate to call screen as callee
    router.push(
      `/call/${incomingCall.callerId}?type=${incomingCall.callType}&userName=${encodeURIComponent(
        incomingCall.callerName
      )}&incoming=true&callId=${incomingCall.callId}` as any
    );
  };

  const handleDecline = () => {
    const { token } = useAuthStore.getState();
    if (token) {
      const socket = getSocket(token);
      socket.emit('webrtc_end_call', {
        targetUserId: incomingCall.callerId,
        callId: incomingCall.callId,
      });
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

  // Listen for incoming calls globally and store them (including the offer)
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    const onIncomingCall = (data: any) => {
      console.log('📞 Incoming call received:', data);
      // data must include: callId, callerId, callerName, callerAvatar, callType, offer
      if (!data?.offer) {
        console.warn('⚠️ webrtc_incoming_call missing offer — ignoring');
        return;
      }
      setIncomingCall(data);
    };

    const joinAndListen = () => {
      console.log('🔌 Socket connected, joining user room:', socket.id);
      socket.emit('join_user_room');
      socket.on('webrtc_incoming_call', onIncomingCall);
    };

    if (socket.connected) {
      joinAndListen();
    } else {
      socket.on('connect', joinAndListen);
    }

    return () => {
      socket.off('connect', joinAndListen);
      socket.off('webrtc_incoming_call', onIncomingCall);
    };
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
