'use client';

import React, { useState, useEffect } from 'react';
import { Share, Save, LogOut, Copy, Check, X, Download, ChevronDown, List, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useSession, signOut } from 'next-auth/react';
import { loginWithGoogle } from '@/actions/auth';
import { createRoomFromLocal } from '@/actions/board';
import { useRouter, usePathname } from 'next/navigation';
import { useBoardStore } from '@/store/boardStore';
import AnimatedGradientBackground from '@/components/ui/animated-gradient-background';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { BoardsPanel } from '@/components/ui/BoardsPanel';

export function TopRightMenu() {
  const { data: session } = useSession();
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const isLandingDismissed = useBoardStore((s) => s.isLandingDismissed);
  const isSharing = useBoardStore((s) => s.isSharing);
  const setIsSharing = useBoardStore((s) => s.setIsSharing);
  const cursors = useBoardStore((s) => s.cursors);
  const [isSaving, setIsSaving] = useState(false);
  const [allowEdit, setAllowEdit] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isBoardsPanelOpen, setIsBoardsPanelOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  const isRoomPage = pathname.startsWith('/board/');
  const currentRoomId = isRoomPage ? pathname.split('/')[2] : null;

  const handleSave = async () => {
    if (!session) {
      localStorage.setItem('syncboard_intent', 'save');
      await loginWithGoogle();
      return;
    }
    if (isRoomPage) {
      toast.success("Already autosaving to cloud!");
      return;
    }
    try {
      setIsSaving(true);
      const elementsStr = localStorage.getItem('syncboard_local_elements');
      const elementsObj = elementsStr ? JSON.parse(elementsStr) : {};
      const elements = Object.values(elementsObj);
      const newRoomId = await createRoomFromLocal(elements as any, false);
      toast.success("Saved to cloud!");
      router.push(`/board/${newRoomId}`);
    } catch (e) {
      toast.error("Error saving board!");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (session) {
      const intent = localStorage.getItem('syncboard_intent');
      if (intent === 'share') {
        setIsSharing(true);
        localStorage.removeItem('syncboard_intent');
      } else if (intent === 'save') {
        localStorage.removeItem('syncboard_intent');
        handleSave();
      }
    }
  }, [session]);

  const handleShareClick = async () => {
    if (!session) {
      localStorage.setItem('syncboard_intent', 'share');
      await loginWithGoogle();
      return;
    }
    setIsSharing(true);
  };

  const confirmShare = async () => {
    try {
      if (isRoomPage && currentRoomId) {
        const url = `${window.location.origin}/board/${currentRoomId}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => {
          setIsSharing(false);
          setCopied(false);
        }, 1500);
        return;
      }

      setIsSaving(true);
      const elementsStr = localStorage.getItem('syncboard_local_elements');
      const elementsObj = elementsStr ? JSON.parse(elementsStr) : {};
      const elements = Object.values(elementsObj);
      
      const newRoomId = await createRoomFromLocal(elements as any, allowEdit);
      
      const url = `${window.location.origin}/board/${newRoomId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      
      setTimeout(() => {
        router.push(`/board/${newRoomId}`);
        setIsSharing(false);
        setCopied(false);
      }, 1000);
      
      
    } catch (e) {
      toast.error("Error creating room!");
    } finally {
      setIsSaving(false);
    }
  };

  const exportBoard = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    try {
      const state = useBoardStore.getState();
      const elements = Object.values(state.elements).filter(el => !el.isDeleted && el.type === 'iframe');
      
      if (elements.length === 0) {
        // No iframes, just export normal canvas
        const link = document.createElement('a');
        link.download = `syncboard-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        return;
      }

      // We have iframes, let's create a composite canvas
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      // Draw original canvas
      ctx.drawImage(canvas, 0, 0);

      // Draw placeholders for iframes
      const camera = state.camera;
      const dpr = window.devicePixelRatio || 1;
      
      for (const el of elements as any[]) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.translate(camera.x, camera.y);
        ctx.scale(camera.zoom, camera.zoom);
        
        ctx.translate(el.x + el.width/2, el.y + el.height/2);
        if (el.rotation) ctx.rotate(el.rotation);
        ctx.translate(-el.width/2, -el.height/2);

        // Draw elegant movie placeholder box
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        
        ctx.beginPath();
        ctx.roundRect(0, 0, el.width, el.height, 12);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#4f46e5'; // indigo-500 border
        ctx.lineWidth = 2;
        ctx.stroke();

        if (el.poster) {
          try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
              const image = new Image();
              image.crossOrigin = 'anonymous'; // Important for CORS
              image.onload = () => resolve(image);
              image.onerror = reject;
              image.src = el.poster;
            });
            
            // Draw image covering the box (maintain aspect ratio or just fill)
            // Let's do object-fit: cover equivalent
            const imgRatio = img.width / img.height;
            const boxRatio = el.width / el.height;
            let drawWidth = el.width;
            let drawHeight = el.height;
            let offsetX = 0;
            let offsetY = 0;

            if (imgRatio > boxRatio) {
              drawWidth = el.height * imgRatio;
              offsetX = (el.width - drawWidth) / 2;
            } else {
              drawHeight = el.width / imgRatio;
              offsetY = (el.height - drawHeight) / 2;
            }

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(0, 0, el.width, el.height, 12);
            ctx.clip(); // Clip to rounded rectangle
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            
            // Add a dark gradient overlay so text is readable
            const gradient = ctx.createLinearGradient(0, 0, 0, el.height);
            gradient.addColorStop(0, 'rgba(15, 23, 42, 0.4)');
            gradient.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();
          } catch (err) {
            console.error('Failed to load poster image', err);
          }
        }

        ctx.fillStyle = '#f8fafc'; // slate-50
        ctx.font = 'bold 32px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = el.title || 'Movie / Media Element';
        ctx.fillText(text, el.width/2, el.height/2);
        
        ctx.fillStyle = '#94a3b8'; // slate-400
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText('Cannot capture video frame due to browser security', el.width/2, el.height/2 + 40);

        ctx.restore();
      }

      const link = document.createElement('a');
      link.download = `syncboard-${Date.now()}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();

    } catch (e) {
      console.error(e);
      toast.error('Error exporting image');
    }
  };

  return (
    <>
      <div 
        className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 sm:gap-3 z-40 transition-all duration-700 ease-out delay-100"
        style={{
          opacity: isLandingDismissed ? 1 : 0,
          transform: `translateY(${isLandingDismissed ? '0' : '-16px'})`,
          pointerEvents: isLandingDismissed ? 'auto' : 'none',
        }}
      >
        {isRoomPage && Object.values(cursors).length > 0 && (
          <div className="flex items-center -space-x-3 mr-1 sm:mr-2">
            {Object.entries(cursors).map(([id, cursor]) => (
              <div 
                key={id} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center shadow-sm overflow-hidden relative group"
                style={{ backgroundColor: cursor.color || '#333' }}
                title={cursor.name || 'Anonymous'}
              >
                {cursor.avatar ? (
                  <img src={cursor.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-bold">{(cursor.name || 'A').charAt(0).toUpperCase()}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {isRoomPage && currentRoomId && (
          <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-800/70 backdrop-blur-md border border-slate-700/50 rounded-full text-slate-200 font-mono text-sm shadow-sm">
            <span className="text-slate-400 font-sans text-sm">Room:</span> {currentRoomId}
            <button 
              onClick={async () => {
                await navigator.clipboard.writeText(currentRoomId);
                const btn = document.getElementById('copy-room-btn');
                if (btn) {
                  const orig = btn.innerHTML;
                  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check text-green-400"><path d="M20 6 9 17l-5-5"/></svg>';
                  setTimeout(() => btn.innerHTML = orig, 1500);
                }
              }}
              id="copy-room-btn"
              className="ml-2 p-1 hover:bg-slate-700 rounded transition-colors"
              title="Copy Room Code"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button 
          onClick={handleShareClick}
          className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-full font-medium shadow-[0_4px_14px_rgba(13,148,136,0.3)] transition-all active:scale-95"
        >
          <Share className="w-4 h-4 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <div className="relative">
          <button 
            onClick={() => setIsSaveMenuOpen(!isSaveMenuOpen)}
            className="flex items-center justify-center w-10 h-10 bg-slate-800/70 hover:bg-slate-800/90 backdrop-blur-md border border-slate-700/50 rounded-full text-slate-200 shadow-sm transition-all active:scale-95 overflow-hidden"
          >
            {session?.user?.image ? (
              <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            )}
          </button>

          {isSaveMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col z-50">
              {session?.user && (
                <div className="px-4 py-3 bg-slate-900/50">
                  <p className="text-sm font-medium text-slate-200 truncate">{session.user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
                </div>
              )}
              
              {!isRoomPage && (
                <button
                  onClick={() => { setIsSaveMenuOpen(false); setIsJoinModalOpen(true); }}
                  className="px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                >
                  <Users className="w-4 h-4 text-indigo-400" /> Join Room
                </button>
              )}

              {session && (
                <button
                  onClick={() => { setIsSaveMenuOpen(false); setIsBoardsPanelOpen(true); }}
                  className="px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                >
                  <List className="w-4 h-4 text-emerald-400" /> My Boards
                </button>
              )}

              <div className="h-px bg-slate-700 w-full" />

              {!isRoomPage && (
                <button
                  onClick={() => { setIsSaveMenuOpen(false); handleSave(); }}
                  disabled={isSaving}
                  className="px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-blue-400" /> {isSaving ? 'Saving...' : 'Save to Cloud'}
                </button>
              )}
              
              <button
                onClick={() => { setIsSaveMenuOpen(false); exportBoard(); }}
                className="px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"
              >
                <Download className="w-4 h-4 text-rose-400" /> Export as PNG
              </button>

              <div className="h-px bg-slate-700 w-full" />

              {isRoomPage && (
                <button
                  onClick={() => { setIsSaveMenuOpen(false); router.push('/'); }}
                  className="px-4 py-3 text-left text-sm text-amber-400 hover:bg-amber-950/30 flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Leave Room
                </button>
              )}

              {session ? (
                <button
                  onClick={() => { setIsSaveMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                  className="px-4 py-3 text-left text-sm text-rose-400 hover:bg-rose-950/50 flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              ) : (
                <button
                  onClick={() => { setIsSaveMenuOpen(false); loginWithGoogle(); }}
                  className="px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
                  Sign In
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {isSharing && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center transition-all overflow-hidden">
          <AnimatedGradientBackground />
          <div className="relative z-10 flex flex-col items-center -translate-y-24">
            {/* The Cat Animation */}
            <div className="w-48 h-48 -mb-10 pointer-events-none relative z-20">
              <DotLottieReact
                src="https://lottie.host/8cf4ba71-e5fb-44f3-8134-178c4d389417/0CCsdcgNIP.json"
                loop
                autoplay
              />
            </div>
            
            <div className="w-[400px] bg-slate-900/90 backdrop-blur-2xl border border-slate-700/50 shadow-2xl rounded-3xl p-8 flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <button 
              onClick={() => setIsSharing(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold text-slate-100 mb-2">
              {isRoomPage ? 'Share this room' : 'Share Board'}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {isRoomPage ? 'Share the link with others to collaborate.' : 'Create a live collaborative room from your current canvas.'}
            </p>
            
            <div className="flex items-center justify-between mb-8 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
              <div>
                <p className="font-semibold text-slate-200 text-sm">Allow editing</p>
                <p className="text-xs text-slate-400">Anyone with the link can edit</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={allowEdit} onChange={e => setAllowEdit(e.target.checked)} disabled={isRoomPage} />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-900/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-200 after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
            
            <button 
              onClick={confirmShare}
              disabled={isSaving}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-md transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {copied ? (
                <><Check className="w-5 h-5" /> Copied!</>
              ) : isSaving ? (
                'Creating...'
              ) : isRoomPage ? (
                'Copy Link'
              ) : (
                'Create Room & Copy Link'
              )}
            </button>
          </div>
          </div>
        </div>
      )}

      {isJoinModalOpen && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center transition-all overflow-hidden bg-black/60 backdrop-blur-sm">
          <div className="relative z-10 w-[400px] bg-slate-900/90 backdrop-blur-2xl border border-slate-700/50 shadow-2xl rounded-3xl p-8 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold text-slate-100 mb-2">Join a Room</h2>
            <p className="text-sm text-slate-400 mb-6">Enter a room ID or paste the full room URL to collaborate.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!joinRoomId.trim()) return;
              let finalId = joinRoomId.trim();
              if (finalId.includes('/board/')) {
                finalId = finalId.split('/board/')[1].split('?')[0].split('#')[0];
              }
              router.push(`/board/${finalId}`);
              setIsJoinModalOpen(false);
            }}>
              <input
                type="text"
                autoFocus
                placeholder="e.g. ck39d8x..."
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-4 mb-6 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              
              <button 
                type="submit"
                disabled={!joinRoomId.trim()}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md transition-all active:scale-[0.98] flex justify-center items-center disabled:opacity-50"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>
      )}

      <BoardsPanel isOpen={isBoardsPanelOpen} onClose={() => setIsBoardsPanelOpen(false)} />
    </>
  );
}
