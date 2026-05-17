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
4. **Monitor script executable** — verify `${CLAUDE_PLUGIN_ROOT}/scripts/room-watcher.sh` has execute permission
5. **Required tools** — verify `jq`, `npx`, `grep` are available in PATH
6. **Plugin enabled** — check if the plugin appears in the session's active plugins

## Output Format

Report each check as PASS or FAIL with brief explanation:
```
[room-doctor] agent-room-mcp: PASS (v0.23.0)
[room-doctor] state file: PASS (/home/user/.agent-room/state.json)
[room-doctor] room membership: PASS (2 rooms joined)
[room-doctor] monitor script: PASS (executable)
[room-doctor] required tools: PASS (jq, npx, grep available)
[room-doctor] plugin enabled: PASS
```

If any check FAILS, provide a suggested fix.
