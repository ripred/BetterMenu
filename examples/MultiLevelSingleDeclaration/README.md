# MultiLevelSingleDeclaration

`MultiLevelSingleDeclaration` is a compact example of the main BetterMenu idea: define the full menu tree in one declaration, including all nested menus, values, choices, disabled behavior, and actions.

It uses Serial for both display and input, but the menu itself is hardware-independent. The declaration includes:

- Display, audio, telemetry, motor, and actions submenus
- Editable integer values
- A fixed-choice motor mode
- A telemetry rate item that is disabled until telemetry is enabled
- A read-only uptime value
- Action callbacks for apply, self-test, and reset defaults

Serial controls:

- `w` / `s`: move up / down
- `e` or `d`: select, enter, toggle, cycle, or save
- `q` or `a`: back or cancel
- while editing: `a` / `d` adjust values

This is the example to copy when the structure of the menu matters more than the display hardware.
