import { usedAssets } from "./asset_utils.mjs";

export function createWebDomWasmPackage(model, bridgeSource) {
  const assetFiles = {};
  for (const asset of usedAssets(model)) {
    if (asset.kind === "svg") {
      assetFiles[`icons/${asset.safeName}.svg`] = asset.source;
    }
  }
  return {
    files: {
      "bettermenu_wasm.cpp": bridgeSource,
      "WebMenuCapture.h": webMenuCaptureHeaderSource(),
      "WebMenuCapture.cpp": webMenuCaptureCppSource(),
      "BetterMenu.h": "Copy the current repository BetterMenu.h beside bettermenu_wasm.cpp before compiling.",
      "index.html": generatedWebIndex(model),
      "demo.js": generatedWebDemoJs(),
      "menu_data.js": generatedWebMenuData(model),
      "web_menu_dom_adapter.js": webMenuDomAdapterJsSource(),
      "styles.css": generatedWebCss(),
      ...assetFiles
    },
    compile: {
      local: "Use a WebAssembly-capable C++ compiler in the project or development environment to emit a freestanding wasm32 module with exported bm_* functions."
    }
  };
}

export function webMenuCaptureHeaderSource() {
  return `#pragma once

#ifndef MENU_MAX_LINE
#define MENU_MAX_LINE 96
#endif

#include "BetterMenu.h"

#include <stdint.h>

display_t make_web_menu_capture_display(menu_runtime_t &runtime, uint8_t width, uint8_t height);

uint8_t web_menu_capture_row_count(void);
uint8_t web_menu_capture_row_kind(int index);
uint8_t web_menu_capture_row_flags(int index);
uint8_t web_menu_capture_row_entry_type(int index);
uint8_t web_menu_capture_row_item_index(int index);
uint8_t web_menu_capture_row_editable(int index);
char const *web_menu_capture_row_text(int index);

uint8_t web_menu_capture_visible_top(void);
uint8_t web_menu_capture_visible_total(void);
uint8_t web_menu_capture_visible_window(void);
`;
}

export function webMenuCaptureCppSource() {
  return `#include "WebMenuCapture.h"

struct captured_row_t {
    uint8_t row;
    uint8_t item_index;
    uint8_t kind;
    uint8_t entry_type;
    uint8_t flags;
    uint8_t editable;
    char text[MENU_MAX_LINE];
};

static captured_row_t rows[8];
static uint8_t rowCount = 0;
static uint8_t visibleTop = 0;
static uint8_t visibleTotal = 0;
static uint8_t visibleWindow = 5;

static bool validIndex(int index) {
    return index >= 0 && index < rowCount;
}

static void clearDisplay(void *) {
    rowCount = 0;
    visibleTop = 0;
    visibleTotal = 0;
    visibleWindow = 5;
    for (uint8_t i = 0; i < 8; ++i) {
        rows[i].editable = 0;
        rows[i].text[0] = '\\0';
    }
}

static void flushDisplay(void *) {
}

static void renderLine(void *ctx, menu_render_line_t const *line) {
    if (!line || line->row >= 8) {
        return;
    }
    menu_runtime_t *rt = static_cast<menu_runtime_t *>(ctx);
    menu_cursor_t const *cur = (rt && rt->depth < MENU_MAX_STACK) ? &rt->stack[rt->depth] : 0;

    captured_row_t &row = rows[line->row];
    row.row = line->row;
    row.item_index = line->item_index;
    row.kind = line->kind;
    row.entry_type = line->entry_type;
    row.flags = line->flags;
    row.editable = 0;

    if (cur && line->kind == MENU_RENDER_ITEM) {
        uint8_t total = menu_runtime_t::menu_count(*cur);
        visibleTotal = menu_runtime_t::visible_count(*cur, total);
        visibleWindow = visibleTotal < 5 ? visibleTotal : 5;
        row.editable = menu_runtime_t::menu_int_has(*cur, line->item_index) ? 1 : 0;
        if (line->row == 1) {
            visibleTop = menu_runtime_t::raw_to_visible(*cur, total, line->item_index);
        }
    }

    char const *src = line->text ? line->text : "";
    uint8_t i = 0;
    while (src[i] && i + 1 < MENU_MAX_LINE) {
        row.text[i] = src[i];
        ++i;
    }
    row.text[i] = '\\0';
    if (line->row + 1 > rowCount) {
        rowCount = static_cast<uint8_t>(line->row + 1);
    }
}

static display_ops_t const WEB_CAPTURE_DISPLAY_OPS = {
    &clearDisplay,
    0,
    &flushDisplay,
    &renderLine
};

display_t make_web_menu_capture_display(menu_runtime_t &runtime, uint8_t width, uint8_t height) {
    return make_display(width, height, &runtime, &WEB_CAPTURE_DISPLAY_OPS);
}

uint8_t web_menu_capture_row_count(void) {
    return rowCount;
}

uint8_t web_menu_capture_row_kind(int index) {
    return validIndex(index) ? rows[index].kind : 0;
}

uint8_t web_menu_capture_row_flags(int index) {
    return validIndex(index) ? rows[index].flags : 0;
}

uint8_t web_menu_capture_row_entry_type(int index) {
    return validIndex(index) ? rows[index].entry_type : 0;
}

uint8_t web_menu_capture_row_item_index(int index) {
    return validIndex(index) ? rows[index].item_index : 255;
}

uint8_t web_menu_capture_row_editable(int index) {
    return validIndex(index) ? rows[index].editable : 0;
}

char const *web_menu_capture_row_text(int index) {
    return validIndex(index) ? rows[index].text : 0;
}

uint8_t web_menu_capture_visible_top(void) {
    return visibleTop;
}

uint8_t web_menu_capture_visible_total(void) {
    return visibleTotal;
}

uint8_t web_menu_capture_visible_window(void) {
    return visibleWindow;
}
`;
}

