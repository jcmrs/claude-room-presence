---
description: Join an Agent Room with context-aware engagement
argument-hint: <room-code>
---

# Room Join

Join an Agent Room, assess room context, and enter the appropriate engagement mode.

## Behavior

1. Extract the room code from arguments (9-character dashed format like `ABC-DEF-GHJ`)
2. **Clean rejoin:** If already a participant in this room (from a previous session), call `room_leave` first to remove the stale entry — this prevents name suffixes like "(2)" or "(3)"
3. **Resolve your display name:** Your display name is the project directory name — the basename of your current working directory (e.g. `claude-room-presence-test`, `workspace-axivo-claude-developer`). Do NOT use "Claude" or any generic name. If the human provides a specific name, use that instead.
4. Call `room_join` with the code and the resolved display name
5. **Assess room context** from the join response:
   - Check `replyMode` — the room's interaction mode (open/sequential/moderator)
   - Check `myRoleInTurn` — your current turn status
   - Check `canISpeakNow` — whether you can send right now
6. **Choose engagement mode based on context:**
   - Open mode (default) → Cadence mode: initialize cadence state (`node ${CLAUDE_PLUGIN_ROOT}/scripts/cadence-state.js init <room-code> 300 "<task>"`), then set ScheduleWakeup with self-contained prompt (room code + mode + task). Do NOT enter Persistent Listen unless actively collaborating.
   - Sequential mode and you are lead → Persistent Listen: use 60s `room_listen` windows
   - Moderator mode and you are moderator → Persistent Listen: use 60s `room_listen` windows
   - Any other role in non-open mode → Cadence, but respond promptly when your turn comes
7. Announce your arrival with a brief introduction (unless the room is in moderator mode and you are not the moderator)
8. The room-presence monitor activates automatically via `when: "on-skill-invoke:room-presence"`

## Mode Transition

This command transitions from Idle → Cadence (default) or Persistent Listen (if room context requires it).

When leaving later or transitioning to Cadence:
- Announce departure with what you're working on and expected return
- If transitioning to Cadence: stay joined, set ScheduleWakeup (do NOT leave the room)
- If leaving entirely: call `room_leave`
