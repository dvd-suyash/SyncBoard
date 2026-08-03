import { create } from 'zustand';
import { BoardElement, ElementType } from '@/types/shared';

export type ToolType = 'select' | 'hand' | 'eraser' | ElementType;

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Cursor {
  x: number;
  y: number;
  color?: string;
  name?: string;
  avatar?: string;
}

interface BoardState {
  boardId: string | null;
  elements: Record<string, BoardElement>;
  camera: Camera;
  activeTool: ToolType;
  selectedIds: string[];
  cursors: Record<string, Cursor>;
  isLandingDismissed: boolean;
  isSharing: boolean;
  defaultStyle: { strokeColor: string; backgroundColor: string; strokeWidth: number; };
  
  // Actions
  setBoardId: (id: string) => void;
  addElement: (element: BoardElement) => void;
  updateElement: (id: string, updates: Partial<BoardElement>) => void;
  removeElement: (id: string) => void;
  setCamera: (camera: Camera | ((prev: Camera) => Camera)) => void;
  setActiveTool: (tool: ToolType) => void;
  setSelectedIds: (ids: string[]) => void;
  updateCursor: (userId: string, cursor: Cursor) => void;
  removeCursor: (userId: string) => void;
  setLandingDismissed: (dismissed: boolean) => void;
  setIsSharing: (val: boolean) => void;
  setDefaultStyle: (style: Partial<{ strokeColor: string; backgroundColor: string; strokeWidth: number; }>) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  boardId: null,
  elements: {},
  camera: { x: 0, y: 0, zoom: 1 },
  activeTool: 'select',
  selectedIds: [],
  cursors: {},
  isLandingDismissed: false,
  isSharing: false,
  defaultStyle: { strokeColor: '#f8fafc', backgroundColor: 'transparent', strokeWidth: 3 },

  setBoardId: (boardId) => set({ boardId }),

  addElement: (element) =>
    set((state) => ({
      elements: { ...state.elements, [element.id]: element },
    })),

  updateElement: (id, updates) =>
    set((state) => {
      const el = state.elements[id];
      if (!el) return state;
      return {
        elements: {
          ...state.elements,
          [id]: { ...el, ...updates, version: el.version + 1, updatedAt: Date.now() } as BoardElement,
        },
      };
    }),

  removeElement: (id) =>
    set((state) => {
      const el = state.elements[id];
      if (!el) return state;
      return {
        elements: {
          ...state.elements,
          [id]: { ...el, isDeleted: true, version: el.version + 1, updatedAt: Date.now() } as BoardElement,
        },
      };
    }),

  setCamera: (camera) =>
    set((state) => ({
      camera: typeof camera === 'function' ? camera(state.camera) : camera,
    })),

  setActiveTool: (activeTool) => set({ activeTool }),
  
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  
  updateCursor: (userId, cursor) => set(state => ({
    cursors: { ...state.cursors, [userId]: cursor }
  })),
  
  removeCursor: (userId) => set(state => {
    const newCursors = { ...state.cursors };
    delete newCursors[userId];
    return { cursors: newCursors };
  }),
  
  setLandingDismissed: (dismissed) => set({ isLandingDismissed: dismissed }),
  setIsSharing: (val) => set({ isSharing: val }),
  setDefaultStyle: (style) => set(state => ({ defaultStyle: { ...state.defaultStyle, ...style } })),
}));
