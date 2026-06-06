# BetterMenu

[![Arduino CI](https://github.com/ripred/BetterMenu/workflows/Arduino%20CI/badge.svg)](https://github.com/ripred/BetterMenu/actions/workflows/arduino_test_runner.yml)
[![Arduino-lint](https://github.com/ripred/BetterMenu/actions/workflows/arduino-lint.yml/badge.svg)](https://github.com/ripred/BetterMenu/actions/workflows/arduino-lint.yml)
[![JSON check](https://github.com/ripred/BetterMenu/actions/workflows/jsoncheck.yml/badge.svg)](https://github.com/ripred/BetterMenu/actions/workflows/jsoncheck.yml)
![code size:](https://img.shields.io/github/languages/code-size/ripred/bettermenu.svg)
[![Arduino Library Manager](https://www.ardu-badge.com/badge/BetterMenu.svg)](https://www.ardu-badge.com/BetterMenu)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ripred/BetterMenu/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/ripred/BetterMenu.svg?style=flat-square&colorB=4183c4)](https://github.com/ripred/BetterMenu)
[![Forks](https://img.shields.io/github/forks/ripred/BetterMenu.svg?style=flat-square&colorB=4183c4)](https://github.com/ripred/BetterMenu)

BetterMenu is a header-only, non-blocking, declarative menu system for Arduino-class and other production embedded targets.

The menu tree is defined in one expression. Submenus are stored inline by value, so changing menu structure, labels, values, choices, and actions does not require keeping parallel arrays, enums, callback tables, or hand-maintained parent/child wiring in sync.

## New Online Builder!

This BetterMenu repository itself now includes a static browser-based builder for drafting menu declarations and exporting starter code for Arduino Serial, desktop C++ stdio, and WebAssembly/DOM adapter projects:

- [Open the BetterMenu Builder](https://ripred.github.io/BetterMenu/menu-builder/)
- Start from an empty menu or load the RoverConsole sample to inspect a complete nested declaration.
- Export declaration-only code, complete Serial/stdio starter programs, or web adapter source files.

The builder is export-only. It does not require local-file access, user-supplied compilers, accounts, or a backend.

## Philosophy

The main point of BetterMenu is that a menu should be declared once. The place where you define the menu is also where every attribute, label, nested submenu, editable value, fixed choice, and action lives. That single declaration is the source of truth for the whole menu system, so changing or re-arranging the menu during fast development means changing one coherent block of code, not chasing matching updates through several files or several disconnected sections of a sketch.

That is what `declarative` means here: describe the complete menu tree and let the library do the repetitive wiring. In a typical hand-built menu, changing one item often means keeping arrays, enum indexes, display rows, callback tables, and parent-child links synchronized by hand. That kind of coupling is easy to miss, and missed updates turn into navigation bugs, wrong labels, stale indexes, and callbacks firing from the wrong row.

The implementation is intentionally DRY on both sides of the API. Library code owns the common menu behavior, while project code supplies small display and input adapters. The user-facing API should stay simple enough for a small Serial menu, but comprehensive enough that a larger LCD, OLED, touch, encoder, keypad, or button-driven menu does not need a project-specific menu framework wrapped around it.

## Minimal Serial Example

```cpp
#include <BetterMenu.h>

static int volume = 5;
static int brightness = 60;
static bool telemetry = false;
static int mode = 0;

static void applySettings() {
    Serial.println(F("[action] apply"));
}

static menu_runtime_t menuRuntime;
static print_display_ctx_t serialDisplay;
static serial_keys_ctx_t serialInput;

void setup() {
    Serial.begin(115200);
    while (!Serial) {
    }

    static const auto appMenu =
        MENU(F("Device"),
            ITEM_MENU(F("Settings"),
                MENU(F("Settings"),
                    ITEM_INT(F("Volume"), &volume, 0, 10),
                    ITEM_INT(F("Brightness"), &brightness, 0, 100),
                    ITEM_BOOL(F("Telemetry"), &telemetry),
                    ITEM_SELECT(F("Mode"), &mode,
                        MENU_CHOICE(F("Off"), 0),
                        MENU_CHOICE(F("Auto"), 1),
                        MENU_CHOICE(F("Manual"), 2)
                    )
                )
            ),
            ITEM_FUNC(F("Apply"), applySettings)
        );

    display_t display = make_print_display(serialDisplay, Serial, 48, 0);
    input_source_t input = make_serial_keys_input(serialInput);
    menuRuntime = menu_runtime_t::make(appMenu, display, input, true);
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}
```

Serial controls: `w/s` move, `e` or `d` select/enter/toggle/cycle, `q` or `a` back. While editing an integer, `w/d` increment, `s/a` decrement, `e` saves, and `q` cancels.

The `examples/SerialMenu` sketch is intentionally Serial-only so it works without extra hardware. Hardware-specific wiring belongs in examples and thin adapters, not in the menu declaration itself.

## Resource Model

BetterMenu is designed around fixed ownership rather than dynamic allocation. It does not use heap allocation, Arduino `String`, or STL containers. Menu capacity comes from the declaration itself and from compile-time limits such as `MENU_MAX_STACK` and `MENU_MAX_LINE`.

Those limits are part of the embedded design rather than something the library tries to hide with allocation. If a product has a known maximum menu depth, line width, or number of visible rows, declare that capacity up front and let the firmware stay predictable. If a project needs deeper nesting or longer rendered lines, raise the compile-time limit deliberately and test the resulting RAM use on the target board.

The expected embedded pattern is caller-owned storage: declare the menu, runtime, display context, input context, backing values, and action contexts with a lifetime that is clear from the sketch. Static/global storage is usually the simplest choice on small Arduino boards. Stack storage is also fine when the runtime and all referenced objects have the same scope and lifetime.

The convenience helpers with no explicit context use fixed internal singleton storage for simple one-menu sketches. They still do not allocate heap memory, but explicit context objects such as `print_display_ctx_t`, `serial_keys_ctx_t`, and `buttons_ctx_t` make lifetime and instance count visible, so those are the preferred examples to copy into production firmware.

## Examples

- `examples/SerialMenu`: zero-extra-hardware Serial input and Serial output.
- `examples/DirectButtonsSerial`: Serial output with four individual pushbuttons wired directly to Arduino pins and ground.
- `examples/ButtonGesturesSerial`: Serial output with one physical pushbutton using the optional ButtonGestures library as a non-blocking gesture input adapter.
- `examples/MultiLevelSingleDeclaration`: larger nested Serial menu using one declaration.
- `examples/ComprehensiveFeatureDemo`: Serial-only feature reference showing every entry type, decorator, runtime option, rich render metadata, persistence hook, and event-style input. This intentionally consumes most of the SRAM on smaller MCUs such as the Uno and Nano; it is meant as a practical copy/paste source for grabbing specific use cases, not as a practical project by itself.
- `examples/HD44780Buttons`: 1602/HD44780 LCD output with six individual active-low navigation buttons.
- `examples/CYDAuroraPanel`: 320x240 CYD/ESP32 graphical menu using a custom `render_line` adapter and TFT_eSPI. The sketch uses Serial keys for input so the display adapter stays independent of any one touch-controller wiring.
- `examples/CYDRoverConsole`: denser 320x240 CYD/ESP32 graphical menu that passes runtime context into the display adapter to draw a proportional faux scrollbar and richer row states.

## Entry Types

- `ITEM_INT(label, &value, min, max)` edits an integer in place; an optional fifth argument sets the edit step size.
- `ITEM_BOOL(label, &value)` toggles a boolean value; optional third and fourth arguments override the off/on labels.
- `ITEM_SELECT(label, &value, MENU_CHOICE(...), ...)` cycles through fixed integer choices declared inline. Keep choice values unique so the stored integer maps back to exactly one visible choice.
- `ITEM_VALUE(label, getter, ctx)` shows a read-only integer-like value supplied by a getter.
- `ITEM_VALUE(label, getter, setter, ctx, min, max[, step])` edits a value through project-owned getter/setter callbacks.
- `ITEM_FUNC(label, callback)` calls a function.
- `ITEM_FUNC_CTX(label, callback, ctx)` calls a function with caller-owned context.
- `ITEM_MENU(label, MENU(...))` stores a submenu inline in the containing declaration.

Item decorators keep conditional behavior with the item declaration:

- `ITEM_HIDDEN(item, predicate, ctx)` removes an item while the predicate returns true.
- `ITEM_DISABLED(item, predicate, ctx)` shows an item but prevents selection/activation while the predicate returns true.
- `ITEM_FORMAT(item, formatter, ctx)` provides custom value text for that item. The formatter receives a temporary line buffer and should write a null-terminated string that fits in the supplied capacity.
- `ITEM_ON_CHANGE(item, callback, ctx)` runs after a value is committed or toggled.

The macros are thin wrappers around `menu_make()`, `make_item_int()`, `make_item_bool()`, `make_item_select()`, `make_item_value()`, `make_item_func()`, `make_item_func_ctx()`, `make_item_menu()`, `menu_choice()`, and the decorator helpers. Use the helpers directly when a project prefers function-style declarations.

Use `ITEM_FUNC_CTX` when an action needs state without forcing that state into a global just to satisfy the menu API. The context pointer is stored in the same menu declaration as the label and callback, keeping the action wiring in one place.

Labels and titles accept normal string literals or Arduino `F("...")` flash strings. Prefer `F("...")` in sketches for static menu text on small boards. On AVR-style cores, `F("...")` menu declarations should use function-scope `static` storage, as shown above, because the core `F()` macro is not valid in global initializers.

The menu declaration itself may be `const`; editable values and action contexts are still caller-owned mutable storage referenced from that declaration.

Menu titles are part of the declaration. They are not shown by default, which keeps narrow displays focused on selectable rows. Call `menuRuntime.set_show_title(true)` after construction when the display has room for a title row. `set_show_breadcrumbs(true)` renders the current path in that title row, and `set_show_affordances(true)` adds simple text hints for back and child-menu rows.

Call `menuRuntime.request_redraw()` after project code changes a backing value, hidden predicate state, or disabled predicate state outside the menu input loop and the display should update on the next `service()` call.

Call `menuRuntime.reset_navigation()` when project code needs to return to the root menu, clear any active integer edit, and re-render from the top. This keeps that common menu behavior in the library instead of duplicating it in every sketch.

Use `menuRuntime.set_persistence(load, save, ctx)` when a project wants shared persistence hooks. `load_persistence()` calls the load hook and requests a redraw; committed value changes call the save hook after any per-item change callback.

## Display and Input

Displays are provided through `display_t`. The preferred adapter form is a small `display_ops_t` table plus a `void *ctx`, so display state can live in user code instead of hidden globals. `make_print_display()` adapts any Arduino `Print` output with caller-owned `print_display_ctx_t` storage. `make_serial_display()` is included as a fixed singleton convenience wrapper for Serial Monitor output. Older contextless callbacks are still supported through `make_callback_display()`. A display width of `0` uses the `MENU_MAX_LINE` buffer limit; a display height of `0` renders all visible menu items.

For graphical or touch displays, `display_ops_t::render_line` can receive `menu_render_line_t` metadata for each title, item, and blank row. The text line is still supplied, but the renderer also gets item index, entry type, selected/editing/disabled flags, scroll hints, child-menu hints, and back availability. Render callbacks should use or copy the text during the callback; the pointer is not storage for later use. `examples/CYDAuroraPanel` shows the simplest graphical pattern, while `examples/CYDRoverConsole` shows an advanced adapter that also uses caller-supplied display context to inspect the active runtime and draw proportional scroll position.

Inputs can use the legacy `input_fptr_t` callback, a context-aware `make_event_input()` provider that returns one `choice_t` or `menu_event_t` event at a time, or an `input_source_t` provider with up, down, select, cancel, left, and right checks. Built-in providers are included for Serial keys, any Arduino `Stream`, and debounced buttons.

The default stream key map is `w/s/e/q/a/d` for up, down, select, cancel, left, and right. Pass a `stream_keymap_t` to `make_serial_keys_input()` or `make_stream_keys_input()` when a project wants different keys without writing a separate input adapter. Each key field is a byte value; use `0` to disable a control:

```cpp
static serial_keys_ctx_t serialInput;
static stream_keymap_t const keys = {
    '+', '-', '\r', 27, '<', '>', 0
};

input_source_t input = make_serial_keys_input(serialInput, keys);
```

The button provider can read individual pushbuttons from normal Arduino pins with no input expander or multiplexer. The simplest hardware pattern is one momentary pushbutton per control, wired from the pin to GND, using the built-in pullup mode shown in `examples/DirectButtonsSerial`. The same provider can also read from any pin-like adapter by supplying `digital_io_ops_t`. That keeps debounce and menu navigation shared for GPIO expanders or other pin-like devices. Four-button layouts can use the overload without left/right pins, and individual unused controls can be passed as `MENU_BUTTON_UNUSED`. A one-button gesture controller can be built as an optional adapter too; `examples/ButtonGesturesSerial` uses ButtonGestures 3.0.0+ to translate single, double, triple, and long gestures into BetterMenu events. Non-button inputs such as touch screens, key matrices, encoders, or project-specific controls can implement `input_ops_t` directly, or use `make_event_input()` and emit the same six menu events. `menu_row_event(row, activate)` supports absolute display-row selection for touch-style input, and `menu_delta_event(delta)` supports encoder-style movement. `menu_long_event()` and `menu_repeat_event()` carry those flags in `menu_event_t`; the base runtime handles them like the underlying choice unless a custom adapter layer chooses to interpret the flags before returning events.

## Writing Adapters

The menu declaration should stay hardware-independent. Device-specific code belongs in a small adapter that translates the project display and input into BetterMenu's common API.

The root menu, display context, input context, action context, and adapter operation tables must live at least as long as the `menu_runtime_t`. Static or global storage is the simplest pattern on small Arduino targets. Do not pass `MENU(...)` directly into `menu_runtime_t::make()` as a temporary; declare the menu once, then pass that named declaration into the runtime.

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
