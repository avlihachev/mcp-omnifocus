# MCP OmniFocus

MCP server for OmniFocus with auto-detection of Pro/Standard version.

## Features

- **Auto-detection**: Automatically detects OmniFocus Pro or Standard
- **Full Pro support**: AppleScript for read/write with sync
- **Standard fallback**: SQLite read + URL scheme for create

### Capabilities by Version

| Feature | Pro (AppleScript) | Standard |
|---------|-------------------|----------|
| Read tasks | ✓ | ✓ (SQLite) |
| Create task | ✓ | ✓ (URL scheme, syncs) |
| Update task | ✓ | ⚠️ (SQLite, no sync) |
| Complete task | ✓ | ⚠️ (SQLite, no sync) |
| Get projects | ✓ | ✓ (SQLite) |

**⚠️ Standard SQLite write**: Changes don't sync until OmniFocus restart.

## Installation

```bash
cd ~/Projects/mcp-omnifocus
npm install
npm run build
```

## Claude Code Configuration

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/Projects/mcp-omnifocus/dist/index.js"]
    }
  }
}
```

## Tools

### omnifocus_get_tasks
Get tasks filtered by flagged, due today, or all.

### omnifocus_create_task
Create a new task with name, note, project, flagged, dueDate.

### omnifocus_update_task
Update existing task (Pro: syncs, Standard: SQLite only).

### omnifocus_complete_task
Mark task as complete (Pro: syncs, Standard: SQLite only).

### omnifocus_get_projects
Get list of active projects.
