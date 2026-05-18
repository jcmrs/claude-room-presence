# Upstream Issue Drafts: agent-room-mcp

**Purpose:** Formal issue drafts ready to submit when a channel to the maintainer (ebin198351) is found.
**Context:** agent-room-mcp has no public repository. These were identified during claude-room-presence v0.2.0 development.

---

## Issue 1: findSpeaker returns MutedError for both "not a participant" and "muted"

**Severity:** High — causes false-muted errors that silence agents for extended periods

**Current behavior:**

In `appendMessage()` (around line 880), `findSpeaker()` is called:

```js
function findSpeaker(room, name, clientKind) {
  const p = room.participants.find(
    (x) => x.name === name && x.client === clientKind
  );
  if (!p) return null;                     // NOT in participants
  if (p.canSpeak === false) return null;   // Explicitly muted
  return p;
}
```

If `findSpeaker` returns `null` (for either reason), `appendMessage` throws `MutedError`:

```js
if (!findSpeaker(room, message.name, message.client)) {
  throw new MutedError(message.name, room.createdBy);
}
```

The handler returns:
```json
{ "sent": false, "error": "muted", "hint": "...Tell the user the host needs to unmute..." }
```

**Problem:** Two fundamentally different conditions produce the same error:
1. Agent is a valid participant but the host muted them (`canSpeak: false`)
2. Agent's name doesn't match any participant (name mismatch, stale participant, wrong client type)

Case 2 is not muting — it's an identity error. But the response tells the agent to ask the host to unmute, which is wrong advice.

**Impact:** An agent sending with the wrong name (e.g., "ENGINEER" instead of "workspace-axivo-claude-engineer") receives "muted" and waits for the host to unmute. The agent goes silent indefinitely.

**Suggested fix:**

Distinguish the two cases:

```js
function findSpeaker(room, name, clientKind) {
  const p = room.participants.find(
    (x) => x.name === name && x.client === clientKind
  );
  if (!p) {
    const error = new Error(`"${name}" is not a participant in this room (client: ${clientKind}). Check your display name matches the participants list.`);
    error.code = "NOT_A_PARTICIPANT";
    throw error;
  }
  if (p.canSpeak === false) {
    throw new MutedError(name, room.createdBy);
  }
  return p;
}
```

Return different error codes:
- `{ sent: false, error: "muted" }` — participant exists but can't speak
- `{ sent: false, error: "not_a_participant" }` — name not found in participants

---

## Issue 2: No participant TTL or heartbeat eviction

**Severity:** Medium — causes stale participant accumulation

**Current behavior:**

Room participants have `joinedAt` and `lastSeenAt` fields, but neither is used for cleanup:

```js
const participant = {
  name: a.name,
  role: a.role ?? "",
  color: colorForName(a.name),
  initials: initialsFor(a.name),
  client: "cc",
  joinedAt: Date.now(),
  lastSeenAt: Date.now()
};
```

`lastSeenAt` is set on join but never updated or checked. Participants persist until:
- Explicitly removed via `room_leave`
- Host removes them via people panel
- Room expires (24h TTL, applies to entire room)

**Problem:** If an agent crashes without calling `room_leave`, its participant entry persists indefinitely. When the agent reconnects (new session), `joinRoom` sees the stale entry and generates a suffixed name ("Engineer (2)"). Over multiple crashes, participants accumulate as "Engineer (2)", "Engineer (3)", etc.

The Stop hook has a `stillIn` check:
```js
const stillIn = room.participants.some(
  (p) => p.name === r.name && p.client === "cc"
);
if (room.status !== "active" || !stillIn) {
  await removeRoom(code);
}
```

But this only runs during the Stop hook, not periodically. If the session terminates without a Stop hook firing (crash, kill, timeout), the stale participant remains.

**Suggested fix:**

Add a participant TTL with periodic cleanup:

1. Update `lastSeenAt` on every `room_listen`, `room_send`, and `room_list_messages` call
2. During `getRoom` or `casRoom`, evict participants where `Date.now() - lastSeenAt > PARTICIPANT_TTL_MS` (e.g., 30 minutes for cc clients, shorter for web)
3. Add a `participants` field to the `room_list_messages` response so agents can detect their own stale entries

---

## Issue 3: No message addressing or threading

**Severity:** Low — limits targeted coordination in multi-agent rooms

**Current behavior:**

All messages broadcast to all participants. There's no way to:
- Address a message to a specific agent
- Thread replies to a specific message
- Filter messages by sender during retrieval

**Impact:** In a room with 3+ agents, every agent processes every message. Coordination requires manual filtering by name parsing in prompt text. No way to have side conversations or targeted requests.

**Suggested fix:**

Add optional `to` field to messages:
```json
{ "text": "...", "to": "DEVELOPER" }
```
Messages with `to` are delivered only to the named participant (and the host). Messages without `to` broadcast as today.
