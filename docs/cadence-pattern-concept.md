# Cadence Pattern: Agent Persistent Presence Across Turn Boundaries

**Type:** Product incubation concept
**Origin:** claude-room-presence v0.2.0 — JCMRS identified generalizability
**Status:** Concept — not in active development

---

## The Pattern

An agent maintains awareness of an external system while performing other work, using a three-layer architecture:

1. **Persistent intent** — A state file records what the agent is monitoring and why
2. **Periodic trigger** — ScheduleWakeup fires at configured intervals
3. **Self-contained prompts** — Each trigger carries everything needed for re-entry after context compaction

The agent works between check-ins and surfaces when there's something worth surfacing.

## What Makes It Generalizable

The cadence pattern solves a fundamental agent problem: **stateless agents cannot maintain persistent awareness of external systems.** Each turn starts fresh. Context compaction erases accumulated state. The cadence pattern gives agents a durable external memory that survives both.

The three layers are domain-agnostic:

- **External system** could be a chat room, an API, a message queue, a dashboard, a git repository, a CI pipeline, or any system with state that changes over time.
- **State file** captures monitoring intent, cursor position, and current task context.
- **Self-contained prompts** enable recovery from compaction without relying on conversation memory.

## Architecture

```
┌─────────────┐     ScheduleWakeup      ┌──────────────┐
│   State      │ ◄────────────────────── │    Agent      │
│   File       │ ──────────────────────► │   (Claude)    │
│              │    Read state, act,      │              │
│  - intent    │    write state back      │  - work      │
│  - cursor    │                          │  - respond   │
│  - task      │                          │  - decide    │
│  - mode      │                          │              │
└─────────────┘                          └──────────────┘
       │                                        │
       │                                        │
       ▼                                        ▼
┌─────────────┐                          ┌──────────────┐
│  External   │ ◄──── query/poll ────────  │   MCP Tool   │
│   System    │ ──── response ──────────►  │  / API / CLI  │
└─────────────┘                          └──────────────┘
```

## Key Design Principles

1. **State file is source of truth** — never embed transient values (cursors, timestamps) in prompts. They go stale.
2. **Prompts are self-contained** — assume zero context on each wake. Room code, mode, task, and instruction to read state file.
3. **Soft transitions** — an agent can step away from active monitoring without losing its place. It stays "joined" to the external system and picks up where it left off on next wake.
4. **Productive presence** — each wake should advance work, not just report status. Cadence becomes performative when the agent checks in without producing anything.
5. **Graceful degradation** — background monitors (push notifications) are best-effort. The state file + ScheduleWakeup (poll) is the reliable baseline that works everywhere.

## Proven Applications

### Room Presence (claude-room-presence)
Agent maintains membership in multi-agent chat rooms, catches up on missed messages, and responds when relevant. Three engagement modes: Cadence (periodic), Persistent Listen (real-time), Idle.

### Potential Applications

- **CI/CD Pipeline Monitoring** — agent watches build status, surfaces failures, tracks deployment progress
- **Code Review Coordination** — agent tracks PR reviews across a team, surfaces blockers
- **Documentation Gardening** — agent periodically checks for stale docs, broken links, outdated examples
- **Dependency Monitoring** — agent watches for security advisories, version bumps, breaking changes
- **Multi-Agent Task Coordination** — agent maintains awareness of peer agents' work status without real-time blocking
- **Calendar/Schedule Awareness** — agent tracks upcoming events, deadlines, and meeting prep needs
- **API Health Monitoring** — agent polls endpoint health, surfaces degradation patterns

## Product Shape

A standalone plugin that provides the cadence pattern as a reusable capability:

- **cadence init <system> <interval> "<task>"** — register monitoring intent
- **cadence wake <system>** — trigger check-in (called by ScheduleWakeup)
- **cadence status** — show all active cadences
- **cadence pause/resume <system>** — temporarily suspend monitoring
- **cadence remove <system>** — stop monitoring

The plugin provides the state file management, prompt templates, and ScheduleWakeup integration. Domain-specific adapters (room presence, CI monitoring, etc.) register as cadence "systems" with their own check-in logic.

## Relationship to claude-room-presence

claude-room-presence proves the pattern works in production. The standalone cadence plugin would extract the pattern, making it available to any agent that needs persistent awareness. Room presence becomes the first "adapter" — a specialized system that uses the cadence infrastructure for room monitoring.

## Next Steps

1. Validate the pattern with a second domain (CI monitoring or code review coordination)
2. Extract cadence-state.js into a standalone package
3. Define the adapter interface (register, wake, pause, remove)
4. Build the CLI commands
5. Document the pattern as a contribution to the Claude Code plugin ecosystem
