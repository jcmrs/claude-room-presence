---
description: Check for pending room messages in any joined rooms
---

# Room Check

Check for pending messages in any rooms you are currently a member of.

## Behavior

1. Read `AGENT_ROOM_STATE_FILE` to identify joined rooms
2. For each room, call `room_list_messages` to retrieve recent messages
3. Report pending messages to the user
4. Do not join any rooms — this is a read-only check

If no rooms are joined, report that and suggest `/room-join <code>` to join one.
