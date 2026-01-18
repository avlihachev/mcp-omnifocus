export interface OmniFocusTask {
  id: string;
  name: string;
  note?: string;
  project?: string;
  flagged?: boolean;
  dueDate?: string;
  completed?: boolean;
}

export interface CreateTaskInput {
  name: string;
  note?: string;
  project?: string;
  flagged?: boolean;
  dueDate?: string;
}

export interface UpdateTaskInput {
  taskId: string;
  name?: string;
  note?: string;
  flagged?: boolean;
  dueDate?: string;
}

export interface GetTasksInput {
  filter?: "flagged" | "due_today" | "all";
}

export interface CompleteTaskInput {
  taskId: string;
}

export type OmniFocusVersion = "pro" | "standard";

export interface OmniFocusProvider {
  version: OmniFocusVersion;
  getTasks(filter?: "flagged" | "due_today" | "all"): Promise<OmniFocusTask[]>;
  createTask(input: CreateTaskInput): Promise<{ success: boolean; taskId?: string; warning?: string }>;
  updateTask(input: UpdateTaskInput): Promise<{ success: boolean; warning?: string }>;
  completeTask(taskId: string): Promise<{ success: boolean; warning?: string }>;
  getProjects(): Promise<string[]>;
}
