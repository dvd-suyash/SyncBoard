export * from '@prisma/client';

// 1. Basic Geometry and Styling
export type Point = { x: number; y: number };
export type Color = string; // e.g., '#000000'

export interface ElementStyle {
  strokeColor?: Color;
  backgroundColor?: Color;
  strokeWidth?: number;
  opacity?: number;
}

export type ElementType = 'freehand' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'text' | 'sticky' | 'image' | 'iframe' | 'screenshare';

export interface BaseElement {
  id: string;
  type: ElementType;
  version: number;
  authorId: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
  
  // Spatial properties
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // In radians
  
  style: ElementStyle;
}

// 3. Specific Element Types
export interface FreehandElement extends BaseElement {
  type: 'freehand';
  points: Point[]; // Points relative to x, y
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  cornerRadius?: number;
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
}

export interface LineElement extends BaseElement {
  type: 'line';
  points: [Point, Point]; // Start and end points relative to x, y
}

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  points: [Point, Point]; // Start and end points relative to x, y
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface StickyElement extends BaseElement {
  type: 'sticky';
  text: string;
  fontSize: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  dataUrl: string;
}

// 4. Union Type
export type BoardElement = 
  | FreehandElement
  | RectangleElement
  | EllipseElement
  | LineElement
  | ArrowElement
  | TextElement
  | StickyElement
  | ImageElement
  | IFrameElement;

export interface IFrameElement extends BaseElement {
  type: 'iframe';
  url: string;
}

// 5. Board Snapshot Structure
// A serializable, point-in-time capture of every element on a board.
export interface BoardSnapshotData {
  boardId: string;
  sequenceNumber: number; // Monotonically increasing sequence number at the time of snapshot
  elements: Record<string, BoardElement>; // Map of element ID to its full state
  timestamp: number;
}
