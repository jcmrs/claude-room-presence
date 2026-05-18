#!/usr/bin/env node
// test-cadence-state.js — Smoke tests for cadence-state.js
// Run: node test-cadence-state.js
// Uses a temp directory for state — does not touch real state.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const TMP_DIR = fs.mkdtempSync(path.join(require("os").tmpdir(), "cadence-test-"));
const STATE_FILE = path.join(TMP_DIR, "cadence-state.json");
const SCRIPT = path.join(__dirname, "cadence-state.js");

let passed = 0;
let failed = 0;

function run(args) {
  try {
    const out = execSync(`node "${SCRIPT}" ${args}`, {
      env: { ...process.env, CLAUDE_PLUGIN_DATA: TMP_DIR },
      encoding: "utf8",
    }).trim();
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: (e.stdout || "").trim(), err: (e.stderr || "").trim() };
  }
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${msg}`);
  } else {
    failed++;
    console.log(`  FAIL: ${msg}`);
  }
}

function cleanup() {
  try { fs.unlinkSync(STATE_FILE); } catch {}
  try { fs.unlinkSync(STATE_FILE + ".tmp." + process.pid); } catch {}
}

// --- Tests ---

console.log("cadence-state.js smoke tests\n");

console.log("1. get on empty state returns {}");
cleanup();
{
  const r = run("get TEST-001");
  assert(r.ok, "get succeeds");
  assert(r.out === "{}", `returns {} (got: ${r.out})`);
}

console.log("\n2. init creates entry with defaults");
cleanup();
{
  const r = run("init TEST-001 300 \"test task\"");
  assert(r.ok, "init succeeds");
  const entry = JSON.parse(r.out);
  assert(entry.mode === "cadence", "mode is cadence");
  assert(entry.joined === true, "joined is true");
  assert(entry.cursor === 0, "cursor starts at 0");
  assert(entry.interval === 300, "interval is 300");
  assert(entry.activeTask === "test task", "activeTask preserved");
  assert(entry.replyMode === "open", "replyMode defaults to open");
}

console.log("\n3. set updates entry");
cleanup();
{
  run("init TEST-001 300 \"initial\"");
  const r = run("set TEST-001 '{\"mode\":\"cadence\",\"joined\":true,\"cursor\":999,\"interval\":300,\"activeTask\":\"updated\",\"replyMode\":\"sequential\"}'");
  assert(r.ok, "set succeeds");
  assert(r.out === "ok", "returns ok");
  const g = run("get TEST-001");
  const entry = JSON.parse(g.out);
  assert(entry.cursor === 999, "cursor updated to 999");
  assert(entry.replyMode === "sequential", "replyMode updated to sequential");
}

console.log("\n4. re-init preserves existing fields (idempotent — #8, #9)");
cleanup();
{
  run("init TEST-001 300 \"initial\"");
  run("set TEST-001 '{\"mode\":\"cadence\",\"joined\":true,\"cursor\":552,\"interval\":300,\"activeTask\":\"running\",\"replyMode\":\"sequential\"}'");
  const r = run("init TEST-001 300 \"new task\"");
  const entry = JSON.parse(r.out);
  assert(entry.cursor === 552, "cursor preserved (552, not reset to 0)");
  assert(entry.replyMode === "sequential", "replyMode preserved (sequential)");
  assert(entry.activeTask === "new task", "activeTask updated to new task");
  assert(entry.joined === true, "joined still true");
}

console.log("\n5. remove deletes entry");
cleanup();
{
  run("init TEST-001 300 \"test\"");
  const r = run("remove TEST-001");
  assert(r.ok, "remove succeeds");
  assert(r.out === "ok", "returns ok");
  const g = run("get TEST-001");
  assert(g.out === "{}", "entry gone after remove");
}

console.log("\n6. remove non-existent returns not_found");
cleanup();
{
  const r = run("remove NO-SUCH-ROOM");
  assert(r.ok, "remove succeeds (non-fatal)");
  assert(r.out === "not_found", "returns not_found");
}

console.log("\n7. atomic write produces valid JSON (no temp file left)");
cleanup();
{
  run("init TEST-001 300 \"atomic\"");
  assert(fs.existsSync(STATE_FILE), "state file exists");
  const content = fs.readFileSync(STATE_FILE, "utf8");
  const parsed = JSON.parse(content);
  assert(parsed.rooms && parsed.rooms["TEST-001"], "valid JSON with room entry");
  // Check no .tmp files
  const files = fs.readdirSync(TMP_DIR).filter(f => f.includes(".tmp."));
  assert(files.length === 0, `no temp files left (${files.length} found)`);
}

console.log("\n8. get without room code returns full state");
cleanup();
{
  run("init ROOM-A 300 \"task a\"");
  run("init ROOM-B 600 \"task b\"");
  const r = run("get");
  assert(r.ok, "get succeeds");
  const state = JSON.parse(r.out);
  assert(state.rooms && state.rooms["ROOM-A"] && state.rooms["ROOM-B"], "both rooms present");
  assert(state.updatedAt, "updatedAt field present");
}

console.log("\n9. init with no interval defaults to 300");
cleanup();
{
  const r = run("init TEST-001");
  const entry = JSON.parse(r.out);
  assert(entry.interval === 300, `interval defaults to 300 (got: ${entry.interval})`);
}

console.log("\n10. concurrent set + get (atomic write under fast succession)");
cleanup();
{
  for (let i = 0; i < 50; i++) {
    run(`set TEST-001 '{"mode":"cadence","joined":true,"cursor":${i},"interval":300,"activeTask":"stress","replyMode":"open"}'`);
  }
  const g = run("get TEST-001");
  const entry = JSON.parse(g.out);
  assert(entry.cursor === 49, `final cursor is 49 (got: ${entry.cursor})`);
  assert(JSON.parse(fs.readFileSync(STATE_FILE, "utf8")).rooms["TEST-001"].cursor === 49, "file on disk matches");
}

// --- Summary ---
console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"=".repeat(40)}`);

// Cleanup
try { fs.rmSync(TMP_DIR, { recursive: true }); } catch {}

process.exit(failed > 0 ? 1 : 0);
