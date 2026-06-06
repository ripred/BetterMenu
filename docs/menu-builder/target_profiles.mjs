export const TARGET_PROFILES = [
  {
    id: "arduino-serial",
    label: "Arduino Serial",
    family: "Text",
    defaultSkinId: "text-rows",
    previewRendererId: "serial-stream",
    capabilities: {
      text: true,
      graphical: false,
      terminal: false,
      color: false,
      monochrome: false,
      bitmap: false,
      mask: false,
      statusWidgets: false,
      customInput: true
    },
    files: ["BetterMenuSerialDemo.ino"],
    includes: ["BetterMenu.h"],
    dependencies: ["Arduino core"],
    input: "Serial keys through make_serial_keys_input",
    display: "Print display through make_print_display",
    memory: "Assets are ignored because this is a text target.",
    defaults: {
      width: 32,
      height: 8,
      serialBaud: 115200
    }
  },
  {
    id: "arduino-ansi-serial",
    label: "ANSI Serial Terminal",
    family: "Terminal",
    defaultSkinId: "text-rows",
    previewRendererId: "ansi-terminal",
    capabilities: {
      text: true,
      graphical: false,
      terminal: true,
      color: true,
      monochrome: false,
      bitmap: false,
      mask: false,
      statusWidgets: false,
      customInput: true
    },
    files: ["BetterMenuAnsiSerialDemo.ino"],
    includes: ["BetterMenu.h"],
    dependencies: ["Arduino core", "ANSI-capable serial terminal"],
    input: "Serial keys through make_serial_keys_input",
    display: "ANSI terminal region over Arduino Print",
    memory: "Assets are ignored because this is a terminal text target.",
    defaults: {
      width: 48,
      height: 8,
      originRow: 1,
      originCol: 1,
      serialBaud: 115200,
      ansiColor: true,
      ansiHideCursor: true,
      ansiClearOnBegin: true
    }
  },
  {
    id: "desktop-stdio",
    label: "Desktop C++ stdio",
    family: "Text",
    defaultSkinId: "text-rows",
    previewRendererId: "stdio-screen",
    capabilities: {
      text: true,
      graphical: false,
      terminal: false,
      color: false,
      monochrome: false,
      bitmap: false,
      mask: false,
      statusWidgets: false,
      customInput: true
    },
    files: ["BetterMenuStdioDemo.cpp"],
    includes: ["BetterMenu.h", "stdint.h", "stdio.h"],
    dependencies: ["C++11 compiler"],
    input: "getchar key loop",
    display: "callback display using puts/fputs",
    memory: "Assets are ignored because this is a text target.",
    defaults: {
      width: 60,
      height: 8
    }
  },
  {
    id: "web-dom-wasm",
    label: "Web DOM + WebAssembly",
    family: "Web",
    defaultSkinId: "rover-console",
    previewRendererId: "web-dom",
    capabilities: {
      text: true,
      graphical: true,
      terminal: false,
      color: true,
      monochrome: false,
      bitmap: true,
      mask: true,
      statusWidgets: true,
      customInput: true
    },
    files: ["index.html", "demo.js", "styles.css", "bettermenu_wasm.cpp", "icons/*.svg"],
    includes: ["BetterMenu.h"],
    dependencies: ["A local wasm32-capable C++ compiler for the generated bridge"],
    input: "DOM buttons mapped to BetterMenu choices",
    display: "DOM renderer using captured BetterMenu render rows",
    memory: "SVG and raster assets remain browser static files."
  },
  {
    id: "adafruit-ili9341-320x240-spi",
    label: "Adafruit ILI9341 320x240 SPI",
    family: "Adafruit_GFX",
    defaultSkinId: "rover-console",
    previewRendererId: "graphical-viewport",
    capabilities: {
      text: true,
      graphical: true,
      terminal: false,
      color: true,
      monochrome: false,
      bitmap: true,
      mask: true,
      statusWidgets: true,
      customInput: true
    },
    files: ["BetterMenuAdafruitILI9341.ino", "BetterMenuGeneratedAssets.h"],
    includes: ["SPI.h", "Adafruit_GFX.h", "Adafruit_ILI9341.h", "BetterMenu.h"],
    dependencies: ["Adafruit GFX Library", "Adafruit ILI9341", "Adafruit BusIO"],
    input: "Serial keys by default so display wiring stays independent",
    display: "Adafruit_GFX primitives mapped from the RoverConsole skin",
    memory: "Used color assets are emitted as RGB565 PROGMEM arrays with optional 1-bit masks.",
    defaults: {
      width: 320,
      height: 240,
      rotation: 1,
      displayObject: "tft",
      pins: {
        cs: "TFT_CS",
        dc: "TFT_DC",
        rst: "TFT_RST"
      },
      serialBaud: 115200
    }
  }
];