export function webMenuDomAdapterJsSource() {
  return `const Choice = {
  Left: 1,
  Right: 2,
  Up: 3,
  Down: 4,
  Select: 5,
  Cancel: 6
};

const Kind = {
  Title: 1,
  Item: 2,
  Blank: 3
};

const Flags = {
  Selected: 1 << 0,
  Editing: 1 << 1,
  Disabled: 1 << 2,
  HasChild: 1 << 3
};

let wasm;
let memory;
let menuElement;
let titleElement;
let bodyElement;
let icons = {};
let content = {};
let wasmPath = "./bettermenu_demo.wasm";

function readCString(ptr) {
  if (!ptr) return "";
  const bytes = new Uint8Array(memory.buffer);
  let end = ptr;
  while (bytes[end] !== 0) end += 1;
  return new TextDecoder().decode(bytes.subarray(ptr, end));
}

function parseLine(text) {
  const clean = text.replace(/^>\\s*/, "").replace(/\\s+\\(edit\\)$/, "").trim();
  const parts = clean.split(": ");
  return {
    label: parts[0] || clean,
    value: parts.length > 1 ? parts.slice(1).join(": ") : ""
  };
}

function iconUrl(label) {
  const key = icons[label];
  return key ? 'url("./icons/' + key + '.svg")' : "";
}

function selectedLabel(rows) {
  const selected = rows.find((row) => row.flags & Flags.Selected);
  return selected ? parseLine(selected.text).label : "";
}

function updateContent(rows) {
  if (!titleElement || !bodyElement) return;
  const label = selectedLabel(rows);
  const entry = content[label] || [label || "BetterMenu", "Generated from the structured BetterMenu model."];
  titleElement.textContent = entry[0];
  bodyElement.textContent = entry[1];
}

function sendChoice(choice) {
  if (!wasm) return;
  wasm.bm_send_choice(choice);
  render();
}

function render() {
  const rows = [];
  menuElement.textContent = "";
  for (let i = 0; i < wasm.bm_row_count(); i += 1) {
    const kind = wasm.bm_row_kind(i);
    const flags = wasm.bm_row_flags(i);
    const text = readCString(wasm.bm_row_text_ptr(i));
    rows.push({ kind, flags, text });
    if (kind === Kind.Blank) continue;

    const row = document.createElement("button");
    row.type = "button";
    row.className = kind === Kind.Title ? "row title-row" : "row";
    if (flags & Flags.Selected) row.classList.add("selected");
    if (flags & Flags.Editing) row.classList.add("editing");
    if (flags & Flags.Disabled) row.classList.add("disabled");
    if (flags & Flags.HasChild) row.classList.add("menu");

    const parsed = parseLine(text);
    const icon = document.createElement("span");
    icon.className = "icon";
    const mask = iconUrl(parsed.label);
    if (mask) icon.style.setProperty("--icon-url", mask);
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = kind === Kind.Title ? text : parsed.label;
    const value = document.createElement("span");
    value.className = "value";
    value.textContent = kind === Kind.Title ? "" : parsed.value;
    row.append(icon, label, value);
    row.addEventListener("click", () => {
      wasm.bm_send_row(i, 1);
      render();
    });
    menuElement.append(row);
  }
  updateContent(rows);
}

async function init() {
  const response = await fetch(wasmPath);
  const result = await WebAssembly.instantiate(await response.arrayBuffer(), {});
  wasm = result.instance.exports;
  memory = wasm.memory;
  wasm.bm_init();
  render();
}

export function initWebMenuDomAdapter(options = {}) {
  icons = options.icons || {};
  content = options.content || {};
  wasmPath = options.wasmPath || wasmPath;
  menuElement = document.querySelector(options.menuSelector || "#menu");
  titleElement = document.querySelector(options.titleSelector || "#content-title");
  bodyElement = document.querySelector(options.bodySelector || "#content-body");
  if (!menuElement) {
    throw new Error("Missing menu element.");
  }

  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => sendChoice(Number(button.dataset.choice)));
  });

  window.addEventListener("keydown", (event) => {
    const keymap = {
      ArrowUp: Choice.Up,
      ArrowDown: Choice.Down,
      ArrowLeft: Choice.Left,
      ArrowRight: Choice.Right,
      Enter: Choice.Select,
      Escape: Choice.Cancel,
      Backspace: Choice.Cancel
    };
    const choice = keymap[event.key];
    if (choice) {
      event.preventDefault();
      sendChoice(choice);
    }
  });

  init().catch((error) => {
    menuElement.textContent = String(error);
  });
}
`;
}

