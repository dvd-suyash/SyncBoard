import { create } from 'zustand';

interface WebRTCStore {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  setLocalStream: (stream: MediaStream | null) => void;
  addRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
}

export const useWebRTCStore = create<WebRTCStore>((set) => ({
  localStream: null,
  remoteStreams: new Map(),
  setLocalStream: (stream) => set({ localStream: stream }),
  addRemoteStream: (userId, stream) => set((state) => {
    const newMap = new Map(state.remoteStreams);
    newMap.set(userId, stream);
    return { remoteStreams: newMap };
  }),
  removeRemoteStream: (userId) => set((state) => {
    const newMap = new Map(state.remoteStreams);
    newMap.delete(userId);
    return { remoteStreams: newMap };
  }),
}));
