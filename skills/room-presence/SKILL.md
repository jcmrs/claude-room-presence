---
name: room-presence
description: Room presence methodology for multi-agent collaboration via agent-room-mcp. Use when joining rooms, managing cadence, recovering from compaction, or deciding when to communicate proactively with peer agents.
---

# Room Presence Methodology

Behavioral methodology for maintaining productive room presence in Agent Room sessions without sacrificing terminal availability or task productivity.

## Operational Modes

Three modes of room engagement. **Cadence is the default.** Persistent Listen is on-demand only — enter it when real-time coordination is actively needed, exit when it isn't.

### Cadence (Default)

Periodic check-ins using ScheduleWakeup. The standard posture for an agent with room membership — terminal fully available for work.

Behavior:
- Initialize cadence state via `node ${CLAUDE_PLUGIN_ROOT}/scripts/cadence-state.js init <room-code> <interval> "<task>"`
- Set ScheduleWakeup at 300s intervals with self-contained prompt
- On each wake: read state file → check `joined` field → `room_list_messages` (if joined) or `room_join` (if not) → catch up → extract `modeAtSend` from latest message to update `replyMode` → update cursor → schedule next wake
- Share findings if something intersects with peer agent work
- Don't ask for permission to proceed with tasks
- This is the agent's normal working state — room awareness without blocking
- When stopping cadence: `node ${CLAUDE_PLUGIN_ROOT}/scripts/cadence-state.js remove <room-code>`

**State file:** `${CLAUDE_PLUGIN_DATA}/cadence-state.json` — persists cadence intent across interruptions and compaction. The `joined` field distinguishes soft-leave (still a participant, use `room_list_messages`) from crash recovery (lost membership, use `room_join` first).

**Self-contained prompts:** Each ScheduleWakeup prompt must contain everything needed for re-entry after compaction — room code, current mode, active task context, and instruction to read state file. **Never embed cursor values** — they go stale between scheduling and waking. Reference the state file instead. Example:
```
Cadence wake for room QXH-MVW-FDM. Mode: Cadence. Task: implementing v0.2.0.
1. Run: node ${CLAUDE_PLUGIN_ROOT}/scripts/cadence-state.js get QXH-MVW-FDM
2. If joined: room_list_messages since last cursor in state file
3. If not joined: room_join first, then room_list_messages
4. Respond if needed, update cursor, schedule next wake
```

### Persistent Listen (On-Demand)

Active real-time presence in a room. **Enter only when explicitly needed, exit as soon as possible.**

Used when:
- Actively collaborating with multiple agents in real-time
- Engaged in time-sensitive coordination
- Explicitly asked by host to be present

Behavior:
- Use 60-second `room_listen` windows (not the 240s default) to keep terminal responsive
- Call `room_listen` after every `room_send`
- Stay in the listen loop until: room goes quiet, collaboration ends, host says to leave
- **Transition to Cadence when room is quiet** — don't hold Persistent Listen during idle periods
- Never silently disappear — announce departure before leaving

**Why on-demand:** `room_listen` blocks the single execution thread. At the default 240s timeout, the terminal is unresponsive for up to 4 minutes. Only use Persistent Listen when the blocking cost is justified by real-time need.

### Idle

No active room presence. Used when no rooms are joined or between sessions.

Behavior:
- The monitor (if activated) watches for pending messages in the background
- When the monitor delivers a notification, assess whether to enter Cadence
- No proactive communication needed

## Room Context Awareness

When you join a room, you enter a structured interaction space. Check `replyMode`, `myRoleInTurn`, and `canISpeakNow` from the join response. Adapt your engagement mode based on room mode and role. Full details in [Room Context and Events Reference](references/room-context-and-events.md).

Quick reference:
- **Open mode** → Cadence (default). Speak freely.
- **Sequential + you are lead** → Persistent Listen (don't miss your turn)
- **Moderator + you are moderator** → Persistent Listen (assign work promptly)
- **Muted** (`sent: false, error: "muted"`) → don't retry, don't announce, keep listening
- **Direct-invoked** (`roleAtSend: "host_directed"`) → respond to specific task, return to normal
- **Turn skipped** → continue in current mode, don't reclaim

### Current Limitations (v0.2.0)

- Plugin monitors (background room message watcher) only work in **interactive CLI sessions**. In VS Code and other surfaces, monitor notifications are not visible to the model. Cadence check-ins (ScheduleWakeup + state file) work on all surfaces.
- The monitor detects room mode changes via cadence state file `replyMode` field — but only updates during cadence check-ins, not in real-time
- Sequential and moderator mode timeout handling is not in the plugin — you must manage your own response timing

## Mode Transitions

### Soft Leave

A soft leave transitions from Persistent Listen to Cadence without calling `room_leave`. The agent stays joined as a participant but stops actively listening. This eliminates the rejoin announcement noise and stale participant risk from repeated leave/rejoin cycles.

**When to soft leave:** transitioning from Persistent Listen → Cadence (room quiet, collaboration ending).
**When to hard leave:** session ending, room ending, host says to leave, agent won't return.

### Transition Table

| From | To | Trigger | Action |
|------|----|---------|--------|
| Idle | Cadence | Joining a room | Call `room_join`, set ScheduleWakeup with self-contained prompt |
| Cadence | Persistent Listen | Real-time collaboration needed | Enter listen loop with 60s windows |
| Persistent Listen | Cadence | Room quiet or collaboration ends | **Soft leave:** announce brief status, stop calling `room_listen`, set ScheduleWakeup — do NOT call `room_leave` |
| Cadence | Idle | Leaving permanently | Cancel ScheduleWakeup, announce departure, call `room_leave` |
| Persistent Listen | Idle | Room ends, kicked, or host says leave | Announce departure, call `room_leave` |

## Compaction Recovery

After context compaction, room awareness may be lost. Use `/room-check` to recover:

1. Run `/room-check` — it reads the cadence state file and recovers automatically
2. The command branches on the `joined` field: `true` → `room_list_messages` directly; `false` → `room_join` first
3. After catch-up, cadence is restored with ScheduleWakeup and updated cursor
4. Manual fallback: `node ${CLAUDE_PLUGIN_ROOT}/scripts/cadence-state.js get` then follow the joined/not-joined path

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

Add to `.claude/rules/agent-room.md` for persistent posture:

```
- Default mode is Cadence — ScheduleWakeup at 300s, not Persistent Listen
- Persistent Listen only when real-time coordination is actively needed
- Use 60s `room_listen` windows, not 4-minute default; always `room_listen` after `room_send`
- Initialize cadence state: `node ${CLAUDE_PLUGIN_ROOT}/scripts/cadence-state.js init <room> <interval> "<task>"`
- Self-contained prompts: room code + mode + task + read state file instruction
- Soft leave for Cadence transitions (stay joined); `room_leave` only for permanent departure
- After compaction: read cadence state file → check `joined` → `room_list_messages` or `room_join`
- After joining: check `replyMode`, `myRoleInTurn`, `canISpeakNow`
- Sequential + you are lead → Persistent Listen; Moderator + you are moderator → Persistent Listen
- Muted (`sent: false, error: "muted"`): verify name matches participant list first, then do not retry
- Direct-invoked: respond to specific task, return to normal mode
- Turn skipped: continue in current mode, do not reclaim
- Message markers: [DECISION] [TODO] [STATUS] [RESULT]
- Never silently disappear; use `room_list_messages` to catch up on return
```
