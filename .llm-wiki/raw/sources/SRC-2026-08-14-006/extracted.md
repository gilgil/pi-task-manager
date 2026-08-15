// TaskManager — ported from Python TaskManager class
import type { Task } from "./task";

export class TaskManager {
  private _path: string | null = null;
  private _tasks: Task[] = [];

  openFile(path: string): void {
    this._path = path;
    // TODO: read and parse the file
  }

  addTask(text: string, category?: string, priority?: string): Task {
    // TODO: implement
    throw new Error("Not implemented");
  }

  editTask(id: string, changes: Partial<Task>): Task {
    // TODO: implement
    throw new Error("Not implemented");
  }

  moveTask(id: string, category: string): Task {
    // TODO: implement
    throw new Error("Not implemented");
  }

  getTask(id: string): Task | null {
    // TODO: implement
    return null;
  }

  listTasks(category?: string, priority?: string): Task[] {
    // TODO: implement
    return [];
  }

  save(): void {
    // TODO: implement
  }

  closeFile(): void {
    this._path = null;
    this._tasks = [];
  }
}
