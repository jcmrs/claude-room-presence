#!/usr/bin/env bash
# room-watcher.sh — Background monitor for agent-room pending messages
# Runs as a plugin monitor (monitors/monitors.json).
# Polls agent-room-mcp state for room membership and emits notifications
# when pending messages are detected.
#
# State ownership:
#   - Room state: AGENT_ROOM_STATE_FILE (owned by agent-room-mcp, read-only)
#   - Watcher cursor: CLAUDE_PLUGIN_DATA (owned by this plugin, read-write)
set -euo pipefail

STATE_FILE="${AGENT_ROOM_STATE_FILE:-$HOME/.agent-room/state.json}"
POLL_INTERVAL="${ROOM_WATCHER_INTERVAL:-60}"
PLUGIN_DATA="${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/claude-room-presence}"
CURSOR_FILE="$PLUGIN_DATA/watcher-cursor.json"

# Ensure plugin data directory exists
mkdir -p "$PLUGIN_DATA" 2>/dev/null || true

# No state file — nothing to watch
if [ ! -f "$STATE_FILE" ]; then
  # Sleep and exit cleanly — monitor will restart
  sleep "$POLL_INTERVAL"
  exit 0
fi

# Check if any rooms are joined
if grep -q '"rooms": {}' "$STATE_FILE" 2>/dev/null; then
  sleep "$POLL_INTERVAL"
  exit 0
fi

# Extract room codes from state
ROOM_CODES=$(grep -oP '"[A-Z]{3}-[A-Z]{3}-[A-Z]{3}"' "$STATE_FILE" 2>/dev/null | tr -d '"' | sort -u || true)

if [ -z "$ROOM_CODES" ]; then
  sleep "$POLL_INTERVAL"
  exit 0
fi

# For each room, run a single-block check via agent-room-mcp hook
for CODE in $ROOM_CODES; do
  OUTPUT=$(echo '{"hook_event_name":"Stop","stop_hook_active":true}' | \
    AGENT_ROOM_MAX_BLOCKS=1 \
    AGENT_ROOM_STATE_FILE="$STATE_FILE" \
    npx -y agent-room-mcp hook 2>/dev/null || true)

  if echo "$OUTPUT" | grep -q '"decision".*"block"'; then
    REASON=$(echo "$OUTPUT" | grep -o '"reason":"[^"]*"' | head -1 || echo "Messages pending")
    echo "[agent-room] $REASON"
  fi
done

# Sleep before next poll cycle
sleep "$POLL_INTERVAL"
exit 0
