import { spawn } from "child_process";

export type OmniFocusVersion = "pro" | "standard";

function runAppleScriptCheck(script: string): Promise<{ success: boolean; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("osascript", ["-"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ success: code === 0, stderr });
    });

    child.on("error", () => {
      resolve({ success: false, stderr: "spawn error" });
    });

    child.stdin.write(script);
    child.stdin.end();
  });
}

const VERSION_DETECTION_TIMEOUT_MS = 5000;

async function detectVersionInternal(): Promise<OmniFocusVersion> {
  const script = 'tell application "OmniFocus" to get name of first flattened task';
  const result = await runAppleScriptCheck(script);

  if (result.success) {
    return "pro";
  }

  // error -1743 = scripting not authorized (Standard version)
  if (result.stderr.includes("-1743")) {
    return "standard";
  }

  // if no tasks exist, AppleScript still works - it's Pro
  if (result.stderr.includes("Can't get")) {
    return "pro";
  }

  // default to standard if we can't determine
  return "standard";
}

export async function detectVersion(): Promise<OmniFocusVersion> {
  const timeout = new Promise<OmniFocusVersion>((resolve) => {
    setTimeout(() => {
      console.error("[mcp-omnifocus] Version detection timed out, falling back to standard");
      resolve("standard");
    }, VERSION_DETECTION_TIMEOUT_MS);
  });

  return Promise.race([detectVersionInternal(), timeout]);
}
