import React, { useState, useEffect, useRef } from 'react';
import { useBoardStore } from '../store/boardStore';
import { commandManager, AddElementCommand, UpdateElementsCommand } from '../lib/commands';
import { v4 as uuidv4 } from 'uuid';

interface TextEditorOverlayProps {
  x: number;
  y: number;
  id: string;
  initialText?: string;
  camera: { x: number; y: number; zoom: number };
  onClose: () => void;
}

export function TextEditorOverlay({ x, y, id, initialText, camera, onClose }: TextEditorOverlayProps) {
  const [text, setText] = useState(initialText || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addElement = useBoardStore((s) => s.addElement);
  const updateElement = useBoardStore((s) => s.updateElement);
  const elements = useBoardStore((s) => s.elements);
  const setSelectedIds = useBoardStore((s) => s.setSelectedIds);
  const defaultStyle = useBoardStore((s) => s.defaultStyle);

  const currentEl = elements[id];
  const currentColor = currentEl?.style?.strokeColor || defaultStyle.strokeColor || '#f8fafc';
  const currentBgColor = currentEl?.style?.backgroundColor || defaultStyle.backgroundColor || 'transparent';
  const hasBg = currentBgColor !== 'transparent';
  const currentStrokeWidth = currentEl?.style?.strokeWidth || defaultStyle.strokeWidth || 4;

  const mountTime = useRef(Date.now());

  useEffect(() => {
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const committed = useRef(false);

  const commitText = () => {
    if (committed.current) return;
    if (Date.now() - mountTime.current < 100) return;
    committed.current = true;
    
    if (text.trim()) {
       const existingEl = elements[id];
       if (existingEl && existingEl.type === 'text') {
           const oldState = { text: (existingEl as any).text };
           const newState = { text: text };
           updateElement(id, newState);
           commandManager.executeCommand(new UpdateElementsCommand([{ id, oldState, newState }]));
       }
    } else {
       // Delete if empty
       useBoardStore.getState().removeElement(id);
    }
    setSelectedIds([]);
    onClose();
  };

  return (
    <div 
      style={{
        position: 'absolute',
        left: x * camera.zoom + camera.x,
        top: y * camera.zoom + camera.y,
        transform: hasBg ? `translate(-${12 * camera.zoom}px, -${12 * camera.zoom}px)` : 'none',
      }}
      className="z-50"
    >
      
      <div style={{ display: 'grid', position: 'relative' }}>
        <span
          style={{
            gridArea: '1 / 1',
            visibility: 'hidden',
            whiteSpace: 'pre-wrap',
            fontSize: `${32 * camera.zoom}px`,
            fontFamily: 'Inter, sans-serif',
            padding: hasBg ? `${12 * camera.zoom}px` : 0,
            margin: 0,
            lineHeight: 1.2,
            minWidth: '50px'
          }}
        >{text + (text.endsWith('\n') ? ' ' : '') || 'Type...'}</span>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              commitText();
            }
            if (e.key === 'Escape') {
                commitText();
            }
          }}
          onBlur={() => commitText()}
          style={{
             gridArea: '1 / 1',
             fontSize: `${32 * camera.zoom}px`,
             fontFamily: 'Inter, sans-serif',
             color: currentColor,
             background: hasBg ? currentBgColor : 'transparent',
             border: hasBg && currentColor !== 'transparent' && currentColor !== '#0f172a' ? `${currentStrokeWidth * camera.zoom}px solid ${currentColor}` : 'none',
             borderRadius: hasBg ? `${8 * camera.zoom}px` : 0,
             boxShadow: hasBg ? `0 ${4 * camera.zoom}px ${8 * camera.zoom}px rgba(0,0,0,0.1)` : 'none',
             outline: hasBg ? 'none' : '1px dashed #475569',
             padding: hasBg ? `${12 * camera.zoom}px` : '4px',
             lineHeight: 1.2,
             resize: 'none',
             overflow: 'hidden',
             width: '100%',
             height: '100%'
          }}
          placeholder="Type..."
        />
      </div>
    </div>
  );
}
