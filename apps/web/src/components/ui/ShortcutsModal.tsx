import React, { useEffect } from 'react';
import { X, Command, Delete, MousePointer2, Hand, Square, Circle, Minus, ArrowRight, Type, Undo, Redo, Eraser, PenTool, StickyNote } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { label: 'Select Tool', keys: ['V'], icon: <MousePointer2 className="w-4 h-4 text-slate-400" /> },
    { label: 'Draw / Pen', keys: ['P'], icon: <PenTool className="w-4 h-4 text-slate-400" /> },
    { label: 'Rectangle', keys: ['R'], icon: <Square className="w-4 h-4 text-slate-400" /> },
    { label: 'Ellipse', keys: ['O'], icon: <Circle className="w-4 h-4 text-slate-400" /> },
    { label: 'Line', keys: ['L'], icon: <Minus className="w-4 h-4 text-slate-400" /> },
    { label: 'Arrow', keys: ['A'], icon: <ArrowRight className="w-4 h-4 text-slate-400" /> },
    { label: 'Text', keys: ['T'], icon: <Type className="w-4 h-4 text-slate-400" /> },
    { label: 'Eraser', keys: ['E'], icon: <Eraser className="w-4 h-4 text-slate-400" /> },
    { label: 'Undo', keys: ['Ctrl', 'Z'], icon: <Undo className="w-4 h-4 text-slate-400" /> },
    { label: 'Redo', keys: ['Ctrl', 'Y'], icon: <Redo className="w-4 h-4 text-slate-400" /> },
    { label: 'Delete Selection', keys: ['Del', 'or Backspace'], icon: <Delete className="w-4 h-4 text-slate-400" /> },
    { label: 'Snap Rotation to 15°', keys: ['Shift', '+ Rotate'], icon: null },
    { label: 'Help Menu', keys: ['?'], icon: null },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Command className="w-5 h-5 text-teal-500" />
            Keyboard Shortcuts
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 max-h-[60vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {shortcuts.map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  {shortcut.icon}
                  <span>{shortcut.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((k, j) => (
                    <kbd 
                      key={j}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-300"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-slate-800/30 border-t border-slate-800 text-center text-xs text-slate-500">
          Tip: Use trackpad pinch to zoom, and two-finger swipe to pan.
        </div>
      </div>
    </div>
  );
}
