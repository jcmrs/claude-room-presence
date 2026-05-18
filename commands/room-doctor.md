---
description: Diagnose agent-room integration health — check dependencies, state, and configuration
---

# Room Doctor

Self-diagnostic for the claude-room-presence plugin. Checks all dependencies and configuration needed for proper operation.

## Checks

Run these checks in order and report results:

1. **agent-room-mcp installed** — verify `npx agent-room-mcp --help` works
2. **State file readable** — check `AGENT_ROOM_STATE_FILE` (default `~/.agent-room/state.json`) exists and is readable JSON
3. **Room membership** — if state file exists, check if any rooms are in `"rooms"` object
4. **Monitor script executable** — verify `${CLAUDE_PLUGIN_ROOT}/scripts/room-watcher.js` exists and Node.js is available
5. **Monitor environment** — check if monitors are supported (CLI sessions only; VS Code and other surfaces receive logging notifications instead of model-visible notifications)
6. **Required tools** — verify `npx` and `node` are available in PATH
7. **Plugin enabled** — check if the plugin appears in the session's active plugins
8. **Cadence state** — check `${CLAUDE_PLUGIN_DATA}/cadence-state.json` exists and has room entries if agent has active cadence
9. **Stale participants** — if joined to any room, check recent messages (last 50) for participant activity. Flag any participant with no messages in the last 30 minutes as potentially stale. This is a plugin-side mitigation for upstream issue #1 (participant TTL/heartbeat not implemented in agent-room-mcp)

## Output Format

Report each check as PASS or FAIL with brief explanation:
```
[room-doctor] agent-room-mcp: PASS (v0.23.0)
[room-doctor] state file: PASS (/home/user/.agent-room/state.json)
[room-doctor] room membership: PASS (2 rooms joined)
[room-doctor] monitor script: PASS (room-watcher.js exists)
[room-doctor] monitor environment: PASS (CLI session — monitors active)
[room-doctor] required tools: PASS (node, npx available)
[room-doctor] plugin enabled: PASS
[room-doctor] cadence state: PASS (1 room with active cadence)
[room-doctor] stale participants: WARN (ENGINEER — no activity in 45 min, may be stale)
```

If any check FAILS, provide a suggested fix.

## Environment Constraints

**Plugin monitors (CLI only):** Background monitors that watch for pending room messages only work in interactive CLI sessions. In VS Code and other surfaces, monitor notifications surface as logging messages that are not visible to the model. Cadence (ScheduleWakeup + state file) works on all surfaces as a fallback.

**AGENT_ROOM_STATE_FILE:** Environment variable pointing to agent-room-mcp's state file (default `~/.agent-room/state.json`). Contains room membership and participant data. This is the durable state that survives compaction — the plugin reads it (does not modify it) to detect room membership. The plugin's own cadence state (`${CLAUDE_PLUGIN_DATA}/cadence-state.json`) is separate and tracks cadence intent + cursor.
