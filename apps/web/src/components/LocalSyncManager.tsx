'use client';

import { useEffect } from 'react';
import { useBoardStore } from '@/store/boardStore';

export function LocalSyncManager() {
  useEffect(() => {
    // On mount, load from localStorage
    const saved = localStorage.getItem('syncboard_local_elements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        useBoardStore.setState({ elements: parsed, boardId: 'local' });
      } catch (e) {
        console.error("Failed to parse local elements");
      }
    } else {
      useBoardStore.setState({ boardId: 'local' });
    }

    // On change, save to localStorage
    const unsub = useBoardStore.subscribe((state, prevState) => {
      if (state.elements !== prevState.elements) {
        localStorage.setItem('syncboard_local_elements', JSON.stringify(state.elements));
      }
    });

    return () => unsub();
  }, []);

  return null;
}
