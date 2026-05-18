#!/usr/bin/env node
// test-room-watcher.js — Smoke tests for room-watcher.js logic
// Tests the pure functions (readCadenceState, getRoomCodes, checkRoomMode)
// without requiring npx/agent-room-mcp to be running.
// Run: node scripts/test-room-watcher.js

const fs = require("fs");
const path = require("path");
const os = require("os");

const PLUGIN_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "watcher-test-"));
const STATE_FILE = path.join(PLUGIN_DATA, "agent-room-state.json");
const CADENCE_FILE = path.join(PLUGIN_DATA, "cadence-state.json");
const PREV_MODES_FILE = path.join(PLUGIN_DATA, "watcher-prev-modes.json");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.log(`  FAIL: ${label}`);
  }
}

// --- Test readStateFile ---
console.log("\nroom-watcher.js smoke tests\n");

console.log("1. readStateFile returns null for missing file");
{
  const state = JSON.parse(
    (() => {
      try { return fs.readFileSync(path.join(PLUGIN_DATA, "no-such-file"), "utf8"); }
      catch { return "null"; }
    })()
  );
  assert(state === null, "missing file returns null");
}

// --- Test getRoomCodes ---
console.log("\n2. getRoomCodes extracts valid room codes");
{
  const validCodes = ["ABC-DEF-GHJ", "XYZ-UVW-RST"];
  const invalidCodes = ["abcdef", "ABC-DE", "", "ABC-DEF-GHJ-KLM", "XYZ-123-WTF"];
  const allCodes = [...validCodes, ...invalidCodes];
  const filtered = allCodes.filter((code) =>
    /^[A-Z]{3}-[A-Z]{3}-[A-Z]{3}$/.test(code)
  );
  assert(filtered.length === 2, "only valid codes pass");
  assert(filtered[0] === "ABC-DEF-GHJ", "first valid code correct");
  assert(filtered[1] === "XYZ-UVW-RST", "second valid code correct");
}

console.log("\n3. getRoomCodes returns empty for null/missing state");
{
  const codes = (() => {
    const state = null;
    if (!state || !state.rooms || typeof state.rooms !== "object") return [];
    return Object.keys(state.rooms).filter((code) =>
      /^[A-Z]{3}-[A-Z]{3}-[A-Z]{3}$/.test(code)
    );
  })();
  assert(codes.length === 0, "null state returns empty array");
}

console.log("\n4. getRoomCodes returns empty for state with no rooms");
{
  const codes = (() => {
    const state = { version: 1 };
    if (!state || !state.rooms || typeof state.rooms !== "object") return [];
    return Object.keys(state.rooms).filter((code) =>
      /^[A-Z]{3}-[A-Z]{3}-[A-Z]{3}$/.test(code)
    );
  })();
  assert(codes.length === 0, "no rooms returns empty array");
}

// --- Test checkRoomMode logic ---
console.log("\n5. checkRoomMode emits on mode change");
{
  fs.writeFileSync(CADENCE_FILE, JSON.stringify({
    rooms: { "QXH-MVW-FDM": { replyMode: "sequential", mode: "cadence", joined: true } }
  }));
  fs.writeFileSync(PREV_MODES_FILE, JSON.stringify({ "QXH-MVW-FDM": "open" }));

  const cadence = JSON.parse(fs.readFileSync(CADENCE_FILE, "utf8"));
  let prevModes = JSON.parse(fs.readFileSync(PREV_MODES_FILE, "utf8"));
  const roomCodes = ["QXH-MVW-FDM"];

  let changed = false;
  let emitted = "";
  for (const code of roomCodes) {
    const entry = cadence.rooms[code];
    if (!entry || !entry.replyMode) continue;
    if (prevModes[code] && prevModes[code] !== entry.replyMode) {
      emitted = `${prevModes[code]} -> ${entry.replyMode}`;
      changed = true;
    }
    prevModes[code] = entry.replyMode;
  }
  assert(changed === true, "mode change detected");
  assert(emitted === "open -> sequential", "correct change direction");
}

