'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, LayoutDashboard, Clock, Trash2, Edit2, Check, X as XIcon, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getUserBoards, deleteBoard, renameBoard } from '@/actions/board';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';
import gsap from 'gsap';

interface BoardsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BoardsPanel({ isOpen, onClose }: BoardsPanelProps) {
  const [boards, setBoards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const currentBoardId = pathname.startsWith('/board/') ? pathname.split('/')[2] : null;

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getUserBoards().then((data) => {
        setBoards(data);
        setIsLoading(false);
      }).catch(() => {
        toast.error('Failed to load boards');
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && panelRef.current && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.fromTo(panelRef.current, { x: '100%' }, { x: '0%', duration: 0.4, ease: 'power3.out' });
    }
  }, [isOpen]);

  const handleClose = () => {
    if (panelRef.current && overlayRef.current) {
      gsap.to(panelRef.current, { x: '100%', duration: 0.3, ease: 'power3.in' });
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: onClose });
    } else {
      onClose();
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this board?')) return;
    try {
      await deleteBoard(id);
      setBoards(prev => prev.filter(b => b.id !== id));
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
      setBoards(prev => prev.map(b => b.id === id ? { ...b, name: newName } : b));
      setRenamingId(null);
      toast.success('Board renamed');
    } catch (e) {
      toast.error('Failed to rename board');
    }
  };

  const navigateToBoard = (boardId: string) => {
    handleClose();
    // Small delay so the close animation plays before navigation
    setTimeout(() => {
      router.push(`/board/${boardId}`);
    }, 350);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-700/50 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">My Boards</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Board List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center text-slate-500 py-20">
              <LayoutDashboard className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-slate-400">No boards yet</p>
              <p className="text-sm mt-1">Create a board to get started</p>
            </div>
          ) : (
            boards.map((board) => {
              const isCurrent = board.id === currentBoardId;
              return (
                <div
                  key={board.id}
                  onClick={() => {
                    if (renamingId !== board.id && !isCurrent) {
                      navigateToBoard(board.id);
                    }
                  }}
                  className={`group relative p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-indigo-500/10 border-indigo-500/50 cursor-default'
                      : 'bg-slate-800/50 border-slate-700/50 cursor-pointer hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  {/* Current board badge */}
                  {isCurrent && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full uppercase tracking-wider">
                      Current
                    </div>
                  )}

                  {/* Actions */}
                  {!isCurrent && renamingId !== board.id && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startRename(e, board.id, board.name)}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, board.id)}
                        className="p-1.5 bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Content */}
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
                        className="flex-1 bg-slate-950 border border-indigo-500 rounded-lg px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                      <button onClick={(e) => handleRename(e, board.id)} className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setRenamingId(null)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300"><XIcon className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      <h3 className={`font-bold text-sm pr-20 line-clamp-1 ${isCurrent ? 'text-indigo-300' : 'text-slate-200'}`}>
                        {board.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        Room: {board.id}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                        <Clock className="w-3 h-3" />
                        Edited {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