function generatedWebIndex(model) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(model.projectName || "BetterMenu Web Demo")}</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <main class="shell">
    <section class="menu-panel">
      <div id="menu" class="menu"></div>
      <div class="preview-remote" aria-label="Menu controls">
        <button class="remote-button remote-up" type="button" data-choice="3" aria-label="Move up" title="Move up"></button>
        <button class="remote-button remote-left" type="button" data-choice="1" aria-label="Move left" title="Move left"></button>
        <button class="remote-button remote-select" type="button" data-choice="5" aria-label="Select" title="Select"></button>
        <button class="remote-button remote-right" type="button" data-choice="2" aria-label="Move right" title="Move right"></button>
        <button class="remote-button remote-down" type="button" data-choice="4" aria-label="Move down" title="Move down"></button>
        <button class="remote-button remote-back" type="button" data-choice="6" aria-label="Back" title="Back"></button>
      </div>
    </section>
    <section class="content-panel" aria-live="polite">
      <h2 id="content-title">Waiting for BetterMenu</h2>
      <p id="content-body">The C++ runtime has not rendered yet.</p>
    </section>
  </main>
  <script type="module" src="./demo.js"></script>
</body>
</html>`;
}

function generatedWebDemoJs() {
  return `import { content, icons } from "./menu_data.js";
import { initWebMenuDomAdapter } from "./web_menu_dom_adapter.js";

