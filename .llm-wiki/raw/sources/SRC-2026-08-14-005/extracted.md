// Task interface — ported from Python Task dataclass
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  emoji?: string;
  category?: string;
  priority?: string;
  project?: string;
  context?: string;
  tags?: string[];
  due?: string;
  created?: string;
  modified?: string;
  indent: number;
}
