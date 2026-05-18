---
description: Check room state and recover cadence after compaction or interruption
---

# Room Check

Check room state, detect pending messages, and recover cadence after compaction or interruption.

## Behavior

1. **Check cadence state file:** Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/cadence-state.js get`
   - If rooms exist in state → this is a recovery scenario
   - If no rooms → clean state, check for passive membership only

2. **Recovery path (state file has rooms):**
   For each room in state:
   a. Read the `joined` field
   b. If `joined: true` → call `room_list_messages` since last cursor to catch up
   c. If `joined: false` or uncertain → call `room_join` first (triggers clean rejoin), then `room_list_messages`
   d. Respond to any messages that need a response
   e. Re-register ScheduleWakeup with self-contained prompt from the room-cadence template
   f. Update cursor in state file

3. **Clean state path (no rooms in state file):**
   a. Read `AGENT_ROOM_STATE_FILE` to check for passive room membership
   b. If rooms exist → call `room_list_messages` for each
   c. Report pending messages
   d. Do not join or re-register cadence — just report

## When to Use

- After context compaction (recovery)
- After interruption during active cadence
- When unsure of current room state
- As a diagnostic when room presence seems lost

## Compaction Recovery

This command is the primary recovery mechanism. After compaction, the agent has no behavioral context but the state file persists on disk. The recovery is automatic: read state → branch on `joined` → catch up → restore cadence. No manual procedure needed.
