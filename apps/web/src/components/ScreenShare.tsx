'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { Monitor, MonitorOff } from 'lucide-react';
import { toast } from 'sonner';
import { useWebRTCStore } from '../store/webrtcStore';
import { useBoardStore } from '../store/boardStore';
import { v4 as uuidv4 } from 'uuid';
import { screenToWorld } from '../lib/math';
import { AddElementCommand, commandManager } from '../lib/commands';

export function ScreenShare({ boardId }: { boardId: string | null }) {
  const localStream = useWebRTCStore(s => s.localStream);
  const setLocalStream = useWebRTCStore(s => s.setLocalStream);
  const addRemoteStream = useWebRTCStore(s => s.addRemoteStream);
  const removeRemoteStream = useWebRTCStore(s => s.removeRemoteStream);

  const peerRef = useRef<any>(null);
  const peerIdRef = useRef<string | null>(null);
  const callsRef = useRef<Map<string, any>>(new Map());
  const connsRef = useRef<Map<string, any>>(new Map());
  const socket = getSocket();

  useEffect(() => {
    import('peerjs').then(({ default: Peer }) => {
      const peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { 
              urls: 'turn:openrelay.metered.ca:80', 
              username: 'openrelayproject', 
              credential: 'openrelayproject' 
            },
            { 
              urls: 'turn:openrelay.metered.ca:443', 
              username: 'openrelayproject', 
              credential: 'openrelayproject' 
            },
            { 
              urls: 'turn:openrelay.metered.ca:443?transport=tcp', 
              username: 'openrelayproject', 
              credential: 'openrelayproject' 
            }
          ]
        }
      });
      
      peer.on('open', (id) => {
        peerIdRef.current = id;
      });

      // Sharer receives data connection from viewer
      peer.on('connection', (conn) => {
        conn.on('data', (data: any) => {
          if (data.type === 'request-call') {
            const stream = useWebRTCStore.getState().localStream;
            if (stream) {
              const call = peer.call(data.viewerId, stream);
              callsRef.current.set(data.viewerId, call);
            }
          }
        });
      });

      // Viewer receives call from sharer
      peer.on('call', (call) => {
        // We are the viewer, so we just answer without sending a stream
        call.answer();
        
        call.on('stream', (remoteStream: MediaStream) => {
          // The peer ID of the caller is call.peer (which is the sharer's peerId)
          addRemoteStream(call.peer, remoteStream);
        });

        call.on('close', () => {
          removeRemoteStream(call.peer);
        });
        
        call.on('error', () => {
          removeRemoteStream(call.peer);
        });
      });
      
      peer.on('error', (err) => {
        console.error('PeerJS Error:', err);
      });

      peerRef.current = peer;
    });

    return () => {
      stopScreenShare();
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  // Poll for new screenshare elements to connect to
  useEffect(() => {
    if (!boardId) return;

    const interval = setInterval(() => {
      if (!peerIdRef.current || !peerRef.current) return;

      const state = useBoardStore.getState();
      const screenshares = Object.values(state.elements).filter(
        (el: any) => el.type === 'screenshare' && !el.isDeleted
      );

      screenshares.forEach((el: any) => {
        const targetPeerId = el.peerId;
        // Don't connect to ourselves or people we've already connected to
        if (!targetPeerId || targetPeerId === peerIdRef.current || connsRef.current.has(targetPeerId)) {
          return;
        }

        // Viewer opens data connection to Sharer to say "call me"
        const conn = peerRef.current.connect(targetPeerId);
        if (!conn) return;

        connsRef.current.set(targetPeerId, conn);
        
        conn.on('open', () => {
          conn.send({ type: 'request-call', viewerId: peerIdRef.current });
        });

        conn.on('close', () => {
          connsRef.current.delete(targetPeerId);
        });
        
        conn.on('error', () => {
          connsRef.current.delete(targetPeerId);
        });
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [boardId]);

  const startScreenShare = async () => {
    if (!boardId) return;
    if (!peerIdRef.current) {
      toast.error('Connection not ready. Please try again.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: true 
      });
      
      stream.getVideoTracks()[0].onended = () => stopScreenShare();
      setLocalStream(stream);

      // Spawn on Canvas
      const state = useBoardStore.getState();
      const worldPt = screenToWorld({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, state.camera);
      const newEl = {
        id: uuidv4(),
        type: 'screenshare',
        version: 1,
        authorId: socket.id,
        peerId: peerIdRef.current, // Save PeerJS ID in the element!
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
        x: worldPt.x - 400,
        y: worldPt.y - 300,
        width: 800,
        height: 600,
        style: {}
      };
      
      state.addElement(newEl as any);
      commandManager.executeCommand(new AddElementCommand(newEl as any));
      
    } catch (e) {
      toast.error('Could not start screen share');
    }
  };

  const stopScreenShare = () => {
    if (useWebRTCStore.getState().localStream) {
      useWebRTCStore.getState().localStream!.getTracks().forEach(t => t.stop());
      setLocalStream(null);

      // Close all active calls we made
      callsRef.current.forEach(call => call.close());
      callsRef.current.clear();

      // Remove local screenshare elements
      const state = useBoardStore.getState();
      const elementsToDelete = Object.values(state.elements).filter(
        (el: any) => el.type === 'screenshare' && el.peerId === peerIdRef.current
      ).map((el: any) => el.id);
      
      elementsToDelete.forEach(id => {
        state.updateElement(id, { isDeleted: true });
      });
    }
  };

  if (!boardId) return null;

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
      <button
        onClick={useWebRTCStore.getState().localStream ? stopScreenShare : startScreenShare}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium shadow-sm transition-all active:scale-95 border backdrop-blur-md ${useWebRTCStore.getState().localStream ? 'bg-rose-500/90 hover:bg-rose-600 border-rose-500 text-white' : 'bg-slate-800/70 hover:bg-slate-800/90 border-slate-700/50 text-slate-200'}`}
      >
        {useWebRTCStore.getState().localStream ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
        <span>{useWebRTCStore.getState().localStream ? 'Stop Sharing' : 'Share Screen'}</span>
      </button>
    </div>
  );
}
