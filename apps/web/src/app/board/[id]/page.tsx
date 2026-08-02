import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';
import { getBoardElements } from '@/actions/board';
import { BoardInitializer } from '@/components/BoardInitializer';
import { TopRightMenu } from '@/components/TopRightMenu';
import { PropertiesBar } from '@/components/PropertiesBar';
import { ScreenShare } from '@/components/ScreenShare';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const boardId = (await params).id;
  
  // Here we will eventually add password check. For now, just load elements.
  const elements = await getBoardElements(boardId);

  // If getBoardElements returns an error or empty array when it shouldn't, we handle it.
  // Currently getBoardElements returns [] if no elements. But we can check if board exists later.

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 selection:bg-indigo-500/30">
      <BoardInitializer boardId={boardId} initialElements={elements} />
      <Canvas />
      <PropertiesBar />
      <Toolbar />
      <TopRightMenu />
      <ScreenShare boardId={boardId} />
      <div className="absolute top-6 left-6 flex flex-col pointer-events-none">
        <h1 className="text-2xl font-black tracking-tight text-slate-100 drop-shadow-sm">
          SyncBoard <span className="text-sm text-indigo-400 font-semibold ml-2">Room: {boardId}</span>
        </h1>
        <p className="text-sm text-slate-400 font-medium mt-1 drop-shadow-sm">
          Scroll to Pan • Pinch or Ctrl+Scroll to Zoom
        </p>
      </div>
    </main>
  );
}
