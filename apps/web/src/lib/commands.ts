import { BoardElement } from '@/types/shared';
import { useBoardStore } from '../store/boardStore';

export interface Command {
  execute(): void;
  undo(): void;
}

export class CommandManager {
  private history: Command[] = [];
  private redoStack: Command[] = [];

  // Used when an action is triggered directly by the command
  executeCommand(command: Command) {
    command.execute();
    this.pushCommand(command);
  }

  // Used when the action was already applied to the UI optimistically (like during drawing)
  pushCommand(command: Command) {
    this.history.push(command);
    this.redoStack = [];
  }

  undo() {
    const command = this.history.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo() {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.history.push(command);
    }
  }
}

export const commandManager = new CommandManager();

// Specific Commands
export class AddElementCommand implements Command {
  constructor(private element: BoardElement) {}
  execute() { useBoardStore.getState().addElement(this.element); }
  undo() { useBoardStore.getState().removeElement(this.element.id); }
}

export class UpdateElementsCommand implements Command {
  constructor(
    private updates: { id: string; oldState: Partial<BoardElement>; newState: Partial<BoardElement> }[]
  ) {}
  execute() {
    const store = useBoardStore.getState();
    this.updates.forEach(u => store.updateElement(u.id, u.newState));
  }
  undo() {
    const store = useBoardStore.getState();
    this.updates.forEach(u => store.updateElement(u.id, u.oldState));
  }
}

export class DeleteElementsCommand implements Command {
  private oldStates: BoardElement[] = [];

  constructor(private elementIds: string[]) {}

  execute() {
    const state = useBoardStore.getState();
    this.oldStates = this.elementIds.map(id => state.elements[id]).filter(Boolean);
    this.elementIds.forEach(id => state.removeElement(id));
  }

  undo() {
    this.oldStates.forEach(el => useBoardStore.getState().addElement(el));
  }
}
