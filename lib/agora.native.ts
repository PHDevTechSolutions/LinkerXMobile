// react-native-agora v4 exports
export {
  createAgoraRtcEngine,
  RtcSurfaceView,
  VideoSourceType,
  ChannelProfileType,
  ClientRoleType,
} from 'react-native-agora';

export const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '95df08b41b164f47a37f0ad9e34ce890';

export function getChannelName(id: string): string {
  return `linkerx_${id}`;
}
