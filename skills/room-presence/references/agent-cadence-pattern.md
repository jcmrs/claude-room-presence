# Agent Cadence Pattern — General-Purpose Design Spec

Design specification for extracting the cadence pattern from claude-room-presence into a standalone, general-purpose capability. This is a product incubation document, not implementation.

## Problem

Agents are stateless across turns. Any external system an agent needs to maintain awareness of — rooms, queues, APIs, databases, file watchers — suffers the same fundamental challenge: the agent wakes up without knowing what changed since last time.

Current solutions are ad hoc: each integration reinvents polling, state persistence, and compaction recovery independently.

## Core Pattern

Four primitives that compose into persistent agent awareness:

### 1. ScheduleWakeup (Tick)

The scheduling primitive. Registers a self-contained prompt that fires after a delay. The agent wakes, processes, and re-registers.

**Properties:**
- Non-blocking — terminal stays available between ticks
- Composable — multiple systems can register independent ticks
- Hint, not contract — the runtime may delay or coalesce ticks

### 2. Self-Contained Prompts (Payload)

Each tick carries everything needed for re-entry after compaction. No assumptions about prior conversation state.

**Required elements:**
- System identifier (room code, queue URL, API endpoint)
- Current mode (cadence, active, idle)
- Active task context (what the agent was doing)
- Recovery instruction (read state file → branch on status → respond)

**Anti-pattern:** Embedding volatile state (cursors, timestamps, sequence numbers) in prompts. These go stale between scheduling and waking. Reference a state file instead.

### 3. State File (Persistence)

Durable, inspectable state that survives the one thing agents can't — statelessness after compaction.

**Schema requirements:**
- `joined` / `connected` boolean — distinguishes soft-disconnect (still a participant, use lightweight check) from crash recovery (lost membership, re-establish connection first)
- Cursor or offset — last-processed position in the external system's stream
- Mode — current engagement mode
- Task context — what the agent was doing last
- System-specific metadata (e.g., `replyMode` for rooms)

**Write semantics:**
- Atomic (temp file + rename) — concurrent access from monitor + agent is expected
- Merge, not overwrite — re-initialization preserves existing fields

### 4. Soft Engagement (Connection Management)

Stay connected without blocking. The agent remains a participant in the external system but doesn't hold an active connection that blocks its execution thread.

**Analog in rooms:** Soft leave — stop calling `room_listen`, stay joined, resume via `room_list_messages`.
**Analog in queues:** Stop long-polling, keep subscription, resume via list/recent.
**Analog in APIs:** Stop watching, keep session token valid, resume via fetch-latest.

## Composition

```
init(system) → ScheduleWakeup(payload)
  ↓
wake → readState() → branch:
  ├─ connected: fetchLatest(since cursor) → respond → updateState → re-register
  └─ disconnected: reConnect() → fetchAll() → respond → updateState → re-register
```

## Design Principles

1. **Inform, don't interpret** — the pattern gives agents awareness of external system state, not opinions about what to do with it
2. **Fail open** — monitor/watcher failures should not degrade the agent's primary work
3. **Idempotent recovery** — re-initialization after crash or compaction converges to correct state regardless of how many times it runs
4. **Composable** — multiple systems can use the pattern simultaneously without interference
5. **State file as source of truth** — prompts are recovery instructions, state files are facts

## Product Opportunities

### agent-cadence (standalone skill package)

A Claude Code plugin or skill package that provides:
- Generic state file management (init, get, set, remove for any system)
- Prompt template generation (self-contained, references state file)
- Compaction recovery automation (read state → branch → recover)
- Engagement mode management (cadence, active, idle)
- Stale connection detection (soft-disconnect monitoring)

### Scope: Any external system where an agent needs persistent awareness

- Agent rooms (proven — this plugin)
- Task queues (SQS, Redis, file-based)
- Database change feeds
- File system watchers
- API polling (status pages, dashboards)
- CI/CD pipeline monitoring
- Multi-agent coordination systems

### Out of scope

- Transport-layer implementation (each system provides its own client)
- Message interpretation or decision-making
- Multi-room routing (that's rooms-specific)

## Relationship to claude-room-presence

This plugin is the proof-of-concept. The cadence state file, self-contained prompts, soft leave, and compaction recovery are all instances of this general pattern. Extracting it would:

1. Remove ~60% of claude-room-presence's complexity into a reusable package
2. Enable any plugin to add persistent agent awareness without reinventing the primitives
3. Create a standard interface for "agent maintains awareness of X while doing Y"

## Known External System Pitfalls

The cadence pattern assumes external systems behave predictably. In practice:

**Error state conflation.** External systems may return the same error for fundamentally different conditions. In agent-room-mcp, `findSpeaker()` returns `null` for both "participant not found" and "participant is muted" — then throws the same `MutedError` for both. An agent using the cadence pattern sent messages with the wrong name, received "muted," assumed the host muted them, and went silent for 30+ minutes. **Principle:** cadence adapters must disambiguate error states before acting on them. If the external system can't distinguish, the adapter must check preconditions independently (e.g., verify participant membership before trusting a "muted" response).

**No participant eviction.** External systems may not clean up stale connections. In agent-room-mcp, participants persist until explicit removal or room expiry (24h). Crashed agents leave ghost participants that cause name collisions ("(2)", "(3)") and block clean reconnection. **Principle:** cadence adapters should detect and clean stale connections during recovery, not assume the external system handles it.

**Cursor gaps after recovery.** If an agent crashes with cursor N and external system is at cursor N+K, recovery may fetch all messages since N (potentially thousands). The cadence pattern needs cursor gap handling — either cap the fetch, or accept the gap and start from current. **Principle:** recovery should have a configurable gap tolerance, not blindly fetch the entire delta.

## Open Questions

1. **State file schema standardization** — should there be a canonical schema that all system adapters conform to, or is the schema per-system?
2. **Monitor integration** — should the pattern include the background watcher component, or is that transport-specific?
3. **Multi-system orchestration** — if an agent uses cadence for rooms AND queues, how do the tick schedules interact?
4. **Naming** — "agent-cadence" is the working name. Better alternatives welcome.
