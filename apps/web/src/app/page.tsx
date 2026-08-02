'use client';

import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';
import { LocalSyncManager } from '@/components/LocalSyncManager';
import { LandingModal } from '@/components/LandingModal';
import { TopRightMenu } from '@/components/TopRightMenu';
import { PropertiesBar } from '@/components/PropertiesBar';
import { useBoardStore } from '@/store/boardStore';

export default function Home() {
  const isLandingDismissed = useBoardStore((s) => s.isLandingDismissed);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 selection:bg-indigo-500/30">
      <LocalSyncManager />
      <Canvas />

      {/* These UI elements animate in after landing is dismissed */}
      <div
        className="absolute top-6 left-6 flex flex-col pointer-events-none transition-all duration-700 ease-out delay-200"
        style={{
          opacity: isLandingDismissed ? 1 : 0,
          transform: `translateY(${isLandingDismissed ? '0' : '-16px'})`,
        }}
      >
        <h1 className="text-2xl font-black tracking-tight text-slate-100 drop-shadow-sm">
          SyncBoard <span className="text-sm text-emerald-400 font-semibold ml-2">Individual Mode (Offline)</span>
        </h1>
        <p className="text-sm text-slate-400 font-medium mt-1 drop-shadow-sm">
          Scroll to Pan • Pinch or Ctrl+Scroll to Zoom
        </p>
      </div>

      <TopRightMenu />

      <PropertiesBar />
      <Toolbar />
      
      {/* Landing modal renders on top of everything */}
      <LandingModal />
    </main>
  );
}
