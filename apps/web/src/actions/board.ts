'use server';

import { prisma } from '../lib/db';
import { BoardElement } from '@/types/shared';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export async function createBoard(name: string = 'Untitled Board', customId?: string, allowEdit: boolean = true) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('You must be logged in to create a board');
  }

  const board = await prisma.board.create({
    data: {
      id: customId,
      name,
      ownerId: session.user.id,
      allowEdit,
    }
  });
  return board.id;
}

export async function joinOrCreateRoom(formData: FormData) {
  const roomCode = formData.get('roomCode')?.toString().toUpperCase().trim();
  
  if (roomCode) {
    redirect(`/board/${roomCode}`);
  } else {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let shortCode = '';
    for (let i = 0; i < 6; i++) {
      shortCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const newId = await createBoard('Random Room', shortCode);
    redirect(`/board/${newId}`);
  }
}

export async function createRoomFromLocal(elements: BoardElement[], allowEdit: boolean) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let shortCode = '';
  for (let i = 0; i < 6; i++) {
    shortCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  const newId = await createBoard('Shared Board', shortCode, allowEdit);
  
  // Save local elements to the new board
  if (elements && elements.length > 0) {
    await saveElements(newId, elements);
  }
  
  return newId;
}

export async function ensureDefaultBoard() {
  const DEFAULT_BOARD_NAME = 'Local Test Board';
  let board = await prisma.board.findFirst({ where: { name: DEFAULT_BOARD_NAME } });
  if (!board) {
    const newBoardId = await createBoard(DEFAULT_BOARD_NAME);
    board = await prisma.board.findUnique({ where: { id: newBoardId } });
  }
  return board!.id;
}

export async function getBoardElements(boardId: string) {
  const elements = await prisma.element.findMany({
    where: { boardId }
  });
  
  return elements.map(e => ({
    ...(e.data as any),
    id: e.id,
    type: e.type,
    version: e.version,
    authorId: e.authorId,
    createdAt: e.createdAt.getTime(),
    updatedAt: e.updatedAt.getTime(),
    isDeleted: e.isDeleted,
  })) as BoardElement[];
}

export async function saveElements(boardId: string, elements: BoardElement[]) {
  if (!elements.length) return true;

  const ops = elements.map(el => {
    const { id, type, version, authorId, createdAt, updatedAt, isDeleted, ...data } = el;
    return prisma.element.upsert({
      where: { id: el.id },
      create: {
        id: el.id,
        boardId,
        type: el.type,
        version: el.version,
        authorId: el.authorId,
        createdAt: new Date(el.createdAt),
        updatedAt: new Date(el.updatedAt),
        isDeleted: el.isDeleted,
        data: data as any,
      },
      update: {
        boardId,
        type: el.type,
        version: el.version,
        updatedAt: new Date(el.updatedAt),
        isDeleted: el.isDeleted,
        data: data as any,
      }
    });
  });
  
  await prisma.$transaction(ops);
  return true;
}

export async function getUserBoards() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }
  
  const boards = await prisma.board.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: 'desc' }
  });
  
  return boards;
}

export async function deleteBoard(boardId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board || board.ownerId !== session.user.id) throw new Error('Unauthorized');

  await prisma.element.deleteMany({ where: { boardId } });
  await prisma.board.delete({ where: { id: boardId } });
  return true;
}

export async function renameBoard(boardId: string, newName: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board || board.ownerId !== session.user.id) throw new Error('Unauthorized');

  await prisma.board.update({
    where: { id: boardId },
    data: { name: newName }
  });
  return true;
}
