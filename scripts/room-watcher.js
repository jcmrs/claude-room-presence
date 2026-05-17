#!/usr/bin/env node
// room-watcher.js — Background monitor for agent-room pending messages
// Runs as a plugin monitor (monitors/monitors.json).
// Persists for the session lifetime — polls with configurable interval.
// Cross-platform: works on Linux, macOS, WSL, and Windows native.
//
// State ownership:
//   - Room state: AGENT_ROOM_STATE_FILE (owned by agent-room-mcp, read-only)
//   - Watcher cursor: CLAUDE_PLUGIN_DATA (owned by this plugin, read-write)

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const STATE_FILE =
  process.env.AGENT_ROOM_STATE_FILE ||
  path.join(
    process.env.HOME || process.env.USERPROFILE || "",
    ".agent-room",
    "state.json"
  );
const POLL_INTERVAL =
  parseInt(process.env.ROOM_WATCHER_INTERVAL || "60", 10) * 1000;
const PLUGIN_DATA =
  process.env.CLAUDE_PLUGIN_DATA ||
  path.join(
    process.env.HOME || process.env.USERPROFILE || "",
    ".claude",
    "plugins",
    "data",
    "claude-room-presence"
  );

// Ensure plugin data directory exists
try {
  fs.mkdirSync(PLUGIN_DATA, { recursive: true });
} catch {
  // Directory may already exist or be inaccessible — non-fatal
}

function readStateFile() {
  try {
    const content = fs.readFileSync(STATE_FILE, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function getRoomCodes(state) {
  if (!state || !state.rooms || typeof state.rooms !== "object") return [];
  return Object.keys(state.rooms).filter((code) =>
    /^[A-Z]{3}-[A-Z]{3}-[A-Z]{3}$/.test(code)
  );
}

function checkRoom(stateFilePath) {
  try {
    const input = JSON.stringify({
      hook_event_name: "Stop",
      stop_hook_active: true,
    });
    const env = Object.assign({}, process.env, {
      AGENT_ROOM_MAX_BLOCKS: "1",
      AGENT_ROOM_STATE_FILE: stateFilePath,
    });
    const output = execSync("npx -y agent-room-mcp hook", {
      input: input,
      env: env,
      timeout: 30000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output;
  } catch {
    return "";
  }
}

function poll() {
  const state = readStateFile();
  if (!state) return;

  const roomCodes = getRoomCodes(state);
  if (roomCodes.length === 0) return;

  for (const code of roomCodes) {
    const output = checkRoom(STATE_FILE);
    if (output.includes('"decision"') && output.includes('"block"')) {
      const reasonMatch = output.match(/"reason"\s*:\s*"([^"]*)"/);
      const reason = reasonMatch ? reasonMatch[1] : "Messages pending";
      // Each stdout line is delivered as a notification by the monitor system
      console.log("[agent-room] " + reason);
    }
  }
}

// Main loop
setInterval(poll, POLL_INTERVAL);
// Run first check immediately
poll();
