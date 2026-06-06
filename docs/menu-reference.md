# Menu Declarations and Entry Types

The menu declaration is the source of truth. Labels, values, choices, actions, decorators, and submenus stay together in one expression.

## Entry Types

- `ITEM_INT(label, &value, min, max)` edits an integer in place; an optional fifth argument sets the edit step size.
- `ITEM_BOOL(label, &value)` toggles a boolean value; optional third and fourth arguments override the off/on labels.
- `ITEM_SELECT(label, &value, MENU_CHOICE(...), ...)` cycles through fixed integer choices declared inline. Keep choice values unique so the stored integer maps back to exactly one visible choice.
- `ITEM_VALUE(label, getter, ctx)` shows a read-only integer-like value supplied by a getter.
- `ITEM_VALUE(label, getter, setter, ctx, min, max[, step])` edits a value through project-owned getter/setter callbacks.
- `ITEM_FUNC(label, callback)` calls a function.
- `ITEM_FUNC_CTX(label, callback, ctx)` calls a function with caller-owned context.
- `ITEM_MENU(label, MENU(...))` stores a submenu inline in the containing declaration.

## Decorators

Item decorators keep conditional behavior with the item declaration:

- `ITEM_HIDDEN(item, predicate, ctx)` removes an item while the predicate returns true.
- `ITEM_DISABLED(item, predicate, ctx)` shows an item but prevents selection/activation while the predicate returns true.
- `ITEM_FORMAT(item, formatter, ctx)` provides custom value text for that item. The formatter receives a temporary line buffer and should write a null-terminated string that fits in the supplied capacity.
- `ITEM_ON_CHANGE(item, callback, ctx)` runs after a value is committed or toggled.

The macros are thin wrappers around `menu_make()`, `make_item_int()`, `make_item_bool()`, `make_item_select()`, `make_item_value()`, `make_item_func()`, `make_item_func_ctx()`, `make_item_menu()`, `menu_choice()`, and the decorator helpers. Use the helpers directly when a project prefers function-style declarations.

Use `ITEM_FUNC_CTX` when an action needs state without forcing that state into a global just to satisfy the menu API. The context pointer is stored in the same menu declaration as the label and callback, keeping the action wiring in one place.

Labels and titles accept normal string literals or Arduino `F("...")` flash strings. Prefer `F("...")` in sketches for static menu text on small boards. On AVR-style cores, `F("...")` menu declarations should use function-scope `static` storage, as shown in the root README, because the core `F()` macro is not valid in global initializers.

The menu declaration itself may be `const`; editable values and action contexts are still caller-owned mutable storage referenced from that declaration.

## Runtime Behavior

Menu titles are part of the declaration. They are not shown by default, which keeps narrow displays focused on selectable rows. Call `menuRuntime.set_show_title(true)` after construction when the display has room for a title row. `set_show_breadcrumbs(true)` renders the current path in that title row, and `set_show_affordances(true)` adds simple text hints for back and child-menu rows.

Call `menuRuntime.request_redraw()` after project code changes a backing value, hidden predicate state, or disabled predicate state outside the menu input loop and the display should update on the next `service()` call.

Call `menuRuntime.reset_navigation()` when project code needs to return to the root menu, clear any active integer edit, and re-render from the top. This keeps that common menu behavior in the library instead of duplicating it in every sketch.

Navigation clamps at the first and last selectable rows by default. Call `menuRuntime.set_navigation_wrap(true)` or `menuRuntime.set_navigation_mode(MENU_NAV_WRAP)` after construction when a project wants Up at the first row or Down at the last row to rotate to the opposite end.

Use `menuRuntime.set_persistence(load, save, ctx)` when a project wants shared persistence hooks. `load_persistence()` calls the load hook and requests a redraw; committed value changes call the save hook after any per-item change callback.
