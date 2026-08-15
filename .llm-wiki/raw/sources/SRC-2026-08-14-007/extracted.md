// Tool definitions — to be implemented
import { Type } from "typebox";

export const taskOpenSchema = Type.Object({
  path: Type.String({ description: "Path to TODO.md file" }),
});

export const taskAddSchema = Type.Object({
  text: Type.String({ description: "Task text" }),
  category: Type.Optional(Type.String({ description: "Category (inbox, today, someday, done)" })),
  priority: Type.Optional(Type.String({ description: "Priority (high, medium, low)" })),
});

export const taskEditSchema = Type.Object({
  id: Type.String({ description: "Task ID" }),
  text: Type.Optional(Type.String({ description: "New task text" })),
  completed: Type.Optional(Type.Boolean({ description: "Mark as done" })),
  priority: Type.Optional(Type.String({ description: "New priority" })),
});

export const taskMoveSchema = Type.Object({
  id: Type.String({ description: "Task ID" }),
  category: Type.String({ description: "Target category" }),
});

export const taskGetSchema = Type.Object({
  id: Type.String({ description: "Task ID" }),
});

export const taskListSchema = Type.Object({
  category: Type.Optional(Type.String({ description: "Filter by category" })),
  priority: Type.Optional(Type.String({ description: "Filter by priority" })),
});

export const taskSaveSchema = Type.Object({});

export const taskCloseSchema = Type.Object({});
