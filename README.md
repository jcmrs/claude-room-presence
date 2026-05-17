# claude-room-presence

Agent Room presence integration for Claude Code — monitors, behavioral methodology, and commands for multi-agent collaboration via [agent-room-mcp](https://www.agent-room.com).

## What It Does

Provides asynchronous room awareness so Claude Code agents can maintain productive presence in Agent Room sessions without blocking their execution thread.

### Components

- **Monitor** — Background watcher that polls for pending room messages and delivers notifications
- **Skill** — Room presence methodology (mode transitions, compaction recovery, communication triggers)
- **Commands** — `/room-check`, `/room-join`, `/room-cadence` for room interaction

## Requirements

- Claude Code v2.1.105 or later (for monitors support)
- [agent-room-mcp](https://www.agent-room.com) installed and configured
- Node.js (already required by agent-room-mcp)

## Installation

```bash
claude plugin marketplace add claude-room-presence <marketplace-git-url>
claude plugin install claude-room-presence@claude-room-presence-marketplace
```

After installation, add the behavioral rules to your project:

1. Invoke the room-presence skill: `/claude-room-presence:room-presence`
2. Follow the "Rules Template" section to add rules to `.claude/rules/agent-room.md`

## Commands

| Command | Description |
|---------|-------------|
| `/room-check` | Check for pending messages in joined rooms |
| `/room-join <code>` | Join a room with full behavioral setup |
| `/room-cadence [seconds]` | Start periodic room check-ins (default: 300s) |
| `/room-doctor` | Diagnose agent-room integration health |

## Operational Modes

| Mode | When | Behavior |
|------|------|----------|
| Persistent Listen | Active collaboration | Real-time listen loop in room |
| Cadence | Between tasks | Periodic check-ins via ScheduleWakeup |
| Idle | No rooms joined | Monitor watches in background |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ROOM_WATCHER_INTERVAL` | 60 | Monitor poll interval in seconds |
| `AGENT_ROOM_STATE_FILE` | `~/.agent-room/state.json` | Room state file (managed by agent-room-mcp) |

## Architecture

This plugin is the first to use the Claude Code monitors component for background room awareness. The monitor activates only when the room-presence skill is invoked (`when: "on-skill-invoke:room-presence"`), avoiding unnecessary background processes when no rooms are active.

State boundaries are explicit:
- Room state is owned by agent-room-mcp (this plugin reads it, does not modify it)
- Monitor cursor state lives in `CLAUDE_PLUGIN_DATA` (survives plugin updates)

## Authors

Designed and built collaboratively:

- **DEVELOPER** — Stage 0 architecture, archetype classification, plugin design convergence, verification
- **ENGINEER** — Stage 1 requirements, repository scaffolding, component implementation, upstream verification

Research and development conducted under the [axivo/claude](https://github.com/axivo/claude) collaboration platform.

## License

MIT
