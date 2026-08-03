import React, { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { usePathname } from 'next/navigation';
import { useBoardStore } from '../store/boardStore';
import { FastForward, ChevronLeft, ChevronRight, SkipForward, ListVideo, Loader2, Play, ChevronDown } from 'lucide-react';
import { getTvShowDetails, getTvSeason } from '../actions/tmdb';

interface GenericIframeProps {
  el: any;
  isSelected: boolean;
  activeTool: string;
  isInteractive: boolean;
}

function TvSidePanel({ tvId, currentSeason, currentEpisode, onChangeEpisode }: { tvId: string, currentSeason: number, currentEpisode: number, onChangeEpisode: (s: number, e: number) => void }) {
  const [details, setDetails] = useState<any>(null);
  const [seasonData, setSeasonData] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState(currentSeason);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    getTvShowDetails(tvId).then(data => {
      if (mounted) setDetails(data);
    }).catch(console.error);
    return () => { mounted = false; };
  }, [tvId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getTvSeason(tvId, selectedSeason).then(data => {
      if (mounted) {
        setSeasonData(data);
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [tvId, selectedSeason]);

  useEffect(() => {
    setSelectedSeason(currentSeason);
  }, [currentSeason]);

  return (
    <div className="absolute top-0 -right-[340px] w-[320px] h-[100%] bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-[60] pointer-events-auto transition-all duration-300">
      <div className="p-5 border-b border-slate-800 bg-slate-900 flex flex-col gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <ListVideo className="w-5 h-5" />
          </div>
          <h3 className="text-white font-bold text-base truncate">{details?.name || 'Loading...'}</h3>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between bg-slate-950 text-sm text-slate-200 border border-slate-700 hover:border-indigo-500 rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30"
          >
            <span className="font-medium">Season {selectedSeason}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {dropdownOpen && details && details.seasons && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setDropdownOpen(false)} 
              />
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-20 max-h-48 overflow-y-auto custom-scrollbar">
                {details.seasons.filter((s: any) => s.season_number > 0).map((s: any) => (
                  <button 
                    key={s.season_number} 
                    onClick={() => { setSelectedSeason(s.season_number); setDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex justify-between items-center ${
                      selectedSeason === s.season_number 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="font-medium">Season {s.season_number}</span>
                    <span className={`text-xs ${selectedSeason === s.season_number ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {s.episode_count} eps
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar relative bg-slate-900/50">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : seasonData?.episodes && seasonData.episodes.length > 0 ? (
          seasonData.episodes.map((ep: any) => {
            const isPlaying = currentSeason === ep.season_number && currentEpisode === ep.episode_number;
            return (
              <button
                key={ep.id}
                onClick={() => onChangeEpisode(ep.season_number, ep.episode_number)}
                className={`w-full flex gap-3 p-2 rounded-2xl text-left transition-all duration-300 group relative overflow-hidden ${
                  isPlaying 
                    ? 'bg-indigo-500/10 border border-indigo-500/50 shadow-inner shadow-indigo-500/10' 
                    : 'bg-transparent border border-transparent hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-28 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-800 relative shadow-sm">
                  {ep.still_path ? (
                    <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt={ep.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <ListVideo size={20} />
                    </div>
                  )}
                  {isPlaying && (
                    <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center backdrop-blur-[2px]">
                      <div className="bg-indigo-500 rounded-full p-1.5 shadow-lg shadow-indigo-900/50">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>
                  )}
                  {!isPlaying && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                      <Play className="w-6 h-6 text-white drop-shadow-lg" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-xs text-indigo-400 font-bold tracking-wider uppercase mb-1 flex items-center gap-2">
                    Episode {ep.episode_number}
                    {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                  </div>
                  <div className={`text-sm font-semibold truncate transition-colors duration-200 ${isPlaying ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                    {ep.name}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
            <ListVideo className="w-10 h-10 opacity-20" />
            <div className="text-sm font-medium">No episodes available</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function GenericIframe({ el, isSelected, activeTool, isInteractive }: GenericIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const socket = getSocket();
  const pathname = usePathname();
  const boardId = pathname.startsWith('/board/') ? pathname.split('/')[2] : null;
  const ignoreNextEvent = useRef(false);
  const [isBridgeConnected, setIsBridgeConnected] = useState(false);
  const lastKnownTime = useRef(0);
  const updateElement = useBoardStore((s) => s.updateElement);

  const tvMatch = el.url.match(/vidlink\.pro\/tv\/([^/]+)\/([^/]+)\/([^?]+)/);
  const isTvShow = !!tvMatch;
  const tvId = tvMatch ? tvMatch[1] : null;
  const currentSeason = tvMatch ? parseInt(tvMatch[2], 10) : 1;
  const currentEpisode = tvMatch ? parseInt(tvMatch[3], 10) : 1;

  useEffect(() => {
    if (!boardId || !socket.connected) return;

    const handleMediaSync = ({ elementId, state, time, userId }: any) => {
      if (elementId !== el.id) return;
      if (!iframeRef.current?.contentWindow) return;
      
      ignoreNextEvent.current = true;
      lastKnownTime.current = time;

      iframeRef.current.contentWindow.postMessage({
        type: 'SYNCBOARD_MEDIA_COMMAND',
        action: state === 'playing' ? 'play' : state === 'paused' ? 'pause' : 'seek',
        time
      }, '*');
      
      setTimeout(() => {
        ignoreNextEvent.current = false;
      }, 500);
    };

    socket.on('media-sync', handleMediaSync);

    return () => {
      socket.off('media-sync', handleMediaSync);
    };
  }, [boardId, el.id]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!boardId) return;

      if (!event.data || typeof event.data !== 'object') return;

      if (event.data?.type === 'SYNCBOARD_BRIDGE_READY') {
        setIsBridgeConnected(true);
      }

      if (event.data?.type === 'SYNCBOARD_MEDIA_EVENT') {
        if (ignoreNextEvent.current) return;
        
        const { action, time } = event.data;
        lastKnownTime.current = time;
        
        if (action === 'play') {
          socket.emit('media-sync', { boardId, elementId: el.id, state: 'playing', time });
        } else if (action === 'pause') {
          socket.emit('media-sync', { boardId, elementId: el.id, state: 'paused', time });
        } else if (action === 'seek') {
          socket.emit('media-sync', { boardId, elementId: el.id, state: 'seek', time });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [boardId, el.id]);

  const changeEpisodeAbsolute = (s: number, e: number) => {
    if (!isTvShow || !tvId) return;
    const newUrl = `https://vidlink.pro/tv/${tvId}/${s}/${e}?primaryColor=6366f1&autoplay=false`;
    updateElement(el.id, { url: newUrl });
  };

  return (
    <div 
      className={`absolute bg-slate-900 border-2 rounded-2xl overflow-visible shadow-2xl group ${isSelected ? 'border-indigo-500 z-50' : 'border-slate-800'}`}
      style={{
        left: el.x,
        top: el.y,
        width: el.width || 800,
        height: el.height || 600,
        transform: `rotate(${el.rotation || 0}rad)`,
        pointerEvents: activeTool === 'select' && isInteractive ? 'auto' : 'none'
      }}
    >
      <iframe 
        ref={iframeRef}
        src={el.url} 
        className="w-full h-full border-0 rounded-2xl bg-black" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allowFullScreen 
      />

      {isTvShow && (isSelected || activeTool === 'select') && (
        <TvSidePanel 
          tvId={tvId} 
          currentSeason={currentSeason} 
          currentEpisode={currentEpisode} 
          onChangeEpisode={changeEpisodeAbsolute} 
        />
      )}
    </div>
  );
}
