#!/usr/bin/env node
// cadence-state.js — Manage cadence state file for interruption survival
// Reads and writes ${CLAUDE_PLUGIN_DATA}/cadence-state.json
// Used by room-cadence command and ScheduleWakeup prompts.
//
// Usage:
//   node cadence-state.js get [room-code]           — print state (all or one room)
//   node cadence-state.js set <room-code> <json>    — set room entry (merges into existing)
//   node cadence-state.js remove <room-code>        — remove room entry
//   node cadence-state.js init <room-code> [interval] [task] — initialize cadence entry

const fs = require("fs");
const path = require("path");

const PLUGIN_DATA =
  process.env.CLAUDE_PLUGIN_DATA ||
  path.join(
    process.env.HOME || process.env.USERPROFILE || "",
    ".claude",
    "plugins",
    "data",
    "claude-room-presence"
  );

const STATE_FILE = path.join(PLUGIN_DATA, "cadence-state.json");

function ensureDir() {
  try {
    fs.mkdirSync(PLUGIN_DATA, { recursive: true });
  } catch {}
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { rooms: {}, updatedAt: null };
  }
}

function writeState(state) {
  ensureDir();
  state.updatedAt = new Date().toISOString();
  const tmp = STATE_FILE + ".tmp." + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tmp, STATE_FILE);
}

function cmdGet(roomCode) {
  const state = readState();
  if (roomCode) {
    const entry = state.rooms && state.rooms[roomCode];
    if (entry) {
      console.log(JSON.stringify(entry));
    } else {
      console.log("{}");
    }
  } else {
    console.log(JSON.stringify(state, null, 2));
  }
}

function cmdSet(roomCode, jsonStr) {
  const state = readState();
  if (!state.rooms) state.rooms = {};
  try {
    state.rooms[roomCode] = JSON.parse(jsonStr);
    writeState(state);
    console.log("ok");
  } catch (e) {
    console.error("Invalid JSON: " + e.message);
    process.exit(1);
  }
}

function cmdRemove(roomCode) {
  const state = readState();
  if (state.rooms && state.rooms[roomCode]) {
    delete state.rooms[roomCode];
    writeState(state);
    console.log("ok");
  } else {
    console.log("not_found");
  }
}

function cmdInit(roomCode, interval, task) {
  const state = readState();
  if (!state.rooms) state.rooms = {};
  const existing = state.rooms[roomCode] || {};
  state.rooms[roomCode] = Object.assign({}, existing, {
    mode: "cadence",
    joined: true,
    cursor: existing.cursor || 0,
    interval: parseInt(interval, 10) || existing.interval || 300,
    activeTask: task || existing.activeTask || "",
  });
  writeState(state);
  console.log(JSON.stringify(state.rooms[roomCode]));
}

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "get":
    cmdGet(args[1]);
    break;
  case "set":
    cmdSet(args[1], args[2]);
    break;
  case "remove":
    cmdRemove(args[1]);
    break;
  case "init":
    cmdInit(args[1], args[2], args[3]);
    break;
  default:
    console.error(
      "Usage: cadence-state.js <get|set|remove|init> [args]\n" +
        "  get [room-code]           — print state\n" +
        "  set <room-code> <json>    — set room entry\n" +
        "  remove <room-code>        — remove room entry\n" +
        "  init <room-code> [interval] [task] — initialize cadence"
    );
    process.exit(1);
}
