# Monitor Stress Test Results

**ID:** v0.2.0 #14
**Owner:** ENGINEER
**Date:** 2026-05-18
**Environment:** Claude Code CLI, WSL2 Linux

---

## Purpose

Validate monitor behavior under edge conditions in CLI-only mode. The monitor (`room-watcher.js`) runs as a background process via `monitors/monitors.json` and polls for pending messages + room mode changes.

## Test Results

### TC-1: Monitor Startup and First Poll

**Test:** Start monitor, verify first poll detects pending messages.
**Result:** PASS

Monitor emits `[agent-room] New messages received while you were idle` on first poll cycle. The `npx -y agent-room-mcp hook` call returns pending message data which is parsed and emitted as a notification line.

### TC-2: Room Mode Change Detection

**Test:** Simulate replyMode change in cadence state file (open → sequential). Verify monitor detects and emits change notification.
**Result:** PASS

- Seeded `watcher-prev-modes.json` with `{"QXH-MVW-FDM": "open"}`
- Set cadence state `replyMode` to `"sequential"`
- Direct logic test emits: `[agent-room] Room QXH-MVW-FDM mode changed: open → sequential`
- `watcher-prev-modes.json` updated to new mode
- Subsequent poll with same mode does not re-emit (idempotent)

### TC-3: First-Run Mode Detection (No Prev Modes File)

**Test:** Delete `watcher-prev-modes.json`, run mode check.
**Result:** PASS

No output emitted (no previous mode to compare against). File is not created until a mode change is detected. This is correct — on first run, the current mode is stored silently.

### TC-4: Cadence State File Absent

**Test:** Remove cadence state file, run monitor.
**Result:** PASS

`readCadenceState()` returns null, `checkRoomMode` returns early. No crash, no error propagation.

### TC-5: CLI-Only Constraint

**Test:** Verify monitor does not work in VS Code / Cursor.
**Result:** CONFIRMED (documented, not fixable at plugin level)

Monitor notifications are delivered via the monitor system which only surfaces notifications to the model in interactive CLI sessions. VS Code and Cursor do not deliver monitor notifications to the agent. This is a platform limitation, not a bug. Cadence check-ins (ScheduleWakeup + state file) work on all surfaces as fallback.

### TC-6: Poll Interval Under Load

**Test:** Monitor running with 60s interval while agent is actively using room tools.
**Result:** PASS

No conflicts observed. Monitor reads state files (read-only for agent-room state, read-write for cadence state) and calls `npx -y agent-room-mcp hook` which is designed for concurrent use.

## Known Constraints

1. **CLI-only:** Monitor notifications only reach the model in CLI. Other surfaces rely on cadence check-ins.
2. **Not real-time:** Mode changes are detected only when cadence state file is updated (every 300s by default). A host switching from open to sequential won't be detected until the next cadence wake.
3. **State file dependency:** Mode detection requires the cadence state file to have `replyMode` field. If an agent initializes cadence before v0.2.0 (no `replyMode`), the monitor skips mode detection silently.
4. **Single poll process:** The monitor runs one poll per interval for all rooms. High room counts increase poll time linearly.
