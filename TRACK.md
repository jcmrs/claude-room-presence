# TRACK — claude-room-presence

**Product:** claude-room-presence
**Archetype:** 10 (Skills + Hooks + Commands) with Monitors
**Status:** v0.2.1 Shipped
**v0.1.0 tag:** 8a12479 (2026-05-18)

---

## Stage 0: Archetype Classification — Gate Checkpoint

**Date:** 2026-05-17
**Agent:** ENGINEER + DEVELOPER (collaborative, room QXH-MVW-FDM)
**Status:** PASSED

### Autonomous Decision

Classified as Archetype 10 (Skills + Hooks + Commands) with Monitors as core component. The monitors component is not yet in the facility archetype taxonomy — it's an emerging pattern discovered during research. No upstream plugin uses monitors yet; this plugin defines the pattern.

Core component: Monitors (background room message watcher). If removed, the plugin provides no asynchronous room awareness.

### Information Sufficiency

Researched:
- Official Anthropic plugin reference docs — confirmed monitors component (v2.1.105+)
- Upstream plugin patterns (`claude-plugins-official`) — no plugins use monitors
- Agent-room-mcp source (v0.23.0) — state management, hook implementation
- Facility archetype taxonomy — 12 archetypes, monitors not yet represented

### Validation Result

- Component set: {Monitors, Skills, Hooks, Commands}
- Core component: Monitors (background watcher) — PASS
- External dependency: agent-room-mcp (pre-installed MCP server) — PASS
- State boundary: plugin reads agent-room-mcp state, does not modify — PASS
- Taxonomy match: Archetype 10 with Monitors extension — PASS

### Future-Agent Note

This is the first plugin to use the monitors component. The monitor activates on `when: "on-skill-invoke:room-presence"` and runs as a background process that polls for pending room messages. The plugin depends on agent-room-mcp being installed separately. Rules are NOT installed to `.claude/rules/` — the SKILL.md includes a template that agents add manually. Stage 0 was collaborative between ENGINEER and DEVELOPER.

---

## Stage 1: Requirements — Gate Checkpoint

**Date:** 2026-05-17
**Agent:** ENGINEER (primary), DEVELOPER (review and convergence)
**Status:** PASSED

### Autonomous Decision

Produced architecture specification with 8 sections: capability need, package structure, component requirements (monitors, hooks, skills, commands), external dependencies, state boundaries, compliance baseline, out of scope, ad hoc unwind plan. Key decisions: hooks.json starts empty (agent-room-mcp manages its own hooks), monitor is fail-open, provider portability is MUST requirement.

### Information Sufficiency

All requirements resolved through Stage 0 research. DEVELOPER reviewed and converged on all points. One clarification resolved: hooks.json stays empty because agent-room-mcp handles SessionStart/Stop. Provider-specific auth added to out-of-scope per DEVELOPER suggestion.

### Validation Result

- Architecture specification internally consistent — PASS
- Sufficient for fresh agent to implement — PASS
- Compliance baseline produced (marketplace, portability, safety checklists) — PASS
- State boundaries documented (plugin vs agent-room-mcp ownership) — PASS
- Out of scope defined (MCP server, multi-room, message persistence, etc.) — PASS

### Future-Agent Note

Stage 1 was produced by ENGINEER with DEVELOPER review. The requirements address a specific gap: agents using agent-room-mcp need portable, self-contained integration that doesn't require ad hoc scripts in `.claude/hooks/`. The ad hoc deployment (asyncRewake-room-check.sh) is documented as a prototype to be unwound.

---

## Stage 2: Repository Scaffolding — Gate Checkpoint

**Date:** 2026-05-17
**Agent:** ENGINEER
**Status:** PASSED

### Autonomous Decision

Scaffolded the plugin at `plugins/claude-room-presence/` with directory structure matching Archetype 10 + Monitors. Created all component stubs with valid frontmatter. Naming follows facility convention (`claude-<capability>`).

### Information Sufficiency

plugin.json validated against facility plugin-identity.md requirements. All required fields present. Directory structure matches archetype components.

### Validation Result

- Directory structure matches archetype: .claude-plugin/, hooks/, monitors/, scripts/, skills/, commands/ — PASS
- plugin.json valid JSON with required fields (name, description, author) — PASS
- monitors.json valid JSON with required fields (name, command, description) — PASS
- hooks.json valid JSON — PASS
- SKILL.md has frontmatter with name and description — PASS
- All commands have frontmatter with description — PASS
- Monitor script exists and is executable — PASS
- .gitignore, LICENSE, README.md present — PASS
- Initial commit pending (requires git init)

### Future-Agent Note

