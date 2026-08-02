'use client';

import { useEffect, useState, useRef } from 'react';
import { useBoardStore, Cursor } from '../store/boardStore';
import { saveElements } from '../actions/board';
import { BoardElement } from '@syncboard/shared';
import { getSocket } from '../lib/socket';

export function SyncManager({ boardId }: { boardId: string }) {
  const elements = useBoardStore((state) => state.elements);
  const addElement = useBoardStore((state) => state.addElement);
  const updateElement = useBoardStore((state) => state.updateElement);
  const updateCursor = useBoardStore((state) => state.updateCursor);
  const removeCursor = useBoardStore((state) => state.removeCursor);
  
  const [syncState, setSyncState] = useState<'saved' | 'saving' | 'error'>('saved');
  
  // Keep track of which versions we have successfully saved to avoid resending
  const savedVersions = useRef<Record<string, number>>({});
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  // Setup WebSocket connection
  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    socketRef.current = socket;

    socket.emit('join-board', boardId);

    const handleElementUpdate = (incomingElements: BoardElement[]) => {
      incomingElements.forEach(incoming => {
        const localEl = useBoardStore.getState().elements[incoming.id];
        if (!localEl || incoming.version > localEl.version) {
          if (incoming.isDeleted) {
             updateElement(incoming.id, { isDeleted: true });
          } else if (!localEl) {
             addElement(incoming);
          } else {
             updateElement(incoming.id, incoming);
          }
          // Mark as saved so we don't bounce it back
          savedVersions.current[incoming.id] = incoming.version;
        }
      });
    };

    socket.on('element-update', handleElementUpdate);

    const handleCursorMove = ({ userId, cursor }: { userId: string, cursor: Cursor }) => {
      updateCursor(userId, cursor);
      
      // Remove cursor after 5 seconds of inactivity
      setTimeout(() => {
        removeCursor(userId);
      }, 5000);
    };

    socket.on('cursor-move', handleCursorMove);

    return () => {
      socket.off('element-update', handleElementUpdate);
      socket.off('cursor-move', handleCursorMove);
    };
  }, [boardId]);
  
  useEffect(() => {
    // Find elements that are newer than what we have saved
    const pendingElements = Object.values(elements).filter(el => {
      const savedVersion = savedVersions.current[el.id] || 0;
      return el.version > savedVersion;
    });

    if (pendingElements.length === 0) {
      if (syncState === 'saving') setSyncState('saved');
      return;
    }

    // Immediately broadcast to other users via WebSocket
    if (socketRef.current) {
      socketRef.current.emit('element-update', { boardId, elements: pendingElements });
    }

    setSyncState('saving');
    
    // Debounce the save
    const timeout = setTimeout(async () => {
      try {
        await saveElements(boardId, pendingElements);
        
        // Update our knowledge of saved versions
        pendingElements.forEach(el => {
          savedVersions.current[el.id] = el.version;
        });
        
        setSyncState('saved');
      } catch (err) {
        console.error('Failed to sync:', err);
        setSyncState('error');
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeout);
  }, [elements, boardId]);

  return (
    <div className="absolute bottom-6 left-6 flex items-center justify-center bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-slate-700/50 pointer-events-none transition-all z-40">
      {syncState === 'saved' && (
        <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Saved to cloud
        </span>
      )}
      {syncState === 'saving' && (
        <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Saving...
        </span>
      )}
      {syncState === 'error' && (
        <span className="flex items-center gap-2 text-sm font-medium text-red-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Sync error
        </span>
      )}
    </div>
  );
}
