# WebAssemblyRoverConsole

`WebAssemblyRoverConsole` points to the static WebAssembly adapter demo hosted from `docs/web-adapter/`.

Live demo: https://ripred.github.io/BetterMenu/web-adapter/

Local source:

- `docs/web-adapter/bettermenu_wasm.cpp` defines the menu, backing values, callbacks, and exported Wasm functions.
- `docs/web-adapter/WebMenuCapture.h` and `docs/web-adapter/WebMenuCapture.cpp` capture BetterMenu render rows for the browser.
- `docs/web-adapter/web_menu_dom_adapter.js` loads the `.wasm`, sends BetterMenu choices, and renders captured rows into the DOM.
- `docs/web-adapter/rover_console_data.js` maps row labels to demo icons and content.
- `docs/web-adapter/demo.js` wires the RoverConsole data into the DOM adapter.
- `docs/web-adapter/styles.css` owns the browser-side RoverConsole skin.

To rebuild locally:

```bash
cd docs/web-adapter
./build.sh
```

If the default compiler does not support `wasm32`, set `CXX` to a local compiler that does:

```bash
CXX=/path/to/clang++ ./build.sh
```

The demo keeps the same BetterMenu separation as the embedded sketches: the menu declaration lives in C++, input is a web button adapter, and display output is a DOM renderer fed by BetterMenu render rows.
