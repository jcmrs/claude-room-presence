#!/usr/bin/env node
// room-watcher.js — Background monitor for agent-room pending messages + room mode
// Runs as a plugin monitor (monitors/monitors.json).
// Persists for the session lifetime — polls with configurable interval.
// Cross-platform: works on Linux, macOS, WSL, and Windows native.
//
// State ownership:
//   - Room state: AGENT_ROOM_STATE_FILE (owned by agent-room-mcp, read-only)
//   - Watcher cursor: CLAUDE_PLUGIN_DATA (owned by this plugin, read-write)
//   - Cadence state: CLAUDE_PLUGIN_DATA/cadence-state.json (read by watcher for room mode)

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
const CADENCE_STATE_FILE = path.join(PLUGIN_DATA, "cadence-state.json");

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

function readCadenceState() {
  try {
    const content = fs.readFileSync(CADENCE_STATE_FILE, "utf8");
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

  // Check for pending messages
  for (const code of roomCodes) {
    const output = checkRoom(STATE_FILE);
    if (output.includes('"decision"') && output.includes('"block"')) {
      const reasonMatch = output.match(/"reason"\s*:\s*"([^"]*)"/);
      const reason = reasonMatch ? reasonMatch[1] : "Messages pending";
      // Each stdout line is delivered as a notification by the monitor system
      console.log("[agent-room] " + reason);
    }
  }

  // Check room mode from cadence state file
  checkRoomMode(roomCodes);
}

function checkRoomMode(roomCodes) {
  const cadence = readCadenceState();
  if (!cadence || !cadence.rooms) return;

  const prevModesFile = path.join(PLUGIN_DATA, "watcher-prev-modes.json");
  let prevModes = {};
  try {
    prevModes = JSON.parse(fs.readFileSync(prevModesFile, "utf8"));
  } catch {
    // First run or file doesn't exist — no previous modes to compare
  }

  let changed = false;
  for (const code of roomCodes) {
    const entry = cadence.rooms[code];
    if (!entry || !entry.replyMode) continue;

    if (prevModes[code] && prevModes[code] !== entry.replyMode) {
      console.log(
        `[agent-room] Room ${code} mode changed: ${prevModes[code]} → ${entry.replyMode}`
      );
      changed = true;
    }
    prevModes[code] = entry.replyMode;
  }

  if (changed) {
    try {
      fs.writeFileSync(prevModesFile, JSON.stringify(prevModes, null, 2), "utf8");
    } catch {
      // Non-fatal — mode change was already emitted
    }
  }
}

// Main loop
setInterval(poll, POLL_INTERVAL);
// Run first check immediately
poll();
