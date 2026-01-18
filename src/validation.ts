import { z } from "zod";

const MAX_NAME_LENGTH = 1000;
const MAX_NOTE_LENGTH = 10000;
const MAX_PROJECT_LENGTH = 500;
const MAX_TASK_ID_LENGTH = 100;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const dateSchema = z.string().regex(ISO_DATE_REGEX, "Invalid date format. Use YYYY-MM-DD").refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: "Invalid date value" }
);

const taskIdSchema = z.string()
  .min(1, "Task ID is required")
  .max(MAX_TASK_ID_LENGTH, `Task ID must be at most ${MAX_TASK_ID_LENGTH} characters`)
  .regex(/^[a-zA-Z0-9_-]+$/, "Task ID contains invalid characters");

export const CreateTaskInputSchema = z.object({
  name: z.string()
    .min(1, "Task name is required")
    .max(MAX_NAME_LENGTH, `Task name must be at most ${MAX_NAME_LENGTH} characters`),
  note: z.string()
    .max(MAX_NOTE_LENGTH, `Note must be at most ${MAX_NOTE_LENGTH} characters`)
    .optional(),
  project: z.string()
    .max(MAX_PROJECT_LENGTH, `Project name must be at most ${MAX_PROJECT_LENGTH} characters`)
    .optional(),
  flagged: z.boolean().optional(),
  dueDate: dateSchema.optional(),
});

export const UpdateTaskInputSchema = z.object({
  taskId: taskIdSchema,
  name: z.string()
    .min(1, "Task name cannot be empty")
    .max(MAX_NAME_LENGTH, `Task name must be at most ${MAX_NAME_LENGTH} characters`)
    .optional(),
  note: z.string()
    .max(MAX_NOTE_LENGTH, `Note must be at most ${MAX_NOTE_LENGTH} characters`)
    .optional(),
  flagged: z.boolean().optional(),
  dueDate: dateSchema.optional(),
});

export const CompleteTaskInputSchema = z.object({
  taskId: taskIdSchema,
});

export const GetTasksInputSchema = z.object({
  filter: z.enum(["flagged", "due_today", "all"]).optional(),
});

export const SetConfigInputSchema = z.object({
  directSqlAccess: z.boolean().optional(),
  taskLimit: z.number().int().min(1).max(10000).optional(),
});

export type ValidatedCreateTaskInput = z.infer<typeof CreateTaskInputSchema>;
export type ValidatedUpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;
export type ValidatedCompleteTaskInput = z.infer<typeof CompleteTaskInputSchema>;
export type ValidatedGetTasksInput = z.infer<typeof GetTasksInputSchema>;
export type ValidatedSetConfigInput = z.infer<typeof SetConfigInputSchema>;
