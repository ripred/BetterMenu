#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

usage() {
  cat <<'EOF'
Builds bettermenu_demo.wasm from the WebAssembly adapter sources.

Requirements:
  - A C++ compiler driver that supports --target=wasm32 and WebAssembly linking.
  - Optional: wasm-strip or llvm-strip to remove nonessential metadata.

Usage:
  ./build.sh
  CXX="<wasm-capable-c++>" ./build.sh
  CXX="<wasm-capable-c++>" WASM_STRIP="<wasm-strip-tool>" ./build.sh

If the default CXX=c++ cannot compile for wasm32, install a WebAssembly-capable
C++ toolchain and set CXX to that compiler when running this script.
EOF
}

case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
  "")
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

CXX="${CXX:-c++}"
WASM_STRIP="${WASM_STRIP:-}"

if ! command -v "$CXX" >/dev/null 2>&1; then
  echo "error: CXX does not name an executable compiler: $CXX" >&2
  echo >&2
  usage >&2
  exit 1
fi

"$CXX" \
  --target=wasm32 \
  -std=c++11 \
  -Os \
  -Iwasm-shim \
  -fno-exceptions \
  -fno-rtti \
  -fno-threadsafe-statics \
  -nostdlib \
  -Wl,--no-entry \
  -Wl,--export-memory \
  -Wl,--export=bm_init \
  -Wl,--export=bm_send_choice \
  -Wl,--export=bm_send_row \
  -Wl,--export=bm_row_count \
  -Wl,--export=bm_row_kind \
  -Wl,--export=bm_row_flags \
  -Wl,--export=bm_row_entry_type \
  -Wl,--export=bm_row_item_index \
  -Wl,--export=bm_row_editable \
  -Wl,--export=bm_row_text_ptr \
  -Wl,--export=bm_battery_centivolts \
  -Wl,--export=bm_battery_percent \
  -Wl,--export=bm_armed \
  -Wl,--export=bm_visible_top \
  -Wl,--export=bm_visible_total \
  -Wl,--export=bm_visible_window \
  -o bettermenu_demo.wasm \
  bettermenu_wasm.cpp \
  WebMenuCapture.cpp

if [ -n "$WASM_STRIP" ]; then
  "$WASM_STRIP" bettermenu_demo.wasm
elif command -v wasm-strip >/dev/null 2>&1; then
  wasm-strip bettermenu_demo.wasm
elif command -v llvm-strip >/dev/null 2>&1; then
  llvm-strip bettermenu_demo.wasm
fi
