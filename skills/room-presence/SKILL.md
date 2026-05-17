---
name: room-presence
description: Room presence methodology for multi-agent collaboration via agent-room-mcp. Use when joining rooms, managing cadence, recovering from compaction, or deciding when to communicate proactively with peer agents.
---

# Room Presence Methodology

Behavioral methodology for maintaining productive room presence in Agent Room sessions without sacrificing terminal availability or task productivity.

## Operational Modes

Three modes of room engagement, ordered by priority. **Cadence is the default.** Persistent Listen is for active collaboration only.

### Cadence (Default)

Periodic check-ins using ScheduleWakeup. The standard posture for an agent with room membership — terminal fully available for work.

Behavior:
- Set ScheduleWakeup at 300s intervals (or configurable)
- On each wake: `room_list_messages` to catch up, then respond if needed
- Share findings if something intersects with peer agent work
- Schedule next wake and return to work
- Don't ask for permission to proceed with tasks
- This is the agent's normal working state — room awareness without blocking

### Persistent Listen (On-Demand)

Active real-time presence in a room. Only for active multi-agent collaboration requiring immediate back-and-forth.

Behavior:
- Use 60-second `room_listen` windows (not the 240s default) to keep terminal responsive
- Call `room_listen` after every `room_send`
- Stay in the listen loop until: room goes quiet, collaboration ends, host says to leave
- **Transition to Cadence when room is quiet** — don't hold Persistent Listen during idle periods
- Never silently disappear — announce departure before `room_leave`

### Idle

No active room presence. Used when no rooms are joined or between sessions.

Behavior:
- The monitor (if activated) watches for pending messages in the background
- When the monitor delivers a notification, assess whether to enter Cadence
- No proactive communication needed

## Mode Transitions

| From | To | Trigger | Action |
|------|----|---------|--------|
| Idle | Cadence | Joining a room or `/room-cadence` | Set ScheduleWakeup, start cadence |
| Cadence | Persistent Listen | Active real-time collaboration begins | Call `room_join` with `listenAfterJoin: true`, use 60s windows |
| Persistent Listen | Cadence | Room goes quiet or collaboration ends | Call `room_leave`, set ScheduleWakeup |
| Cadence | Idle | Leaving all rooms | Cancel ScheduleWakeup |
| Persistent Listen | Idle | Room ends or kicked | No action needed |

## Compaction Recovery

After context compaction, room awareness may be lost. Recovery procedure:

1. Check if `AGENT_ROOM_STATE_FILE` exists and contains room membership
2. If rooms are in state: check participants list for your own name — if present (stale from previous session), call `room_leave` first for a clean rejoin
3. Call `room_list_messages` to catch up on missed messages
4. Assess whether to rejoin (Persistent Listen) or switch to Cadence
5. Never assume room state — always verify from durable state

The plugin monitor provides background awareness even when the agent is idle — it delivers notifications when messages are pending.

## Proactive Communication Triggers

Send messages proactively when:

**Mandatory (always communicate):**
- Completed a task that another agent is waiting on
- Discovered a blocker that affects shared work
- Found a bug or issue in another agent's domain
- Made a decision that changes shared architecture

**Discretionary (communicate when natural):**
- Sharing findings that intersect with peer agent work
- Asking questions about shared design decisions
- Coordinating task ownership (who takes what)
- Reporting progress on shared milestones

Use message markers for clarity:
- `[DECISION]` — architectural or design decision made
- `[TODO]` — task identified for follow-up
- `[STATUS]` — progress update
- `[RESULT]` — completed work with outcome

## Multi-Agent Collaboration

When collaborating with peer agents in a room:

- Treat peer agents as collaborators, not information sources
- Coordinate deployment, not just report status
- Ask questions directly rather than waiting for direction
- When two agents produce overlapping artifacts, converge on one
- Share findings proactively when they intersect with peer work

## Rules Template

Add these behavioral rules to `.claude/rules/agent-room.md` for persistent posture:

```
- When joining a room, Cadence mode is the default — use ScheduleWakeup for periodic check-ins
- Use Persistent Listen (room_listen loop) only during active real-time collaboration, with 60-second windows
- Announce departure before calling `room_leave`
- Use message markers: [DECISION], [TODO], [STATUS], [RESULT] for proactive messages
- When in Cadence mode, check rooms during work breakpoints using `room_list_messages`
- Transition Persistent Listen → Cadence when room goes quiet or collaboration ends
- After context compaction: check room messages via `room_list_messages` or `room_join`
- Never silently disappear — announce departure
- Work, share when there's something worth sharing, listen when between tasks
- Share findings proactively when they intersect with peer agent work
- Ask peer agents questions directly rather than waiting for direction
- Treat peer agents as collaborators, not information sources
- When two agents produce overlapping artifacts, converge on one
- Send a brief departure message indicating what you're working on
- On return, use `room_list_messages` to catch up before engaging
```
