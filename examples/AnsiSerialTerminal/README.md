# AnsiSerialTerminal

`AnsiSerialTerminal` shows a BetterMenu display adapter that writes a fixed ANSI terminal region over Serial. It uses the normal `make_serial_keys_input()` keyboard adapter for input and an example-local `display_ops_t::render_line` adapter for output.

Use a terminal that interprets ANSI escape sequences:

```bash
screen /dev/cu.usbserial-XXXX 115200
tio /dev/cu.usbserial-XXXX -b 115200
minicom -D /dev/cu.usbserial-XXXX -b 115200
```

Controls:

- `w` / `s`: move up / down
- `e` or `d`: select, enter, toggle, cycle, or save
- `q` or `a`: back or cancel
- while editing: `w` / `d` increment, `s` / `a` decrement

Arduino Serial Monitor is not the intended target for this example. Most Serial Monitor views show escape bytes as text instead of treating them as cursor movement and style commands.

The useful part is the adapter boundary: the menu declaration is ordinary BetterMenu, the input is still swappable, and the output adapter only consumes BetterMenu render metadata.
