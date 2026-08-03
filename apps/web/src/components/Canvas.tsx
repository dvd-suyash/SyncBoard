'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { getSocket } from '../lib/socket';
import { screenToWorld, getElementAtPoint } from '../lib/math';
import { v4 as uuidv4 } from 'uuid';
import { BoardElement, FreehandElement, LineElement, ArrowElement, TextElement } from '@/types/shared';
import { commandManager, AddElementCommand, DeleteElementsCommand, UpdateElementsCommand } from '../lib/commands';
import { TextEditorOverlay } from './TextEditorOverlay';
import { SyncedYouTube } from './SyncedYouTube';
import { GenericIframe } from './GenericIframe';
import { CanvasScreenShare } from './CanvasScreenShare';
import { useSession } from 'next-auth/react';

let ROTATE_ICON_PATH: Path2D | null = null;

function getRotationHandleLocal(el: BoardElement, zoom: number) {
  const cx = el.width / 2;
  const cy = el.height / 2;
  const handleOffset = 24 / zoom;
  const mag = Math.hypot(cx, cy);
  if (mag === 0) return { hx: cx, hy: cy - handleOffset, cx, cy };
  
  return { 
      hx: el.width + (cx / mag) * handleOffset, 
      hy: el.height + (cy / mag) * handleOffset, 
      cx, 
      cy 
  };
}

