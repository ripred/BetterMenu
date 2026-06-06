# Display, Input, and Adapter Patterns

The menu declaration should stay hardware-independent. Device-specific code belongs in small adapters that translate the project display and input into BetterMenu's common API.

The root menu, display context, input context, action context, and adapter operation tables must live at least as long as the `menu_runtime_t`. Static or global storage is the simplest pattern on small Arduino targets. Do not pass `MENU(...)` directly into `menu_runtime_t::make()` as a temporary; declare the menu once, then pass that named declaration into the runtime.

## Display Adapters

Displays are provided through `display_t`. The preferred adapter form is a small `display_ops_t` table plus a `void *ctx`, so display state can live in user code instead of hidden globals. `make_print_display()` adapts any Arduino `Print` output with caller-owned `print_display_ctx_t` storage. `make_serial_display()` is included as a fixed singleton convenience wrapper for Serial Monitor output. Older contextless callbacks are still supported through `make_callback_display()`. A display width of `0` uses the `MENU_MAX_LINE` buffer limit; a display height of `0` renders all visible menu items.

For richer displays, `display_ops_t::render_line` can receive `menu_render_line_t` metadata for each title, item, and blank row. The text line is still supplied, but the renderer also gets item index, entry type, selected/editing/disabled flags, scroll hints, child-menu hints, and back availability. Render callbacks should use or copy the text during the callback; the pointer is not storage for later use.

`examples/AnsiSerialTerminal` uses that path for a fixed terminal region, `examples/CYDAuroraPanel` shows the simplest graphical pattern, and `examples/CYDRoverConsole` shows an advanced adapter that also uses caller-supplied display context to inspect the active runtime and draw proportional scroll position.

Display adapters implement clear, write-line, and flush:

```cpp
struct my_display_ctx_t {
    MyDisplay *display;
};

static void myClear(void *ctx) {
    static_cast<my_display_ctx_t *>(ctx)->display->clear();
}

static void myWriteLine(void *ctx, uint8_t row, char const *text) {
    MyDisplay *display = static_cast<my_display_ctx_t *>(ctx)->display;
    display->setCursor(0, row);
    display->print(text ? text : "");
}

static void myFlush(void *ctx) {
    (void)ctx;
}

static display_ops_t const MY_DISPLAY_OPS = {
    &myClear, &myWriteLine, &myFlush, 0
};
```

## Input Adapters

Inputs can use the legacy `input_fptr_t` callback, a context-aware `make_event_input()` provider that returns one `choice_t` or `menu_event_t` event at a time, or an `input_source_t` provider with up, down, select, cancel, left, and right checks. Built-in providers are included for Serial keys, any Arduino `Stream`, and debounced buttons.

The default stream key map is `w/s/e/q/a/d` for up, down, select, cancel, left, and right. Pass a `stream_keymap_t` to `make_serial_keys_input()` or `make_stream_keys_input()` when a project wants different keys without writing a separate input adapter. Each key field is a byte value; use `0` to disable a control:

```cpp
static serial_keys_ctx_t serialInput;
static stream_keymap_t const keys = {
    '+', '-', '\r', 27, '<', '>', 0
};

input_source_t input = make_serial_keys_input(serialInput, keys);
```

The button provider can read individual pushbuttons from normal Arduino pins with no input expander or multiplexer. The simplest hardware pattern is one momentary pushbutton per control, wired from the pin to GND, using the built-in pullup mode shown in `examples/DirectButtonsSerial`. The same provider can also read from any pin-like adapter by supplying `digital_io_ops_t`. That keeps debounce and menu navigation shared for GPIO expanders or other pin-like devices. Four-button layouts can use the overload without left/right pins, and individual unused controls can be passed as `MENU_BUTTON_UNUSED`.

A one-button gesture controller can be built as an optional adapter too; `examples/ButtonGesturesSerial` uses ButtonGestures 3.0.0+ to translate single, double, triple, and long gestures into BetterMenu events. Non-button inputs such as touch screens, key matrices, encoders, or project-specific controls can implement `input_ops_t` directly, or use `make_event_input()` and emit the same six menu events. `menu_row_event(row, activate)` supports absolute display-row selection for touch-style input, and `menu_delta_event(delta)` supports encoder-style movement. `menu_long_event()` and `menu_repeat_event()` carry those flags in `menu_event_t`; the base runtime handles them like the underlying choice unless a custom adapter layer chooses to interpret the flags before returning events.

Event-style inputs return one menu event per call:

```cpp
static choice_t readMenuInput(void *ctx) {
    MyInput *input = static_cast<MyInput *>(ctx);
    if (input->upPressed()) { return Choice_Up; }
    if (input->downPressed()) { return Choice_Down; }
    if (input->selectPressed()) { return Choice_Select; }
    if (input->backPressed()) { return Choice_Cancel; }
    return Choice_Invalid;
}

static input_event_ctx_t menuInputStorage;
input_source_t input = make_event_input(menuInputStorage, &myInput, readMenuInput);
```
