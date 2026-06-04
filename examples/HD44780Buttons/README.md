# HD44780Buttons

`HD44780Buttons` shows BetterMenu on a small character LCD with dedicated navigation buttons.

Display output uses the standard Arduino `LiquidCrystal` library for a 16x2 HD44780-compatible LCD. Input uses six active-low pushbuttons wired directly to GPIO pins and read through BetterMenu's debounced button provider.

LCD wiring used by the sketch:

- RS: pin `7`
- E: pin `8`
- D4-D7: pins `9`, `10`, `11`, `12`

Button wiring:

- Up: pin `2` to GND
- Down: pin `3` to GND
- Select: pin `4` to GND
- Cancel: pin `5` to GND
- Left: pin `6` to GND
- Right: pin `A1` to GND

The display adapter is intentionally small: it clears the LCD, writes fixed-width padded rows, and lets BetterMenu handle navigation, editing, and menu structure.
