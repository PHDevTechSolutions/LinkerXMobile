import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/authStore';
import { useCallStore } from '@/store/callStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useActivityStore } from '@/store/activityStore';
import Toast from '@/components/Toast';
import IncomingCall from '@/components/IncomingCall';
import GlobalMusicPlayer from '@/components/MusicPlayer';
import { useToastStore } from '@/lib/toast';
import { getSocket } from '@/lib/socket';
import { useColors } from '@/hooks/useColors';
import { requestNotificationPermission, showCallNotification, flashTabTitle } from '@/lib/callNotification';
import { playMessageSound, playCallSound } from '@/lib/sounds';

function GlobalToast() {
  const { visible, message, type, hide } = useToastStore();
  return <Toast visible={visible} message={message} type={type} onHide={hide} />;
}

// Module-level ref so GlobalIncomingCall can stop alerts without prop drilling
let _stopCallAlerts: (() => void) | null = null;

function GlobalIncomingCall() {
  const { incomingCall, setIncomingCall, setPendingOffer } = useCallStore();
  if (!incomingCall) return null;

  const handleAccept = () => {
    _stopCallAlerts?.();
    setPendingOffer({
      offer: incomingCall.offer,
      fromUserId: incomingCall.callerId,
      callId: incomingCall.callId,
    });
    setIncomingCall(null);
    router.push(
      `/call/${incomingCall.callerId}?type=${incomingCall.callType}&userName=${encodeURIComponent(
        incomingCall.callerName
      )}&incoming=true&callId=${incomingCall.callId}` as any
    );
  };

  const handleDecline = () => {
    _stopCallAlerts?.();
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
  const { addNotification, incrementUnreadMessages } = useNotificationStore();
  const { setNowPlaying } = useActivityStore();
  const {
    notificationsEnabled, messageNotifications,
    followNotifications, commentNotifications,
  } = useSettingsStore();
  const theme = useSettingsStore((s) => s.theme);
  const C     = useColors();

  // Cleanup ref for browser call notification
  const callNotifCleanup = useRef<(() => void) | null>(null);
  const tabTitleCleanup  = useRef<(() => void) | null>(null);
  const callSoundStop    = useRef<(() => void) | null>(null);

  const stopCallAlerts = () => {
    callNotifCleanup.current?.();
    tabTitleCleanup.current?.();
    callSoundStop.current?.();
    callNotifCleanup.current = null;
    tabTitleCleanup.current  = null;
    callSoundStop.current    = null;
  };

  // Expose to GlobalIncomingCall
  _stopCallAlerts = stopCallAlerts;

  useEffect(() => { loadAuth(); }, []);

  // Request browser notification permission once on startup
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Listen for incoming calls + all notifications globally
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    const onIncomingCall = (data: any) => {
      console.log('📞 Incoming call received:', data);
      if (!data?.offer) {
        console.warn('⚠️ webrtc_incoming_call missing offer — ignoring');
        return;
      }
      setIncomingCall(data);

      // Start call ringtone
      callSoundStop.current = playCallSound();

      // Fire browser system notification + tab title flash
      const cleanup = showCallNotification(
        data.callerName,
        data.callType,
        () => {
          stopCallAlerts();
          useCallStore.getState().setPendingOffer({
            offer: data.offer,
            fromUserId: data.callerId,
            callId: data.callId,
          });
          useCallStore.getState().setIncomingCall(null);
          router.push(
            `/call/${data.callerId}?type=${data.callType}&userName=${encodeURIComponent(data.callerName)}&incoming=true&callId=${data.callId}` as any
          );
        },
        () => {
          stopCallAlerts();
          const { token: t } = useAuthStore.getState();
          if (t) {
            const s = getSocket(t);
            s.emit('webrtc_end_call', { targetUserId: data.callerId, callId: data.callId });
          }
          useCallStore.getState().setIncomingCall(null);
        }
      );
      callNotifCleanup.current = cleanup;
      tabTitleCleanup.current  = flashTabTitle(data.callerName);
    };

    const onNotification = (data: any) => {
      if (!notificationsEnabled) return;
      if (data.type === 'message' && !messageNotifications) return;
      if (data.type === 'follow'  && !followNotifications)  return;
      if (data.type === 'comment' && !commentNotifications) return;

      addNotification({
        type: data.type,
        title: data.title,
        body: data.body,
        fromUserId: data.fromUserId,
        fromUserName: data.fromUserName,
        fromUserAvatar: data.fromUserAvatar,
        targetId: data.targetId,
      });

      // Play message sound for incoming messages
      if (data.type === 'message' && messageNotifications) {
        playMessageSound();
      }

      if (data.type === 'message') incrementUnreadMessages();
    };

    const onNowPlaying = (data: any) => {
      setNowPlaying(data.userId, data.track || null);
    };

    const joinAndListen = () => {
      console.log('🔌 Socket connected, joining user room:', socket.id);
      socket.emit('join_user_room');
      socket.on('webrtc_incoming_call', onIncomingCall);
      socket.on('notification', onNotification);
      socket.on('user_now_playing', onNowPlaying);
    };

    if (socket.connected) {
      joinAndListen();
    } else {
      socket.on('connect', joinAndListen);
    }

    return () => {
      socket.off('connect', joinAndListen);
      socket.off('webrtc_incoming_call', onIncomingCall);
      socket.off('notification', onNotification);
      socket.off('user_now_playing', onNowPlaying);
    };
  }, [token, notificationsEnabled, messageNotifications, followNotifications, commentNotifications]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} backgroundColor={C.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="settings/change-password" />
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/help" />
        <Stack.Screen name="settings/about" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="new-chat" />
        <Stack.Screen name="new-group" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="call/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="post/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="profile/saved" />
        <Stack.Screen name="profile/links" />
        <Stack.Screen name="profile/files" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="bio/[userName]" />
        <Stack.Screen name="rss/index" />
      </Stack>
      <GlobalToast />
      <GlobalIncomingCall />
      <GlobalMusicPlayer />
    </GestureHandlerRootView>
  );
}