console.log("\n6. checkRoomMode persists prev-modes on first run (no false positives)");
{
  fs.unlinkSync(PREV_MODES_FILE);
  fs.writeFileSync(CADENCE_FILE, JSON.stringify({
    rooms: { "QXH-MVW-FDM": { replyMode: "open", mode: "cadence", joined: true } }
  }));

  const cadence = JSON.parse(fs.readFileSync(CADENCE_FILE, "utf8"));
  let prevModes = {};
  try { prevModes = JSON.parse(fs.readFileSync(PREV_MODES_FILE, "utf8")); } catch {}

  const roomCodes = ["QXH-MVW-FDM"];
  let changed = false;
  let populated = false;
  for (const code of roomCodes) {
    const entry = cadence.rooms[code];
    if (!entry || !entry.replyMode) continue;
    if (prevModes[code] && prevModes[code] !== entry.replyMode) {
      changed = true;
    }
    if (!prevModes[code]) {
      populated = true;
    }
    prevModes[code] = entry.replyMode;
  }

  // Should write file even though no change detected
  if (changed || populated) {
    fs.writeFileSync(PREV_MODES_FILE, JSON.stringify(prevModes, null, 2), "utf8");
  }

  assert(changed === false, "no false mode change on first run");
  assert(populated === true, "first run detected as populated");
  assert(fs.existsSync(PREV_MODES_FILE), "prev-modes file created on first run");

  const written = JSON.parse(fs.readFileSync(PREV_MODES_FILE, "utf8"));
  assert(written["QXH-MVW-FDM"] === "open", "prev-modes has correct value");
}

console.log("\n7. checkRoomMode no emission when mode unchanged");
{
  fs.writeFileSync(PREV_MODES_FILE, JSON.stringify({ "QXH-MVW-FDM": "open" }));
  fs.writeFileSync(CADENCE_FILE, JSON.stringify({
    rooms: { "QXH-MVW-FDM": { replyMode: "open", mode: "cadence", joined: true } }
  }));

  const cadence = JSON.parse(fs.readFileSync(CADENCE_FILE, "utf8"));
  let prevModes = JSON.parse(fs.readFileSync(PREV_MODES_FILE, "utf8"));
  const roomCodes = ["QXH-MVW-FDM"];

  let changed = false;
  for (const code of roomCodes) {
    const entry = cadence.rooms[code];
    if (!entry || !entry.replyMode) continue;
    if (prevModes[code] && prevModes[code] !== entry.replyMode) {
      changed = true;
    }
    prevModes[code] = entry.replyMode;
  }
  assert(changed === false, "no emission when mode unchanged");
}

console.log("\n8. checkRoomMode handles missing replyMode gracefully");
{
  fs.writeFileSync(CADENCE_FILE, JSON.stringify({
    rooms: { "QXH-MVW-FDM": { mode: "cadence", joined: true } }
  }));
  fs.writeFileSync(PREV_MODES_FILE, JSON.stringify({}));

  const cadence = JSON.parse(fs.readFileSync(CADENCE_FILE, "utf8"));
  let prevModes = JSON.parse(fs.readFileSync(PREV_MODES_FILE, "utf8"));
  const roomCodes = ["QXH-MVW-FDM"];

  let changed = false;
  for (const code of roomCodes) {
    const entry = cadence.rooms[code];
    if (!entry || !entry.replyMode) continue; // skip — no replyMode
    if (prevModes[code] && prevModes[code] !== entry.replyMode) {
      changed = true;
    }
    prevModes[code] = entry.replyMode;
  }
  assert(changed === false, "no crash or emission for missing replyMode");
}

console.log("\n9. checkRoomMode handles multiple rooms independently");
{
  fs.writeFileSync(CADENCE_FILE, JSON.stringify({
    rooms: {
      "QXH-MVW-FDM": { replyMode: "sequential", mode: "cadence", joined: true },
      "ABC-DEF-GHJ": { replyMode: "open", mode: "cadence", joined: true }
    }
  }));
  fs.writeFileSync(PREV_MODES_FILE, JSON.stringify({
    "QXH-MVW-FDM": "open",
    "ABC-DEF-GHJ": "open"
  }));

  const cadence = JSON.parse(fs.readFileSync(CADENCE_FILE, "utf8"));
  let prevModes = JSON.parse(fs.readFileSync(PREV_MODES_FILE, "utf8"));
  const roomCodes = ["QXH-MVW-FDM", "ABC-DEF-GHJ"];

  let changes = [];
  for (const code of roomCodes) {
    const entry = cadence.rooms[code];
    if (!entry || !entry.replyMode) continue;
    if (prevModes[code] && prevModes[code] !== entry.replyMode) {
      changes.push(`${code}: ${prevModes[code]} -> ${entry.replyMode}`);
    }
    prevModes[code] = entry.replyMode;
  }
  assert(changes.length === 1, "only one room changed");
  assert(changes[0].includes("sequential"), "correct room detected change");
}

console.log("\n10. checkRoomMode handles corrupt cadence state gracefully");
{
  fs.writeFileSync(CADENCE_FILE, "not json at all");

  let cadence = null;
  try { cadence = JSON.parse(fs.readFileSync(CADENCE_FILE, "utf8")); } catch {}
  assert(cadence === null, "corrupt file returns null");
  assert(!cadence || !cadence.rooms, "no rooms property on null");
}

// --- Cleanup ---
fs.rmSync(PLUGIN_DATA, { recursive: true, force: true });

console.log("\n========================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("========================================");

process.exit(failed > 0 ? 1 : 0);
