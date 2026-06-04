# SerialMenu

`SerialMenu` is the simplest BetterMenu example. It uses Serial for both display output and input, so it is the first sketch to try when checking the library or learning the basic API.

The menu declaration demonstrates nested menus, editable integers, a boolean toggle, a fixed-choice select item, and action callbacks. The display and input adapters are both built in:

- `make_print_display()` sends rendered rows to `Serial`.
- `make_serial_keys_input()` reads navigation keys from `Serial`.

Serial controls:

- `w` / `s`: move up / down
- `e` or `d`: select, enter, toggle, cycle, or save
- `q` or `a`: back or cancel
- while editing: `w` / `d` increment, `s` / `a` decrement

This example is useful as a baseline because the whole menu system is declared once, while the Serial display and input plumbing stays separate and small.