const imageCache = new Map<string, HTMLImageElement>();

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const elements = useBoardStore((s) => s.elements);
  const cursors = useBoardStore((s) => s.cursors);
  const camera = useBoardStore((s) => s.camera);
  const setCamera = useBoardStore((s) => s.setCamera);
  const activeTool = useBoardStore((s) => s.activeTool);
  const addElement = useBoardStore((s) => s.addElement);
  const updateElement = useBoardStore((s) => s.updateElement);
  const defaultStyle = useBoardStore((s) => s.defaultStyle);
  
  const boardId = useBoardStore((s) => s.boardId);

  const selectedIds = useBoardStore((s) => s.selectedIds);
  const setSelectedIds = useBoardStore((s) => s.setSelectedIds);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotatingElementId, setRotatingElementId] = useState<string | null>(null);
  const [rotationInitialState, setRotationInitialState] = useState<{rotation: number} | null>(null);
  const [currentElementId, setCurrentElementId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<{x: number, y: number, id: string, initialText?: string} | null>(null);
  
  const [dragStartPoint, setDragStartPoint] = useState<{x: number, y: number} | null>(null);
  const [dragInitialStates, setDragInitialStates] = useState<Record<string, Partial<BoardElement>>>({});
  
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const lastPointerPos = useRef<{x: number, y: number} | null>(null);

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          commandManager.redo();
        } else {
          commandManager.undo();
        }
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        commandManager.redo();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scrolling down
        setIsSpaceDown(true);
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        commandManager.executeCommand(new DeleteElementsCommand(selectedIds));
        setSelectedIds([]);
        return;
      }

      // Tool shortcuts
      const toolMap: Record<string, any> = {
        'v': 'select',
        'p': 'freehand',
        'r': 'rectangle',
        'o': 'ellipse',
        'l': 'line',
        'a': 'arrow',
        't': 'text',
        'e': 'eraser',
      };

      const key = e.key.toLowerCase();
      if (toolMap[key]) {
        useBoardStore.getState().setActiveTool(toolMap[key]);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
      }
    };
    
    const handlePaste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;
          
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (typeof ev.target?.result === 'string') {
               const img = new Image();
               img.onload = () => {
                 const id = uuidv4();
                 const state = useBoardStore.getState();
                 const worldPt = screenToWorld({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, state.camera);
                 
                 const newImage = {
                   id,
                   type: 'image' as const,
                   version: 1,
                   authorId: 'local',
                   createdAt: Date.now(),
                   updatedAt: Date.now(),
                   isDeleted: false,
                   x: worldPt.x - img.naturalWidth / 2,
                   y: worldPt.y - img.naturalHeight / 2,
                   width: img.naturalWidth,
                   height: img.naturalHeight,
                   dataUrl: ev.target!.result as string,
                   style: {}
                 };
                 state.addElement(newImage as any);
                 commandManager.pushCommand(new AddElementCommand(newImage as any));
               };
               img.src = ev.target.result;
            }
          };
          reader.readAsDataURL(file);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
    };
  }, [selectedIds, setSelectedIds]);

  // Native wheel event for zooming (avoids React passive listener warnings)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Allow scrolling in UI overlays
      if ((e.target as Element).closest?.('.custom-scrollbar') || (e.target as Element).closest?.('.overflow-y-auto')) {
        return;
      }
      e.preventDefault();
      
      const state = useBoardStore.getState();
      const currentCam = state.camera;
      
      if (e.ctrlKey || e.metaKey) {
        // Zoom logic (Pinch on trackpad)
        const zoomSensitivity = 0.005;
        const zoomDelta = -e.deltaY * zoomSensitivity;
        const newZoom = Math.max(0.1, Math.min(5, currentCam.zoom * Math.exp(zoomDelta)));
        
        const dx = (e.clientX - currentCam.x) - (e.clientX - currentCam.x) * (newZoom / currentCam.zoom);
        const dy = (e.clientY - currentCam.y) - (e.clientY - currentCam.y) * (newZoom / currentCam.zoom);
        
        state.setCamera({ x: currentCam.x + dx, y: currentCam.y + dy, zoom: newZoom });
      } else {
        // Pan logic (2-finger scroll on trackpad)
        state.setCamera({ 
          x: currentCam.x - e.deltaX, 
          y: currentCam.y - e.deltaY, 
          zoom: currentCam.zoom 
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    const render = () => {
      // Handle resizing cleanly
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = window.innerWidth;
      const displayHeight = window.innerHeight;
      
      // Only resize if actually needed to prevent flickering
      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
         canvas.width = displayWidth * dpr;
         canvas.height = displayHeight * dpr;
         canvas.style.width = `${displayWidth}px`;
         canvas.style.height = `${displayHeight}px`;
         ctx.scale(dpr, dpr);
      } else {
         ctx.resetTransform();
         ctx.scale(dpr, dpr);
      }

      let cursorToSet = 'default';
      if (activeTool === 'hand' || isSpaceDown) cursorToSet = isDragging ? 'grabbing' : 'grab';
      else if (activeTool === 'select') cursorToSet = 'default';
      else cursorToSet = 'crosshair';

      ctx.clearRect(0, 0, displayWidth, displayHeight);
      
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);

      // Grid pattern
      ctx.fillStyle = '#020617'; // slate-950
      ctx.fillRect(-camera.x/camera.zoom, -camera.y/camera.zoom, displayWidth/camera.zoom, displayHeight/camera.zoom);
      
      ctx.beginPath();
      const gridSize = 50;
      const startX = -camera.x / camera.zoom;
      const startY = -camera.y / camera.zoom;
      const endX = startX + displayWidth / camera.zoom;
      const endY = startY + displayHeight / camera.zoom;
      
      for (let x = Math.floor(startX / gridSize) * gridSize; x <= endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = Math.floor(startY / gridSize) * gridSize; y <= endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.strokeStyle = '#0f172a'; // slate-900
      ctx.lineWidth = 1 / camera.zoom;
      ctx.stroke();

      // Render elements
      Object.values(elements).forEach(el => {
        if (el.isDeleted) return;
        if (editorState && editorState.id === el.id) return;
        ctx.save();
        const w = el.width || 0;
        const h = el.height || 0;

        if (el.rotation) {
           ctx.translate(el.x + w/2, el.y + h/2);
           ctx.rotate(el.rotation);
           ctx.translate(-(el.x + w/2), -(el.y + h/2));
        }

        if (el.type === 'freehand' || el.type === 'line') {
          const points = (el as any).points;
          if (points && points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(el.x + points[0].x, el.y + points[0].y);
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(el.x + points[i].x, el.y + points[i].y);
            }
            ctx.strokeStyle = el.style.strokeColor === "#0f172a" ? "#f8fafc" : (el.style.strokeColor || "#f8fafc");
            ctx.lineWidth = el.style.strokeWidth || 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
          }
        } else if (el.type === 'rectangle') {
            ctx.beginPath();
            ctx.rect(el.x, el.y, el.width, el.height);
            if (el.style.backgroundColor && el.style.backgroundColor !== 'transparent') {
                ctx.fillStyle = el.style.backgroundColor;
                ctx.fill();
            }
            ctx.strokeStyle = el.style.strokeColor === "#0f172a" ? "#f8fafc" : (el.style.strokeColor || "#f8fafc");
            ctx.lineWidth = el.style.strokeWidth || 3;
            ctx.stroke();
        } else if (el.type === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, Math.abs(el.width / 2), Math.abs(el.height / 2), 0, 0, 2 * Math.PI);
            if (el.style.backgroundColor && el.style.backgroundColor !== 'transparent') {
                ctx.fillStyle = el.style.backgroundColor;
                ctx.fill();
            }
            ctx.strokeStyle = el.style.strokeColor === "#0f172a" ? "#f8fafc" : (el.style.strokeColor || "#f8fafc");
            ctx.lineWidth = el.style.strokeWidth || 3;
            ctx.stroke();
        } else if (el.type === 'arrow') {
            const points = (el as any).points;
            if (points && points.length === 2) {
                const endPt = points[1];
                const ex = el.x + endPt.x;
                const ey = el.y + endPt.y;
                
                ctx.beginPath();
                ctx.moveTo(el.x + points[0].x, el.y + points[0].y);
                ctx.lineTo(ex, ey);
                ctx.strokeStyle = el.style.strokeColor === "#0f172a" ? "#f8fafc" : (el.style.strokeColor || "#f8fafc");
                ctx.lineWidth = el.style.strokeWidth || 3;
                ctx.lineCap = 'round';
                ctx.stroke();
                
                // Draw arrowhead
                const angle = Math.atan2(endPt.y - points[0].y, endPt.x - points[0].x);
                const headlen = 15;
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex - headlen * Math.cos(angle - Math.PI / 6), ey - headlen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex - headlen * Math.cos(angle + Math.PI / 6), ey - headlen * Math.sin(angle + Math.PI / 6));
                ctx.stroke();
            }
        } else if (el.type === 'text') {
            const textEl = el as any;
            ctx.font = `${textEl.fontSize}px ${textEl.fontFamily}`;
            
            const lines = textEl.text.split('\n');
            let maxWidth = 0;
            lines.forEach((line: string) => {
               maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
            });
            const textHeight = lines.length * textEl.fontSize * 1.2;

            if (el.style.backgroundColor && el.style.backgroundColor !== 'transparent') {
                const pad = 12; // padding
                ctx.fillStyle = el.style.backgroundColor;
                // Add some shadow for stickyness
                ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
                ctx.shadowBlur = 8 / camera.zoom;
                ctx.shadowOffsetY = 4 / camera.zoom;
                
                ctx.beginPath();
                ctx.roundRect(el.x - pad, el.y - pad, maxWidth + pad * 2, textHeight + pad * 2, 8);
                ctx.fill();
                
                ctx.shadowColor = 'transparent';
                
                // Add stroke if specified
                if (el.style.strokeWidth && el.style.strokeColor && el.style.strokeColor !== 'transparent' && el.style.strokeColor !== "#0f172a") {
                    ctx.strokeStyle = el.style.strokeColor;
                    ctx.lineWidth = el.style.strokeWidth;
                    ctx.stroke();
                }
            }

            ctx.fillStyle = textEl.style.strokeColor === "#0f172a" ? "#f8fafc" : (textEl.style.strokeColor || "#f8fafc");
            ctx.textBaseline = 'top';
            
            lines.forEach((line: string, i: number) => {
               ctx.fillText(line, textEl.x, textEl.y + (i * textEl.fontSize * 1.2));
            });
        } else if (el.type === 'image') {
            const imageEl = el as any;
            if (imageEl.dataUrl) {
                let img = imageCache.get(imageEl.id);
                if (!img) {
                    img = new Image();
                    img.src = imageEl.dataUrl;
                    imageCache.set(imageEl.id, img);
                }
                if (img.complete && img.naturalWidth > 0) {
                    ctx.drawImage(img, el.x, el.y, el.width, el.height);
                }
            }
        }
        ctx.restore();
      });

      // Render selection bounds
      selectedIds.forEach(id => {
          const el = elements[id];
          if (!el || el.isDeleted) return;

          ctx.save();
          if (el.rotation) {
             ctx.translate(el.x + el.width/2, el.y + el.height/2);
             ctx.rotate(el.rotation);
             ctx.translate(-(el.x + el.width/2), -(el.y + el.height/2));
          }

          ctx.strokeStyle = '#0d9488';
          ctx.lineWidth = 1.5 / camera.zoom;
          ctx.setLineDash([5 / camera.zoom, 5 / camera.zoom]);
          
          let boundsX = Math.min(el.x, el.x + el.width);
          let boundsY = Math.min(el.y, el.y + el.height);
          let boundsW = Math.abs(el.width);
          let boundsH = Math.abs(el.height);
          
          // Padding for bounds
          const p = 8 / camera.zoom;
          
          if (el.type === 'freehand' || el.type === 'line' || el.type === 'arrow') {
              // For freehand, line, and arrow, width/height is technically not used, 
              // so just fallback to computed bounds if we were doing deep bounding box calculation.
              // Currently, the selection might look odd for freehand if width/height are 0.
              // Let's ensure bounds are valid:
              if (boundsW === 0 && boundsH === 0) {
                  boundsW = 50; boundsH = 50;
              }
          }

          ctx.strokeRect(boundsX - p, boundsY - p, boundsW + p*2, boundsH + p*2);
          
          // Rotation handle
          if (selectedIds.length === 1 && (el.type === 'rectangle' || el.type === 'ellipse')) {
              const { hx, hy, cx, cy } = getRotationHandleLocal(el, camera.zoom);
              const handleX = el.x + hx;
              const handleY = el.y + hy;
              
              const isActive = isRotating && rotatingElementId === el.id;
              
              // Draw connection line
              ctx.setLineDash([]);
              ctx.beginPath();
              ctx.moveTo(el.x + el.width, el.y + el.height);
              ctx.lineTo(handleX, handleY);
              ctx.lineWidth = 1.5 / camera.zoom;
              ctx.strokeStyle = isActive ? '#0f766e' : '#0d9488';
              ctx.stroke();
              
              // Draw handle circle
              const hr = 9 / camera.zoom;
              ctx.beginPath();
              ctx.arc(handleX, handleY, hr, 0, Math.PI * 2);
              ctx.fillStyle = isActive ? '#ccfbf1' : '#ffffff';
              ctx.fill();
              ctx.lineWidth = 1.5 / camera.zoom;
              ctx.strokeStyle = isActive ? '#0f766e' : '#0d9488';
              ctx.stroke();

              // Draw UI/UX Rotate Icon inside the circle
              ctx.save();
              ctx.translate(handleX, handleY);
              const scale = 0.55 / camera.zoom;
              ctx.scale(scale, scale);
              ctx.translate(-12, -12); 
              
              ctx.lineWidth = 3; 
              ctx.strokeStyle = isActive ? '#0f766e' : '#0d9488';
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              if (!ROTATE_ICON_PATH) {
                  ROTATE_ICON_PATH = new Path2D("M 23 4 L 23 10 L 17 10 M 20.49 15 a 9 9 0 1 1 -2.12 -9.36 L 23 10");
              }
              ctx.stroke(ROTATE_ICON_PATH);
              ctx.restore();

              // Tooltip & Cursor logic
              if (lastPointerPos.current && activeTool === 'select') {
                  const worldPt = screenToWorld(lastPointerPos.current, camera);
                  const rot = el.rotation || 0;
                  
                  // Vector from center to handle
                  const dx = hx - cx;
                  const dy = hy - cy;
                  
                  // Rotated vector
                  const rdx = dx * Math.cos(rot) - dy * Math.sin(rot);
                  const rdy = dx * Math.sin(rot) + dy * Math.cos(rot);
                  
                  // True world position of the handle
                  const handleWorldPt = { x: el.x + cx + rdx, y: el.y + cy + rdy };
                  
                  const dist = Math.hypot(worldPt.x - handleWorldPt.x, worldPt.y - handleWorldPt.y);
                  const isHovering = dist <= hr * 1.5; 
                  
                  if (isHovering) cursorToSet = 'alias';
                  
                  if (isHovering || isActive) {
                      ctx.save();
                      ctx.setTransform(1, 0, 0, 1, 0, 0); 
                      const screenPt = {
                          x: handleWorldPt.x * camera.zoom + camera.x,
                          y: handleWorldPt.y * camera.zoom + camera.y
                      };
                      
                      ctx.font = '12px Inter, sans-serif';
                      const text = "Hold Shift to snap 15°";
                      const tw = ctx.measureText(text).width;
                      
                      ctx.fillStyle = '#f8fafc'; // light tooltip bg for dark mode
                      ctx.beginPath();
                      ctx.roundRect(screenPt.x - tw/2 - 8, screenPt.y - 35, tw + 16, 24, 6);
                      ctx.fill();
                      
                      ctx.fillStyle = '#0f172a'; // dark text for tooltip
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillText(text, screenPt.x, screenPt.y - 23);
                      ctx.restore();
                  }
              }
          }

          ctx.restore();
      });

      // Render multiplayer cursors
      Object.entries(cursors).forEach(([userId, cursor]) => {
        ctx.save();
        ctx.translate(cursor.x, cursor.y);
        
        ctx.beginPath();
        // Draw a simple cursor shape
        ctx.moveTo(0, 0);
        ctx.lineTo(15 / camera.zoom, 15 / camera.zoom);
        ctx.lineTo(5 / camera.zoom, 15 / camera.zoom);
        ctx.lineTo(0, 20 / camera.zoom);
        ctx.closePath();
        
        const color = cursor.color || '#ef4444';
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / camera.zoom;
        ctx.stroke();

        if (cursor.name) {
          const fontSize = 12 / camera.zoom;
          ctx.font = `600 ${fontSize}px Inter, sans-serif`;
          const textWidth = ctx.measureText(cursor.name).width;
          const paddingX = 8 / camera.zoom;
          const paddingY = 4 / camera.zoom;
          
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(
            12 / camera.zoom, 
            16 / camera.zoom, 
            textWidth + paddingX * 2, 
            fontSize + paddingY * 2, 
            4 / camera.zoom
          );
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'top';
          ctx.fillText(cursor.name, 12 / camera.zoom + paddingX, 16 / camera.zoom + paddingY);
        }
        
        ctx.restore();
      });

      ctx.restore();

      if (isRotating) cursorToSet = 'grabbing';
      if (canvas.style.cursor !== cursorToSet) {
          canvas.style.cursor = cursorToSet;
      }

      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [elements, camera, selectedIds, editorState, cursors]);

  const [interactiveIframeId, setInteractiveIframeId] = useState<string | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    if (e.button !== 0 && e.button !== 1) return;
    
    // Reset interactive iframe on any click on the canvas
    setInteractiveIframeId(null);

    const worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, camera);

    if (activeTool === 'hand' || isSpaceDown || e.button === 1) {
       setIsDrawing(true);
       return;
    }

    // Check rotation handles first, regardless of active tool
    for (const id of selectedIds) {
        const el = elements[id];
        if (el && (el.type === 'rectangle' || el.type === 'ellipse')) {
            const { hx, hy, cx, cy } = getRotationHandleLocal(el, camera.zoom);
            
            const rot = el.rotation || 0;
            const dx = hx - cx;
            const dy = hy - cy;
            
            const rdx = dx * Math.cos(rot) - dy * Math.sin(rot);
            const rdy = dx * Math.sin(rot) + dy * Math.cos(rot);
            
            const handleWorldPt = { x: el.x + cx + rdx, y: el.y + cy + rdy };
            
            const dist = Math.hypot(worldPt.x - handleWorldPt.x, worldPt.y - handleWorldPt.y);
            const hr = 9 / camera.zoom;
            if (dist <= hr * 1.5) {
                setIsRotating(true);
                setRotatingElementId(id);
                setRotationInitialState({ rotation: rot });
                return;
            }
        }
    }
    
    if (activeTool === 'select') {
       const hitElement = getElementAtPoint(worldPt, Object.values(elements), camera.zoom);
       if (hitElement) {
         setSelectedIds([hitElement.id]);
         setIsDragging(true);
         setDragStartPoint(worldPt);
         setDragInitialStates({
           [hitElement.id]: { x: hitElement.x, y: hitElement.y }
         });
       } else {
         setSelectedIds([]);
       }
       return;
    }
    
    if (activeTool === 'eraser') {
       const hitElement = getElementAtPoint(worldPt, Object.values(elements), camera.zoom);
       if (hitElement) {
         commandManager.executeCommand(new DeleteElementsCommand([hitElement.id]));
       }
       setIsDrawing(true);
       return;
    }
    
    // Creating new element
    setSelectedIds([]);
    const newId = uuidv4();
    setCurrentElementId(newId);
    setIsDrawing(true);
    
    const baseEl = {
      id: newId,
      version: 1,
      authorId: 'local',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
      x: worldPt.x,
      y: worldPt.y,
      width: 0,
      height: 0,
      style: { ...defaultStyle }
    };

    if (activeTool === 'freehand') {
      addElement({ ...baseEl, type: 'freehand', points: [{x:0, y:0}] } as any);
    } else if (activeTool === 'rectangle') {
      addElement({ ...baseEl, type: 'rectangle' } as any);
    } else if (activeTool === 'ellipse') {
      addElement({ ...baseEl, type: 'ellipse' } as any);
    } else if (activeTool === 'line') {
      addElement({ ...baseEl, type: 'line', points: [{x:0, y:0}, {x:0, y:0}] } as any);
    } else if (activeTool === 'arrow') {
      addElement({ ...baseEl, type: 'arrow', points: [{x:0, y:0}, {x:0, y:0}] } as any);
    } else if (activeTool === 'text') {
        const textEl = { ...baseEl, type: 'text', text: '', fontSize: 32, fontFamily: 'Inter, sans-serif', style: { ...baseEl.style, backgroundColor: 'transparent', strokeColor: '#f8fafc', strokeWidth: 4 } } as any;
        addElement(textEl);
        commandManager.executeCommand(new AddElementCommand(textEl));
        setEditorState({
           x: worldPt.x,
           y: worldPt.y,
           id: newId,
           initialText: ''
        });
        setIsDrawing(false);
        setCurrentElementId(null);
        setSelectedIds([newId]);
        useBoardStore.getState().setActiveTool('select');
    } else if (activeTool === 'iframe') {
        const url = prompt('Enter website URL to embed (e.g., https://youtube.com/embed/...)');
        if (url) {
          const iframeEl = { ...baseEl, type: 'iframe', url, width: 800, height: 600 } as any;
          addElement(iframeEl);
          commandManager.executeCommand(new AddElementCommand(iframeEl));
          setSelectedIds([newId]);
        } else {
          setIsDrawing(false);
          setCurrentElementId(null);
        }
        useBoardStore.getState().setActiveTool('select');
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, camera);

    // Throttle cursor emit
    const socket = getSocket();
    if (socket.connected && boardId) {
      // Very basic throttle for cursor emit (ideally use a real throttle function)
      if (Math.random() < 0.3) {
        socket.emit('cursor-move', { 
          boardId, 
          cursor: { 
            x: worldPt.x, 
            y: worldPt.y, 
            color: '#3b82f6',
            name: session?.user?.name || 'Anonymous',
            avatar: session?.user?.image || undefined
          } 
        });
      }
    }

    if (activeTool === 'hand' || isSpaceDown || e.buttons === 4) {
      if (isDrawing) {
        setCamera(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
      }
      return;
    }

    if (activeTool === 'eraser' && isDrawing) {
       const hitElement = getElementAtPoint(worldPt, Object.values(elements), camera.zoom);
       if (hitElement) {
         commandManager.executeCommand(new DeleteElementsCommand([hitElement.id]));
       }
       return;
    }

    if (activeTool === 'select' && isDragging && dragStartPoint) {
      const dx = worldPt.x - dragStartPoint.x;
      const dy = worldPt.y - dragStartPoint.y;
      selectedIds.forEach(id => {
        const initial = dragInitialStates[id];
        if (initial && initial.x !== undefined && initial.y !== undefined) {
          updateElement(id, {
            x: initial.x + dx,
            y: initial.y + dy
          });
        }
      });
      return;
    }

    if (isRotating && rotatingElementId) {
        const el = elements[rotatingElementId];
        if (!el) return;
        
        const { hx, hy, cx, cy } = getRotationHandleLocal(el, camera.zoom);
        const centerWorldX = el.x + cx;
        const centerWorldY = el.y + cy;
        
        const baseAngle = Math.atan2(hy - cy, hx - cx);
        const currentAngle = Math.atan2(worldPt.y - centerWorldY, worldPt.x - centerWorldX);
        
        let newRotation = currentAngle - baseAngle;
        
        if (e.shiftKey) {
            const snap = (15 * Math.PI) / 180;
            newRotation = Math.round(newRotation / snap) * snap;
        }
        
        updateElement(rotatingElementId, { rotation: newRotation });
        return;
    }
    
    if (isDrawing && currentElementId) {
       const el = elements[currentElementId];
       if (!el) return;
       
       if (el.type === 'freehand') {
         const freehand = el as FreehandElement;
         updateElement(currentElementId, {
            points: [...freehand.points, { x: worldPt.x - el.x, y: worldPt.y - el.y }]
         } as any);
       } else if (el.type === 'line' || el.type === 'arrow') {
         const lineEl = el as LineElement | ArrowElement;
         updateElement(currentElementId, {
            points: [lineEl.points[0], { x: worldPt.x - el.x, y: worldPt.y - el.y }]
         } as any);
       } else if (el.type === 'rectangle' || el.type === 'ellipse') {
         updateElement(currentElementId, {
            width: worldPt.x - el.x,
            height: worldPt.y - el.y
         });
       }
    }
  };

  const handlePointerUp = () => {
    if (isDrawing && currentElementId) {
      const el = elements[currentElementId];
      if (el) {
        commandManager.pushCommand(new AddElementCommand(el));
      }
    }

    if (activeTool === 'select' && isDragging && selectedIds.length > 0) {
       const updates = selectedIds.map(id => {
         const el = elements[id];
         return {
           id,
           oldState: dragInitialStates[id] || {},
           newState: { x: el.x, y: el.y }
         };
       });
       
       if (updates.some(u => u.oldState.x !== u.newState.x || u.oldState.y !== u.newState.y)) {
         commandManager.pushCommand(new UpdateElementsCommand(updates));
       }
    }

    if (isRotating && rotatingElementId && rotationInitialState) {
        const el = elements[rotatingElementId];
        if (el && el.rotation !== rotationInitialState.rotation) {
             commandManager.pushCommand(new UpdateElementsCommand([{
                 id: el.id,
                 oldState: { rotation: rotationInitialState.rotation },
                 newState: { rotation: el.rotation }
             }]));
        }
    }

    setIsDrawing(false);
    setIsDragging(false);
    setIsRotating(false);
    setCurrentElementId(null);
    setRotatingElementId(null);
    setRotationInitialState(null);
    setDragStartPoint(null);
    setDragInitialStates({});
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, camera);
    const hitElement = getElementAtPoint(worldPt, Object.values(elements), camera.zoom);
    
    if (hitElement && hitElement.type === 'text') {
      const textEl = hitElement as any;
      setEditorState({
        x: textEl.x,
        y: textEl.y,
        id: hitElement.id,
        initialText: textEl.text
      });
      setSelectedIds([hitElement.id]);
    } else if (hitElement && hitElement.type === 'iframe') {
      setSelectedIds([hitElement.id]);
      setInteractiveIframeId(hitElement.id);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.indexOf('image') !== -1) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (typeof ev.target?.result === 'string') {
             const img = new Image();
             img.onload = () => {
               const id = uuidv4();
               const state = useBoardStore.getState();
               const worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, state.camera);
               
               const newImage = {
                 id,
                 type: 'image' as const,
                 version: 1,
                 authorId: 'local',
                 createdAt: Date.now(),
                 updatedAt: Date.now(),
                 isDeleted: false,
                 x: worldPt.x - img.naturalWidth / 2,
                 y: worldPt.y - img.naturalHeight / 2,
                 width: img.naturalWidth,
                 height: img.naturalHeight,
                 dataUrl: ev.target!.result as string,
                 style: {}
               };
               state.addElement(newImage as any);
               commandManager.pushCommand(new AddElementCommand(newImage as any));
             };
             img.src = ev.target.result;
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  return (
    <div ref={containerRef} className="absolute inset-0 touch-none outline-none overflow-hidden" onDrop={handleDrop} onDragOver={handleDragOver}>
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 touch-none outline-none w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        tabIndex={0} 
      />
      
      {/* HTML Overlays (Iframes and Screenshares) */}
      <div 
        className="absolute origin-top-left pointer-events-none"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`
        }}
      >
        {Object.values(elements).filter(el => !el.isDeleted && ['iframe', 'screenshare'].includes(el.type)).map((el: any) => {
          const isSelected = selectedIds.includes(el.id);
          
          if (el.type === 'screenshare') {
            return (
              <CanvasScreenShare 
                key={el.id} 
                el={el} 
                isSelected={isSelected} 
                activeTool={activeTool} 
                isInteractive={interactiveIframeId === el.id}
              />
            );
          }

          const isYouTube = el.url.includes('youtube.com');
          
          if (isYouTube) {
            return (
              <SyncedYouTube 
                key={el.id} 
                el={el} 
                boardId={boardId} 
                isSelected={isSelected} 
                activeTool={activeTool} 
                isInteractive={interactiveIframeId === el.id}
              />
            );
          }

          return (
            <GenericIframe 
              key={el.id} 
              el={el} 
              isSelected={isSelected} 
              activeTool={activeTool} 
              isInteractive={interactiveIframeId === el.id}
            />
          );
        })}
      </div>

      {editorState && (
        <TextEditorOverlay
          key={editorState.id}
          {...editorState}
          camera={camera}
          onClose={() => setEditorState(prev => prev?.id === editorState.id ? null : prev)}
        />
      )}
    </div>
  );
}
