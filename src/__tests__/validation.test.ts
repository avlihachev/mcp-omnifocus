import { describe, it, expect } from 'vitest';
import {
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  CompleteTaskInputSchema,
  GetTasksInputSchema,
  SetConfigInputSchema,
} from '../validation.js';

describe('CreateTaskInputSchema', () => {
  it('should accept valid task with name only', () => {
    const result = CreateTaskInputSchema.safeParse({ name: 'Buy milk' });
    expect(result.success).toBe(true);
  });

  it('should accept task with all fields', () => {
    const result = CreateTaskInputSchema.safeParse({
      name: 'Buy milk',
      note: 'From the store',
      project: 'Shopping',
      flagged: true,
      dueDate: '2025-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = CreateTaskInputSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing name', () => {
    const result = CreateTaskInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject invalid date format', () => {
    const result = CreateTaskInputSchema.safeParse({
      name: 'Task',
      dueDate: '31-12-2025',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid ISO date', () => {
    const result = CreateTaskInputSchema.safeParse({
      name: 'Task',
      dueDate: '2025-01-15',
    });
    expect(result.success).toBe(true);
  });

  it('should reject name exceeding max length', () => {
    const result = CreateTaskInputSchema.safeParse({
      name: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateTaskInputSchema', () => {
  it('should accept valid update with taskId only', () => {
    const result = UpdateTaskInputSchema.safeParse({ taskId: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('should accept update with all fields', () => {
    const result = UpdateTaskInputSchema.safeParse({
      taskId: 'abc-123_456',
      name: 'Updated name',
      note: 'Updated note',
      flagged: false,
      dueDate: '2025-06-15',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing taskId', () => {
    const result = UpdateTaskInputSchema.safeParse({ name: 'New name' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid taskId characters', () => {
    const result = UpdateTaskInputSchema.safeParse({ taskId: 'task id with spaces' });
    expect(result.success).toBe(false);
  });

  it('should reject taskId with special characters', () => {
    const result = UpdateTaskInputSchema.safeParse({ taskId: 'task@id' });
    expect(result.success).toBe(false);
  });
});

describe('CompleteTaskInputSchema', () => {
  it('should accept valid taskId', () => {
    const result = CompleteTaskInputSchema.safeParse({ taskId: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('should reject empty taskId', () => {
    const result = CompleteTaskInputSchema.safeParse({ taskId: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing taskId', () => {
    const result = CompleteTaskInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('GetTasksInputSchema', () => {
  it('should accept empty object', () => {
    const result = GetTasksInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept flagged filter', () => {
    const result = GetTasksInputSchema.safeParse({ filter: 'flagged' });
    expect(result.success).toBe(true);
  });

  it('should accept due_today filter', () => {
    const result = GetTasksInputSchema.safeParse({ filter: 'due_today' });
    expect(result.success).toBe(true);
  });

  it('should accept all filter', () => {
    const result = GetTasksInputSchema.safeParse({ filter: 'all' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid filter', () => {
    const result = GetTasksInputSchema.safeParse({ filter: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('SetConfigInputSchema', () => {
  it('should accept empty object', () => {
    const result = SetConfigInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept directSqlAccess boolean', () => {
    const result = SetConfigInputSchema.safeParse({ directSqlAccess: true });
    expect(result.success).toBe(true);
  });

  it('should accept taskLimit within range', () => {
    const result = SetConfigInputSchema.safeParse({ taskLimit: 500 });
    expect(result.success).toBe(true);
  });

  it('should reject taskLimit below minimum', () => {
    const result = SetConfigInputSchema.safeParse({ taskLimit: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject taskLimit above maximum', () => {
    const result = SetConfigInputSchema.safeParse({ taskLimit: 10001 });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer taskLimit', () => {
    const result = SetConfigInputSchema.safeParse({ taskLimit: 100.5 });
    expect(result.success).toBe(false);
  });
});