export const FUTURE_PROFILES = [
  "tft-espi-cyd-320x240",
  "adafruit-st7789",
  "u8g2-128x64",
  "liquidcrystal-16x2",
  "liquidcrystal-20x4"
];

export const SKINS = [
  {
    id: "text-rows",
    label: "Text rows",
    description: "Plain BetterMenu row text for Serial and stdio targets."
  },
  {
    id: "rover-console",
    label: "RoverConsole",
    description: "Graphical card rows, icon slots, header status widgets, inline edit controls, and a faux scrollbar."
  }
];

export function targetProfileById(id) {
  return TARGET_PROFILES.find((profile) => profile.id === id) || TARGET_PROFILES[0];
}

export function skinById(id) {
  return SKINS.find((skin) => skin.id === id) || SKINS[0];
}

export function defaultTargetSettings(profileId = "arduino-serial") {
  const profile = targetProfileById(profileId);
  const defaults = profile.defaults || {};
  return {
    profileId: profile.id,
    skinId: profile.defaultSkinId,
    width: defaults.width || 0,
    height: defaults.height || 0,
    rotation: defaults.rotation || 0,
    originRow: defaults.originRow || 1,
    originCol: defaults.originCol || 1,
    serialBaud: defaults.serialBaud || 115200,
    displayObject: defaults.displayObject || "display",
    pins: {
      cs: defaults.pins?.cs || "TFT_CS",
      dc: defaults.pins?.dc || "TFT_DC",
      rst: defaults.pins?.rst || "TFT_RST"
    },
    inputAdapter: profile.id === "desktop-stdio" ? "stdio-keys" : "serial-keys",
    navigationWrap: false,
    serialAutoscroll: true,
    serialTimestamps: false,
    ansiColor: defaults.ansiColor !== undefined ? Boolean(defaults.ansiColor) : false,
    ansiHideCursor: defaults.ansiHideCursor !== undefined ? Boolean(defaults.ansiHideCursor) : false,
    ansiClearOnBegin: defaults.ansiClearOnBegin !== undefined ? Boolean(defaults.ansiClearOnBegin) : false,
    assetExport: {
      includeUnused: false,
      iconSize: 18,
      colorDepth: "rgb565",
      mask: true
    }
  };
}

export function normalizeTargetSettings(input) {
  const profile = targetProfileById(input?.profileId || "arduino-serial");
  const base = defaultTargetSettings(profile.id);
  const merged = {
    ...base,
    ...(input || {}),
    pins: {
      ...base.pins,
      ...(input?.pins || {})
    },
    assetExport: {
      ...base.assetExport,
      ...(input?.assetExport || {})
    }
  };
  if (!SKINS.some((skin) => skin.id === merged.skinId)) {
    merged.skinId = profile.defaultSkinId;
  }
  merged.width = nonNegativeNumber(merged.width, base.width);
  merged.height = nonNegativeNumber(merged.height, base.height);
  merged.rotation = nonNegativeNumber(merged.rotation, base.rotation);
  merged.originRow = positiveNumber(merged.originRow, base.originRow);
  merged.originCol = positiveNumber(merged.originCol, base.originCol);
  merged.serialBaud = positiveNumber(merged.serialBaud, base.serialBaud);
  merged.displayObject = safeName(merged.displayObject || base.displayObject || "display");
  merged.pins.cs = safeName(merged.pins.cs || "TFT_CS");
  merged.pins.dc = safeName(merged.pins.dc || "TFT_DC");
  merged.pins.rst = safeName(merged.pins.rst || "TFT_RST");
  merged.navigationWrap = Boolean(merged.navigationWrap);
  merged.serialAutoscroll = Boolean(merged.serialAutoscroll);
  merged.serialTimestamps = Boolean(merged.serialTimestamps);
  merged.ansiColor = Boolean(merged.ansiColor);
  merged.ansiHideCursor = Boolean(merged.ansiHideCursor);
  merged.ansiClearOnBegin = Boolean(merged.ansiClearOnBegin);
  return merged;
}

export function profileInstructions(profile) {
  return [
    `Target profile: ${profile.label}.`,
    `Generated files: ${profile.files.join(", ")}.`,
    `Required includes: ${profile.includes.join(", ")}.`,
    `Dependencies: ${profile.dependencies.join(", ")}.`,
    `Input adapter: ${profile.input}.`,
    `Display adapter: ${profile.display}.`,
    profile.memory
  ];
}

function nonNegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 ? number : fallback;
}

function safeName(value) {
  return String(value || "").replace(/[^A-Za-z0-9_]/g, "_").replace(/^([^A-Za-z_])/, "_$1") || "value";
}