Plugin scaffolded by ENGINEER. Monitor script (room-watcher.sh) is functional but needs live testing. The script uses `npx -y agent-room-mcp hook` for single-block polling — this is the same approach as the ad hoc asyncRewake-room-check.sh but properly packaged. git init and initial commit done.

---

## Stage 4: Validation — Gate Checkpoint

**Date:** 2026-05-17
**Agent:** ENGINEER
**Status:** PASSED

### Validation Results (Archetype 10: S+H+C)

**Static Checks (all PASS):**
- A1: plugin.json valid JSON with name, description, author — PASS
- A2: LICENSE (MIT) present — PASS
- A3: README.md complete with installation, configuration, architecture — PASS
- A4: Git repo clean — PASS
- C9: SKILL.md frontmatter with name, description — PASS
- C10: No internal references to validate — PASS (N/A)
- C11: Progressive disclosure (overview → modes → transitions → recovery → communication → rules) — PASS (SHOULD)
- D12: hooks.json valid JSON — PASS
- D13-D15: N/A (hooks.json intentionally empty)
- E16: All 4 commands have valid frontmatter with description — PASS
- G20: Cross-component references resolve (monitor → script, CLAUDE_PLUGIN_ROOT) — PASS

**Live Validation (PASS):**
- A5: Plugin loads via marketplace install — PASS (JCMRS verified in test project `claude-room-presence-test`)
- E17: All 4 commands + 1 skill discoverable via `/claude` — PASS
- G21: Plugin operates as integrated unit — PASS (no load errors after duplicate hooks fix)

**Issues Found and Fixed During Live Validation:**
- Duplicate hooks error: plugin.json declared `"hooks": "./hooks/hooks.json"` but Claude Code auto-discovers hooks by convention — removed explicit declaration (c25fc7f)
- Skill invocation name: README referenced `/claude-room-presence:room-presence` but actual name is `/room-presence` — fixed (e69c73e)

**Monitors-specific validation:**
- monitors.json valid JSON with required fields (name, command, description, when) — PASS
- Monitor script uses ${CLAUDE_PLUGIN_ROOT} for portable paths — PASS
- Monitor script uses ${CLAUDE_PLUGIN_DATA} for persistent state — PASS
- Monitor script has pre-flight checks (state file exists, rooms not empty) — PASS
- Monitor script is fail-open (all errors handled gracefully) — PASS
- Monitor script is cross-platform Node.js (replaced bash for Windows native support) — PASS

### Autonomous Decision

Live validation completed by JCMRS installing the plugin in a separate test project (`claude-room-presence-test`). Plugin loaded clean after the duplicate hooks fix. All commands and skills discovered correctly.

### Information Sufficiency

Full validation complete — static and live. Two issues discovered during live testing were fixed immediately.

### Future-Agent Note

Stage 4 fully passed. The duplicate hooks issue was an important discovery: plugin.json should NOT explicitly declare `"hooks": "./hooks/hooks.json"` because Claude Code auto-discovers hooks by directory convention. The monitors component loaded without issue — first plugin to use this pattern in production.

---

## v0.1.0 Release — 2026-05-18

**Tag:** v0.1.0 (8a12479)
**Agents:** DEVELOPER + ENGINEER (collaborative, room QXH-MVW-FDM)
**Session:** ~6 hours of live collaborative development and testing

### Shipped

