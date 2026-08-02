'use client';

import React from 'react';
import { useBoardStore } from '../store/boardStore';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

export function ZoomControls() {
  const camera = useBoardStore(s => s.camera);
  const setCamera = useBoardStore(s => s.setCamera);
  const isLandingDismissed = useBoardStore(s => s.isLandingDismissed);
  const isSharing = useBoardStore(s => s.isSharing);

  if (!isLandingDismissed || isSharing) return null;

  const handleZoomIn = () => {
    setCamera(prev => ({ ...prev, zoom: Math.min(5, prev.zoom * 1.2) }));
  };

  const handleZoomOut = () => {
    setCamera(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }));
  };

  const handleResetZoom = () => {
    setCamera(prev => ({ ...prev, zoom: 1 }));
  };

  return (
    <div className="absolute bottom-6 right-6 flex items-center gap-1 bg-slate-800/80 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-slate-700/50 z-40 transition-all">
      <button 
        onClick={handleZoomOut}
        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-slate-100 transition-colors"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      
      <button 
        onClick={handleResetZoom}
        className="px-2 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors min-w-[3.5rem] text-center"
        title="Reset Zoom"
      >
        {Math.round(camera.zoom * 100)}%
      </button>

      <button 
        onClick={handleZoomIn}
        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-slate-100 transition-colors"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  );
}
