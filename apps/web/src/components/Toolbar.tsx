'use client';

import { useState, useEffect } from 'react';
import { useBoardStore, ToolType } from '../store/boardStore';
import { screenToWorld } from '../lib/math';
import { 
  MousePointer2, 
  Square, 
  Circle, 
  Minus, 
  MoveUpRight, 
  Type, 
  PenTool,
  Undo2,
  Redo2,
  Eraser,
  HelpCircle,
  StickyNote,
  Globe,
  Film,
  Image as ImageIcon,
  Search
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { commandManager, AddElementCommand } from '../lib/commands';
import { ShortcutsModal } from './ui/ShortcutsModal';
import { MovieSearchModal } from './ui/MovieSearchModal';

const TOOLS: { id: ToolType; icon: React.ElementType; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'freehand', icon: PenTool, label: 'Draw' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'arrow', icon: MoveUpRight, label: 'Arrow' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
];

export function Toolbar() {
  const activeTool = useBoardStore((s) => s.activeTool);
  const setActiveTool = useBoardStore((s) => s.setActiveTool);
  const isLandingDismissed = useBoardStore((s) => s.isLandingDismissed);
  const isSharing = useBoardStore((s) => s.isSharing);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMediaMenuOpen, setIsMediaMenuOpen] = useState(false);
  const [isMovieSearchOpen, setIsMovieSearchOpen] = useState(false);
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
           const img = new Image();
           img.onload = () => {
              const state = useBoardStore.getState();
              const worldPt = screenToWorld({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, state.camera);
              const newImage = {
                id: uuidv4(),
                type: 'image' as const,
                version: 1,
                authorId: 'local',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isDeleted: false,
                x: worldPt.x - (img.naturalWidth / 2),
                y: worldPt.y - (img.naturalHeight / 2),
                width: img.naturalWidth,
                height: img.naturalHeight,
                dataUrl: ev.target!.result as string,
                style: {}
              };
             state.addElement(newImage as any);
             commandManager.pushCommand(new AddElementCommand(newImage as any));
           };
           img.src = ev.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    e.target.value = '';
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?') {
        setIsHelpOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isVisible = isLandingDismissed && !isSharing;

  return (
    <>
      <div
        className="fixed bottom-4 sm:bottom-6 left-1/2 z-50 flex items-center gap-0.5 sm:gap-1 rounded-2xl border border-slate-700/50 bg-slate-800/80 p-1.5 sm:p-2 shadow-2xl backdrop-blur-xl transition-all duration-700 ease-out max-w-[95vw] overflow-x-auto scrollbar-hide"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: `translate(-50%, ${isVisible ? '0' : '24px'})`,
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      >
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
              className={`p-2 sm:p-3 rounded-xl transition-all duration-200 flex-shrink-0 group relative ${
                isActive 
                  ? 'bg-teal-600 text-white shadow-md scale-105' 
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-100'
              }`}
            >
              <Icon className="w-5 h-5 sm:w-5 sm:h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 sm:group-hover:opacity-100 pointer-events-none transition-opacity">
                {tool.label}
              </span>
            </button>
          );
        })}

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setIsMediaMenuOpen(!isMediaMenuOpen)}
            title="Media & Movies"
            className={`p-2 sm:p-3 rounded-xl transition-all duration-200 group relative ${
              isMediaMenuOpen || isMovieSearchOpen
                ? 'bg-indigo-600 text-white shadow-md scale-105' 
                : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-100'
            }`}
          >
            <Film className="w-5 h-5 sm:w-5 sm:h-5" strokeWidth={isMediaMenuOpen || isMovieSearchOpen ? 2.5 : 2} />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 sm:group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
              Media & Movies
            </span>
          </button>
        </div>
        
        <div className="w-px h-6 sm:h-8 bg-slate-700 mx-1 sm:mx-2 flex-shrink-0" />
        
        <button 
          onClick={() => commandManager.undo()}
          className="p-2 sm:p-3 rounded-xl text-slate-400 hover:bg-slate-700/50 hover:text-slate-100 transition-colors flex-shrink-0"
          title="Undo"
        >
          <Undo2 className="w-5 h-5 sm:w-5 sm:h-5" />
        </button>
        <button 
          onClick={() => commandManager.redo()}
          className="p-2 sm:p-3 rounded-xl text-slate-400 hover:bg-slate-700/50 hover:text-slate-100 transition-colors flex-shrink-0"
          title="Redo"
        >
          <Redo2 className="w-5 h-5 sm:w-5 sm:h-5" />
        </button>

        <div className="w-px h-6 sm:h-8 bg-slate-700 mx-1 sm:mx-2 flex-shrink-0" />

        <button 
          onClick={() => setIsHelpOpen(true)}
          className="p-2 sm:p-3 rounded-xl text-slate-400 hover:bg-slate-700/50 hover:text-slate-100 transition-colors flex-shrink-0"
          title="Shortcuts (?)"
        >
          <HelpCircle className="w-5 h-5 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Render the dropdown OUTSIDE the overflow-x-auto container so it doesn't get clipped */}
      {isMediaMenuOpen && isVisible && (
        <div className="fixed bottom-[4.5rem] sm:bottom-[5rem] left-1/2 translate-x-12 sm:translate-x-20 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col z-50">
          <label className="px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2 cursor-pointer transition-colors">
            <ImageIcon className="w-4 h-4 text-indigo-400" />
            Upload Image
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { setIsMediaMenuOpen(false); handleFileUpload(e); }} />
          </label>
          <div className="h-px bg-slate-700 w-full" />
          <button
            onClick={() => {
              setIsMediaMenuOpen(false);
              setIsMovieSearchOpen(true);
            }}
            className="px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4 text-rose-400" />
            Search Movies
          </button>
          <div className="h-px bg-slate-700 w-full" />
          <button
            onClick={() => {
              setIsMediaMenuOpen(false);
              const url = window.prompt("Enter a website or YouTube URL to embed:");
              if (!url) return;
              
              let embedUrl = url;
              let posterUrl = undefined;
              let title = 'Web Embed';
              
              if (url.includes('youtube.com/watch?v=') || url.includes('youtu.be/')) {
                const videoId = url.includes('youtube.com') 
                  ? new URLSearchParams(new URL(url).search).get('v') 
                  : url.split('youtu.be/')[1]?.split('?')[0];
                if (videoId) {
                  embedUrl = `https://www.youtube.com/embed/${videoId}`;
                  posterUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                  title = 'YouTube Video';
                }
              }

              const state = useBoardStore.getState();
              const worldPt = screenToWorld({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, state.camera);
              
              const iframeEl = {
                id: uuidv4(),
                type: 'iframe' as const,
                version: 1,
                authorId: 'local',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isDeleted: false,
                x: worldPt.x - 400,
                y: worldPt.y - 225,
                width: 800,
                height: 450,
                url: embedUrl,
                title: title,
                poster: posterUrl,
                style: {}
              };

              state.addElement(iframeEl as any);
              commandManager.pushCommand(new AddElementCommand(iframeEl as any));
            }}
            className="px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2 transition-colors"
          >
            <Globe className="w-4 h-4 text-teal-400" />
            Embed Web Link
          </button>
        </div>
      )}

      <ShortcutsModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <MovieSearchModal isOpen={isMovieSearchOpen} onClose={() => setIsMovieSearchOpen(false)} />
    </>
  );
}
