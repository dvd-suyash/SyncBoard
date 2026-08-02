'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ChevronLeft, LayoutDashboard, Plus, Clock, Trash2, Edit2, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { deleteBoard, renameBoard } from '@/actions/board';
import { toast } from 'sonner';

export function DashboardClient({ boards, user }: { boards: any[], user: any }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [localBoards, setLocalBoards] = useState(boards);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this board?')) return;
    try {
      await deleteBoard(id);
      setLocalBoards(prev => prev.filter(b => b.id !== id));
      toast.success('Board deleted');
    } catch (e) {
      toast.error('Failed to delete board');
    }
  };

  const startRename = (e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    setRenamingId(id);
    setNewName(currentName);
  };

  const handleRename = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!newName.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await renameBoard(id, newName);
      setLocalBoards(prev => prev.map(b => b.id === id ? { ...b, name: newName } : b));
      setRenamingId(null);
      toast.success('Board renamed');
    } catch (e) {
      toast.error('Failed to rename board');
    }
  };
  
  useEffect(() => {
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll('.board-card');
      if (cards.length > 0) {
        gsap.fromTo(cards, 
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
        );
      }
      
      gsap.fromTo('.dashboard-header',
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      );
    }
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30 font-sans p-8 md:p-16 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        <header className="dashboard-header flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')}
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                <LayoutDashboard className="w-8 h-8 text-indigo-400" />
                My Boards
              </h1>
              <p className="text-slate-400 mt-1">Welcome back, {user.name?.split(' ')[0]}</p>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Board
          </button>
        </header>

        <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {localBoards.length === 0 ? (
            <div className="board-card col-span-full py-20 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
              <LayoutDashboard className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-xl font-semibold text-slate-300">No boards yet</p>
              <p className="mt-2 text-sm">Create your first board to get started!</p>
            </div>
          ) : (
            localBoards.map((board) => (
              <div 
                key={board.id}
                onClick={() => {
                  if (renamingId !== board.id) {
                    router.push(`/board/${board.id}`);
                  }
                }}
                className={`board-card group relative h-48 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col transition-all shadow-xl ${renamingId === board.id ? 'border-indigo-500 bg-slate-800/80' : 'cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/80 hover:-translate-y-1'}`}
              >
                {/* Actions on hover */}
                {renamingId !== board.id && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => startRename(e, board.id, board.name)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, board.id)}
                      className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-full transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex-1 mt-2">
                  {renamingId === board.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(e as any, board.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        autoFocus
                        className="w-full bg-slate-950 border border-indigo-500 rounded-lg px-3 py-1 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                      <button onClick={(e) => handleRename(e, board.id)} className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setRenamingId(null)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <h3 className="text-xl font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-1 pr-16">{board.name}</h3>
                  )}
                  <p className="text-sm text-slate-500 mt-3 font-mono bg-slate-950 inline-block px-2 py-1 rounded-md">Room: {board.id}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-800 group-hover:border-slate-700 transition-colors">
                  <Clock className="w-3.5 h-3.5" />
                  Edited {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
