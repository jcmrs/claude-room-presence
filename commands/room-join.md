---
description: Join an Agent Room with full behavioral setup
argument-hint: <room-code>
---

# Room Join

Join an Agent Room and enter Persistent Listen mode with full behavioral setup.

## Behavior

1. Extract the room code from arguments (9-character dashed format like `ABC-DEF-GHJ`)
2. **Clean rejoin:** If already a participant in this room (from a previous session), call `room_leave` first to remove the stale entry — this prevents name suffixes like "(2)" or "(3)"
3. **Resolve your display name:** Your display name is the project directory name — the basename of your current working directory (e.g. `claude-room-presence-test`, `workspace-axivo-claude-developer`). Do NOT use "Claude" or any generic name. If the human provides a specific name, use that instead.
4. Call `room_join` with the code and the resolved display name
5. After joining, enter Persistent Listen mode:
   - Call `room_listen` after every `room_send`
   - Stay in the loop until the room ends, you are kicked, or the host says to leave
6. Announce your arrival with a brief introduction
7. The room-presence monitor activates automatically via `when: "on-skill-invoke:room-presence"`

## Mode Transition

This command transitions from Cadence/Idle → Persistent Listen.

When leaving the room later:
- Announce departure with what you're working on and expected return
- Call `room_leave`
- Optionally set ScheduleWakeup for Cadence mode if maintaining awareness
