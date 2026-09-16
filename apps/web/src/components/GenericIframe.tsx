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


function MediaSidePanel({ mediaId, isTvShow, currentSeason, currentEpisode, currentServer, onChangeEpisode, onChangeServer }: { mediaId: string, isTvShow: boolean, currentSeason: number, currentEpisode: number, currentServer: string, onChangeEpisode: (s: number, e: number) => void, onChangeServer: (s: string) => void }) {
  const [details, setDetails] = useState<any>(null);
  const [seasonData, setSeasonData] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState(currentSeason);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isTvShow) return;
    let mounted = true;
    getTvShowDetails(mediaId).then(data => {
      if (mounted) setDetails(data);
    }).catch(console.error);
    return () => { mounted = false; };
  }, [mediaId, isTvShow]);

  useEffect(() => {
    if (!isTvShow) return;
    let mounted = true;
    setLoading(true);
    getTvSeason(mediaId, selectedSeason).then(data => {
      if (mounted) {
        setSeasonData(data);
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [mediaId, selectedSeason, isTvShow]);

  useEffect(() => {
    if (!isTvShow) return;
    setSelectedSeason(currentSeason);
  }, [currentSeason, isTvShow]);

  return (
    <div className="absolute top-0 -right-[340px] w-[320px] h-[100%] bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-[60] pointer-events-auto transition-all duration-300">
      <div className="p-5 border-b border-slate-800 bg-slate-900 flex flex-col gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <ListVideo className="w-5 h-5" />
          </div>
          <h3 className="text-white font-bold text-base truncate">{isTvShow ? (details?.name || 'Loading...') : 'Media Options'}</h3>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-400 font-medium">Streaming Server</label>
          <select 
            value={currentServer}
            onChange={(e) => onChangeServer(e.target.value)}
            className="w-full bg-slate-950 text-sm text-slate-200 border border-slate-700 hover:border-indigo-500 rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="vidsrc">Server 1 (VidSrc Pro)</option>
            <option value="embedsu">Server 2 (Embed.su)</option>
            <option value="autoembed">Server 3 (AutoEmbed)</option>
            <option value="vidlink">Server 4 (VidLink)</option>
          </select>
        </div>
        
        {isTvShow && (
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
        )}
      </div>

      {isTvShow && (
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
      )}
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

  let isTvShow = false;
  let mediaId = null;
  let currentSeason = 1;
  let currentEpisode = 1;
  let currentServer = 'vidlink';

  if (el.url.includes('vidlink.pro/tv/')) {
    const m = el.url.match(/vidlink\.pro\/tv\/([^/]+)\/([^/]+)\/([^?]+)/);
    if (m) { isTvShow = true; mediaId = m[1]; currentSeason = parseInt(m[2]); currentEpisode = parseInt(m[3]); currentServer = 'vidlink'; }
  } else if (el.url.includes('vidsrc.pro/embed/tv/')) {
    const m = el.url.match(/vidsrc\.pro\/embed\/tv\/([^/]+)\/([^/]+)/);
    if (m) { isTvShow = true; mediaId = m[1]; currentSeason = parseInt(m[2]); currentEpisode = parseInt(m[3] || "1"); currentServer = 'vidsrc'; }
  } else if (el.url.includes('embed.su/embed/tv/')) {
    const m = el.url.match(/embed\.su\/embed\/tv\/([^/]+)\/([^/]+)\/([^?]+)/);
    if (m) { isTvShow = true; mediaId = m[1]; currentSeason = parseInt(m[2]); currentEpisode = parseInt(m[3]); currentServer = 'embedsu'; }
  } else if (el.url.includes('autoembed.cc/embed/player.php') && el.url.includes('s=')) {
    const idM = el.url.match(/id=([^&]+)/);
    const sM = el.url.match(/s=([^&]+)/);
    const eM = el.url.match(/e=([^&]+)/);
    if (idM && sM && eM) { isTvShow = true; mediaId = idM[1]; currentSeason = parseInt(sM[1]); currentEpisode = parseInt(eM[1]); currentServer = 'autoembed'; }
  } else {
    if (el.url.includes('vidlink.pro/movie/')) {
      const m = el.url.match(/vidlink\.pro\/movie\/([^?]+)/);
      if (m) { mediaId = m[1]; currentServer = 'vidlink'; }
    } else if (el.url.includes('vidsrc.pro/embed/movie/')) {
      const m = el.url.match(/vidsrc\.pro\/embed\/movie\/([^?]+)/);
      if (m) { mediaId = m[1]; currentServer = 'vidsrc'; }
    } else if (el.url.includes('embed.su/embed/movie/')) {
      const m = el.url.match(/embed\.su\/embed\/movie\/([^?]+)/);
      if (m) { mediaId = m[1]; currentServer = 'embedsu'; }
    } else if (el.url.includes('autoembed.cc/embed/player.php')) {
      const m = el.url.match(/id=([^&]+)/);
      if (m) { mediaId = m[1]; currentServer = 'autoembed'; }
    }
  }
  
  const isMedia = !!mediaId;


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
    if (!isTvShow || !mediaId) return;
    let newUrl = '';
    if (currentServer === 'vidsrc') newUrl = `https://vidsrc.pro/embed/tv/${mediaId}/${s}/${e}`;
    else if (currentServer === 'embedsu') newUrl = `https://embed.su/embed/tv/${mediaId}/${s}/${e}`;
    else if (currentServer === 'autoembed') newUrl = `https://autoembed.cc/embed/player.php?id=${mediaId}&s=${s}&e=${e}`;
    else newUrl = `https://vidlink.pro/tv/${mediaId}/${s}/${e}?primaryColor=6366f1&autoplay=false`;
    updateElement(el.id, { url: newUrl });
  };

  const changeServer = (newServer: string) => {
    if (!mediaId) return;
    let newUrl = '';
    if (isTvShow) {
      if (newServer === 'vidsrc') newUrl = `https://vidsrc.pro/embed/tv/${mediaId}/${currentSeason}/${currentEpisode}`;
      else if (newServer === 'embedsu') newUrl = `https://embed.su/embed/tv/${mediaId}/${currentSeason}/${currentEpisode}`;
      else if (newServer === 'autoembed') newUrl = `https://autoembed.cc/embed/player.php?id=${mediaId}&s=${currentSeason}&e=${currentEpisode}`;
      else newUrl = `https://vidlink.pro/tv/${mediaId}/${currentSeason}/${currentEpisode}?primaryColor=6366f1&autoplay=false`;
    } else {
      if (newServer === 'vidsrc') newUrl = `https://vidsrc.pro/embed/movie/${mediaId}`;
      else if (newServer === 'embedsu') newUrl = `https://embed.su/embed/movie/${mediaId}`;
      else if (newServer === 'autoembed') newUrl = `https://autoembed.cc/embed/player.php?id=${mediaId}`;
      else newUrl = `https://vidlink.pro/movie/${mediaId}?primaryColor=6366f1&autoplay=false`;
    }
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
        allowFullScreen 
      />

      {isMedia && (isSelected || activeTool === 'select') && (
        <MediaSidePanel 
          mediaId={mediaId} 
          isTvShow={isTvShow}
          currentSeason={currentSeason} 
          currentEpisode={currentEpisode} 
          currentServer={currentServer}
          onChangeEpisode={changeEpisodeAbsolute} 
          onChangeServer={changeServer}
        />
      )}
    </div>
  );
}
