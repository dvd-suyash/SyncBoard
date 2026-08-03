'use client';

import { useEffect, useRef } from 'react';
import { useBoardStore } from '../store/boardStore';
import { BoardElement } from '@/types/shared';
import { SyncManager } from './SyncManager';

export function BoardInitializer({ boardId, initialElements }: { boardId: string, initialElements: BoardElement[] }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      const elementsMap: Record<string, BoardElement> = {};
      initialElements.forEach(el => {
        elementsMap[el.id] = el;
      });
      useBoardStore.setState({ elements: elementsMap, boardId, isLandingDismissed: true });
      initialized.current = true;
    }
  }, [initialElements, boardId]);

  return <SyncManager boardId={boardId} />;
}
