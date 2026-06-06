# WebAssemblyRoverConsole

`WebAssemblyRoverConsole` points to the static WebAssembly adapter demo hosted from `docs/web-adapter/`.

Live demo: https://ripred.github.io/BetterMenu/web-adapter/

Local source:

- `docs/web-adapter/bettermenu_wasm.cpp` builds the BetterMenu bridge.
- `docs/web-adapter/demo.js` loads the `.wasm`, sends BetterMenu choices, and renders captured rows into the DOM.
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
