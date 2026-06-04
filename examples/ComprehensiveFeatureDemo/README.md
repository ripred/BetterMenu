# ComprehensiveFeatureDemo

`ComprehensiveFeatureDemo` is the feature reference sketch. It intentionally shows nearly every BetterMenu entry type, decorator, runtime option, input event style, render metadata path, and persistence hook in one place.

It uses Serial for both input and output so the sketch can be explored without extra hardware. The tradeoff is size: on smaller AVR boards such as the Uno or Nano, it consumes a large share of SRAM. Treat it as a copy/paste reference for specific techniques, not as a practical finished application.

Covered features include:

- `ITEM_INT`, `ITEM_BOOL`, `ITEM_SELECT`, `ITEM_VALUE`, `ITEM_FUNC`, and `ITEM_FUNC_CTX`
- Step-size editing and getter/setter-backed values
- Hidden and disabled item predicates
- Per-item formatters and on-change callbacks
- Title rows, breadcrumbs, affordances, and rich render metadata
- Row/touch events, encoder delta events, long events, and repeat events
- Persistence load/save hooks
- `request_redraw()` and `reset_navigation()`

Serial controls are printed when the sketch starts. Press `?` to print them again.
