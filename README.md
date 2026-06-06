# <img src="docs/menu-builder/assets/icons/bettermenu-library-icon.svg" width="38" height="38" align="absmiddle" alt=""> BetterMenu

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

| Example | What it shows |
| --- | --- |
| [`SerialMenu`](examples/SerialMenu) | Zero-extra-hardware Serial input and Serial output. |
| [`DirectButtonsSerial`](examples/DirectButtonsSerial) | Serial output with four individual pushbuttons wired directly to Arduino pins and ground. |
| [`ButtonGesturesSerial`](examples/ButtonGesturesSerial) | Serial output with one physical pushbutton using the optional ButtonGestures library as a non-blocking gesture input adapter. |
| [`MultiLevelSingleDeclaration`](examples/MultiLevelSingleDeclaration) | Larger nested Serial menu using one declaration. |
| [`ComprehensiveFeatureDemo`](examples/ComprehensiveFeatureDemo) | Serial-only feature reference showing every entry type, decorator, runtime option, rich render metadata, persistence hook, and event-style input. This intentionally consumes most of the SRAM on smaller MCUs such as the Uno and Nano; it is meant as a practical copy/paste source for grabbing specific use cases, not as a practical project by itself. |
| [`AnsiSerialTerminal`](examples/AnsiSerialTerminal) | Serial-key input with ANSI terminal output using cursor positioning, bounded row clearing, and selected/editing/disabled styles. |
| [`HD44780Buttons`](examples/HD44780Buttons) | 1602/HD44780 LCD output with six individual active-low navigation buttons. |
| [`CYDAuroraPanel`](examples/CYDAuroraPanel) | 320x240 CYD/ESP32 graphical menu using a custom `render_line` adapter and TFT_eSPI. The sketch uses Serial keys for input so the display adapter stays independent of any one touch-controller wiring. |
| [`CYDRoverConsole`](examples/CYDRoverConsole) | Denser 320x240 CYD/ESP32 graphical menu that passes runtime context into the display adapter to draw a proportional faux scrollbar and richer row states. |
| [`WebAssemblyRoverConsole`](examples/WebAssemblyRoverConsole) | Notes for the hosted WebAssembly/DOM adapter demo in `docs/web-adapter`. |

## Online Builder

This BetterMenu repository itself now includes a static browser-based builder for drafting menu declarations and exporting starter code for Arduino Serial, ANSI Serial terminals, desktop C++ stdio, WebAssembly/DOM, Adafruit_GFX, TFT_eSPI, U8g2, and character LCD adapter projects: [Open the BetterMenu Builder](https://ripred.github.io/BetterMenu/menu-builder/)

## Full Documentation

The full reference is versioned with the repository in [docs/README.md](docs/README.md). It covers entry types, decorators, runtime behavior, resource ownership, input adapters, display adapters, writing custom adapters, and the examples in more detail.