initWebMenuDomAdapter({
  content,
  icons,
  wasmPath: "./bettermenu_demo.wasm"
});
`;
}

function generatedWebMenuData(model) {
  const iconMap = Object.fromEntries(model.items.map((item) => {
    const asset = assetForItem(model, item);
    return [item.label, asset?.safeName || ""];
  }).filter(([, key]) => key));
  const contentMap = Object.fromEntries(model.items.map((item) => [
    item.label,
    [item.contentTitle || item.label, item.contentBody || "Generated from the structured BetterMenu model."]
  ]));
  return `export const icons = ${JSON.stringify(iconMap, null, 2)};

export const content = ${JSON.stringify(contentMap, null, 2)};
`;
}

function generatedWebCss() {
  return `body {
  margin: 0;
  color: #edf2f7;
  background: #10151c;
  font: 14px/1.45 system-ui, sans-serif;
}

.shell {
  display: grid;
  gap: 16px;
  width: min(760px, calc(100vw - 32px));
  margin: 32px auto;
}

.menu-panel,
.content-panel {
  border: 1px solid #344559;
  border-radius: 8px;
  background: #0f1822;
  padding: 16px;
}

.menu {
  display: grid;
  gap: 8px;
}

button {
  border: 1px solid #344559;
  border-radius: 6px;
  background: #111a24;
  color: inherit;
  padding: 9px 10px;
}

.row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
}

.row.selected {
  border-color: #54d6c1;
  background: #173241;
}

.row.disabled {
  opacity: 0.45;
}

.row.title-row {
  cursor: default;
  font-weight: 700;
}

.icon {
  width: 18px;
  height: 18px;
  background: currentColor;
  mask: var(--icon-url) center / contain no-repeat;
}

.value {
  color: #a9b8c8;
}

.preview-remote {
  display: grid;
  grid-template-columns: repeat(3, 42px);
  grid-template-rows: repeat(3, 42px);
  gap: 8px;
  width: max-content;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid #344559;
  border-radius: 8px;
  background: #101720;
}

.remote-button {
  position: relative;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  padding: 0;
  color: #edf2f7;
  border-radius: 8px;
  background: #141f2a;
}

.remote-button::before,
.remote-button::after {
  content: "";
  grid-area: 1 / 1;
}

.remote-up {
  grid-column: 2;
  grid-row: 1;
}

.remote-left {
  grid-column: 1;
  grid-row: 2;
}

.remote-select {
  grid-column: 2;
  grid-row: 2;
  border-color: #54d6c1;
}

.remote-right {
  grid-column: 3;
  grid-row: 2;
}

.remote-down {
  grid-column: 2;
  grid-row: 3;
}

.remote-back {
  grid-column: 3;
  grid-row: 3;
}

.remote-up::before,
.remote-down::before,
.remote-left::before,
.remote-right::before {
  width: 0;
  height: 0;
  border-style: solid;
}

.remote-up::before {
  border-width: 0 8px 11px;
  border-color: transparent transparent currentColor;
}

.remote-down::before {
  border-width: 11px 8px 0;
  border-color: currentColor transparent transparent;
}

.remote-left::before {
  border-width: 8px 11px 8px 0;
  border-color: transparent currentColor transparent transparent;
}

.remote-right::before {
  border-width: 8px 0 8px 11px;
  border-color: transparent transparent transparent currentColor;
}

.remote-select::before {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-radius: 50%;
}

.remote-back::before {
  width: 17px;
  height: 13px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translateX(3px) rotate(45deg);
}

.remote-back::after {
  width: 16px;
  height: 2px;
  background: currentColor;
  transform: translateX(3px);
}

.content-panel h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.content-panel p {
  margin: 0;
  color: #a9b8c8;
}
`;
}

function assetForItem(model, item) {
  if (item.iconAssetId) {
    const direct = model.assets.find((asset) => asset.id === item.iconAssetId);
    if (direct) return direct;
  }
  if (!item.icon) return null;
  return model.assets.find((asset) => asset.key === item.icon || asset.safeName === item.icon) || null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
