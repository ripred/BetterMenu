# Philosophy and Resource Model

## Philosophy

The main point of BetterMenu is that a menu should be declared once. The place where you define the menu is also where every attribute, label, nested submenu, editable value, fixed choice, and action lives. That single declaration is the source of truth for the whole menu system, so changing or re-arranging the menu during fast development means changing one coherent block of code, not chasing matching updates through several files or several disconnected sections of a sketch.

That is what `declarative` means here: describe the complete menu tree and let the library do the repetitive wiring. In a typical hand-built menu, changing one item often means keeping arrays, enum indexes, display rows, callback tables, and parent-child links synchronized by hand. That kind of coupling is easy to miss, and missed updates turn into navigation bugs, wrong labels, stale indexes, and callbacks firing from the wrong row.

The implementation is intentionally DRY on both sides of the API. Library code owns the common menu behavior, while project code supplies small display and input adapters. The user-facing API should stay simple enough for a small Serial menu, but comprehensive enough that a larger LCD, OLED, touch, encoder, keypad, or button-driven menu does not need a project-specific menu framework wrapped around it.

## Resource Model

BetterMenu is designed around fixed ownership rather than dynamic allocation. It does not use heap allocation, Arduino `String`, or STL containers. Menu capacity comes from the declaration itself and from compile-time limits such as `MENU_MAX_STACK` and `MENU_MAX_LINE`.

Those limits are part of the embedded design rather than something the library tries to hide with allocation. If a product has a known maximum menu depth, line width, or number of visible rows, declare that capacity up front and let the firmware stay predictable. If a project needs deeper nesting or longer rendered lines, raise the compile-time limit deliberately and test the resulting RAM use on the target board.

The expected embedded pattern is caller-owned storage: declare the menu, runtime, display context, input context, backing values, and action contexts with a lifetime that is clear from the sketch. Static/global storage is usually the simplest choice on small Arduino boards. Stack storage is also fine when the runtime and all referenced objects have the same scope and lifetime.

The convenience helpers with no explicit context use fixed internal singleton storage for simple one-menu sketches. They still do not allocate heap memory, but explicit context objects such as `print_display_ctx_t`, `serial_keys_ctx_t`, and `buttons_ctx_t` make lifetime and instance count visible, so those are the preferred examples to copy into production firmware.
