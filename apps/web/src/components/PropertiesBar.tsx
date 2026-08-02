'use client';

import React from 'react';
import { useBoardStore } from '../store/boardStore';
import { commandManager, UpdateElementsCommand } from '../lib/commands';
import { ChevronLeft, ChevronRight, Palette } from 'lucide-react';
import { useState } from 'react';

const COLORS = [
  '#f8fafc', // white-ish
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  'transparent'
];

const STROKE_WIDTHS = [2, 3, 5, 8];

export function PropertiesBar() {
  const selectedIds = useBoardStore(s => s.selectedIds);
  const elements = useBoardStore(s => s.elements);
  const defaultStyle = useBoardStore(s => s.defaultStyle);
  const setDefaultStyle = useBoardStore(s => s.setDefaultStyle);
  const isLandingDismissed = useBoardStore(s => s.isLandingDismissed);
  const isSharing = useBoardStore(s => s.isSharing);
  const activeTool = useBoardStore(s => s.activeTool);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isLandingDismissed || isSharing) return null;

  // Determine what to show
  let currentStrokeColor = defaultStyle.strokeColor;
  let currentBgColor = defaultStyle.backgroundColor;
  let currentStrokeWidth = defaultStyle.strokeWidth;

  const hasSelection = selectedIds.length > 0;

  if (hasSelection) {
    const firstSelected = elements[selectedIds[0]];
    if (firstSelected) {
      currentStrokeColor = firstSelected.style.strokeColor || '#f8fafc';
      currentBgColor = firstSelected.style.backgroundColor || 'transparent';
      currentStrokeWidth = firstSelected.style.strokeWidth || 3;
    }
  }

  const applyStyle = (prop: 'strokeColor' | 'backgroundColor' | 'strokeWidth', value: any) => {
    setDefaultStyle({ [prop]: value });

    if (hasSelection) {
      const updates = selectedIds.map(id => {
        const el = elements[id];
        return {
          id,
          oldState: { style: { ...el.style } },
          newState: { style: { ...el.style, [prop]: value } }
        };
      });
      commandManager.executeCommand(new UpdateElementsCommand(updates));
    }
  };

  const showThickness = hasSelection ? true : (activeTool !== 'select' && activeTool !== 'hand' && activeTool !== 'text' && activeTool !== 'sticky');

  return (
    <>
    <div 
      className={`absolute top-1/2 left-6 -translate-y-1/2 z-40 flex flex-col gap-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-700/50 transition-all duration-300 ${isCollapsed ? '-translate-x-32 opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}
      onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
    >
      <button 
        onClick={() => setIsCollapsed(true)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-slate-800 border border-slate-700 rounded-r-xl flex items-center justify-center hover:bg-slate-700 transition-colors pointer-events-auto"
        title="Collapse Panel"
      >
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>

      {/* Stroke Color */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stroke</span>
        <div className="grid grid-cols-2 gap-2">
          {COLORS.filter(c => c !== 'transparent').map(c => (
            <button
              key={`stroke-${c}`}
              onClick={() => applyStyle('strokeColor', c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${currentStrokeColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      <div className="w-full h-px bg-slate-800" />

      {/* Background Color */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Background</span>
        <div className="grid grid-cols-2 gap-2">
          {COLORS.map(c => (
            <button
              key={`bg-${c}`}
              onClick={() => applyStyle('backgroundColor', c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform relative ${currentBgColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'} ${c === 'transparent' ? 'bg-slate-800' : ''}`}
              style={c !== 'transparent' ? { backgroundColor: c } : {}}
              title={c === 'transparent' ? 'Transparent' : c}
            >
              {c === 'transparent' && (
                <div className="absolute inset-0 m-auto w-4 h-0.5 bg-rose-500 rotate-45" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-px bg-slate-800" />

      {/* Stroke Width */}
      {showThickness && (
        <>
          <div className="w-full h-px bg-slate-800" />
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Thickness</span>
            <div className="flex flex-col gap-1.5">
              {STROKE_WIDTHS.map(w => (
                <button
                  key={`width-${w}`}
                  onClick={() => applyStyle('strokeWidth', w)}
                  className={`h-6 flex items-center justify-center rounded transition-colors ${currentStrokeWidth === w ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
                >
                  <div className="bg-slate-300 rounded-full w-full mx-2" style={{ height: w }} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
    
    {isCollapsed && (
      <button
        onClick={() => setIsCollapsed(false)}
        className="absolute top-1/2 left-0 -translate-y-1/2 w-8 h-12 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-r-xl flex items-center justify-center hover:bg-slate-800 transition-colors z-40 shadow-xl"
        title="Open Properties"
      >
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </button>
    )}
    </>
  );
}
