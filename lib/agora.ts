// Web stub — react-native-agora is not supported on web
export const createAgoraRtcEngine = null;
export const RtcSurfaceView = null;
export const VideoSourceType = null;
export const ChannelProfileType = null;
export const ClientRoleType = null;
export const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '95df08b41b164f47a37f0ad9e34ce890';

export function getChannelName(id: string): string {
  return `linkerx_${id}`;
}
