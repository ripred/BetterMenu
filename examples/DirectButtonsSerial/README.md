# DirectButtonsSerial

`DirectButtonsSerial` shows the beginner-friendly hardware path: one normal momentary pushbutton per control, wired directly from an Arduino pin to GND.

The sketch uses Serial for output and BetterMenu's built-in debounced GPIO button input provider for navigation. No input expander, resistor ladder, matrix keypad, or multiplexer is required.

Button wiring:

- Up: pin `2` to GND
- Down: pin `3` to GND
- Select: pin `4` to GND
- Cancel: pin `5` to GND

The adapter enables `INPUT_PULLUP`, so the buttons are active-low. The menu demonstrates editable integers, a step-size integer, a boolean toggle, a fixed-choice select item, and action callbacks.

Copy this pattern when a project has dedicated navigation buttons but does not need a display-specific example yet.
