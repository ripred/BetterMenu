# Examples Guide

The examples are intentionally small, focused sketches. Copy the adapter pattern you need and keep the menu declaration hardware-independent.

- `examples/SerialMenu`: zero-extra-hardware Serial input and Serial output.
- `examples/DirectButtonsSerial`: Serial output with four individual pushbuttons wired directly to Arduino pins and ground.
- `examples/ButtonGesturesSerial`: Serial output with one physical pushbutton using the optional ButtonGestures library as a non-blocking gesture input adapter.
- `examples/MultiLevelSingleDeclaration`: larger nested Serial menu using one declaration.
- `examples/ComprehensiveFeatureDemo`: Serial-only feature reference showing every entry type, decorator, runtime option, rich render metadata, persistence hook, and event-style input. This intentionally consumes most of the SRAM on smaller MCUs such as the Uno and Nano; it is meant as a practical copy/paste source for grabbing specific use cases, not as a practical project by itself.
- `examples/AnsiSerialTerminal`: Serial-key input with ANSI terminal output using cursor positioning, bounded row clearing, and selected/editing/disabled styles.
- `examples/HD44780Buttons`: 1602/HD44780 LCD output with six individual active-low navigation buttons.
- `examples/CYDAuroraPanel`: 320x240 CYD/ESP32 graphical menu using a custom `render_line` adapter and TFT_eSPI. The sketch uses Serial keys for input so the display adapter stays independent of any one touch-controller wiring.
- `examples/CYDRoverConsole`: denser 320x240 CYD/ESP32 graphical menu that passes runtime context into the display adapter to draw a proportional faux scrollbar and richer row states.
- `examples/WebAssemblyRoverConsole`: notes for the hosted WebAssembly/DOM adapter demo in `docs/web-adapter`.

The hosted demos are served from GitHub Pages:

- [BetterMenu Builder](https://ripred.github.io/BetterMenu/menu-builder/)
- [RoverConsole WebAssembly demo](https://ripred.github.io/BetterMenu/web-adapter/)
