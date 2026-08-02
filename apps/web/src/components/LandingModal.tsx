'use client';

import { useState, useEffect, useCallback } from 'react';
import { loginWithGoogle } from '@/actions/auth';
import { joinOrCreateRoom } from '@/actions/board';
import { useSession } from 'next-auth/react';
import { useBoardStore } from '@/store/boardStore';
import KineticGrid from './ui/kinetic-grid';
import { Link2, PenTool, ArrowRight } from 'lucide-react';

type Phase = 'visible' | 'dissolving' | 'gone';

export function LandingModal() {
  const { data: session, status } = useSession();
  const setLandingDismissed = useBoardStore((s) => s.setLandingDismissed);
  const [phase, setPhase] = useState<Phase>('visible');
  const [showJoin, setShowJoin] = useState(false);

  // Determine if user should bypass the modal (already authenticated)
  const shouldShow = !session?.user && status !== 'loading';

  const dismiss = useCallback(() => {
    // Start the dissolve animation
    setPhase('dissolving');
    // After the animation completes, remove from DOM and signal other components
    setTimeout(() => {
      setPhase('gone');
      setLandingDismissed(true);
    }, 900); // matches the CSS transition duration
  }, [setLandingDismissed]);

  // If session loads and user is already authenticated, skip the modal entirely
  useEffect(() => {
    if (session?.user) {
      // User just logged in (or was already logged in)
      if (phase === 'visible') {
        dismiss();
      }
    }
  }, [session, phase, dismiss]);

  // On first mount, if user is already logged in, mark as dismissed immediately
  useEffect(() => {
    if (status === 'authenticated') {
      setPhase('gone');
      setLandingDismissed(true);
    }
  }, [status, setLandingDismissed]);

  // Don't render anything once fully gone
  if (phase === 'gone') return null;

  // Don't flash while session is loading
  if (status === 'loading') return null;

  const isDissolvingOrGone = phase === 'dissolving';

  return (
    <div
      className="absolute inset-0 z-[60] transition-all duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{
        opacity: isDissolvingOrGone ? 0 : 1,
        pointerEvents: isDissolvingOrGone ? 'none' : 'auto',
      }}
    >
      {/* Kinetic grid background — fills the entire screen */}
      <KineticGrid className="absolute inset-0">
        {/* Centered card container */}
        <div className="flex items-center justify-center w-full h-screen">
          <div
            className="w-[440px] bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl p-10 flex flex-col items-center relative transition-all duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              transform: isDissolvingOrGone
                ? 'scale(1.15) translateY(-20px)'
                : 'scale(1) translateY(0)',
              opacity: isDissolvingOrGone ? 0 : 1,
            }}
          >
            <div className="relative w-14 h-14 bg-teal-500 rounded-2xl shadow-lg shadow-teal-500/20 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-2">
              SyncBoard
            </h1>
            <p className="text-sm text-slate-400 mb-8 font-medium text-center">
              The infinitely fast collaborative canvas.
            </p>

            <div className="w-full flex flex-col gap-3 relative z-10">
              <form action={loginWithGoogle} className="w-full">
                <button
                  type="submit"
                  className="w-full h-12 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 rounded-full flex items-center justify-center transition-colors gap-3 group"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 transition-transform group-hover:scale-110">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-medium text-[15px] text-slate-200">Continue with Google</span>
                </button>
              </form>

              {!showJoin ? (
                <button
                  onClick={() => setShowJoin(true)}
                  className="w-full h-12 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 rounded-full flex items-center justify-center transition-colors gap-3 group"
                >
                  <Link2 className="w-5 h-5 text-slate-400 group-hover:text-slate-300 transition-colors" />
                  <span className="font-medium text-[15px] text-slate-200">Enter a room</span>
                </button>
              ) : (
                <form action={joinOrCreateRoom} className="w-full relative animate-in fade-in zoom-in-95 duration-200">
                  <input 
                    name="roomCode" 
                    placeholder="Enter 6-digit code..." 
                    autoFocus
                    className="w-full h-12 bg-slate-800 border border-teal-600/50 rounded-full pl-5 pr-12 text-slate-200 text-[15px] focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder:text-slate-500" 
                  />
                  <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 w-9 bg-teal-600 hover:bg-teal-500 rounded-full flex items-center justify-center transition-colors text-white">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              <button
                onClick={dismiss}
                className="w-full h-12 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 rounded-full flex items-center justify-center transition-colors gap-3 group"
              >
                <PenTool className="w-5 h-5 text-slate-400 group-hover:text-slate-300 transition-colors" />
                <span className="font-medium text-[15px] text-slate-200">Skip and use locally</span>
              </button>
            </div>
          </div>
        </div>
      </KineticGrid>
    </div>
  );
}
