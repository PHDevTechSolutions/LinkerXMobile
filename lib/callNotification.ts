import { Platform } from 'react-native';

/**
 * Requests browser notification permission on web.
 * Call this once on app startup (after user interaction).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Shows a browser system notification for an incoming call.
 * Works even when the tab is in the background or minimized.
 * The actual ringtone is handled by playCallSound() in sounds.ts.
 * Returns a cleanup function.
 */
export function showCallNotification(
  callerName: string,
  callType: 'video' | 'voice',
  onAccept: () => void,
  onDecline: () => void
): (() => void) | null {
  if (Platform.OS !== 'web') return null;
  if (typeof Notification === 'undefined') return null;
  if (Notification.permission !== 'granted') return null;

  const title = callType === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Voice Call';
  const body  = `${callerName} is calling you...`;

  let notif: Notification | null = null;
  try {
    notif = new Notification(title, {
      body,
      tag: 'incoming-call',       // replaces any previous call notification
      requireInteraction: true,   // stays until user interacts
      silent: true,               // we handle sound ourselves via call.mp3
    });

    notif.onclick = () => {
      window.focus();             // bring tab to front
      notif?.close();
      onAccept();
    };
  } catch (_) {}

  return () => {
    notif?.close();
  };
}

/**
 * Flashes the browser tab title to alert the user when tab is in background.
 * Returns a cleanup function that restores the original title.
 */
export function flashTabTitle(callerName: string): () => void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return () => {};
  const original = document.title;
  let show = true;
  const interval = setInterval(() => {
    document.title = show ? `📞 ${callerName} is calling...` : original;
    show = !show;
  }, 1000);
  return () => {
    clearInterval(interval);
    document.title = original;
  };
}
