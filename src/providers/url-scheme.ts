import { execFile } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import Database from "better-sqlite3";
import type { OmniFocusProvider, OmniFocusTask, CreateTaskInput, UpdateTaskInput, OmniFocusConfig } from "../types.js";
import { DEFAULT_TASK_LIMIT } from "../types.js";

const execFileAsync = promisify(execFile);

const DB_PATH = `${homedir()}/Library/Group Containers/34YW5XSRB7.com.omnigroup.OmniFocus/com.omnigroup.OmniFocus4/com.omnigroup.OmniFocusModel/OmniFocusDatabase.db`;

// Core Data (Apple) uses 2001-01-01 as epoch, Unix uses 1970-01-01
// difference is ~31 years (978307200 seconds)
const CORE_DATA_EPOCH_MS = new Date("2001-01-01T00:00:00Z").getTime();

function getDatabase(readonly = true): Database.Database {
  return new Database(DB_PATH, { readonly, fileMustExist: true });
}

export class UrlSchemeProvider implements OmniFocusProvider {
  version = "standard" as const;
  config: OmniFocusConfig = { directSqlAccess: true, taskLimit: DEFAULT_TASK_LIMIT };

  setConfig(newConfig: Partial<OmniFocusConfig>): void {
    Object.assign(this.config, newConfig);
  }

  async getTasks(filter?: "flagged" | "due_today" | "all"): Promise<OmniFocusTask[]> {
    const db = getDatabase(true);

    try {
      let whereClause = "t.dateCompleted IS NULL";

      if (filter === "flagged") {
        whereClause += " AND t.flagged = 1";
      } else if (filter === "due_today") {
        // '+31 years' converts Core Data epoch (2001) to Unix epoch (1970)
        whereClause += " AND date(t.dateDue, 'unixepoch', '+31 years') = date('now')";
      } else if (!filter || filter === "all") {
        whereClause += " AND (t.flagged = 1 OR date(t.dateDue, 'unixepoch', '+31 years') <= date('now'))";
      }

      const query = `
        SELECT
          t.persistentIdentifier as id,
          t.name,
          t.plainTextNote as note,
          t.flagged,
          datetime(t.dateDue, 'unixepoch', '+31 years') as dueDate,
          p.name as project
        FROM Task t
        LEFT JOIN ProjectInfo pi ON t.containingProjectInfo = pi.pk
        LEFT JOIN Task p ON pi.task = p.persistentIdentifier
        WHERE ${whereClause}
        ORDER BY t.dateDue ASC, t.flagged DESC
        LIMIT ${this.config.taskLimit}
      `;

      const rows = db.prepare(query).all() as Array<{
        id: string;
        name: string;
        note: string | null;
        flagged: number;
        dueDate: string | null;
        project: string | null;
      }>;

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        note: row.note || undefined,
        flagged: row.flagged === 1,
        dueDate: row.dueDate || undefined,
        project: row.project || undefined,
        completed: false
      }));
    } finally {
      db.close();
    }
  }

  async createTask(input: CreateTaskInput): Promise<{ success: boolean; warning?: string }> {
    const params = new URLSearchParams();
    params.set("name", input.name);
    params.set("autosave", "true");

    if (input.note) {
      params.set("note", input.note);
    }
    if (input.flagged) {
      params.set("flag", "true");
    }
    if (input.dueDate) {
      params.set("due", input.dueDate);
    }
    if (input.project) {
      params.set("project", input.project);
    }

    const url = `omnifocus:///add?${params.toString()}`;
    await execFileAsync("open", [url]);

    return {
      success: true,
      warning: "Task created via URL scheme. It will sync automatically."
    };
  }

  async updateTask(input: UpdateTaskInput): Promise<{ success: boolean; warning?: string }> {
    if (!this.config.directSqlAccess) {
      return {
        success: false,
        warning: "Direct SQL access is disabled. Update operations require directSqlAccess=true or OmniFocus Pro. Use omnifocus_set_config to enable it."
      };
    }

    const db = getDatabase(false);

    try {
      const updates: string[] = [];
      const params: Record<string, unknown> = {
        taskId: input.taskId
      };

      if (input.name !== undefined) {
        updates.push("name = @name");
        params.name = input.name;
      }
      if (input.note !== undefined) {
        updates.push("plainTextNote = @note");
        params.note = input.note;
      }
      if (input.flagged !== undefined) {
        updates.push("flagged = @flagged");
        params.flagged = input.flagged ? 1 : 0;
      }
      if (input.dueDate !== undefined) {
        const date = new Date(input.dueDate);
        const timestamp = (date.getTime() - CORE_DATA_EPOCH_MS) / 1000;
        updates.push("dateDue = @dateDue");
        params.dateDue = timestamp;
      }

      if (updates.length === 0) {
        return { success: true };
      }

      const query = `UPDATE Task SET ${updates.join(", ")} WHERE persistentIdentifier = @taskId`;
      const stmt = db.prepare(query);
      const result = stmt.run(params);

      if (result.changes === 0) {
        throw new Error("Task not found");
      }

      return {
        success: true,
        warning: "Task updated via SQLite. Changes won't sync until OmniFocus is restarted. Consider using OmniFocus Pro for full sync support."
      };
    } finally {
      db.close();
    }
  }

  async completeTask(taskId: string): Promise<{ success: boolean; warning?: string }> {
    if (!this.config.directSqlAccess) {
      return {
        success: false,
        warning: "Direct SQL access is disabled. Complete operations require directSqlAccess=true or OmniFocus Pro. Use omnifocus_set_config to enable it."
      };
    }

    const db = getDatabase(false);

    try {
      const now = new Date();
      const timestamp = (now.getTime() - CORE_DATA_EPOCH_MS) / 1000;

      const stmt = db.prepare("UPDATE Task SET dateCompleted = @timestamp WHERE persistentIdentifier = @taskId");
      const result = stmt.run({ timestamp, taskId });

      if (result.changes === 0) {
        throw new Error("Task not found");
      }

      return {
        success: true,
        warning: "Task marked complete via SQLite. Changes won't sync until OmniFocus is restarted. Consider using OmniFocus Pro for full sync support."
      };
    } finally {
      db.close();
    }
  }

  async getProjects(): Promise<string[]> {
    const db = getDatabase(true);

    try {
      const query = `
        SELECT t.name
        FROM Task t
        JOIN ProjectInfo pi ON t.persistentIdentifier = pi.task
        WHERE t.dateCompleted IS NULL
        ORDER BY t.name
      `;

      const rows = db.prepare(query).all() as Array<{ name: string }>;
      return rows.map(row => row.name);
    } finally {
      db.close();
    }
  }
}
