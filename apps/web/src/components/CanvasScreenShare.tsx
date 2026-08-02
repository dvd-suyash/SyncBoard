import React, { useEffect, useRef, useState } from 'react';
import { useWebRTCStore } from '../store/webrtcStore';
import { useBoardStore } from '../store/boardStore';
import { MonitorOff, Monitor } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface CanvasScreenShareProps {
  el: any;
  isSelected: boolean;
  activeTool: string;
  isInteractive: boolean;
}

export function CanvasScreenShare({ el, isSelected, activeTool, isInteractive }: CanvasScreenShareProps) {
  const localStream = useWebRTCStore((s) => s.localStream);
  const remoteStreams = useWebRTCStore((s) => s.remoteStreams);
  const videoRef = useRef<HTMLVideoElement>(null);
  const socket = getSocket();
  const [isTimeout, setIsTimeout] = useState(false);

  const isLocal = el.authorId === socket.id;
  const stream = isLocal ? localStream : remoteStreams.get(el.peerId);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.error('Failed to autoplay video:', err));
    }
    
    if (!stream) {
      const timer = setTimeout(() => setIsTimeout(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setIsTimeout(false);
    }
  }, [stream]);

  const removeElement = () => {
    useBoardStore.getState().updateElement(el.id, { isDeleted: true });
  };

  return (
    <div 
      className={`absolute bg-slate-900 border-2 rounded-2xl overflow-hidden shadow-2xl group ${isSelected ? 'border-indigo-500 z-50' : 'border-slate-800'}`}
      style={{
        left: el.x,
        top: el.y,
        width: el.width || 800,
        height: el.height || 600,
        transform: `rotate(${el.rotation || 0}rad)`,
        pointerEvents: activeTool === 'select' && isInteractive ? 'auto' : 'none'
      }}
    >
      {stream ? (
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted={isLocal} 
          className="w-full h-full object-contain bg-black"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black/90 text-slate-500 space-y-4">
          <MonitorOff className="w-12 h-12 opacity-50" />
          <div className="text-sm font-medium">
            {isTimeout ? 'Stream offline or disconnected.' : 'Screen share connecting...'}
          </div>
          {isTimeout && (
            <button 
              onClick={removeElement}
              className="mt-2 px-3 py-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-md text-xs font-medium pointer-events-auto transition-colors"
            >
              Remove from board
            </button>
          )}
        </div>
      )}
      
      {/* Label */}
      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/50 flex items-center gap-2">
        <Monitor className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-200">
          {isLocal ? 'Your Screen' : 'Live Screen'}
        </span>
      </div>
    </div>
  );
}
