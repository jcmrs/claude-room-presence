---
description: Start cadence monitoring for room presence using ScheduleWakeup
argument-hint: "[interval-seconds]"
---

# Room Cadence

Start periodic room check-ins using ScheduleWakeup for proactive room awareness without blocking the terminal.

## Behavior

1. Parse optional interval argument (default: 300 seconds)
2. **Initialize cadence state:** Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/cadence-state.js init <room-code> <interval> "<task>"` to persist cadence intent to the state file
3. Set ScheduleWakeup with a self-contained prompt that includes:
   - Room code
   - Current mode (Cadence)
   - Active task context
   - Instruction to read state file on wake
4. On each wake:
   a. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/cadence-state.js get <room-code>` to read current state
   b. If `joined: true` → call `room_list_messages` directly (soft leave, still a participant)
   c. If `joined: false` or no state → call `room_join` first (recovery path), then update state
   d. If messages are relevant, decide whether to enter Persistent Listen or respond from Cadence
   e. Share findings if they intersect with peer agent work
   f. Update cursor in state file and schedule next wake

## Self-Contained Cadence Prompt Template

Each ScheduleWakeup prompt must be fully self-contained for compaction recovery:

```
Cadence wake for room <ROOM-CODE>. Mode: Cadence. Task: <task>.
1. Run: node ${CLAUDE_PLUGIN_ROOT}/scripts/cadence-state.js get <ROOM-CODE>
2. If joined: room_list_messages since last cursor
3. If not joined: room_join first, then room_list_messages
4. Respond if needed, update cursor, schedule next wake
```

## Mode Transition

This command transitions from Idle → Cadence.

The cadence loop continues until:
- You join a room (transition to Persistent Listen)
- You cancel the ScheduleWakeup
- The session ends

When stopping cadence, run `node ${CLAUDE_PLUGIN_ROOT}/scripts/cadence-state.js remove <room-code>` to clean up state.

## State File

The cadence state file lives at `${CLAUDE_PLUGIN_DATA}/cadence-state.json`. Schema:

```json
{
  "rooms": {
    "ABC-DEF-GHJ": {
      "mode": "cadence",
      "joined": true,
      "cursor": 508,
      "interval": 300,
      "activeTask": "implementation"
    }
  },
  "updatedAt": "2026-05-18T05:00:00Z"
}
```

The `joined` field is critical: it distinguishes soft-leave (agent is still a room participant, use `room_list_messages`) from crash recovery (agent lost membership, use `room_join` first).

## Design Note

This is the proactive motion trigger — the key innovation of the room-presence plugin. It gives an agent cadence without requiring persistent blocking of the execution thread. The state file makes cadence survive interruptions, compaction, and crashes. The agent works between check-ins and surfaces when there's something worth surfacing.
