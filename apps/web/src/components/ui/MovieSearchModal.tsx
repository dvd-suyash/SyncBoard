import React, { useState, useEffect } from 'react';
import { Search, X, Clapperboard, Tv, Loader2, Key } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { commandManager, AddElementCommand } from '../../lib/commands';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { searchMovies } from '../../actions/tmdb';
import { screenToWorld } from '../../lib/math';

interface MovieSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MovieSearchModal({ isOpen, onClose }: MovieSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const data = await searchMovies(query);
      setResults(data);
    } catch (e) {
      toast.error('Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const spawnMovie = (item: any) => {
    const state = useBoardStore.getState();
    const isTv = item.media_type === 'tv';
    const url = isTv 
      ? `https://vidlink.pro/tv/${item.id}/1/1?primaryColor=6366f1&autoplay=false` 
      : `https://vidlink.pro/movie/${item.id}?primaryColor=6366f1&autoplay=false`;

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
      y: worldPt.y - 300,
      width: 800,
      height: 600,
      url,
      title: item.title || item.name,
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
      style: {}
    };

    state.addElement(iframeEl as any);
    commandManager.pushCommand(new AddElementCommand(iframeEl as any));
    onClose();
    toast.success(`Spawned ${item.title || item.name}!`, {
      description: 'Double click the video player to access playback controls (Play, Pause, etc).'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Clapperboard className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-100">Media Library</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for movies, TV shows..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-14 pr-6 py-4 text-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  autoFocus
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
                <button type="submit" className="hidden" />
              </form>

              {isSearching ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {results.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => spawnMovie(item)}
                      className="group relative rounded-xl overflow-hidden bg-slate-800 aspect-[2/3] cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                    >
                      {item.poster_path ? (
                        <img 
                          src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} 
                          alt={item.title || item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                          {item.media_type === 'tv' ? <Tv className="w-8 h-8 mb-2 opacity-50" /> : <Clapperboard className="w-8 h-8 mb-2 opacity-50" />}
                          <span className="text-sm font-medium">{item.title || item.name}</span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">{item.media_type}</span>
                        <h4 className="text-white font-bold leading-tight line-clamp-2">{item.title || item.name}</h4>
                        {item.release_date || item.first_air_date ? (
                          <span className="text-slate-300 text-xs mt-1">{(item.release_date || item.first_air_date).split('-')[0]}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : query && !isSearching ? (
                <div className="text-center text-slate-500 py-20">
                  No results found for "{query}"
                </div>
              ) : (
                <div className="text-center text-slate-500 py-20">
                  Search for a movie or TV show to embed
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
