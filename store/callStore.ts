import { create } from 'zustand';

export type IncomingCallData = {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'video' | 'voice';
  offer: RTCSessionDescriptionInit; // always required — server must send this
};

export type PendingOffer = {
  offer: RTCSessionDescriptionInit;
  fromUserId: string;
  callId: string;
} | null;

type CallState = {
  incomingCall: IncomingCallData | null;
  setIncomingCall: (call: IncomingCallData | null) => void;

  // Stores the WebRTC offer before CallScreen mounts so it isn't lost
  pendingOffer: PendingOffer;
  setPendingOffer: (offer: PendingOffer) => void;
};

export const useCallStore = create<CallState>((set) => ({
  incomingCall: null,
  setIncomingCall: (call) => set({ incomingCall: call }),

  pendingOffer: null,
  setPendingOffer: (offer) => set({ pendingOffer: offer }),
}));
