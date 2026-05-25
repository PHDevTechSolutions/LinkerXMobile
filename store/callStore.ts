import { create } from 'zustand';

type IncomingCallData = {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'video' | 'voice';
  offer: RTCSessionDescriptionInit;
};

type CallState = {
  incomingCall: IncomingCallData | null;
  setIncomingCall: (call: IncomingCallData | null) => void;
};

export const useCallStore = create<CallState>((set) => ({
  incomingCall: null,
  setIncomingCall: (call) => set({ incomingCall: call }),
}));
