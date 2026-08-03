import { Point, BoardElement, FreehandElement, LineElement, TextElement } from '@/types/shared';

export function screenToWorld(
  screenPoint: Point,
  camera: { x: number; y: number; zoom: number }
): Point {
  return {
    x: (screenPoint.x - camera.x) / camera.zoom,
    y: (screenPoint.y - camera.y) / camera.zoom,
  };
}

export function worldToScreen(
  worldPoint: Point,
  camera: { x: number; y: number; zoom: number }
): Point {
  return {
    x: worldPoint.x * camera.zoom + camera.x,
    y: worldPoint.y * camera.zoom + camera.y,
  };
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function getBoundingBox(element: BoardElement): BoundingBox {
  let minX = 0, minY = 0, maxX = element.width, maxY = element.height;

  if (element.type === 'freehand') {
    const freehand = element as FreehandElement;
    if (freehand.points.length > 0) {
      const xs = freehand.points.map(p => p.x);
      const ys = freehand.points.map(p => p.y);
      minX = Math.min(...xs); minY = Math.min(...ys);
      maxX = Math.max(...xs); maxY = Math.max(...ys);
    }
  } else if (element.type === 'line' || element.type === 'arrow') {
    const line = element as LineElement;
    if (line.points.length > 0) {
      const xs = line.points.map(p => p.x);
      const ys = line.points.map(p => p.y);
      minX = Math.min(...xs); minY = Math.min(...ys);
      maxX = Math.max(...xs); maxY = Math.max(...ys);
    }
  } else if (element.type === 'text') {
    const textEl = element as TextElement;
    const lines = textEl.text.split('\n');
    const maxLineLength = Math.max(0, ...lines.map(l => l.length));
    maxX = maxLineLength * (textEl.fontSize * 0.6); 
    maxY = lines.length * (textEl.fontSize * 1.2);
  }

  // Handle negative sizes if drawn backwards
  if (maxX < minX) { const t = minX; minX = maxX; maxX = t; }
  if (maxY < minY) { const t = minY; minY = maxY; maxY = t; }

  return {
    minX: element.x + minX,
    minY: element.y + minY,
    maxX: element.x + maxX,
    maxY: element.y + maxY,
  };
}

export function pointInBox(point: Point, box: BoundingBox, padding = 10): boolean {
  return (
    point.x >= box.minX - padding &&
    point.x <= box.maxX + padding &&
    point.y >= box.minY - padding &&
    point.y <= box.maxY + padding
  );
}

function distanceToLineSegment(p: Point, a: Point, b: Point): number {
  const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y)
  };
  return Math.hypot(p.x - projection.x, p.y - projection.y);
}

export function isPointNearElement(point: Point, element: BoardElement, zoom: number): boolean {
  let px = point.x - element.x;
  let py = point.y - element.y;

  if (element.rotation && (element.type === 'rectangle' || element.type === 'ellipse' || element.type === 'sticky' || element.type === 'image' || element.type === 'iframe')) {
    const cx = element.width / 2;
    const cy = element.height / 2;
    const dx = px - cx;
    const dy = py - cy;
    const cos = Math.cos(-element.rotation);
    const sin = Math.sin(-element.rotation);
    px = cx + dx * cos - dy * sin;
    py = cy + dx * sin + dy * cos;
  }

  const worldTestPoint = { x: px + element.x, y: py + element.y };
  const padding = (element.style.strokeWidth || 3) + (10 / zoom);
  const box = getBoundingBox(element);
  
  if (!pointInBox(worldTestPoint, box, padding)) {
    return false;
  }

  const pt = { x: px, y: py };
  const hitTolerance = Math.max(6 / zoom, padding);

  if (element.type === 'line' || element.type === 'arrow') {
    const line = element as LineElement;
    if (line.points.length < 2) return false;
    return distanceToLineSegment(pt, line.points[0], line.points[1]) <= hitTolerance;
  }

  if (element.type === 'freehand') {
    const freehand = element as FreehandElement;
    for (let i = 0; i < freehand.points.length - 1; i++) {
      if (distanceToLineSegment(pt, freehand.points[i], freehand.points[i+1]) <= hitTolerance) {
        return true;
      }
    }
    return false;
  }

  if (element.type === 'rectangle' || element.type === 'sticky' || element.type === 'image' || element.type === 'iframe') {
    const rx1 = Math.min(0, element.width);
    const rx2 = Math.max(0, element.width);
    const ry1 = Math.min(0, element.height);
    const ry2 = Math.max(0, element.height);

    if (element.type === 'iframe' || element.type === 'image' || (element.style.backgroundColor && element.style.backgroundColor !== 'transparent')) {
      return px >= rx1 && px <= rx2 && py >= ry1 && py <= ry2;
    }

    const distLeft = Math.abs(px - rx1);
    const distRight = Math.abs(px - rx2);
    const distTop = Math.abs(py - ry1);
    const distBottom = Math.abs(py - ry2);
    
    if (px >= rx1 - hitTolerance && px <= rx2 + hitTolerance &&
        py >= ry1 - hitTolerance && py <= ry2 + hitTolerance) {
      if (Math.min(distLeft, distRight, distTop, distBottom) <= hitTolerance) {
        return true;
      }
    }
    return false;
  }

  if (element.type === 'ellipse') {
    const rx = Math.abs(element.width / 2);
    const ry = Math.abs(element.height / 2);
    const cx = element.width / 2;
    const cy = element.height / 2;
    
    if (rx === 0 || ry === 0) return false;

    if (rx === 0 || ry === 0) return false;

    const dx = px - cx;
    const dy = py - cy;
    
    const value = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
    
    if (element.style.backgroundColor && element.style.backgroundColor !== 'transparent') {
      return value <= 1;
    }
    
    const f = value - 1;
    const gradX = (2 * dx) / (rx * rx);
    const gradY = (2 * dy) / (ry * ry);
    const gradMag = Math.hypot(gradX, gradY);
    
    if (gradMag === 0) return false;
    
    const approxDist = Math.abs(f) / gradMag;
    
    return approxDist <= hitTolerance;
  }

  if (element.type === 'text') {
    return true; 
  }

  return false;
}

export function getElementAtPoint(
  point: Point,
  elements: BoardElement[],
  zoom: number
): BoardElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.isDeleted) continue;
    if (isPointNearElement(point, el, zoom)) {
      return el;
    }
  }
  return null;
}
