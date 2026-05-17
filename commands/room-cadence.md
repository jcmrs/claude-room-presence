---
description: Start cadence monitoring for room presence using ScheduleWakeup
argument-hint: "[interval-seconds]"
---

# Room Cadence

Start periodic room check-ins using ScheduleWakeup for proactive room awareness without blocking the terminal.

## Behavior

1. Parse optional interval argument (default: 300 seconds)
2. Set ScheduleWakeup with the specified interval
3. On each wake:
   a. Call `room_list_messages` for any rooms in state
   b. If messages are relevant, decide whether to rejoin (Persistent Listen) or respond from Cadence
   c. Share findings if they intersect with peer agent work
   d. Schedule next wake

## Mode Transition

This command transitions from Idle → Cadence.

The cadence loop continues until:
- You join a room (transition to Persistent Listen)
- You cancel the ScheduleWakeup
- The session ends

## Design Note

This is the proactive motion trigger — the key innovation of the room-presence plugin. It gives an agent cadence without requiring persistent blocking of the execution thread. The agent works between check-ins and surfaces when there's something worth surfacing.
