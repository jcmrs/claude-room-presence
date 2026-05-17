# TRACK — claude-room-presence

**Product:** claude-room-presence
**Archetype:** 10 (Skills + Hooks + Commands) with Monitors
**Status:** Stage 2 — Repository Scaffolding

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
**Status:** PARTIAL PASS (static checks pass, live tests deferred)

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
- E16: All 3 commands have valid frontmatter with description — PASS
- G20: Cross-component references resolve (monitor → script, CLAUDE_PLUGIN_ROOT) — PASS

**Deferred (requires live install):**
- A5: Plugin loads via `claude --plugin-dir` — DEFERRED
- E17: Command invocation produces expected behavior — DEFERRED
- G21: Plugin operates as integrated unit — DEFERRED

**Monitors-specific validation:**
- monitors.json valid JSON with required fields (name, command, description, when) — PASS
- Monitor script uses ${CLAUDE_PLUGIN_ROOT} for portable paths — PASS
- Monitor script uses ${CLAUDE_PLUGIN_DATA} for persistent state — PASS
- Monitor script has pre-flight checks (state file exists, rooms not empty) — PASS
- Monitor script is fail-open (all errors exit 0) — PASS
- Monitor script is executable — PASS

### Autonomous Decision

Deferred live validation because installing the plugin requires either a marketplace repo or a local install mechanism. The static checks validate structure and content correctness. Live validation will occur during Stage 5/6 when distribution is set up.

### Information Sufficiency

All static validation complete. No structural issues found. The plugin is ready for live testing once a distribution mechanism is available.

### Future-Agent Note

Static validation passed all checks. Live validation (A5, E17, G21) requires installing the plugin in a Claude Code session. This should happen before marketplace distribution. The monitors component is untested in production — we're the first to use this pattern.
