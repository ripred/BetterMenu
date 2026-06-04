# ButtonGesturesSerial

`ButtonGesturesSerial` shows how an optional one-button gesture library can feed BetterMenu without changing the menu declaration.

Hardware is one momentary pushbutton from pin `2` to GND. Output is Serial. Input comes from `ButtonGestures` 3.0.0 or newer and is translated into BetterMenu events through `make_event_input()`.

Gesture map:

- Single click: select or save
- Single long-hold: cancel or back
- Double click: down
- Double long-hold: up
- Triple click: right or increment
- Triple long-hold: left or decrement

The sketch sets ButtonGestures to single-shot long-press mode so one long cancel press does not back out through several menu levels. Keep `loop()` non-blocking so the button can be polled frequently.

Use this example when a product only has room for one physical button but still needs a practical multi-level menu.
