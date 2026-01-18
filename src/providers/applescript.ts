import { spawn } from "child_process";
import type { OmniFocusProvider, OmniFocusTask, CreateTaskInput, UpdateTaskInput, OmniFocusConfig } from "../types.js";

async function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("osascript", ["-"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`AppleScript failed: ${stderr.trim() || "Unknown error"}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.stdin.write(script);
    child.stdin.end();
  });
}

function escapeAppleScriptString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

export class AppleScriptProvider implements OmniFocusProvider {
  version = "pro" as const;
  config: OmniFocusConfig = { directSqlAccess: false };

  setConfig(newConfig: Partial<OmniFocusConfig>): void {
    // AppleScript provider doesn't use SQL, config is ignored
    Object.assign(this.config, newConfig);
  }

  async getTasks(filter?: "flagged" | "due_today" | "all"): Promise<OmniFocusTask[]> {
    let condition = "";
    if (filter === "flagged") {
      condition = "whose flagged is true";
    } else if (filter === "due_today") {
      condition = "whose due date is not missing value and due date < (current date) + 1 * days";
    }

    const script = `
      tell application "OmniFocus"
        tell default document
          set taskList to {}
          set theTasks to flattened tasks ${condition}
          repeat with t in theTasks
            if completed of t is false then
              set taskId to id of t
              set taskName to name of t
              set taskNote to note of t
              set taskFlagged to flagged of t
              set taskDue to ""
              if due date of t is not missing value then
                set taskDue to (due date of t) as «class isot» as string
              end if
              set projectName to ""
              try
                set projectName to name of containing project of t
              end try
              set end of taskList to taskId & "|||" & taskName & "|||" & taskNote & "|||" & taskFlagged & "|||" & taskDue & "|||" & projectName
            end if
          end repeat
          return taskList
        end tell
      end tell
    `;

    const result = await runAppleScript(script);
    if (!result) return [];

    return result.split(", ").map(line => {
      const [id, name, note, flagged, dueDate, project] = line.split("|||");
      return {
        id,
        name,
        note: note || undefined,
        flagged: flagged === "true",
        dueDate: dueDate || undefined,
        project: project || undefined,
        completed: false
      };
    });
  }

  async createTask(input: CreateTaskInput): Promise<{ success: boolean; taskId?: string }> {
    const escapedName = escapeAppleScriptString(input.name);
    const props: string[] = [`name:"${escapedName}"`];

    if (input.note) {
      const escapedNote = escapeAppleScriptString(input.note);
      props.push(`note:"${escapedNote}"`);
    }
    if (input.flagged) {
      props.push("flagged:true");
    }
    if (input.dueDate) {
      const escapedDate = escapeAppleScriptString(input.dueDate);
      props.push(`due date:date "${escapedDate}"`);
    }

    let script: string;
    if (input.project) {
      const escapedProject = escapeAppleScriptString(input.project);
      script = `
        tell application "OmniFocus"
          tell default document
            set theProject to first flattened project whose name is "${escapedProject}"
            set newTask to make new task with properties {${props.join(", ")}} at end of tasks of theProject
            return id of newTask
          end tell
        end tell
      `;
    } else {
      script = `
        tell application "OmniFocus"
          tell default document
            set newTask to make new inbox task with properties {${props.join(", ")}}
            return id of newTask
          end tell
        end tell
      `;
    }

    const taskId = await runAppleScript(script);
    return { success: true, taskId };
  }

  async updateTask(input: UpdateTaskInput): Promise<{ success: boolean }> {
    const updates: string[] = [];
    const escapedTaskId = escapeAppleScriptString(input.taskId);

    if (input.name) {
      const escapedName = escapeAppleScriptString(input.name);
      updates.push(`set name of theTask to "${escapedName}"`);
    }
    if (input.note !== undefined) {
      const escapedNote = escapeAppleScriptString(input.note);
      updates.push(`set note of theTask to "${escapedNote}"`);
    }
    if (input.flagged !== undefined) {
      updates.push(`set flagged of theTask to ${input.flagged}`);
    }
    if (input.dueDate) {
      const escapedDate = escapeAppleScriptString(input.dueDate);
      updates.push(`set due date of theTask to date "${escapedDate}"`);
    }

    const script = `
      tell application "OmniFocus"
        tell default document
          set theTask to first flattened task whose id is "${escapedTaskId}"
          ${updates.join("\n          ")}
        end tell
      end tell
    `;

    await runAppleScript(script);
    return { success: true };
  }

  async completeTask(taskId: string): Promise<{ success: boolean }> {
    const escapedTaskId = escapeAppleScriptString(taskId);
    const script = `
      tell application "OmniFocus"
        tell default document
          set theTask to first flattened task whose id is "${escapedTaskId}"
          set completed of theTask to true
        end tell
      end tell
    `;

    await runAppleScript(script);
    return { success: true };
  }

  async getProjects(): Promise<string[]> {
    const script = `
      tell application "OmniFocus"
        tell default document
          set projectNames to {}
          repeat with p in flattened projects
            if status of p is active then
              set end of projectNames to name of p
            end if
          end repeat
          return projectNames
        end tell
      end tell
    `;

    const result = await runAppleScript(script);
    if (!result) return [];
    return result.split(", ");
  }
}
