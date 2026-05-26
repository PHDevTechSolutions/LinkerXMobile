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
 * Returns the Notification instance so it can be closed on accept/decline.
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

  const icon = 'https://res.cloudinary.com/dxnk3mexu/image/upload/v1/linkerx/icon.png';
  const title = callType === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Voice Call';
  const body  = `${callerName} is calling you...`;

  let notif: Notification | null = null;
  try {
    notif = new Notification(title, {
      body,
      icon,
      tag: 'incoming-call',       // replaces any previous call notification
      requireInteraction: true,   // stays until user interacts
      silent: false,
    });

    notif.onclick = () => {
      window.focus();             // bring tab to front
      notif?.close();
      onAccept();
    };

    notif.onclose = () => {};
  } catch (_) {}

  // Play a ringtone using Web Audio API
  let audioCtx: AudioContext | null = null;
  let ringInterval: ReturnType<typeof setInterval> | null = null;

  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playBeep = () => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 440;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.4);
    };

    playBeep();
    ringInterval = setInterval(playBeep, 1200);
  } catch (_) {}

  // Return cleanup function
  return () => {
    notif?.close();
    if (ringInterval) clearInterval(ringInterval);
    if (audioCtx) audioCtx.close().catch(() => {});
  };
}

/**
 * Shows a browser tab title flash to alert the user.
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
