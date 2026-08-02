import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { getSocket } from '@/lib/socket';

interface SyncedYouTubeProps {
  el: any;
  boardId: string | null;
  isSelected: boolean;
  activeTool: string;
  isInteractive: boolean;
}

export function SyncedYouTube({ el, boardId, isSelected, activeTool, isInteractive }: SyncedYouTubeProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const socket = getSocket();
  const ignoreNextEvent = useRef(false);

  // Extract video ID from URL
  const videoId = el.url.split('/embed/')[1]?.split('?')[0];

  useEffect(() => {
    if (!boardId || !socket.connected) return;

    const handleMediaSync = ({ elementId, state, time, userId }: any) => {
      if (elementId !== el.id) return;
      if (!playerRef.current) return;
      
      const player = playerRef.current;
      ignoreNextEvent.current = true;

      // Sync time if difference is greater than 2 seconds
      const currentTime = player.getCurrentTime() || 0;
      if (Math.abs(currentTime - time) > 2) {
        player.seekTo(time, true);
      }

      if (state === 'playing') {
        player.playVideo();
        setIsPlaying(true);
      } else if (state === 'paused') {
        player.pauseVideo();
        setIsPlaying(false);
      }
      
      setTimeout(() => {
        ignoreNextEvent.current = false;
      }, 500);
    };

    socket.on('media-sync', handleMediaSync);

    return () => {
      socket.off('media-sync', handleMediaSync);
    };
  }, [boardId, el.id]);

  const onStateChange = (event: YouTubeEvent) => {
    if (ignoreNextEvent.current || !boardId) return;

    const player = event.target;
    const time = player.getCurrentTime();
    
    // 1 is PLAYING, 2 is PAUSED, 3 is BUFFERING
    if (event.data === 1) {
      setIsPlaying(true);
      socket.emit('media-sync', { boardId, elementId: el.id, state: 'playing', time });
    } else if (event.data === 2) {
      setIsPlaying(false);
      socket.emit('media-sync', { boardId, elementId: el.id, state: 'paused', time });
    } else if (event.data === 3) {
      // Buffering occurs when a user scrubs the timeline
      socket.emit('media-sync', { boardId, elementId: el.id, state: 'seek', time });
    }
  };

  const onReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
  };

  if (!videoId) return null;

  return (
    <div 
      className={`absolute bg-slate-900 border-2 rounded-xl overflow-hidden shadow-2xl ${isSelected ? 'border-teal-500' : 'border-slate-700'}`}
      style={{
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        transform: `rotate(${el.rotation || 0}rad)`,
        pointerEvents: activeTool === 'select' && isInteractive ? 'auto' : 'none'
      }}
    >
      <YouTube
        videoId={videoId}
        onReady={onReady}
        onStateChange={onStateChange}
        opts={{
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0
          }
        }}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