- Monitors: background room message watcher (first plugin to use monitors component)
- Skills: full behavioral methodology (Cadence/Persistent Listen/Idle modes)
- Skills: room context awareness (open/sequential/moderator modes, role implications)
- Skills: interaction events (muting, direct-invoke, turn skipping)
- Commands: room-join (context-aware), room-cadence, room-leave, room-status
- Marketplace distribution via .claude-plugin/marketplace.json
- Agent naming convention (project directory name as display name)
- Clean rejoin pattern (room_leave before room_join)
- Self-contained cadence prompt pattern for compaction recovery
- 3 upstream feature request issues tracked (#1, #2, #3)

### Session Learnings

1. **Cadence is default, Persistent Listen is on-demand** — room_listen blocks single execution thread for 4 minutes at default timeout
2. **Room modes exist** — agent-room-mcp supports open/sequential/moderator; plugin must inform agents about them
3. **Leave/rejoin cycle creates noise** — each rejoin sends announcement, accumulates stale participants. Soft leave needed.
4. **Cadence doesn't survive interruption** — ScheduleWakeup is a hint, not a contract. Prompts must be self-contained.
5. **Agent-facing means informing, not interpreting** — the plugin must tell agents what rooms expect, not leave them to discover it

---

## v0.2.0 — Released 2026-05-18

**Tag:** v0.2.0 (3b30b2c)
**Theme:** Reliable Cadence + Clean Recovery
**Status:** Shipped

All 14 backlog items completed. See commit history for details.

---

## v0.2.1 — Released 2026-05-18

**Tag:** v0.2.1 (152bcbc)
**Theme:** Reliability — quality audit, smoke tests, hardening
**Branch:** v0.2.1 (active, accumulating toward v0.3.0 tag)

### Quality Audit (6 bugs found, 6 fixed)

| # | Bug | Severity | Fix | Commit |
|---|-----|----------|-----|--------|
| 4 | Non-atomic state file write | Critical | Atomic write via temp file + rename | 3dae7a1 |
| 5 | Monitor swallows all errors | Critical | Log stderr on failure | 152bcbc |
| 6 | False mode-change on restart | Critical | Persist prev-modes on first population | 152bcbc |
| 7 | Redundant per-room polling | Standard | Single checkRoom call | 152bcbc |
| 8 | cmdInit overwrites replyMode | Standard | Merge with existing entry | 3dae7a1 |
| 9 | Double-init resets cursor | Standard | Idempotent init preserves cursor | 3dae7a1 |

### Automated Testing (52 tests)

| Suite | Tests | Commit |
|-------|-------|--------|
| cadence-state.js | 34 (init, set, get, remove, atomic write, idempotent init, room code validation) | 61dfaf8, aa57d2c |
| room-watcher.js | 18 (state reading, room code extraction, mode change detection, first-run persistence, multi-room, corrupt state) | bcf0018 |
| Unified runner | `bash scripts/run-tests.sh` — both suites, single command | 073f440 |

### Documentation

- Cadence pattern concept doc for product incubation (`docs/cadence-pattern-concept.md`)
- General-purpose cadence design spec (`skills/room-presence/references/agent-cadence-pattern.md`)
- Upstream issue drafts for agent-room-mcp (`docs/upstream-issues.md`)

---

## Completed Backlog

All v0.2.0 items shipped. All v0.2.1 audit items fixed. Details preserved in git history.

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | Soft leave pattern | ENGINEER | ✅ Done (2e521e3) |
| 2 | Cadence survival through interruptions | DEVELOPER | ✅ Done (933be75) |
| 3 | Compaction recovery automation | DEVELOPER | ✅ Done (717fdab) |
| 4 | Monitor room-mode polling | ENGINEER | ✅ Done (d93318b) |
| 5 | Monitor notification path validation | DEVELOPER | ✅ Done (55483fb) |
| 6 | Ad hoc unwinding decision | Shared | ✅ Decided — keep hook as fallback |
| 7 | README workflow rewrite | Shared | ✅ Done (e49ef41) |
| 8 | Room scope documentation | Shared | ✅ Done |
| 9 | AGENT_ROOM_STATE_FILE documentation | Shared | ✅ Done (0545367) |
| 13 | Crash-recovery test | ENGINEER | ✅ Done (50325c7) |
| 14 | Monitor stress test | ENGINEER | ✅ Done (1e7d240) |

---

## Active Backlog — v0.3.0

**Theme:** Defensive capability + upstream mitigation

### Plugin Improvements

| # | Item | Owner | Description | Status |
|---|------|-------|-------------|--------|
| 15 | Stale participant detection | DEVELOPER | room-doctor check #9 flags participants silent 30+ min. Plugin-side mitigation for upstream #1. | ✅ Done (c55ec5d) |
| 16 | Agent cadence pattern spec | DEVELOPER | Design document for general-purpose cadence pattern as standalone capability package. | ✅ Done (docs + references) |

### Upstream Dependencies (tracked as GitHub issues)

| # | Item | Issue | Priority |
|---|------|-------|----------|
| 10 | Participant TTL/heartbeat | #1 | High — stale participants from crashes are a live problem |
| 11 | Message addressing | #2 | Medium — broadcast-only scales poorly beyond 3 agents |
| 12 | Cross-room inbox | #3 | Low — nice-to-have |

---

## Future Product Opportunities

### Agent Cadence Pattern (general-purpose)

The cadence pattern discovered during v0.2.0 development is substrate-level, not room-specific. Any agent that needs to maintain awareness of an external system while doing other work can use it:

- **Core pattern:** ScheduleWakeup → wake → check state → respond → re-register
- **Key technique:** Self-contained prompts that survive compaction (room/system code + mode + task context)
- **State persistence:** Durable state file that survives the one thing agents can't — statelessness after compaction
- **Soft engagement:** Stay connected without blocking (soft leave analog for any system)

Design spec: `skills/room-presence/references/agent-cadence-pattern.md`
Concept doc: `docs/cadence-pattern-concept.md`

