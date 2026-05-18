# Crash-Recovery Test Plan

**ID:** v0.2.0 #13
**Owner:** ENGINEER
**Depends on:** #1 (soft leave), #2 (cadence survival / state file)
**Type:** Manual test procedure

---

## Purpose

Validate that an agent can recover room presence after an ungraceful session termination (no `room_leave` called). Tests the interaction between soft leave, cadence state file, and clean rejoin patterns.

## Prerequisites

- agent-room-mcp installed and configured
- claude-room-presence plugin installed (v0.2.0+)
- A test room (create with `room_create`)
- Two terminal sessions (one for the test agent, one to observe)

## Test Cases

### TC-1: Normal Soft Leave Recovery

**Setup:** Agent joins room, enters Cadence mode with soft leave (stays joined).

**Steps:**
1. Agent joins room via `/room-join <code>`
2. Agent enters Cadence — state file initialized with `joined: true`
3. ScheduleWakeup fires, agent uses `room_list_messages` directly (no rejoin)
4. Repeat 3 cycles

**Expected:**
- State file has `joined: true` throughout
- No `room_join` calls during Cadence check-ins
- No stale participant accumulation
- No greeting noise

**Pass criteria:** 3 consecutive Cadence cycles with `room_list_messages` only, no rejoin.

---

### TC-2: Crash Without Leave

**Setup:** Agent joins room and enters Cadence. Session terminates abruptly.

**Steps:**
1. Agent joins room, enters Cadence
2. State file has `joined: true`
3. **Terminate the session** (Ctrl+C, kill process, or close terminal)
4. Open a new session in the same project
5. New session reads state file: `node ${CLAUDE_PLUGIN_ROOT}/scripts/cadence-state.js get <room-code>`
6. State says `joined: true` but agent is no longer in the room
7. New session attempts `room_list_messages` — should fail or return empty with participant check
8. New session detects stale state, calls `room_join` (clean rejoin: check participants → leave if name found → join)

**Expected:**
- State file persists across session boundary
- Clean rejoin removes stale participant entry
- No name suffix accumulation ("(2)", "(3)")
- State file updated to reflect new session

**Pass criteria:** Agent recovers room presence with correct name, no duplicate participants.

---

### TC-3: State File Corruption

**Setup:** Cadence is active. State file gets corrupted.

**Steps:**
1. Agent in Cadence, state file valid
2. Manually corrupt state file: `echo "not json" > ${CLAUDE_PLUGIN_DATA}/cadence-state.json`
3. ScheduleWakeup fires, agent reads state file
4. `cadence-state.js get` returns null/parse error
5. Agent falls back: skips cycle, re-initializes state

**Expected:**
- No crash or infinite loop
- Graceful fallback to safe state
- Agent continues working, next cycle re-initializes cadence

**Pass criteria:** No error propagation, agent remains functional, state file repaired on next init.

---

### TC-4: Compaction Mid-Cadence

**Setup:** Agent in Cadence. Context compaction occurs between ScheduleWakeup cycles.

**Steps:**
1. Agent in Cadence with active state file
2. Context grows until compaction triggers
3. After compaction, ScheduleWakeup fires with self-contained prompt
4. Prompt says "read state file" — agent has no memory but prompt is self-contained
5. Agent reads state file, gets room code + mode + cursor
6. Agent uses `room_list_messages` with cursor from state file

**Expected:**
- Self-contained prompt provides enough context for recovery
- State file survives compaction (stored in plugin data, not context)
- Agent catches up on missed messages using stored cursor
- No duplicate processing of already-seen messages

**Pass criteria:** Agent recovers cadence after compaction with correct cursor, no message gaps or duplicates.

---

### TC-5: Stale Cursor in Prompt

**Setup:** ScheduleWakeup prompt was created with cursor X, but messages arrived since then (cursor now X+N).

**Steps:**
1. Agent schedules cadence with self-contained prompt
2. Between scheduling and wake, other participants send messages (cursor advances)
3. ScheduleWakeup fires with old prompt text
4. Agent reads state file for current cursor (not prompt cursor)
5. Agent uses state file cursor for `room_list_messages`

**Expected:**
- State file has current cursor
- Agent does NOT use any cursor embedded in prompt text
- All messages since last check are retrieved
- State file cursor updated after processing

**Pass criteria:** No missed messages despite stale prompt. State file is sole cursor authority.

---

### TC-6: Multi-Room Crash Recovery

**Setup:** Agent is in Cadence for two rooms simultaneously.

**Steps:**
1. Agent joins room A, enters Cadence, state file has room A entry
2. Agent joins room B, enters Cadence, state file has both entries
3. Session terminates
4. New session reads state file, sees both rooms
5. Recovery loop: for each room, check `joined` → clean rejoin or `room_list_messages`

**Expected:**
- State file tracks multiple rooms independently
- Each room recovers independently
- No cross-room state contamination

**Pass criteria:** Both rooms recovered with correct participants and cursors.

---

## Test Environment Notes

- **CLI only:** Monitor notifications are CLI-only (per #5 findings). Tests should be run in Claude Code CLI, not VS Code.
- **State file location:** `${CLAUDE_PLUGIN_DATA}/cadence-state.json` — verify this env var is set before testing.
- **Clean slate:** Before each test, remove the state file and ensure no stale participants exist in the test room.

## Bug Class: Cadence Staleness

The root cause of cadence staleness (identified during live testing):

1. **Stale cursor in prompts** — embedding cursor values in ScheduleWakeup prompts that go stale between scheduling and waking. Fix: reference state file as source of truth.
2. **Performative presence** — agent checks in but doesn't produce work. Cadence becomes status reporting instead of productive engagement. Fix: each wake should advance at least one item.
3. **No work tracking** — agent has no durable record of what it committed to do. Fix: state file `activeTask` field tracks current work item.
