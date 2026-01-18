#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createRequire } from "module";

import { ZodError } from "zod";

const require = createRequire(import.meta.url);
const { version: PACKAGE_VERSION } = require("../package.json");
import { detectVersion } from "./version-detector.js";
import { AppleScriptProvider } from "./providers/applescript.js";
import { UrlSchemeProvider } from "./providers/url-scheme.js";
import {
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  CompleteTaskInputSchema,
  GetTasksInputSchema,
  SetConfigInputSchema,
} from "./validation.js";
import type { OmniFocusProvider } from "./types.js";

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
  }
  if (error instanceof Error) {
    const msg = error.message;
    // remove file paths and sensitive info
    return msg
      .replace(/\/Users\/[^/\s]+/g, "/Users/***")
      .replace(/\/home\/[^/\s]+/g, "/home/***")
      .replace(/at\s+.+:\d+:\d+/g, "")
      .trim();
  }
  return "An unexpected error occurred";
}

let provider: OmniFocusProvider;

const server = new Server(
  {
    name: "mcp-omnifocus",
    version: PACKAGE_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const version = provider.version;
  const writeWarning = version === "standard"
    ? " (Standard version: changes via SQLite won't sync until OmniFocus restart)"
    : "";

  return {
    tools: [
      {
        name: "omnifocus_get_tasks",
        description: `Get tasks from OmniFocus. Filter by flagged, due today, or all. Detected version: ${version}`,
        inputSchema: {
          type: "object",
          properties: {
            filter: {
              type: "string",
              enum: ["flagged", "due_today", "all"],
              description: "Filter tasks: flagged, due_today, or all (default: flagged + due today)"
            }
          }
        }
      },
      {
        name: "omnifocus_create_task",
        description: `Create a new task in OmniFocus. Detected version: ${version}`,
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Task name (required)"
            },
            note: {
              type: "string",
              description: "Task note/description"
            },
            project: {
              type: "string",
              description: "Project name to add task to (optional, defaults to inbox)"
            },
            flagged: {
              type: "boolean",
              description: "Mark task as flagged"
            },
            dueDate: {
              type: "string",
              description: "Due date in ISO format (YYYY-MM-DD)"
            }
          },
          required: ["name"]
        }
      },
      {
        name: "omnifocus_update_task",
        description: `Update an existing task in OmniFocus.${writeWarning}`,
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "Task ID (required)"
            },
            name: {
              type: "string",
              description: "New task name"
            },
            note: {
              type: "string",
              description: "New task note"
            },
            flagged: {
              type: "boolean",
              description: "Set flagged status"
            },
            dueDate: {
              type: "string",
              description: "New due date in ISO format"
            }
          },
          required: ["taskId"]
        }
      },
      {
        name: "omnifocus_complete_task",
        description: `Mark a task as complete.${writeWarning}`,
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "Task ID to complete (required)"
            }
          },
          required: ["taskId"]
        }
      },
      {
        name: "omnifocus_get_projects",
        description: `Get list of active projects from OmniFocus. Detected version: ${version}`,
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "omnifocus_get_config",
        description: "Get current configuration settings",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "omnifocus_set_config",
        description: "Update configuration settings. For Standard version: directSqlAccess controls whether to use direct SQLite access for update/complete operations (faster but requires OmniFocus restart to sync)",
        inputSchema: {
          type: "object",
          properties: {
            directSqlAccess: {
              type: "boolean",
              description: "Enable direct SQLite access for write operations (Standard version only)"
            },
            taskLimit: {
              type: "number",
              description: "Maximum number of tasks to return from getTasks (default: 500, max: 10000)"
            }
          }
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "omnifocus_get_tasks": {
        const input = GetTasksInputSchema.parse(args ?? {});
        const tasks = await provider.getTasks(input.filter);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ version: provider.version, tasks }, null, 2)
          }]
        };
      }

      case "omnifocus_create_task": {
        const input = CreateTaskInputSchema.parse(args ?? {});
        const result = await provider.createTask(input);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ version: provider.version, ...result }, null, 2)
          }]
        };
      }

      case "omnifocus_update_task": {
        const input = UpdateTaskInputSchema.parse(args ?? {});
        const result = await provider.updateTask(input);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ version: provider.version, ...result }, null, 2)
          }]
        };
      }

      case "omnifocus_complete_task": {
        const input = CompleteTaskInputSchema.parse(args ?? {});
        const result = await provider.completeTask(input.taskId);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ version: provider.version, ...result }, null, 2)
          }]
        };
      }

      case "omnifocus_get_projects": {
        const projects = await provider.getProjects();
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ version: provider.version, projects }, null, 2)
          }]
        };
      }

      case "omnifocus_get_config": {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              version: provider.version,
              config: provider.config
            }, null, 2)
          }]
        };
      }

      case "omnifocus_set_config": {
        const input = SetConfigInputSchema.parse(args ?? {});
        provider.setConfig(input);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              version: provider.version,
              config: provider.config
            }, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error("[mcp-omnifocus] Error:", error);
    const message = sanitizeErrorMessage(error);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ error: message }, null, 2)
      }],
      isError: true
    };
  }
});

async function main() {
  console.error("[mcp-omnifocus] Starting...");

  const version = await detectVersion();
  console.error(`[mcp-omnifocus] Detected OmniFocus version: ${version}`);

  provider = version === "pro"
    ? new AppleScriptProvider()
    : new UrlSchemeProvider();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[mcp-omnifocus] Server connected");
}

main().catch((error) => {
  console.error("[mcp-omnifocus] Fatal error:", error);
  process.exit(1);
});
