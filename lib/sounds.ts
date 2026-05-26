import { Platform } from 'react-native';

// ─── Web: HTMLAudio-based player ─────────────────────────────────────────────

let messageAudio: HTMLAudioElement | null = null;
let callAudio: HTMLAudioElement | null = null;

function getAudio(src: string, existing: HTMLAudioElement | null): HTMLAudioElement | null {
  if (Platform.OS !== 'web' || typeof Audio === 'undefined') return null;
  if (existing) return existing;
  try {
    const audio = new Audio(src);
    audio.preload = 'auto';
    return audio;
  } catch (_) { return null; }
}

// ─── Native: expo-av ─────────────────────────────────────────────────────────

let avLoaded = false;
let Sound: any = null;

async function loadAv() {
  if (avLoaded) return;
  avLoaded = true;
  try {
    const av = await import('expo-av');
    Sound = av.Audio;
  } catch (_) {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Play the message notification sound (short ding).
 * Web: /message.mp3 (served from public/)
 * Native: bundled asset via expo-av
 */
export function playMessageSound() {
  if (Platform.OS === 'web') {
    messageAudio = getAudio('/message.mp3', messageAudio);
    if (!messageAudio) return;
    messageAudio.currentTime = 0;
    messageAudio.volume = 0.6;
    messageAudio.play().catch(() => {});
  } else {
    loadAv().then(() => {
      if (!Sound) return;
      Sound.Sound.createAsync(
        require('../public/message.mp3'),
        { shouldPlay: true, volume: 0.6 }
      ).catch(() => {});
    });
  }
}

/**
 * Play the call ringtone (loops until stopped).
 * Returns a stop function.
 */
export function playCallSound(): () => void {
  if (Platform.OS === 'web') {
    callAudio = getAudio('/call.mp3', callAudio);
    if (!callAudio) return () => {};
    callAudio.currentTime = 0;
    callAudio.volume = 0.8;
    callAudio.loop = true;
    callAudio.play().catch(() => {});
    return () => {
      if (callAudio) {
        callAudio.pause();
        callAudio.currentTime = 0;
        callAudio.loop = false;
      }
    };
  } else {
    let soundObj: any = null;
    loadAv().then(() => {
      if (!Sound) return;
      Sound.Sound.createAsync(
        require('../public/call.mp3'),
        { shouldPlay: true, isLooping: true, volume: 0.8 }
      ).then(({ sound }: any) => {
        soundObj = sound;
      }).catch(() => {});
    });
    return () => {
      if (soundObj) {
        soundObj.stopAsync().catch(() => {});
        soundObj.unloadAsync().catch(() => {});
      }
    };
  }
}
