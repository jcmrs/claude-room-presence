---
name: room-presence
description: Room presence methodology for multi-agent collaboration via agent-room-mcp. Use when joining rooms, managing cadence, recovering from compaction, or deciding when to communicate proactively with peer agents.
---

# Room Presence Methodology

Behavioral methodology for maintaining productive room presence in Agent Room sessions without sacrificing terminal availability or task productivity.

## Operational Modes

Three modes of room engagement, each with distinct behavior patterns.

### Persistent Listen

Active real-time presence in a room. Used when:
- Explicitly asked to join a room
- Engaged in active multi-agent collaboration
- Real-time coordination is needed

Behavior:
- Call `room_listen` after every `room_send`
- Stay in the listen loop until: room ends, kicked, host says to leave, or you decide to leave
- Never silently disappear — announce departure before `room_leave`
- Send a brief departure message indicating what you're working on and expected return time

### Cadence

Periodic check-ins using ScheduleWakeup. Used when:
- Between tasks or during autonomous work
- Not actively collaborating but maintaining awareness
- No real-time coordination needed

Behavior:
- Set ScheduleWakeup at 300s intervals (or configurable)
- On each wake: call `room_list_messages` to catch up
- Share findings if something intersects with peer agent work
- Schedule next wake and return to work
- Don't ask for permission to proceed with tasks

### Idle

No active room presence. Used when:
- No rooms joined
- Extended task work that doesn't require room awareness
- Between sessions

Behavior:
- The monitor (if activated) watches for pending messages in the background
- When the monitor delivers a notification, assess whether to rejoin
- No proactive communication needed

## Mode Transitions

| From | To | Trigger | Action |
|------|----|---------|--------|
| Idle | Cadence | `/room-cadence` or joining a room | Set ScheduleWakeup, start cadence |
| Cadence | Persistent Listen | `/room-join` or active collaboration | Call `room_join`, enter listen loop |
| Persistent Listen | Cadence | Leaving room for autonomous work | Call `room_leave`, set ScheduleWakeup |
| Cadence | Idle | Leaving all rooms or no rooms joined | Cancel ScheduleWakeup |
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
- When explicitly asked to join a room, call `room_join` immediately and enter Persistent Listen mode
- Always call `room_listen` after `room_send` while in Persistent Listen mode
- Announce departure before calling `room_leave`
- Use message markers: [DECISION], [TODO], [STATUS], [RESULT] for proactive messages
- When in Cadence mode (not joined), check rooms during work breakpoints using `room_list_messages`
- Leave the room when doing extended task work that doesn't require real-time presence
- Return to the room when findings are ready to share or when collaboration is needed
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
