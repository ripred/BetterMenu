import {
  SKINS,
  TARGET_PROFILES,
  defaultTargetSettings,
  normalizeTargetSettings,
  profileInstructions,
  targetProfileById
} from "./target_profiles.mjs";
import {
  assetCssUrl,
  defaultRoverAssets,
  encodeAssetForRgb565,
  fileToDataUrl,
  formatMaskArray,
  formatRgb565Array,
  makeSvgAsset,
  safeAssetName,
  sanitizeSvgSource,
  usedAssets
} from "./asset_utils.mjs";

const storageKey = "bettermenu.menuBuilder.project.v3";

const itemTypes = [
  ["int", "ITEM_INT"],
  ["bool", "ITEM_BOOL"],
  ["select", "ITEM_SELECT"],
  ["value", "ITEM_VALUE"],
  ["func", "ITEM_FUNC"],
  ["menu", "ITEM_MENU"]
];

const decoratorTypes = [
  ["format", "ITEM_FORMAT", "formatter"],
  ["disabled", "ITEM_DISABLED", "predicate"],
  ["hidden", "ITEM_HIDDEN", "predicate"],
  ["onChange", "ITEM_ON_CHANGE", "callback"]
];

const Choice = {
  Left: 1,
  Right: 2,
  Up: 3,
  Down: 4,
  Select: 5,
  Cancel: 6
};

const els = {
  projectName: document.querySelector("#project-name"),
  rootTitle: document.querySelector("#root-title"),
  menuSelect: document.querySelector("#menu-select"),
  itemList: document.querySelector("#item-list"),
  itemEditor: document.querySelector("#item-editor"),
  editorTitle: document.querySelector("#editor-title"),
  addItem: document.querySelector("#add-item"),
  deleteItem: document.querySelector("#delete-item"),
  generateStubs: document.querySelector("#generate-stubs"),
  backingSnippet: document.querySelector("#backing-snippet"),
  callbackSnippet: document.querySelector("#callback-snippet"),
  previewFrame: document.querySelector("#preview-frame"),
  previewMenu: document.querySelector("#preview-menu"),
  previewZoomOut: document.querySelector("#preview-zoom-out"),
  previewZoomIn: document.querySelector("#preview-zoom-in"),
  previewZoomLabel: document.querySelector("#preview-zoom-label"),
  previewTitle: document.querySelector("#preview-title"),
  previewBody: document.querySelector("#preview-body"),
  outputSelect: document.querySelector("#output-select"),
  outputCode: document.querySelector("#output-code"),
  copyOutput: document.querySelector("#copy-output"),
  downloadOutput: document.querySelector("#download-output"),
  saveJson: document.querySelector("#save-json"),
  loadJson: document.querySelector("#load-json"),
  loadSample: document.querySelector("#load-sample"),
  clearModel: document.querySelector("#clear-model"),
  instructions: document.querySelector("#instructions"),
  assetList: document.querySelector("#asset-list"),
  assetKey: document.querySelector("#asset-key"),
  assetSize: document.querySelector("#asset-size"),
  assetSvgSource: document.querySelector("#asset-svg-source"),
  addSvgAsset: document.querySelector("#add-svg-asset"),
  assetSvgFile: document.querySelector("#asset-svg-file"),
  assetRasterFile: document.querySelector("#asset-raster-file"),
  assetMaskFile: document.querySelector("#asset-mask-file"),
  addRasterAsset: document.querySelector("#add-raster-asset"),
  loadRoverAssets: document.querySelector("#load-rover-assets"),
  targetProfile: document.querySelector("#target-profile"),
  targetSkin: document.querySelector("#target-skin"),
  targetWidth: document.querySelector("#target-width"),
  targetHeight: document.querySelector("#target-height"),
  targetRotation: document.querySelector("#target-rotation"),
  targetDisplayObject: document.querySelector("#target-display-object"),
  targetPinCs: document.querySelector("#target-pin-cs"),
  targetPinDc: document.querySelector("#target-pin-dc"),
  targetPinRst: document.querySelector("#target-pin-rst"),
  targetInputAdapter: document.querySelector("#target-input-adapter"),
  targetNavigationWrap: document.querySelector("#target-navigation-wrap"),
  targetSummary: document.querySelector("#target-summary")
};

let selectedMenuId = "root";
let selectedItemId = "";
let activeTab = "builder";
let model = loadModel();
let idCounter = 0;
let preview = createPreviewState(model);

function defaultModel() {
  return {
    version: 2,
    projectName: "New BetterMenu Project",
    rootMenuId: "root",
    generateStubs: true,
    menus: [
      { id: "root", title: "Menu", itemIds: [] }
    ],
    items: [],
    snippets: {
      backing: "",
      callbacks: ""
    },
    icons: {},
    content: {},
    assets: [],
    statusWidgets: [],
    targetSettings: defaultTargetSettings("arduino-serial"),
    previewSettings: {
      skinId: "text-rows",
      visibleRows: 5,
      zoom: 1
    }
  };
}

function roverConsoleModel() {
  const assets = defaultRoverAssets();
  const assetId = (key) => assets.find((asset) => asset.key === key)?.id || "";
  return {
    version: 2,
    projectName: "RoverConsole Builder Demo",
    rootMenuId: "root",
    generateStubs: false,
    menus: [
      { id: "root", title: "Rover", itemIds: ["drive", "maxSpeed", "headlights", "pitchTrim", "pidMenu", "sensorsMenu", "telemetry", "telemetryRate", "calibrate", "armed", "estop", "systemMenu"] },
      { id: "pid", title: "PID tuning", itemIds: ["kp", "ki", "kd", "loopRate", "saveTune"] },
      { id: "sensors", title: "Sensors", itemIds: ["pitch", "heading", "battery", "range", "cellTemp"] },
      { id: "system", title: "System", itemIds: ["brightness", "theme", "screenFlip", "devTools", "firmware", "uptime"] }
    ],
    items: [
      withIconAsset(selectItem("drive", "Drive mode", "driveMode", [["Idle", 0], ["Manual", 1], ["Auto", 2], ["Follow", 3]], 1, "compass", "A fixed-choice select row for rover operating mode."), assetId("compass")),
      withIconAsset(intItem("maxSpeed", "Max speed", "maxSpeedPct", 0, 100, 5, 65, "speed", "An editable integer row formatted as a percentage.", formatDec("formatPercent", "&maxSpeedPct")), assetId("speed")),
      withIconAsset(boolItem("headlights", "Headlights", "headlights", "Off", "On", false, "beam", "A boolean row rendered through BetterMenu value labels."), assetId("beam")),
      withIconAsset(valueItem("pitchTrim", "Pitch trim", "getInt", "setInt", "&pitchTrimTenth", -50, 50, 1, "level", "A mutable getter/setter value row with a signed degree formatter.", formatDec("formatTrim", "&pitchTrimTenth")), assetId("level")),
      withIconAsset(menuItem("pidMenu", "PID tuning", "pid", "sliders", "A child menu with mutable PID gains and a save action."), assetId("sliders")),
      withIconAsset(menuItem("sensorsMenu", "Sensors", "sensors", "radar", "A child menu of read-only telemetry values."), assetId("radar")),
      withIconAsset(boolItem("telemetry", "Telemetry", "telemetryStream", "Quiet", "Stream", false, "broadcast", "A boolean row with an on-change callback.", onChangeDec("onChanged", "0")), assetId("broadcast")),
      withIconAsset(intItem("telemetryRate", "Telemetry rate", "telemetryHz", 1, 50, 1, 5, "clock", "A disabled row until telemetry streaming is enabled.", mergeDecorators(formatDec("formatHz", "&telemetryHz"), disabledDec("telemetryRateDisabled", "0"))), assetId("clock")),
      withIconAsset(funcItem("calibrate", "Calibrate IMU", "action", "crosshair", "A function row that forwards selection to firmware code."), assetId("crosshair")),
      withIconAsset(boolItem("armed", "Arm motors", "armed", "Safe", "Armed", false, "shield", "A boolean row using custom labels.", onChangeDec("onChanged", "0")), assetId("shield")),
      withIconAsset(funcItem("estop", "E-STOP", "action", "stop", "A high-priority function row carried through the same action path."), assetId("stop")),
      withIconAsset(menuItem("systemMenu", "System", "system", "gear", "Display preferences and system metadata."), assetId("gear")),
      withIconAsset(valueItem("kp", "Kp", "getInt", "setInt", "&kpMilli", 0, 5000, 10, "slider", "A mutable fixed-point value row.", formatDec("formatMilli2", "&kpMilli")), assetId("slider")),
      withIconAsset(valueItem("ki", "Ki", "getInt", "setInt", "&kiMilli", 0, 5000, 10, "slider", "A mutable fixed-point value row.", formatDec("formatMilli2", "&kiMilli")), assetId("slider")),
      withIconAsset(valueItem("kd", "Kd", "getInt", "setInt", "&kdMilli", 0, 5000, 10, "slider", "A mutable fixed-point value row.", formatDec("formatMilli2", "&kdMilli")), assetId("slider")),
      withIconAsset(intItem("loopRate", "Loop rate", "loopRateHz", 50, 400, 10, 200, "clock", "A standard integer row inside the PID submenu."), assetId("clock")),
      withIconAsset(funcItem("saveTune", "Save tune", "action", "save", "A function row for persisting PID values."), assetId("save")),
      withIconAsset(valueItem("pitch", "Pitch", "getInt", "", "&pitchTenth", 0, 0, 1, "level", "A read-only value formatted as signed tenths of a degree.", formatDec("formatPitch", "&pitchTenth")), assetId("level")),
      withIconAsset(valueItem("heading", "Heading", "getInt", "", "&headingDeg", 0, 0, 1, "compass", "A read-only heading value.", formatDec("formatHeading", "&headingDeg")), assetId("compass")),
      withIconAsset(valueItem("battery", "Battery", "getInt", "", "&battCentiV", 0, 0, 1, "battery", "A read-only centivolt value formatted as volts.", formatDec("formatVolts", "&battCentiV")), assetId("battery")),
      withIconAsset(valueItem("range", "Range", "getInt", "", "&rangeMm", 0, 0, 1, "radar", "A read-only distance value.", formatDec("formatMm", "&rangeMm")), assetId("radar")),
      withIconAsset(valueItem("cellTemp", "Cell temp", "getInt", "", "&cellTempC", 0, 0, 1, "thermo", "A read-only temperature value.", formatDec("formatTempC", "&cellTempC")), assetId("thermo")),
      withIconAsset(intItem("brightness", "Brightness", "brightnessPct", 10, 100, 10, 80, "sun", "A display brightness integer row."), assetId("sun")),
      withIconAsset(selectItem("theme", "Theme", "themeSel", [["Aurora", 0], ["Slate", 1], ["Mono", 2]], 0, "swatch", "A select row that also controls the hidden Dev tools row."), assetId("swatch")),
      withIconAsset(boolItem("screenFlip", "Screen flip", "screenFlip", "Off", "On", false, "flip", "A boolean display orientation row."), assetId("flip")),
      withIconAsset(funcItem("devTools", "Dev tools", "action", "tool", "A hidden row that appears only for the Mono theme.", hiddenDec("devToolsHidden", "0")), assetId("tool")),
      withIconAsset(valueItem("firmware", "Firmware", "getInt", "", "&uptimeMin", 0, 0, 1, "chip", "A formatted read-only value.", formatDec("formatFirmware", "0")), assetId("chip")),
      withIconAsset(valueItem("uptime", "Uptime", "getInt", "", "&uptimeMin", 0, 0, 1, "clock", "A formatted runtime value.", formatDec("formatUptime", "&uptimeMin")), assetId("clock"))
    ],
    snippets: {
      backing: defaultBackingSnippet(),
      callbacks: defaultCallbackSnippet()
    },
    icons: {},
    content: {},
    assets,
    statusWidgets: [
      { id: "armed-status", type: "chip", label: "Armed state", sourceSymbol: "armed", falseLabel: "READY", trueLabel: "ARMED" },
      { id: "battery-status", type: "battery", label: "Battery", sourceSymbol: "battCentiV", min: 900, max: 1260 }
    ],
    targetSettings: defaultTargetSettings("adafruit-ili9341-320x240-spi"),
    previewSettings: {
      skinId: "rover-console",
      visibleRows: 5,
      zoom: 1.25
    }
  };
}

function intItem(id, label, stateSymbol, min, max, step, initial, icon, body, decorators = emptyDecorators()) {
  return {
    id,
    type: "int",
    label,
    stateSymbol,
    min,
    max,
    step,
    initial,
    icon,
    contentTitle: label,
    contentBody: body,
    decorators
  };
}

function boolItem(id, label, stateSymbol, falseLabel, trueLabel, initial, icon, body, decorators = emptyDecorators()) {
  return {
    id,
    type: "bool",
    label,
    stateSymbol,
    falseLabel,
    trueLabel,
    initial,
    icon,
    contentTitle: label,
    contentBody: body,
    decorators
  };
}

function selectItem(id, label, stateSymbol, choices, initial, icon, body, decorators = emptyDecorators()) {
  return {
    id,
    type: "select",
    label,
    stateSymbol,
    choices: choices.map(([choiceLabel, value]) => ({ label: choiceLabel, value })),
    initial,
    icon,
    contentTitle: label,
    contentBody: body,
    decorators
  };
}

function valueItem(id, label, getter, setter, ctx, min, max, step, icon, body, decorators = emptyDecorators()) {
  return {
    id,
    type: "value",
    label,
    getter,
    setter,
    ctx,
    min,
    max,
    step,
    icon,
    contentTitle: label,
    contentBody: body,
    decorators
  };
}

function funcItem(id, label, actionSymbol, icon, body, decorators = emptyDecorators()) {
  return {
    id,
    type: "func",
    label,
    actionSymbol,
    icon,
    contentTitle: label,
    contentBody: body,
    decorators
  };
}

function menuItem(id, label, childMenuId, icon, body, decorators = emptyDecorators()) {
  return {
    id,
    type: "menu",
    label,
    childMenuId,
    icon,
    contentTitle: label,
    contentBody: body,
    decorators
  };
}

function withIconAsset(item, iconAssetId) {
  item.iconAssetId = iconAssetId || "";
  return item;
}

function emptyDecorators() {
  return {
    format: { enabled: false, symbol: "", ctx: "0" },
    disabled: { enabled: false, symbol: "", ctx: "0" },
    hidden: { enabled: false, symbol: "", ctx: "0" },
    onChange: { enabled: false, symbol: "", ctx: "0" }
  };
}

function formatDec(symbol, ctx) {
  return { format: { enabled: true, symbol, ctx } };
}

function disabledDec(symbol, ctx) {
  return { disabled: { enabled: true, symbol, ctx } };
}

function hiddenDec(symbol, ctx) {
  return { hidden: { enabled: true, symbol, ctx } };
}

function onChangeDec(symbol, ctx) {
  return { onChange: { enabled: true, symbol, ctx } };
}

function mergeDecorators(...partials) {
  const base = emptyDecorators();
  for (const partial of partials) {
    if (!partial) continue;
    for (const [key, value] of Object.entries(partial)) {
      base[key] = { ...base[key], ...value };
    }
  }
  return base;
}

function defaultBackingSnippet() {
  return `static int driveMode = 1;
static int maxSpeedPct = 65;
static bool headlights = false;
static int pitchTrimTenth = -15;
static int kpMilli = 1200;
static int kiMilli = 80;
static int kdMilli = 450;
static int loopRateHz = 200;
static int pitchTenth = 23;
static int headingDeg = 247;
static int battCentiV = 1187;
static int rangeMm = 412;
static int cellTempC = 34;
static bool telemetryStream = false;
static int telemetryHz = 5;
static bool armed = false;
static int brightnessPct = 80;
static int themeSel = 0;
static bool screenFlip = false;
static int uptimeMin = 154;`;
}

function defaultCallbackSnippet() {
  return `static void action(void) {
}

static void onChanged(void *) {
}

static bool telemetryRateDisabled(void *) {
    return !telemetryStream;
}

static bool devToolsHidden(void *) {
    return themeSel != 2;
}

static int getInt(void *ctx) {
    return ctx ? *static_cast<int *>(ctx) : 0;
}

static void setInt(void *ctx, int value) {
    if (ctx) {
        *static_cast<int *>(ctx) = value;
    }
}

static void appendChar(char *out, uint8_t cap, uint8_t &pos, char c) {
    if (pos + 1 < cap) {
        out[pos++] = c;
        out[pos] = '\\0';
    }
}

static unsigned int absUnsigned(int value) {
    return value < 0 ? (0U - static_cast<unsigned int>(value)) : static_cast<unsigned int>(value);
}

static void appendInt(char *out, uint8_t cap, uint8_t &pos, int value) {
    char tmp[12];
    bool neg = value < 0;
    unsigned int v = neg ? (0U - static_cast<unsigned int>(value)) : static_cast<unsigned int>(value);
    uint8_t len = 0;
    do {
        tmp[len++] = static_cast<char>('0' + (v % 10U));
        v /= 10U;
    } while (v && len < sizeof(tmp));
    if (neg) {
        appendChar(out, cap, pos, '-');
    }
    while (len) {
        appendChar(out, cap, pos, tmp[--len]);
    }
}

static void appendText(char *out, uint8_t cap, uint8_t &pos, char const *text) {
    while (text && *text) {
        appendChar(out, cap, pos, *text++);
    }
}

static void formatIntUnit(int value, char const *unit, char *out, uint8_t cap) {
    if (!out || cap == 0) {
        return;
    }
    uint8_t pos = 0;
    out[0] = '\\0';
    appendInt(out, cap, pos, value);
    appendText(out, cap, pos, unit);
}

static void formatPercent(void *ctx, char *out, uint8_t cap) {
    formatIntUnit(ctx ? *static_cast<int *>(ctx) : 0, "%", out, cap);
}

static void formatMilli2(void *ctx, char *out, uint8_t cap) {
    if (!out || cap == 0) {
        return;
    }
    int value = ctx ? *static_cast<int *>(ctx) : 0;
    unsigned int whole = absUnsigned(value) / 1000U;
    unsigned int hundredths = (absUnsigned(value) % 1000U) / 10U;
    uint8_t pos = 0;
    out[0] = '\\0';
    if (value < 0) {
        appendChar(out, cap, pos, '-');
    }
    appendInt(out, cap, pos, static_cast<int>(whole));
    appendChar(out, cap, pos, '.');
    appendChar(out, cap, pos, static_cast<char>('0' + (hundredths / 10U)));
    appendChar(out, cap, pos, static_cast<char>('0' + (hundredths % 10U)));
}

static void formatSignedTenths(int value, char *out, uint8_t cap) {
    if (!out || cap == 0) {
        return;
    }
    unsigned int av = absUnsigned(value);
    uint8_t pos = 0;
    out[0] = '\\0';
    appendChar(out, cap, pos, value < 0 ? '-' : '+');
    appendInt(out, cap, pos, static_cast<int>(av / 10U));
    appendChar(out, cap, pos, '.');
    appendChar(out, cap, pos, static_cast<char>('0' + (av % 10U)));
    appendText(out, cap, pos, " deg");
}

static void formatTrim(void *ctx, char *out, uint8_t cap) {
    formatSignedTenths(ctx ? *static_cast<int *>(ctx) : 0, out, cap);
}

static void formatPitch(void *ctx, char *out, uint8_t cap) {
    formatSignedTenths(ctx ? *static_cast<int *>(ctx) : 0, out, cap);
}

static void formatHeading(void *ctx, char *out, uint8_t cap) {
    formatIntUnit(ctx ? *static_cast<int *>(ctx) : 0, " deg", out, cap);
}

static void formatVolts(void *ctx, char *out, uint8_t cap) {
    if (!out || cap == 0) {
        return;
    }
    int value = ctx ? *static_cast<int *>(ctx) : 0;
    unsigned int av = absUnsigned(value);
    uint8_t pos = 0;
    out[0] = '\\0';
    if (value < 0) {
        appendChar(out, cap, pos, '-');
    }
    appendInt(out, cap, pos, static_cast<int>(av / 100U));
    appendChar(out, cap, pos, '.');
    appendChar(out, cap, pos, static_cast<char>('0' + ((av % 100U) / 10U)));
    appendChar(out, cap, pos, static_cast<char>('0' + (av % 10U)));
    appendText(out, cap, pos, " V");
}

static void formatMm(void *ctx, char *out, uint8_t cap) {
    formatIntUnit(ctx ? *static_cast<int *>(ctx) : 0, " mm", out, cap);
}

static void formatTempC(void *ctx, char *out, uint8_t cap) {
    formatIntUnit(ctx ? *static_cast<int *>(ctx) : 0, " C", out, cap);
}

static void formatHz(void *ctx, char *out, uint8_t cap) {
    formatIntUnit(ctx ? *static_cast<int *>(ctx) : 0, " Hz", out, cap);
}

static void formatFirmware(void *, char *out, uint8_t cap) {
    if (!out || cap == 0) {
        return;
    }
    uint8_t pos = 0;
    out[0] = '\\0';
    appendText(out, cap, pos, "v0.5.4");
}

static void formatUptime(void *ctx, char *out, uint8_t cap) {
    if (!out || cap == 0) {
        return;
    }
    int minutes = ctx ? *static_cast<int *>(ctx) : 0;
    uint8_t pos = 0;
    out[0] = '\\0';
    appendInt(out, cap, pos, minutes / 60);
    appendChar(out, cap, pos, 'h');
    appendChar(out, cap, pos, ' ');
    int rem = minutes % 60;
    appendChar(out, cap, pos, static_cast<char>('0' + ((rem / 10) % 10)));
    appendChar(out, cap, pos, static_cast<char>('0' + (rem % 10)));
    appendChar(out, cap, pos, 'm');
}`;
}

function loadModel() {
  const fallback = defaultModel();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    return normalizeModel(saved || fallback);
  } catch {
    return fallback;
  }
}

function normalizeModel(input) {
  const base = defaultModel();
  const normalized = {
    ...base,
    ...input,
    menus: Array.isArray(input?.menus) ? input.menus : base.menus,
    items: Array.isArray(input?.items) ? input.items : base.items,
    snippets: { ...base.snippets, ...(input?.snippets || {}) },
    icons: input?.icons || {},
    content: input?.content || {},
    assets: Array.isArray(input?.assets) ? input.assets : base.assets,
    statusWidgets: Array.isArray(input?.statusWidgets) ? input.statusWidgets : base.statusWidgets,
    targetSettings: normalizeTargetSettings(input?.targetSettings || base.targetSettings),
    previewSettings: {
      ...base.previewSettings,
      ...(input?.previewSettings || {})
    }
  };
  normalized.version = 2;
  normalized.assets = normalized.assets.map(normalizeAsset);
  normalized.items = normalized.items.map((item) => ({
    ...item,
    iconAssetId: item.iconAssetId || assetIdForIconKey(normalized.assets, item.icon || ""),
    decorators: mergeDecorators(item.decorators || {})
  }));
  if (!normalized.menus.some((menu) => menu.id === normalized.rootMenuId)) {
    normalized.rootMenuId = normalized.menus[0]?.id || "root";
  }
  if (!normalized.previewSettings.skinId) {
    normalized.previewSettings.skinId = normalized.targetSettings.skinId || targetProfileById(normalized.targetSettings.profileId).defaultSkinId;
  }
  normalized.previewSettings.visibleRows = clamp(numberOr(normalized.previewSettings.visibleRows, 5), 1, 8);
  normalized.previewSettings.zoom = clamp(numberOr(normalized.previewSettings.zoom, 1), 0.75, 2);
  return normalized;
}

function normalizeAsset(asset) {
  const key = asset?.key || asset?.safeName || "asset";
  return {
    id: asset?.id || `asset_${safeAssetName(key)}`,
    key,
    kind: asset?.kind || "svg",
    source: asset?.source || "",
    maskSource: asset?.maskSource || "",
    width: numberOr(asset?.width, 24),
    height: numberOr(asset?.height, 24),
    safeName: asset?.safeName || safeAssetName(key),
    usage: asset?.usage || "rowIcon",
    settings: {
      size: numberOr(asset?.settings?.size, 18),
      threshold: numberOr(asset?.settings?.threshold, 1),
      invertMask: Boolean(asset?.settings?.invertMask),
      fit: asset?.settings?.fit || "contain",
      colorDepth: asset?.settings?.colorDepth || "rgb565"
    },
    encoded: asset?.encoded || null
  };
}

function assetIdForIconKey(assets, key) {
  if (!key) return "";
  return assets.find((asset) => asset.key === key || asset.safeName === key)?.id || "";
}

function saveModel() {
  localStorage.setItem(storageKey, JSON.stringify(model));
}

async function prepareModelAssets() {
  const iconSize = Number(model.targetSettings?.assetExport?.iconSize || 18);
  const pending = model.assets.filter((asset) => !asset.encoded && (asset.kind === "svg" || asset.kind === "raster" || asset.kind === "rasterMask"));
  for (const asset of pending) {
    try {
      await encodeAssetForRgb565(asset, iconSize);
    } catch (error) {
      asset.encodeError = error.message || String(error);
    }
  }
}

function createPreviewState(sourceModel) {
  const values = {};
  for (const item of sourceModel.items) {
    if (item.stateSymbol) {
      values[item.stateSymbol] = item.type === "bool" ? Boolean(item.initial) : numberOr(item.initial, 0);
    }
    const ctxSymbol = symbolFromCtx(item.ctx);
    if (ctxSymbol && !(ctxSymbol in values)) {
      values[ctxSymbol] = numberOr(item.initial, initialFromKnownSymbol(ctxSymbol));
    }
  }
  return {
    stack: [sourceModel.rootMenuId],
    selected: 0,
    selectedByMenu: { [sourceModel.rootMenuId]: 0 },
    editingItemId: "",
    editingOriginal: null,
    lastAction: "",
    values
  };
}

function currentPreviewMenuId() {
  return preview.stack[preview.stack.length - 1] || model.rootMenuId;
}

function previewSelectedFor(menuId, rowCount) {
  const selected = clamp(numberOr(preview.selectedByMenu?.[menuId], preview.selected), 0, Math.max(0, rowCount - 1));
  preview.selectedByMenu ||= {};
  preview.selectedByMenu[menuId] = selected;
  preview.selected = selected;
  return selected;
}

function setPreviewSelected(menuId, selected, rowCount) {
  preview.selectedByMenu ||= {};
  preview.selectedByMenu[menuId] = clamp(selected, 0, Math.max(0, rowCount - 1));
  preview.selected = preview.selectedByMenu[menuId];
}

function initialFromKnownSymbol(symbol) {
  const known = {
    pitchTrimTenth: -15,
    kpMilli: 1200,
    kiMilli: 80,
    kdMilli: 450,
    pitchTenth: 23,
    headingDeg: 247,
    battCentiV: 1187,
    rangeMm: 412,
    cellTempC: 34,
    uptimeMin: 154
  };
  return known[symbol] ?? 0;
}

function symbolFromCtx(ctx) {
  return String(ctx || "").trim().replace(/^&/, "") || "";
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function byId(collection, id) {
  return collection.find((entry) => entry.id === id);
}

function currentMenu() {
  return byId(model.menus, selectedMenuId) || byId(model.menus, model.rootMenuId) || model.menus[0];
}

function selectedItem() {
  return byId(model.items, selectedItemId) || null;
}

function visibleItemsForMenu(menuId) {
  const menu = byId(model.menus, menuId);
  if (!menu) return [];
  return menu.itemIds.map((id) => byId(model.items, id)).filter(Boolean).filter((item) => !isHidden(item));
}

function assetUsageCounts() {
  const counts = {};
  for (const item of model.items || []) {
    if (item.iconAssetId) counts[item.iconAssetId] = (counts[item.iconAssetId] || 0) + 1;
  }
  for (const widget of model.statusWidgets || []) {
    if (widget.assetId) counts[widget.assetId] = (counts[widget.assetId] || 0) + 1;
  }
  return counts;
}

function renderAll() {
  const rootMenu = byId(model.menus, model.rootMenuId);
  els.projectName.value = model.projectName || "";
  els.rootTitle.value = rootMenu?.title || "";
  els.generateStubs.checked = Boolean(model.generateStubs);
  els.backingSnippet.value = model.snippets.backing || "";
  els.callbackSnippet.value = model.snippets.callbacks || "";
  renderTabs();
  renderMenuSelect();
  renderItemList();
  renderItemEditor();
  renderAssetManager();
  renderTargetSettings();
  renderPreview();
  renderOutput();
  renderInstructions();
  saveModel();
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === activeTab;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === activeTab);
  });
}

function renderMenuSelect() {
  els.menuSelect.textContent = "";
  for (const menu of model.menus) {
    const option = document.createElement("option");
    option.value = menu.id;
    option.textContent = menu.id === model.rootMenuId ? `${menu.title} (root)` : menu.title;
    els.menuSelect.append(option);
  }
  selectedMenuId = byId(model.menus, selectedMenuId)?.id || model.rootMenuId;
  els.menuSelect.value = selectedMenuId;
}

function renderItemList() {
  const menu = currentMenu();
  els.itemList.textContent = "";
  if (!menu) return;
  if (!menu.itemIds.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "This menu has no items yet.";
    els.itemList.append(empty);
    selectedItemId = "";
    return;
  }
  if (!menu.itemIds.includes(selectedItemId)) {
    selectedItemId = menu.itemIds[0];
  }
  menu.itemIds.forEach((itemId, index) => {
    const item = byId(model.items, itemId);
    if (!item) return;
    const row = document.createElement("div");
    row.className = `item-row${item.id === selectedItemId ? " selected" : ""}`;
    row.dataset.itemId = item.id;
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(item.id === selectedItemId));

    const text = document.createElement("button");
    text.type = "button";
    text.className = "item-pick";
    text.dataset.itemId = item.id;
    text.innerHTML = `<strong>${escapeHtml(item.label || "(untitled)")}</strong><span class="meta">${typeLabel(item.type)}${decoratorSummary(item)}</span>`;

    const controls = document.createElement("span");
    controls.className = "row-actions";
    controls.innerHTML = `
      <button type="button" data-move="up" data-item-id="${item.id}" ${index === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
      <button type="button" data-move="down" data-item-id="${item.id}" ${index === menu.itemIds.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
    `;
    row.append(text, controls);
    els.itemList.append(row);
  });
}

function renderItemEditor() {
  const item = selectedItem();
  els.deleteItem.disabled = !item;
  if (!item) {
    els.editorTitle.textContent = "Item settings";
    els.itemEditor.textContent = "";
    return;
  }
  els.editorTitle.textContent = item.label || "Item settings";
  els.itemEditor.innerHTML = `
    <div class="form-grid">
      ${fieldHtml("label", "Label", item.label || "")}
      <div class="field">
        <label for="item-type">Type</label>
        <select id="item-type" data-prop="type">
          ${itemTypes.map(([value, label]) => `<option value="${value}" ${item.type === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </div>
      ${fieldHtml("icon", "Icon key", item.icon || "")}
      ${assetSelectHtml(item)}
      ${fieldHtml("contentTitle", "Content title", item.contentTitle || "")}
    </div>
    <div class="field">
      <label for="contentBody">Content/help text</label>
      <textarea id="contentBody" data-prop="contentBody" spellcheck="false">${escapeTextarea(item.contentBody || "")}</textarea>
    </div>
    ${typeFieldsHtml(item)}
    <section class="decorator-grid" aria-label="Decorators">
      ${decoratorTypes.map(([key, macro, role]) => decoratorHtml(item, key, macro, role)).join("")}
    </section>
  `;
}

function assetSelectHtml(item) {
  const options = [
    `<option value="" ${item.iconAssetId ? "" : "selected"}>No asset</option>`,
    ...model.assets.map((asset) => `<option value="${escapeAttr(asset.id)}" ${item.iconAssetId === asset.id ? "selected" : ""}>${escapeHtml(asset.key)}</option>`)
  ];
  return `<div class="field"><label for="iconAssetId">Icon asset</label><select id="iconAssetId" data-prop="iconAssetId">${options.join("")}</select></div>`;
}

function renderAssetManager() {
  if (!els.assetList) return;
  els.assetList.textContent = "";
  if (!model.assets.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No assets yet. Add SVGs or images, or load the RoverConsole icon set.";
    els.assetList.append(empty);
    return;
  }
  const counts = assetUsageCounts();
  for (const asset of model.assets) {
    const row = document.createElement("article");
    row.className = "asset-card";
    const preview = document.createElement("span");
    preview.className = "asset-preview";
    const cssUrl = assetCssUrl(asset);
    if (cssUrl) {
      preview.style.setProperty("--asset-url", `url("${cssUrl.replace(/"/g, "%22")}")`);
    }
    const info = document.createElement("div");
    info.innerHTML = `
      <strong>${escapeHtml(asset.key)}</strong>
      <span class="meta">${escapeHtml(asset.kind)} · ${numberOr(asset.encoded?.width, asset.width)}x${numberOr(asset.encoded?.height, asset.height)} · used ${counts[asset.id] || 0}x</span>
      <span class="meta">${asset.encoded ? `${asset.encoded.flashBytes || 0} bytes estimated Adafruit asset data` : "encoding pending"}</span>
    `;
    const controls = document.createElement("div");
    controls.className = "row-actions";
    controls.innerHTML = `<button type="button" data-delete-asset="${escapeAttr(asset.id)}" aria-label="Delete asset">Delete</button>`;
    row.append(preview, info, controls);
    els.assetList.append(row);
  }
}

function renderTargetSettings() {
  if (!els.targetProfile) return;
  const settings = model.targetSettings;
  const profile = targetProfileById(settings.profileId);
  if (!els.targetProfile.options.length) {
    for (const optionProfile of TARGET_PROFILES) {
      const option = document.createElement("option");
      option.value = optionProfile.id;
      option.textContent = optionProfile.label;
      els.targetProfile.append(option);
    }
  }
  if (!els.targetSkin.options.length) {
    for (const skin of SKINS) {
      const option = document.createElement("option");
      option.value = skin.id;
      option.textContent = skin.label;
      els.targetSkin.append(option);
    }
  }
  els.targetProfile.value = settings.profileId;
  els.targetSkin.value = settings.skinId;
  els.targetWidth.value = settings.width;
  els.targetHeight.value = settings.height;
  els.targetRotation.value = settings.rotation;
  els.targetDisplayObject.value = settings.displayObject;
  els.targetPinCs.value = settings.pins.cs;
  els.targetPinDc.value = settings.pins.dc;
  els.targetPinRst.value = settings.pins.rst;
  els.targetInputAdapter.value = settings.inputAdapter;
  els.targetNavigationWrap.checked = Boolean(settings.navigationWrap);
  els.targetSummary.innerHTML = `
    <section>
      <h3>${escapeHtml(profile.label)}</h3>
      <ul>
        ${profileInstructions(profile).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
        <li>Navigation: ${settings.navigationWrap ? "wraps from either menu end to the other" : "stops at the first and last selectable rows"}.</li>
      </ul>
    </section>
  `;
}

function typeFieldsHtml(item) {
  if (item.type === "int") {
    return `<div class="form-grid">
      ${fieldHtml("stateSymbol", "Backing int symbol", item.stateSymbol || "")}
      ${numberFieldHtml("initial", "Initial value", item.initial ?? 0)}
      ${numberFieldHtml("min", "Min", item.min ?? 0)}
      ${numberFieldHtml("max", "Max", item.max ?? 100)}
      ${numberFieldHtml("step", "Step", item.step ?? 1)}
    </div>`;
  }
  if (item.type === "bool") {
    return `<div class="form-grid">
      ${fieldHtml("stateSymbol", "Backing bool symbol", item.stateSymbol || "")}
      ${fieldHtml("falseLabel", "False label", item.falseLabel || "Off")}
      ${fieldHtml("trueLabel", "True label", item.trueLabel || "On")}
      <label class="checkline editor-check"><input type="checkbox" data-prop="initial" ${item.initial ? "checked" : ""}> Initial true</label>
    </div>`;
  }
  if (item.type === "select") {
    return `<div class="form-grid">
      ${fieldHtml("stateSymbol", "Backing int symbol", item.stateSymbol || "")}
      ${numberFieldHtml("initial", "Initial value", item.initial ?? 0)}
    </div>
    <div class="field">
      <label for="choices">Choices, one per line as Label=value</label>
      <textarea id="choices" data-prop="choices" spellcheck="false">${escapeTextarea(choicesToText(item.choices || []))}</textarea>
    </div>`;
  }
  if (item.type === "value") {
    return `<div class="form-grid">
      ${fieldHtml("getter", "Getter symbol", item.getter || "getInt")}
      ${fieldHtml("setter", "Setter symbol, blank for read-only", item.setter || "")}
      ${fieldHtml("ctx", "Context expression", item.ctx || "0")}
      ${numberFieldHtml("min", "Min", item.min ?? 0)}
      ${numberFieldHtml("max", "Max", item.max ?? 100)}
      ${numberFieldHtml("step", "Step", item.step ?? 1)}
    </div>`;
  }
  if (item.type === "func") {
    return `<div class="form-grid">
      ${fieldHtml("actionSymbol", "Callback symbol", item.actionSymbol || "action")}
    </div>`;
  }
  const child = byId(model.menus, item.childMenuId);
  return `<div class="form-grid">
    <div class="field">
      <label for="childMenuId">Child menu</label>
      <select id="childMenuId" data-prop="childMenuId">
        ${model.menus.filter((menu) => menu.id !== selectedMenuId).map((menu) => `<option value="${menu.id}" ${item.childMenuId === menu.id ? "selected" : ""}>${escapeHtml(menu.title)}</option>`).join("")}
      </select>
    </div>
    ${fieldHtml("childTitle", "Child title", child?.title || item.label || "")}
  </div>`;
}

function fieldHtml(prop, label, value) {
  return `<div class="field"><label for="${prop}">${label}</label><input id="${prop}" data-prop="${prop}" type="text" value="${escapeAttr(value)}"></div>`;
}

function numberFieldHtml(prop, label, value) {
  return `<div class="field"><label for="${prop}">${label}</label><input id="${prop}" data-prop="${prop}" type="number" value="${escapeAttr(value)}"></div>`;
}

function decoratorHtml(item, key, macro, role) {
  const dec = item.decorators?.[key] || emptyDecorators()[key];
  return `<div class="decorator-card">
    <label class="checkline"><input type="checkbox" data-decorator="${key}" data-decorator-prop="enabled" ${dec.enabled ? "checked" : ""}> ${macro}</label>
    <div class="field">
      <label>${role}</label>
      <input type="text" data-decorator="${key}" data-decorator-prop="symbol" value="${escapeAttr(dec.symbol || "")}">
    </div>
    <div class="field">
      <label>ctx</label>
      <input type="text" data-decorator="${key}" data-decorator-prop="ctx" value="${escapeAttr(dec.ctx || "0")}">
    </div>
  </div>`;
}

function renderPreview() {
  const menuId = currentPreviewMenuId();
  const rows = visibleItemsForMenu(menuId);
  const selected = previewSelectedFor(menuId, rows.length);
  const profile = targetProfileById(model.targetSettings.profileId);
  const graphicalPreview = Boolean(profile.capabilities.graphical);
  const targetWidth = numberOr(model.targetSettings.width, 0);
  const targetHeight = numberOr(model.targetSettings.height, 0);
  const zoom = clamp(numberOr(model.previewSettings.zoom, 1), 0.75, 2);
  els.previewMenu.textContent = "";
  els.previewMenu.classList.toggle("rover-skin", model.previewSettings.skinId === "rover-console" || model.targetSettings.skinId === "rover-console");
  els.previewMenu.classList.toggle("graphical-viewport", graphicalPreview);
  els.previewFrame.classList.toggle("graphical-frame", graphicalPreview);
  if (graphicalPreview && targetWidth > 0 && targetHeight > 0) {
    els.previewFrame.style.setProperty("--preview-width", `${targetWidth}px`);
    els.previewFrame.style.setProperty("--preview-height", `${targetHeight}px`);
    els.previewFrame.style.setProperty("--preview-zoom", String(zoom));
    els.previewMenu.style.setProperty("--preview-width", `${targetWidth}px`);
    els.previewMenu.style.setProperty("--preview-height", `${targetHeight}px`);
    els.previewMenu.style.setProperty("--preview-aspect", `${targetWidth} / ${targetHeight}`);
    els.previewMenu.style.setProperty("--preview-zoom", String(zoom));
  } else {
    els.previewFrame.style.removeProperty("--preview-width");
    els.previewFrame.style.removeProperty("--preview-height");
    els.previewFrame.style.removeProperty("--preview-zoom");
    els.previewMenu.style.removeProperty("--preview-width");
    els.previewMenu.style.removeProperty("--preview-height");
    els.previewMenu.style.removeProperty("--preview-aspect");
    els.previewMenu.style.removeProperty("--preview-zoom");
  }
  els.previewZoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  els.previewZoomOut.disabled = zoom <= 0.75;
  els.previewZoomIn.disabled = zoom >= 2;

  const header = document.createElement("div");
  header.className = "preview-header";
  header.innerHTML = `<span class="breadcrumb">${escapeHtml(menuPathTitle())}</span>${previewStatusHtml()}`;
  els.previewMenu.append(header);

  const windowSize = Number(model.previewSettings.visibleRows || 5);
  const top = previewTop(rows.length, selected, windowSize);
  const visibleRows = rows.slice(top, top + windowSize);
  visibleRows.forEach((item, offset) => {
    const index = top + offset;
    const row = document.createElement("button");
    row.type = "button";
    row.className = `preview-row ${item.type}`;
    row.dataset.previewIndex = String(index);
    if (graphicalPreview) {
      row.style.setProperty("--row-top", `${44 + offset * 36}px`);
    }
    if (index === selected) row.classList.add("selected");
    if (isDisabled(item)) row.classList.add("disabled");
    if (item.type === "bool" || item.type === "select") row.classList.add("choice");
    const value = previewValueText(item);
    const meta = graphicalPreview ? "" : `<span class="meta">${typeLabel(item.type)}${assetLabel(item) ? ` · ${escapeHtml(assetLabel(item))}` : ""}</span>`;
    row.innerHTML = `${previewIconHtml(item)}<span class="row-main"><strong>${escapeHtml(item.label || "(untitled)")}</strong>${meta}</span>${previewValueHtml(item, value)}`;
    els.previewMenu.append(row);
  });
  if (rows.length > windowSize) {
    const scrollbar = document.createElement("div");
    const thumbHeight = Math.max(18, Math.round((windowSize / rows.length) * 100));
    const denom = Math.max(1, rows.length - windowSize);
    const thumbTop = Math.round(((100 - thumbHeight) * top) / denom);
    scrollbar.className = "preview-scrollbar";
    scrollbar.innerHTML = `<span style="height:${thumbHeight}%;top:${thumbTop}%"></span>`;
    els.previewMenu.append(scrollbar);
  }

  renderPreviewDetails(rows[selected]);
}

function previewTop(total, selected, windowSize) {
  if (total <= windowSize) return 0;
  return clamp(selected - Math.floor(windowSize / 2), 0, total - windowSize);
}

function previewStatusHtml() {
  const armedWidget = model.statusWidgets.find((widget) => widget.type === "chip");
  const batteryWidget = model.statusWidgets.find((widget) => widget.type === "battery");
  const parts = [];
  if (armedWidget) {
    const armed = Boolean(preview.values[armedWidget.sourceSymbol]);
    parts.push(`<span class="state-chip ${armed ? "armed" : "ready"}"><span aria-hidden="true"></span>${escapeHtml(armed ? armedWidget.trueLabel || "ARMED" : armedWidget.falseLabel || "READY")}</span>`);
  }
  if (batteryWidget) {
    const pct = batteryPercent(preview.values[batteryWidget.sourceSymbol], batteryWidget);
    const tone = pct > 50 ? "good" : (pct > 20 ? "warn" : "low");
    parts.push(`<span class="battery-meter ${tone}" aria-label="Battery ${pct}%"><span class="battery-percent">${pct}%</span><span class="battery-case"><span class="battery-fill" style="width:${pct}%"></span></span></span>`);
  }
  if (!parts.length) {
    parts.push(`<span class="meta">${visibleItemsForMenu(currentPreviewMenuId()).length} rows</span>`);
  }
  return `<span class="preview-status">${parts.join("")}</span>`;
}

function previewIconHtml(item) {
  const asset = assetForItem(item);
  if (!asset) return `<span class="preview-icon empty" aria-hidden="true"></span>`;
  const cssUrl = assetCssUrl(asset);
  return `<span class="preview-icon" style="--asset-url:url(&quot;${escapeAttr(cssUrl)}&quot;)" aria-hidden="true"></span>`;
}

function previewValueHtml(item, value) {
  if (preview.editingItemId === item.id && value) {
    return `<span class="edit-controls"><span class="edit-button minus" aria-hidden="true"></span><span class="edit-value">${escapeHtml(value)}</span><span class="edit-button plus" aria-hidden="true"></span></span>`;
  }
  if (item.type === "menu") {
    return `<span class="value value-icon" aria-hidden="true">›</span>`;
  }
  return `<span class="value">${escapeHtml(value)}</span>`;
}

function assetForItem(item) {
  return byId(model.assets, item.iconAssetId) || model.assets.find((asset) => asset.key === item.icon) || null;
}

function assetLabel(item) {
  return assetForItem(item)?.key || item.icon || "";
}

function batteryPercent(value, widget) {
  const min = numberOr(widget.min, 900);
  const max = numberOr(widget.max, 1260);
  const pct = Math.round(((numberOr(value, max) - min) / Math.max(1, max - min)) * 100);
  return clamp(pct, 0, 100);
}

function renderPreviewDetails(item) {
  if (!item) {
    els.previewTitle.textContent = "No selection";
    els.previewBody.textContent = "Add a row to this menu to preview it.";
    return;
  }
  els.previewTitle.textContent = item.contentTitle || item.label || "Selected item";
  const action = preview.lastAction ? ` Last action: ${preview.lastAction}.` : "";
  els.previewBody.textContent = `${item.contentBody || "This row is generated from the structured BetterMenu model."}${action}`;
}

function renderOutput() {
  const key = els.outputSelect.value || "firmwareDeclaration";
  const outputs = generateOutputs();
  els.outputCode.textContent = outputs[key] || "";
}

function renderInstructions() {
  const diagnostics = collectDiagnostics();
  const profile = targetProfileById(model.targetSettings.profileId);
  els.instructions.innerHTML = `
    <section>
      <h3>Static hosting</h3>
      <ol>
        <li>Place this folder under <code>docs/menu-builder/</code> and publish the repository with GitHub Pages from <code>docs/</code>.</li>
        <li>The app stores the working project in browser local storage and can export/import the JSON model.</li>
        <li>No backend, local-file access, or browser compiler is required. The app exports text assets for the user's normal development environment.</li>
      </ol>
    </section>
    <section>
      <h3>Selected target</h3>
      <ol>
        ${profileInstructions(profile).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
      </ol>
    </section>
    <section>
      <h3>Samples</h3>
      <ol>
        <li>Start with the empty project to build a new declaration from scratch.</li>
        <li>Use <code>Load RoverConsole sample</code> to inspect a complete nested menu with backing values, formatters, decorators, and callbacks.</li>
        <li>Use <code>Clear project</code> to return to a blank model after exploring or modifying the sample.</li>
      </ol>
    </section>
    <section>
      <h3>Firmware export</h3>
      <ol>
        <li>Use the declaration-only output when the sketch already owns setup, loop, input, and display adapters.</li>
        <li>Use the Arduino Serial sketch output for a complete text-console starting point.</li>
        <li>Use the Desktop C++ stdio program for command-line testing without Arduino or browser dependencies.</li>
        <li>Use the Adafruit ILI9341 sketch and generated asset header together for the first graphical Adafruit_GFX target.</li>
        <li>Move generated backing variables and callbacks into normal sketch files when replacing stubs with real application logic.</li>
      </ol>
    </section>
    <section>
      <h3>Assets</h3>
      <ol>
        <li>SVG assets are sanitized before preview or export.</li>
        <li>Raster assets and optional masks are decoded in browser memory and exported without local filesystem paths.</li>
        <li>Text targets report assigned icons as ignored; graphical targets export only used assets unless the profile says otherwise.</li>
      </ol>
    </section>
    <section>
      <h3>Web export</h3>
      <ol>
        <li>Use the WebAssembly bridge source together with <code>BetterMenu.h</code> and the reusable DOM input/display adapter.</li>
        <li>Build the generated bridge with the same WebAssembly-capable C++ toolchain used by the project or development environment.</li>
        <li>Copy the compiled <code>.wasm</code> and static web files into the deployed web demo package.</li>
      </ol>
    </section>
    <section>
      <h3>Diagnostics</h3>
      <ul>${diagnostics.map((line) => `<li>${escapeHtml(line)}</li>`).join("") || "<li>No model diagnostics.</li>"}</ul>
    </section>
  `;
}

function generateOutputs() {
  const declaration = generateFirmwareDeclaration();
  const sketch = generateFirmwareSketch();
  const stdio = generateStdioProgram();
  const bridge = generateWasmBridgeCpp();
  const adafruitAssets = generateAdafruitAssetHeader();
  const adafruitSketch = generateAdafruitSketch();
  return {
    firmwareDeclaration: declaration,
    firmwareSketch: sketch,
    stdioProgram: stdio,
    wasmBridgeCpp: bridge,
    webPackageFiles: JSON.stringify(generateWebPackageFiles(bridge), null, 2),
    adafruitSketch,
    adafruitAssets,
    targetPackageFiles: JSON.stringify(generateTargetPackageFiles({ bridge, adafruitSketch, adafruitAssets }), null, 2),
    diagnostics: collectDiagnostics().join("\n") || "No model diagnostics."
  };
}

function generateFirmwareDeclaration() {
  return `#include <BetterMenu.h>

${generateSupportCode()}

static const auto ${safeCppIdentifier(model.projectName || "menu", "Menu")} =
${menuExpression(model.rootMenuId, 0)};
`;
}

function navigationSetupCode(runtimeName) {
  return model.targetSettings.navigationWrap ? `\n    ${runtimeName}.set_navigation_wrap(true);` : "";
}

function generateFirmwareSketch() {
  const menuName = safeCppIdentifier(model.projectName || "menu", "Menu");
  return `#include <BetterMenu.h>

${generateSupportCode()}

static const auto ${menuName} =
${menuExpression(model.rootMenuId, 0)};

static menu_runtime_t runtime;
static serial_keys_ctx_t keyInput;
static print_display_ctx_t serialDisplay;

void setup() {
    Serial.begin(115200);
    while (!Serial) {
    }
    Serial.println(F("BetterMenu Serial demo"));
    Serial.println(F("Use W/S to move, E to select, Q to go back, A/D to edit."));

    input_source_t input = make_serial_keys_input(keyInput);
    display_t display = make_print_display(serialDisplay, Serial, 32, 8);
    runtime = menu_runtime_t::make(${menuName}, display, input, false);
    runtime.set_show_title(true);
    runtime.set_show_breadcrumbs(true);${navigationSetupCode("runtime")}
    runtime.begin();
}

void loop() {
    runtime.service();
}
`;
}

function generateStdioProgram() {
  const menuName = safeCppIdentifier(model.projectName || "menu", "Menu");
  return `#include "BetterMenu.h"

#include <stdint.h>
#include <stdio.h>

${generateSupportCode()}

static const auto ${menuName} =
${menuExpression(model.rootMenuId, 0)};

static menu_runtime_t runtime;
static input_event_ctx_t keyInput;
static bool running = true;

static void displayClear(void) {
    fputs("\\033[2J\\033[H", stdout);
}

static void displayWriteLine(uint8_t row, char const *text) {
    (void)row;
    puts(text ? text : "");
}

static void displayFlush(void) {
    puts("");
    puts("[w/s] move  [e/d] select or edit +  [a] back or edit -  [q] back  [x] quit");
    fflush(stdout);
}

static choice_t readChoice(void *) {
    int ch = getchar();
    while (ch == '\\n' || ch == '\\r') {
        ch = getchar();
    }
    switch (ch) {
        case 'w': case 'W': return Choice_Up;
        case 's': case 'S': return Choice_Down;
        case 'e': case 'E': return Choice_Select;
        case 'd': case 'D': return Choice_Right;
        case 'a': case 'A': return Choice_Left;
        case 'q': case 'Q': return Choice_Cancel;
        case 'x': case 'X': running = false; return Choice_Invalid;
        default: return Choice_Invalid;
    }
}

int main(void) {
    input_source_t input = make_event_input(keyInput, 0, readChoice);
    display_t display = make_callback_display(60, 8, displayClear, displayWriteLine, displayFlush);

    runtime = menu_runtime_t::make(${menuName}, display, input, false);
    runtime.set_show_title(true);
    runtime.set_show_breadcrumbs(true);${navigationSetupCode("runtime")}
    runtime.begin();

    while (running) {
        runtime.service();
    }

    return 0;
}
`;
}

function generateSupportCode() {
  const snippets = `${model.snippets.backing || ""}\n\n${model.snippets.callbacks || ""}`.trim();
  if (!model.generateStubs) return snippets;
  const stubs = generateMissingStubs(snippets);
  return [snippets, stubs].filter(Boolean).join("\n\n");
}

function generateMissingStubs(existing) {
  const lines = [];
  for (const item of model.items) {
    if ((item.type === "int" || item.type === "select") && item.stateSymbol && !hasSymbol(existing, item.stateSymbol)) {
      lines.push(`static int ${item.stateSymbol} = ${numberOr(item.initial, 0)};`);
    }
    if (item.type === "bool" && item.stateSymbol && !hasSymbol(existing, item.stateSymbol)) {
      lines.push(`static bool ${item.stateSymbol} = ${item.initial ? "true" : "false"};`);
    }
    if (item.type === "func" && item.actionSymbol && !hasSymbol(existing, item.actionSymbol)) {
      lines.push(`static void ${item.actionSymbol}(void) { }`);
    }
    if (item.type === "value") {
      if (item.getter && !hasSymbol(existing, item.getter)) {
        lines.push(`static int ${item.getter}(void *ctx) { return ctx ? *static_cast<int *>(ctx) : 0; }`);
      }
      if (item.setter && !hasSymbol(existing, item.setter)) {
        lines.push(`static void ${item.setter}(void *ctx, int value) { if (ctx) { *static_cast<int *>(ctx) = value; } }`);
      }
      const ctxSymbol = symbolFromCtx(item.ctx);
      if (ctxSymbol && !hasSymbol(existing, ctxSymbol)) {
        lines.push(`static int ${ctxSymbol} = ${numberOr(item.initial, 0)};`);
      }
    }
    for (const [key] of decoratorTypes) {
      const dec = item.decorators?.[key];
      if (!dec?.enabled || !dec.symbol || hasSymbol(existing, dec.symbol)) continue;
      if (key === "format") {
        lines.push(`static void ${dec.symbol}(void *ctx, char *out, uint8_t cap) { formatIntUnit(ctx ? *static_cast<int *>(ctx) : 0, "", out, cap); }`);
      } else if (key === "onChange") {
        lines.push(`static void ${dec.symbol}(void *) { }`);
      } else {
        lines.push(`static bool ${dec.symbol}(void *) { return false; }`);
      }
    }
  }
  return [...new Set(lines)].join("\n");
}

function menuExpression(menuId, depth) {
  const menu = byId(model.menus, menuId);
  if (!menu) return `${indent(depth)}MENU(${cppString("(missing menu)")})`;
  const itemLines = menu.itemIds
    .map((id) => byId(model.items, id))
    .filter(Boolean)
    .map((item) => `${indent(depth + 1)}${itemExpression(item, depth + 1)}`);
  return `${indent(depth)}MENU(${cppString(menu.title || "Menu")}${itemLines.length ? ",\n" : ""}${itemLines.join(",\n")}\n${indent(depth)})`;
}

function itemExpression(item, depth) {
  let expr;
  if (item.type === "int") {
    expr = Number(item.step) === 1
      ? `ITEM_INT(${cppString(item.label)}, &${requiredSymbol(item.stateSymbol, "intValue")}, ${numberOr(item.min, 0)}, ${numberOr(item.max, 100)})`
      : `ITEM_INT_STEP(${cppString(item.label)}, &${requiredSymbol(item.stateSymbol, "intValue")}, ${numberOr(item.min, 0)}, ${numberOr(item.max, 100)}, ${numberOr(item.step, 1)})`;
  } else if (item.type === "bool") {
    expr = `ITEM_BOOL(${cppString(item.label)}, &${requiredSymbol(item.stateSymbol, "boolValue")}, ${cppString(item.falseLabel || "Off")}, ${cppString(item.trueLabel || "On")})`;
  } else if (item.type === "select") {
    const choices = (item.choices || []).map((choice) => `\n${indent(depth + 1)}MENU_CHOICE(${cppString(choice.label)}, ${numberOr(choice.value, 0)})`).join(",");
    expr = `ITEM_SELECT(${cppString(item.label)}, &${requiredSymbol(item.stateSymbol, "selectValue")},${choices}\n${indent(depth)})`;
  } else if (item.type === "value") {
    const getter = requiredSymbol(item.getter, "getInt");
    const ctx = item.ctx || "0";
    if (item.setter) {
      expr = `ITEM_VALUE(${cppString(item.label)}, ${getter}, ${item.setter}, ${ctx}, ${numberOr(item.min, 0)}, ${numberOr(item.max, 100)}, ${numberOr(item.step, 1)})`;
    } else {
      expr = `ITEM_VALUE(${cppString(item.label)}, ${getter}, ${ctx})`;
    }
  } else if (item.type === "func") {
    expr = `ITEM_FUNC(${cppString(item.label)}, ${requiredSymbol(item.actionSymbol, "action")})`;
  } else {
    expr = `ITEM_MENU(${cppString(item.label)},\n${menuExpression(item.childMenuId, depth + 1)}\n${indent(depth)})`;
  }
  return decorateExpression(expr, item, depth);
}

function decorateExpression(expr, item, depth) {
  let result = expr;
  const order = [
    ["format", "ITEM_FORMAT"],
    ["onChange", "ITEM_ON_CHANGE"],
    ["disabled", "ITEM_DISABLED"],
    ["hidden", "ITEM_HIDDEN"]
  ];
  for (const [key, macro] of order) {
    const dec = item.decorators?.[key];
    if (!dec?.enabled) continue;
    result = `${macro}(${result}, ${requiredSymbol(dec.symbol, key)}, ${dec.ctx || "0"})`;
  }
  return result;
}

function generateWasmBridgeCpp() {
  const menuName = safeCppIdentifier(model.projectName || "menu", "Menu");
  return `#define MENU_MAX_LINE 96

#include "BetterMenu.h"

#include <stddef.h>
#include <stdint.h>

extern "C" size_t strlen(char const *s) {
    size_t n = 0;
    while (s && s[n]) {
        ++n;
    }
    return n;
}

extern "C" void *memcpy(void *dst, void const *src, size_t n) {
    char *d = static_cast<char *>(dst);
    char const *s = static_cast<char const *>(src);
    for (size_t i = 0; i < n; ++i) {
        d[i] = s[i];
    }
    return dst;
}

extern "C" void *memmove(void *dst, void const *src, size_t n) {
    char *d = static_cast<char *>(dst);
    char const *s = static_cast<char const *>(src);
    if (d < s) {
        for (size_t i = 0; i < n; ++i) {
            d[i] = s[i];
        }
    } else if (d > s) {
        for (size_t i = n; i > 0; --i) {
            d[i - 1] = s[i - 1];
        }
    }
    return dst;
}

extern "C" void *memset(void *dst, int value, size_t n) {
    unsigned char *d = static_cast<unsigned char *>(dst);
    for (size_t i = 0; i < n; ++i) {
        d[i] = static_cast<unsigned char>(value);
    }
    return dst;
}

${generateSupportCode()}

static menu_runtime_t runtime;
static menu_event_t pendingEvent = menu_event(Choice_Invalid);

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

static menu_event_t readEvent(void *) {
    menu_event_t event = pendingEvent;
    pendingEvent = menu_event(Choice_Invalid);
    return event;
}

static display_ops_t const WEB_DISPLAY_OPS = {
    &clearDisplay,
    0,
    &flushDisplay,
    &renderLine
};

static input_ops_t const WEB_INPUT_OPS = {
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    &readEvent
};

static input_source_t webInput = make_input_source(0, &WEB_INPUT_OPS);
static display_t webDisplay = make_display(60, 6, &runtime, &WEB_DISPLAY_OPS);
static const auto ${menuName} =
${menuExpression(model.rootMenuId, 0)};

extern "C" __attribute__((export_name("bm_init"))) void bm_init(void) {
    runtime = menu_runtime_t::make(${menuName}, webDisplay, webInput, false);
    runtime.set_show_title(true);
    runtime.set_show_breadcrumbs(true);
    runtime.set_show_affordances(false);${navigationSetupCode("runtime")}
    runtime.begin();
    runtime.service();
}

extern "C" __attribute__((export_name("bm_send_choice"))) void bm_send_choice(int choice) {
    pendingEvent = menu_event(static_cast<choice_t>(choice));
    runtime.service();
    runtime.service();
}

extern "C" __attribute__((export_name("bm_send_row"))) void bm_send_row(int row, int activate) {
    pendingEvent = menu_row_event(static_cast<uint8_t>(row), activate != 0);
    runtime.service();
    runtime.service();
}

extern "C" __attribute__((export_name("bm_row_count"))) int bm_row_count(void) {
    return rowCount;
}

extern "C" __attribute__((export_name("bm_row_kind"))) int bm_row_kind(int idx) {
    return (idx >= 0 && idx < rowCount) ? rows[idx].kind : 0;
}

extern "C" __attribute__((export_name("bm_row_flags"))) int bm_row_flags(int idx) {
    return (idx >= 0 && idx < rowCount) ? rows[idx].flags : 0;
}

extern "C" __attribute__((export_name("bm_row_entry_type"))) int bm_row_entry_type(int idx) {
    return (idx >= 0 && idx < rowCount) ? rows[idx].entry_type : 0;
}

extern "C" __attribute__((export_name("bm_row_item_index"))) int bm_row_item_index(int idx) {
    return (idx >= 0 && idx < rowCount) ? rows[idx].item_index : 255;
}

extern "C" __attribute__((export_name("bm_row_editable"))) int bm_row_editable(int idx) {
    return (idx >= 0 && idx < rowCount) ? rows[idx].editable : 0;
}

extern "C" __attribute__((export_name("bm_row_text_ptr"))) int bm_row_text_ptr(int idx) {
    return (idx >= 0 && idx < rowCount) ? static_cast<int>(reinterpret_cast<uintptr_t>(rows[idx].text)) : 0;
}

extern "C" __attribute__((export_name("bm_visible_top"))) int bm_visible_top(void) {
    return visibleTop;
}

extern "C" __attribute__((export_name("bm_visible_total"))) int bm_visible_total(void) {
    return visibleTotal;
}

extern "C" __attribute__((export_name("bm_visible_window"))) int bm_visible_window(void) {
    return visibleWindow;
}
`;
}

function generateWebPackageFiles(bridgeSource) {
  const assetFiles = {};
  for (const asset of usedAssets(model)) {
    if (asset.kind === "svg") {
      assetFiles[`icons/${asset.safeName}.svg`] = asset.source;
    }
  }
  return {
    files: {
      "bettermenu_wasm.cpp": bridgeSource,
      "BetterMenu.h": "Copy the current repository BetterMenu.h beside bettermenu_wasm.cpp before compiling.",
      "index.html": generatedWebIndex(),
      "demo.js": generatedWebDemoJs(),
      "styles.css": generatedWebCss(),
      ...assetFiles
    },
    compile: {
      local: "Use a WebAssembly-capable C++ compiler in the project or development environment to emit a freestanding wasm32 module with exported bm_* functions."
    }
  };
}

function generatedWebIndex() {
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
    <section>
      <div id="menu" class="menu"></div>
      <div class="controls">
        <button data-choice="3">Up</button>
        <button data-choice="4">Down</button>
        <button data-choice="1">Left</button>
        <button data-choice="2">Right</button>
        <button data-choice="5">Select</button>
        <button data-choice="6">Back</button>
      </div>
    </section>
  </main>
  <script type="module" src="./demo.js"></script>
</body>
</html>`;
}

function generatedWebDemoJs() {
  const iconMap = Object.fromEntries(model.items.map((item) => {
    const asset = assetForItem(item);
    return [item.label, asset?.safeName || ""];
  }).filter(([, key]) => key));
  const contentMap = Object.fromEntries(model.items.map((item) => [
    item.label,
    [item.contentTitle || item.label, item.contentBody || "Generated from the structured BetterMenu model."]
  ]));
  return `const menu = document.querySelector("#menu");
const icons = ${JSON.stringify(iconMap, null, 2)};
const content = ${JSON.stringify(contentMap, null, 2)};
let wasm;
let memory;

function readCString(ptr) {
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
  return key ? \`url("./icons/\${key}.svg")\` : "";
}

function render() {
  menu.textContent = "";
  for (let i = 0; i < wasm.bm_row_count(); i += 1) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "row";
    const parsed = parseLine(readCString(wasm.bm_row_text_ptr(i)));
    if (wasm.bm_row_flags(i) & 1) row.classList.add("selected");
    const icon = document.createElement("span");
    icon.className = "icon";
    const mask = iconUrl(parsed.label);
    if (mask) icon.style.setProperty("--icon-url", mask);
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = parsed.label;
    const value = document.createElement("span");
    value.className = "value";
    value.textContent = parsed.value;
    row.append(icon, label, value);
    row.addEventListener("click", () => {
      wasm.bm_send_row(i, 1);
      render();
    });
    menu.append(row);
  }
}

async function init() {
  const response = await fetch("./bettermenu_demo.wasm");
  const result = await WebAssembly.instantiate(await response.arrayBuffer(), {});
  wasm = result.instance.exports;
  memory = wasm.memory;
  wasm.bm_init();
  render();
}

document.querySelectorAll("[data-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    wasm.bm_send_choice(Number(button.dataset.choice));
    render();
  });
});

init().catch((error) => {
  menu.textContent = String(error);
});`;
}

function generatedWebCss() {
  return `body {
  margin: 0;
  color: #edf2f7;
  background: #10151c;
  font: 14px/1.45 system-ui, sans-serif;
}

.shell {
  width: min(760px, calc(100vw - 32px));
  margin: 32px auto;
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
  gap: 10px;
  text-align: left;
}

.row.selected {
  border-color: #7fc7c0;
  box-shadow: inset 4px 0 0 #7fc7c0;
}

.icon {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  color: #96a6b6;
  border: 1px solid currentColor;
  border-radius: 50%;
}

.icon::before {
  content: "";
  width: 15px;
  height: 15px;
  background: currentColor;
  -webkit-mask: var(--icon-url, none) center / contain no-repeat;
  mask: var(--icon-url, none) center / contain no-repeat;
}

.label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.value {
  color: #7ed39f;
  font-variant-numeric: tabular-nums;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}`;
}

function generateAdafruitAssetHeader() {
  const assets = usedAssets(model);
  const declarations = [];
  const structs = [];
  for (const asset of assets) {
    const symbol = assetSymbol(asset);
    const encoded = asset.encoded;
    if (!encoded?.rgb565?.length) continue;
    declarations.push(`static const uint16_t ${symbol}_PIXELS[] PROGMEM = {\n${formatRgb565Array(encoded.rgb565)}\n};`);
    if (encoded.mask?.length) {
      declarations.push(`static const uint8_t ${symbol}_MASK[] PROGMEM = {\n${formatMaskArray(encoded.mask)}\n};`);
    }
    structs.push(`static const BMIconAsset ${symbol} = { ${encoded.width}, ${encoded.height}, ${symbol}_PIXELS, ${encoded.mask?.length ? `${symbol}_MASK` : "0"} };`);
  }
  return `#pragma once

#include <Arduino.h>
#include <Adafruit_GFX.h>

struct BMIconAsset {
    uint8_t width;
    uint8_t height;
    const uint16_t *pixels;
    const uint8_t *mask;
};

${declarations.join("\n\n")}

${structs.join("\n")}

static bool bmIconMaskBit(const BMIconAsset *icon, uint16_t index) {
    if (!icon || !icon->mask) {
        return true;
    }
    uint8_t value = pgm_read_byte(&icon->mask[index / 8]);
    return (value & (1 << (7 - (index % 8)))) != 0;
}

static void bmDrawIcon(Adafruit_GFX &gfx, int16_t x, int16_t y, const BMIconAsset *icon, uint16_t color, uint16_t fallback) {
    if (!icon || !icon->pixels) {
        gfx.drawCircle(x + 9, y + 9, 3, fallback);
        return;
    }
    for (uint8_t py = 0; py < icon->height; ++py) {
        for (uint8_t px = 0; px < icon->width; ++px) {
            uint16_t index = static_cast<uint16_t>(py) * icon->width + px;
            if (!bmIconMaskBit(icon, index)) {
                continue;
            }
            uint16_t pixel = pgm_read_word(&icon->pixels[index]);
            gfx.drawPixel(x + px, y + py, icon->mask ? color : pixel);
        }
    }
}
`;
}

function generateAdafruitSketch() {
  const menuName = safeCppIdentifier(model.projectName || "menu", "Menu");
  const settings = normalizeTargetSettings(model.targetSettings);
  const profile = targetProfileById(settings.profileId);
  return `#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <BetterMenu.h>

#include "BetterMenuGeneratedAssets.h"

#define ${settings.pins.cs} 10
#define ${settings.pins.dc} 9
#define ${settings.pins.rst} 8

static Adafruit_ILI9341 ${settings.displayObject}(${settings.pins.cs}, ${settings.pins.dc}, ${settings.pins.rst});
static menu_runtime_t menuRuntime;
static serial_keys_ctx_t serialInput;

${generateSupportCode()}

static const auto ${menuName} =
${menuExpression(model.rootMenuId, 0)};

static uint16_t bmRgb(uint8_t r, uint8_t g, uint8_t b) {
    return ${settings.displayObject}.color565(r, g, b);
}

static char bmLower(char c) {
    return (c >= 'A' && c <= 'Z') ? static_cast<char>(c + ('a' - 'A')) : c;
}

static bool bmEq(const char *a, const char *b) {
    if (!a || !b) {
        return false;
    }
    while (*a && *b) {
        if (bmLower(*a++) != bmLower(*b++)) {
            return false;
        }
    }
    return *a == '\\0' && *b == '\\0';
}

static void stripLabel(char *text) {
    while (*text == '>' || *text == ' ') {
        memmove(text, text + 1, strlen(text));
    }
    char *edit = strstr(text, "  (edit)");
    if (edit) {
        *edit = '\\0';
    }
}

static char *splitValue(char *text) {
    char *colon = strchr(text, ':');
    if (!colon) {
        return 0;
    }
    *colon = '\\0';
    ++colon;
    while (*colon == ' ') {
        ++colon;
    }
    return colon;
}

${generateAdafruitIconLookup()}

static int batteryPercent(void) {
${generateAdafruitBatteryCode()}
}

static void drawHeader(const char *text, uint8_t flags) {
    ${settings.displayObject}.fillRoundRect(8, 6, 304, 32, 8, bmRgb(23, 31, 43));
    ${settings.displayObject}.drawRoundRect(8, 6, 304, 32, 8, bmRgb(46, 58, 74));
    int16_t tx = 24;
    if (flags & MENU_RENDER_BACK_AVAILABLE) {
        ${settings.displayObject}.drawRoundRect(11, 12, 16, 20, 4, bmRgb(47, 211, 190));
        ${settings.displayObject}.drawLine(22, 16, 17, 22, bmRgb(47, 211, 190));
        ${settings.displayObject}.drawLine(17, 22, 22, 28, bmRgb(47, 211, 190));
        tx = 36;
    } else {
        ${settings.displayObject}.fillRoundRect(11, 13, 5, 18, 2, bmRgb(47, 211, 190));
    }
    char title[MENU_MAX_LINE];
    strncpy(title, text ? text : "", sizeof(title));
    title[sizeof(title) - 1] = '\\0';
    ${settings.displayObject}.setTextWrap(false);
    ${settings.displayObject}.setTextSize(1);
    ${settings.displayObject}.setTextColor(bmRgb(234, 240, 246), bmRgb(23, 31, 43));
    ${settings.displayObject}.setCursor(tx, 15);
    ${settings.displayObject}.print(title);

    ${generateAdafruitHeaderStatusCode(settings.displayObject)}
}

static void drawScrollbar(menu_cursor_t const *cur, menu_render_line_t const *line) {
    if (!cur || !line || line->row != 1) {
        return;
    }
    uint8_t count = menu_runtime_t::menu_count(*cur);
    int total = menu_runtime_t::visible_count(*cur, count);
    if (total <= 5) {
        return;
    }
    int top = menu_runtime_t::raw_to_visible(*cur, count, line->item_index);
    int trackY = 44;
    int trackH = 176;
    int thumbH = trackH * 5 / total;
    if (thumbH < 20) {
        thumbH = 20;
    }
    int denom = total - 5;
    if (denom < 1) {
        denom = 1;
    }
    int thumbY = trackY + (trackH - thumbH) * top / denom;
    ${settings.displayObject}.fillRoundRect(307, trackY, 4, trackH, 2, bmRgb(34, 43, 56));
    ${settings.displayObject}.fillRoundRect(307, thumbY, 4, thumbH, 2, bmRgb(58, 150, 140));
}

static void adafruitClear(void *) {
    ${settings.displayObject}.fillScreen(bmRgb(16, 21, 28));
}

static void adafruitFlush(void *) {
}

static void adafruitRenderLine(void *ctx, menu_render_line_t const *line) {
    if (!line) {
        return;
    }
    menu_runtime_t *runtime = static_cast<menu_runtime_t *>(ctx);
    menu_cursor_t const *cur = (runtime && runtime->depth < MENU_MAX_STACK) ? &runtime->stack[runtime->depth] : 0;
    if (line->kind == MENU_RENDER_TITLE) {
        drawHeader(line->text, line->flags);
        return;
    }
    if (line->kind != MENU_RENDER_ITEM) {
        return;
    }
    drawScrollbar(cur, line);
    uint8_t flags = line->flags;
    bool selected = (flags & MENU_RENDER_SELECTED) != 0;
    bool editing = (flags & MENU_RENDER_EDITING) != 0;
    bool disabled = (flags & MENU_RENDER_DISABLED) != 0;
    bool child = (flags & MENU_RENDER_HAS_CHILD) != 0;
    bool editable = cur ? menu_runtime_t::menu_int_has(*cur, line->item_index) : false;
    int16_t y = 44 + (line->row - 1) * 36;
    int16_t cy = y + 16;
    uint16_t cardBg = selected ? bmRgb(15, 45, 50) : bmRgb(20, 26, 35);
    uint16_t border = selected ? bmRgb(47, 211, 190) : bmRgb(38, 48, 62);
    ${settings.displayObject}.fillRoundRect(8, y, 294, 32, 7, cardBg);
    ${settings.displayObject}.drawRoundRect(8, y, 294, 32, 7, border);
    if (selected) {
        ${settings.displayObject}.fillRoundRect(11, y + 4, 4, 24, 1, bmRgb(47, 211, 190));
    }
    char label[MENU_MAX_LINE];
    strncpy(label, line->text ? line->text : "", sizeof(label));
    label[sizeof(label) - 1] = '\\0';
    stripLabel(label);
    char *value = splitValue(label);
    bool alert = bmEq(label, "E-STOP");
    uint16_t iconColor = disabled ? bmRgb(74, 86, 98) : (alert ? bmRgb(240, 122, 110) : (selected ? bmRgb(47, 211, 190) : bmRgb(150, 166, 182)));
    bmDrawIcon(${settings.displayObject}, 17, y + 7, bmIconForLabel(label), iconColor, iconColor);
    ${settings.displayObject}.setTextSize(1);
    ${settings.displayObject}.setTextColor(disabled ? bmRgb(74, 86, 98) : (alert ? bmRgb(240, 122, 110) : bmRgb(234, 240, 246)), cardBg);
    ${settings.displayObject}.setCursor(52, y + 12);
    ${settings.displayObject}.print(label);
    if (editing && value) {
        ${settings.displayObject}.drawRoundRect(196, y + 7, 18, 18, 4, bmRgb(47, 211, 190));
        ${settings.displayObject}.drawLine(201, cy, 209, cy, bmRgb(47, 211, 190));
        ${settings.displayObject}.setTextColor(bmRgb(95, 224, 196), cardBg);
        ${settings.displayObject}.setCursor(226, y + 12);
        ${settings.displayObject}.print(value);
        ${settings.displayObject}.drawRoundRect(284, y + 7, 18, 18, 4, bmRgb(47, 211, 190));
        ${settings.displayObject}.drawLine(289, cy, 297, cy, bmRgb(47, 211, 190));
        ${settings.displayObject}.drawLine(293, cy - 4, 293, cy + 4, bmRgb(47, 211, 190));
    } else if (child) {
        ${settings.displayObject}.drawLine(292, y + 11, 297, y + 16, bmRgb(126, 138, 153));
        ${settings.displayObject}.drawLine(297, y + 16, 292, y + 21, bmRgb(126, 138, 153));
    } else if (value) {
        uint16_t valueColor = disabled ? bmRgb(54, 63, 74) : ((line->entry_type == ENTRY_BOOL || line->entry_type == ENTRY_SELECT) ? bmRgb(232, 197, 122) : (editable ? bmRgb(95, 224, 196) : bmRgb(111, 182, 232)));
        ${settings.displayObject}.setTextColor(valueColor, cardBg);
        int16_t x = 294 - static_cast<int16_t>(strlen(value)) * 6;
        if (x < 190) {
            x = 190;
        }
        ${settings.displayObject}.setCursor(x, y + 12);
        ${settings.displayObject}.print(value);
    }
}

static display_ops_t const ADAFRUIT_DISPLAY_OPS = {
    &adafruitClear,
    0,
    &adafruitFlush,
    &adafruitRenderLine
};

void setup() {
    Serial.begin(115200);
    while (!Serial) {
    }
    ${settings.displayObject}.begin();
    ${settings.displayObject}.setRotation(${settings.rotation});
    ${settings.displayObject}.setTextWrap(false);

    input_source_t input = make_serial_keys_input(serialInput);
    display_t display = make_display(60, 6, &menuRuntime, &ADAFRUIT_DISPLAY_OPS);
    menuRuntime = menu_runtime_t::make(${menuName}, display, input, false);
    menuRuntime.set_show_title(true);
    menuRuntime.set_show_breadcrumbs(true);
    menuRuntime.set_show_affordances(false);${navigationSetupCode("menuRuntime")}
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}

// Profile: ${profile.label}
// Default pin constants are placeholders. Replace them with the board wiring before compiling.
`;
}

function generateTargetPackageFiles(files) {
  const profile = targetProfileById(model.targetSettings.profileId);
  return {
    profile: profile.id,
    profileLabel: profile.label,
    files: {
      "BetterMenuDeclaration.h": generateFirmwareDeclaration(),
      "BetterMenuSerialDemo.ino": generateFirmwareSketch(),
      "BetterMenuStdioDemo.cpp": generateStdioProgram(),
      "bettermenu_wasm.cpp": files.bridge,
      "web-package-manifest.json": generateWebPackageFiles(files.bridge),
      "BetterMenuAdafruitILI9341.ino": files.adafruitSketch,
      "BetterMenuGeneratedAssets.h": files.adafruitAssets
    },
    instructions: profileInstructions(profile)
  };
}

function generateAdafruitIconLookup() {
  const lines = [];
  const seen = new Set();
  for (const item of model.items) {
    const asset = assetForItem(item);
    if (!asset?.encoded || seen.has(`${item.label}:${asset.id}`)) continue;
    seen.add(`${item.label}:${asset.id}`);
    lines.push(`    if (bmEq(label, ${cppString(item.label)})) { return &${assetSymbol(asset)}; }`);
  }
  return `static const BMIconAsset *bmIconForLabel(const char *label) {
${lines.join("\n") || "    (void)label;"}
    return 0;
}`;
}

function generateAdafruitBatteryCode() {
  const widget = model.statusWidgets.find((entry) => entry.type === "battery");
  if (!widget?.sourceSymbol) {
    return "    return 100;";
  }
  return `    long raw = ${widget.sourceSymbol};
    long minValue = ${numberOr(widget.min, 900)};
    long maxValue = ${numberOr(widget.max, 1260)};
    long pct = (raw - minValue) * 100L / (maxValue - minValue);
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    return static_cast<int>(pct);`;
}

function generateAdafruitHeaderStatusCode(displayObject) {
  const chip = model.statusWidgets.find((entry) => entry.type === "chip");
  const battery = model.statusWidgets.find((entry) => entry.type === "battery");
  const lines = [];
  if (battery) {
    lines.push(`    int pct = batteryPercent();
    uint16_t batteryColor = pct > 50 ? bmRgb(86, 216, 168) : (pct > 20 ? bmRgb(232, 182, 92) : bmRgb(240, 122, 110));
    ${displayObject}.drawRoundRect(282, 16, 22, 12, 2, bmRgb(126, 138, 153));
    ${displayObject}.fillRect(305, 19, 2, 6, bmRgb(126, 138, 153));
    ${displayObject}.fillRect(284, 18, (18 * pct) / 100, 8, batteryColor);
    char pctText[8];
    snprintf(pctText, sizeof(pctText), "%d%%", pct);
    ${displayObject}.setTextSize(1);
    ${displayObject}.setTextColor(bmRgb(126, 138, 153), bmRgb(23, 31, 43));
    ${displayObject}.setCursor(252, 18);
    ${displayObject}.print(pctText);`);
  }
  if (chip?.sourceSymbol) {
    lines.push(`    const bool chipOn = ${chip.sourceSymbol};
    const char *chipText = chipOn ? ${cppString(chip.trueLabel || "ARMED")} : ${cppString(chip.falseLabel || "READY")};
    uint16_t chipColor = chipOn ? bmRgb(232, 182, 92) : bmRgb(86, 216, 168);
    uint16_t chipBg = chipOn ? bmRgb(58, 42, 18) : bmRgb(18, 52, 43);
    ${displayObject}.fillRoundRect(200, 15, 42, 14, 7, chipBg);
    ${displayObject}.fillCircle(208, 22, 2, chipColor);
    ${displayObject}.setTextColor(chipColor, chipBg);
    ${displayObject}.setCursor(213, 18);
    ${displayObject}.print(chipText);`);
  }
  return lines.join("\n");
}

function assetSymbol(asset) {
  return `BM_ICON_${safeCppIdentifier(asset.safeName || asset.key || "asset").toUpperCase()}`;
}

function collectDiagnostics() {
  const diagnostics = [];
  const supportSource = `${model.snippets.backing || ""}\n${model.snippets.callbacks || ""}`;
  const profile = targetProfileById(model.targetSettings.profileId);
  const assetKeys = new Set();
  const usedAssetList = usedAssets(model);
  if (model.version !== 2) diagnostics.push("Project model will be migrated to version 2 on save.");
  if (!profile.capabilities.graphical && usedAssetList.length) {
    diagnostics.push(`${profile.label} is a text target; assigned icons and graphical assets are ignored for this output.`);
  }
  for (const asset of model.assets || []) {
    if (!asset.key?.trim()) diagnostics.push(`Asset ${asset.id} needs a key.`);
    if (assetKeys.has(asset.key)) diagnostics.push(`Asset key ${asset.key} is duplicated.`);
    assetKeys.add(asset.key);
    if (!asset.source) diagnostics.push(`Asset ${asset.key || asset.id} has no source data.`);
    if (asset.kind === "svg") {
      try {
        sanitizeSvgSource(asset.source);
      } catch (error) {
        diagnostics.push(`Asset ${asset.key || asset.id} is not export-safe: ${error.message || String(error)}.`);
      }
    }
    if (profile.id === "adafruit-ili9341-320x240-spi" && usedAssetList.includes(asset) && !asset.encoded?.rgb565?.length) {
      diagnostics.push(`Asset ${asset.key || asset.id} is used by the Adafruit target but has not been RGB565 encoded yet.`);
    }
  }
  if (profile.capabilities.statusWidgets === false && model.statusWidgets.length) {
    diagnostics.push(`${profile.label} does not render graphical status widgets.`);
  }
  if (profile.id === "adafruit-ili9341-320x240-spi") {
    if (!model.targetSettings.width || !model.targetSettings.height) diagnostics.push("Adafruit ILI9341 target needs non-zero width and height.");
    if (!model.targetSettings.displayObject?.trim()) diagnostics.push("Adafruit ILI9341 target needs a display object name.");
  }
  const requireCppSymbol = (item, symbol, role) => {
    if (!symbol?.trim()) return;
    if (!isCppIdentifier(symbol)) {
      diagnostics.push(`${item.label || item.id} has an invalid ${role} symbol: ${symbol}.`);
    } else if (!model.generateStubs && !hasSymbol(supportSource, symbol)) {
      diagnostics.push(`${item.label || item.id} references ${role} ${symbol}, but it is not in the support snippets and generated stubs are off.`);
    }
  };
  const requireCtxSymbol = (item) => {
    const ctx = String(item.ctx || "").trim();
    if (!ctx.startsWith("&")) return;
    const symbol = ctx.slice(1);
    if (isCppIdentifier(symbol) && !model.generateStubs && !hasSymbol(supportSource, symbol)) {
      diagnostics.push(`${item.label || item.id} references context ${ctx}, but ${symbol} is not in the support snippets and generated stubs are off.`);
    }
  };
  if (!byId(model.menus, model.rootMenuId)) diagnostics.push("Root menu is missing.");
  for (const menu of model.menus) {
    if (!menu.title?.trim()) diagnostics.push(`Menu ${menu.id} needs a title.`);
    for (const id of menu.itemIds) {
      if (!byId(model.items, id)) diagnostics.push(`Menu ${menu.title || menu.id} references missing item ${id}.`);
    }
  }
  for (const item of model.items) {
    if (!item.label?.trim()) diagnostics.push(`Item ${item.id} needs a label.`);
    if ((item.type === "int" || item.type === "bool" || item.type === "select") && !item.stateSymbol?.trim()) {
      diagnostics.push(`${item.label || item.id} needs a backing symbol.`);
    }
    if (item.type === "int" || item.type === "bool" || item.type === "select") {
      requireCppSymbol(item, item.stateSymbol, "backing");
    }
    if (item.type === "select" && !(item.choices || []).length) diagnostics.push(`${item.label || item.id} needs at least one choice.`);
    if (item.type === "value" && !item.getter?.trim()) diagnostics.push(`${item.label || item.id} needs a getter symbol.`);
    if (item.type === "value") {
      requireCppSymbol(item, item.getter, "getter");
      if (item.setter) requireCppSymbol(item, item.setter, "setter");
      requireCtxSymbol(item);
    }
    if (item.type === "func" && !item.actionSymbol?.trim()) diagnostics.push(`${item.label || item.id} needs a callback symbol.`);
    if (item.type === "func") {
      requireCppSymbol(item, item.actionSymbol, "callback");
    }
    if (item.type === "menu" && !byId(model.menus, item.childMenuId)) diagnostics.push(`${item.label || item.id} needs an existing child menu.`);
    if (item.iconAssetId && !byId(model.assets, item.iconAssetId)) diagnostics.push(`${item.label || item.id} references a missing icon asset.`);
    for (const [key] of decoratorTypes) {
      const dec = item.decorators?.[key];
      if (dec?.enabled && !dec.symbol?.trim()) diagnostics.push(`${item.label || item.id} enables ${key} without a symbol.`);
      if (dec?.enabled) {
        requireCppSymbol(item, dec.symbol, key);
      }
      if (dec?.enabled && String(dec.ctx || "").trim().startsWith("&")) {
        const symbol = String(dec.ctx).trim().slice(1);
        if (isCppIdentifier(symbol) && !model.generateStubs && !hasSymbol(supportSource, symbol)) {
          diagnostics.push(`${item.label || item.id} ${key} decorator references context ${dec.ctx}, but ${symbol} is not in the support snippets and generated stubs are off.`);
        }
      }
    }
  }
  return diagnostics;
}

function previewValueText(item) {
  if (!item) return "";
  const editing = preview.editingItemId === item.id;
  if (item.type === "menu") return ">";
  if (item.type === "func") return preview.lastAction === item.label ? "called" : "";
  if (item.type === "bool") return preview.values[item.stateSymbol] ? item.trueLabel || "On" : item.falseLabel || "Off";
  if (item.type === "select") {
    const value = preview.values[item.stateSymbol];
    const choice = (item.choices || []).find((entry) => Number(entry.value) === Number(value)) || item.choices?.[0];
    return choice?.label || "";
  }
  const value = item.type === "value" ? preview.values[symbolFromCtx(item.ctx)] : preview.values[item.stateSymbol];
  const formatted = formatPreviewValue(item, numberOr(value, 0));
  return editing ? `${formatted} (edit)` : formatted;
}

function formatPreviewValue(item, value) {
  const symbol = item.decorators?.format?.enabled ? item.decorators.format.symbol : "";
  if (symbol === "formatPercent") return `${value}%`;
  if (symbol === "formatMilli2") return `${(value / 1000).toFixed(2)}`;
  if (symbol === "formatTrim" || symbol === "formatPitch") return `${value < 0 ? "-" : "+"}${(Math.abs(value) / 10).toFixed(1)} deg`;
  if (symbol === "formatHeading") return `${value} deg`;
  if (symbol === "formatVolts") return `${(value / 100).toFixed(2)} V`;
  if (symbol === "formatMm") return `${value} mm`;
  if (symbol === "formatTempC") return `${value} C`;
  if (symbol === "formatHz") return `${value} Hz`;
  if (symbol === "formatFirmware") return "v0.5.4";
  if (symbol === "formatUptime") return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`;
  return String(value);
}

function previewChoice(choice) {
  const menuId = currentPreviewMenuId();
  const rows = visibleItemsForMenu(menuId);
  if (!rows.length) return;
  const selected = previewSelectedFor(menuId, rows.length);
  const item = rows[selected];
  if (preview.editingItemId) {
    if (choice === Choice.Up || choice === Choice.Right) {
      if (item) adjustPreviewValue(item, 1);
    } else if (choice === Choice.Down || choice === Choice.Left) {
      if (item) adjustPreviewValue(item, -1);
    } else if (choice === Choice.Select) {
      commitPreviewEdit();
    } else if (choice === Choice.Cancel) {
      cancelPreviewEdit();
    }
    renderPreview();
    return;
  }
  if (choice === Choice.Up) {
    const next = model.targetSettings.navigationWrap ? (selected + rows.length - 1) % rows.length : Math.max(0, selected - 1);
    setPreviewSelected(menuId, next, rows.length);
  } else if (choice === Choice.Down) {
    const next = model.targetSettings.navigationWrap ? (selected + 1) % rows.length : Math.min(rows.length - 1, selected + 1);
    setPreviewSelected(menuId, next, rows.length);
  } else if (choice === Choice.Cancel) {
    if (preview.stack.length > 1) preview.stack.pop();
  } else if (choice === Choice.Left) {
    if (preview.stack.length > 1) preview.stack.pop();
  } else if (choice === Choice.Right) {
    if (item) activatePreviewItem(item);
  } else if (choice === Choice.Select) {
    if (item) activatePreviewItem(item);
  }
  renderPreview();
}

function activatePreviewItem(item) {
  if (isDisabled(item)) return;
  if (item.type === "menu" && item.childMenuId) {
    preview.stack.push(item.childMenuId);
    setPreviewSelected(item.childMenuId, preview.selectedByMenu?.[item.childMenuId] ?? 0, visibleItemsForMenu(item.childMenuId).length);
  } else if (item.type === "bool") {
    preview.values[item.stateSymbol] = !preview.values[item.stateSymbol];
    preview.lastAction = `${item.label} changed`;
  } else if (item.type === "select") {
    cyclePreviewSelect(item);
    preview.lastAction = `${item.label} changed`;
  } else if (item.type === "int" || (item.type === "value" && item.setter)) {
    beginPreviewEdit(item);
  } else if (item.type === "value") {
    clearPreviewEdit();
  } else if (item.type === "func") {
    preview.lastAction = item.label || "Function called";
  }
}

function beginPreviewEdit(item) {
  const key = previewValueKey(item);
  if (!key) return;
  const min = numberOr(item.min, -2147483648);
  const max = numberOr(item.max, 2147483647);
  const current = clamp(numberOr(preview.values[key], 0), Math.min(min, max), Math.max(min, max));
  preview.values[key] = current;
  preview.editingItemId = item.id;
  preview.editingOriginal = { key, value: current };
}

function commitPreviewEdit() {
  clearPreviewEdit();
}

function cancelPreviewEdit() {
  if (preview.editingOriginal?.key) {
    preview.values[preview.editingOriginal.key] = preview.editingOriginal.value;
  }
  clearPreviewEdit();
}

function clearPreviewEdit() {
  preview.editingItemId = "";
  preview.editingOriginal = null;
}

function cyclePreviewSelect(item) {
  const choices = item.choices || [];
  if (!choices.length) return;
  const current = preview.values[item.stateSymbol];
  const index = Math.max(0, choices.findIndex((choice) => Number(choice.value) === Number(current)));
  preview.values[item.stateSymbol] = Number(choices[(index + 1) % choices.length].value);
}

function adjustPreviewValue(item, direction) {
  const key = previewValueKey(item);
  if (!key) return;
  const step = numberOr(item.step, 1);
  const min = numberOr(item.min, -2147483648);
  const max = numberOr(item.max, 2147483647);
  const next = clamp(numberOr(preview.values[key], 0) + direction * step, min, max);
  preview.values[key] = next;
  preview.lastAction = `${item.label} changed`;
}

function previewValueKey(item) {
  return item?.type === "value" ? symbolFromCtx(item.ctx) : item?.stateSymbol;
}

function isHidden(item) {
  const dec = item.decorators?.hidden;
  if (!dec?.enabled) return false;
  return evaluatePredicate(dec.symbol, dec.ctx);
}

function isDisabled(item) {
  const dec = item.decorators?.disabled;
  if (!dec?.enabled) return false;
  return evaluatePredicate(dec.symbol, dec.ctx);
}

function evaluatePredicate(symbol) {
  if (symbol === "telemetryRateDisabled") return !preview.values.telemetryStream;
  if (symbol === "devToolsHidden") return Number(preview.values.themeSel) !== 2;
  if (/always/i.test(symbol)) return true;
  return false;
}

function menuPathTitle() {
  return preview.stack.map((id) => byId(model.menus, id)?.title || id).join(" / ");
}

function typeLabel(type) {
  return itemTypes.find(([value]) => value === type)?.[1] || type;
}

function decoratorSummary(item) {
  const active = decoratorTypes.filter(([key]) => item.decorators?.[key]?.enabled).map(([, macro]) => macro);
  return active.length ? ` · ${active.join(", ")}` : "";
}

function hasSymbol(source, symbol) {
  return new RegExp(`\\b${escapeRegExp(symbol)}\\b`).test(source);
}

function requiredSymbol(symbol, fallback) {
  return String(symbol || fallback).trim() || fallback;
}

function isCppIdentifier(symbol) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(symbol || ""));
}

function safeCppIdentifier(input, suffix = "") {
  const raw = `${input || "menu"}${suffix}`.replace(/[^A-Za-z0-9_]/g, "_").replace(/^([^A-Za-z_])/, "_$1");
  return raw.replace(/_+/g, "_");
}

function cppString(value) {
  return `"${String(value || "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n")}"`;
}

function indent(depth) {
  return "    ".repeat(depth);
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function choicesToText(choices) {
  return (choices || []).map((choice) => `${choice.label}=${choice.value}`).join("\n");
}

function textToChoices(value) {
  return String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const parts = line.split("=");
    if (parts.length === 1) return { label: parts[0].trim(), value: index };
    return { label: parts.slice(0, -1).join("=").trim(), value: numberOr(parts[parts.length - 1].trim(), index) };
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeTextarea(value) {
  return escapeHtml(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function outputFilename() {
  const map = {
    firmwareDeclaration: "BetterMenuDeclaration.h",
    firmwareSketch: "BetterMenuSerialDemo.ino",
    stdioProgram: "BetterMenuStdioDemo.cpp",
    wasmBridgeCpp: "bettermenu_wasm.cpp",
    webPackageFiles: "web-package-manifest.json",
    adafruitSketch: "BetterMenuAdafruitILI9341.ino",
    adafruitAssets: "BetterMenuGeneratedAssets.h",
    targetPackageFiles: "target-package-manifest.json",
    diagnostics: "diagnostics.txt"
  };
  return map[els.outputSelect.value] || "bettermenu-output.txt";
}

function activeOutputText() {
  return els.outputCode.textContent || "";
}

function updateSelectedItem(prop, value) {
  const item = selectedItem();
  if (!item) return;
  if (prop === "type") {
    item.type = value;
    applyTypeDefaults(item);
  } else if (prop === "choices") {
    item.choices = textToChoices(value);
  } else if (prop === "initial" && item.type === "bool") {
    item.initial = Boolean(value);
  } else if (["min", "max", "step", "initial"].includes(prop)) {
    item[prop] = numberOr(value, item[prop] || 0);
  } else if (prop === "iconAssetId") {
    item.iconAssetId = value;
    const asset = byId(model.assets, value);
    if (asset) item.icon = asset.key;
  } else if (prop === "childTitle") {
    const child = byId(model.menus, item.childMenuId);
    if (child) child.title = value;
  } else {
    item[prop] = value;
  }
  if (prop === "label" && item.type === "menu") {
    const child = byId(model.menus, item.childMenuId);
    if (child && !child.title) child.title = value;
  }
  preview = createPreviewState(model);
}

function applyTypeDefaults(item) {
  if (!item.decorators) item.decorators = emptyDecorators();
  if (item.type === "int") {
    item.stateSymbol ||= safeCppIdentifier(item.label || "value");
    item.min ??= 0;
    item.max ??= 100;
    item.step ??= 1;
    item.initial ??= 0;
  } else if (item.type === "bool") {
    item.stateSymbol ||= safeCppIdentifier(item.label || "flag");
    item.falseLabel ||= "Off";
    item.trueLabel ||= "On";
    item.initial = Boolean(item.initial);
  } else if (item.type === "select") {
    item.stateSymbol ||= safeCppIdentifier(item.label || "choice");
    item.choices ||= [{ label: "First", value: 0 }, { label: "Second", value: 1 }];
    item.initial ??= item.choices[0]?.value || 0;
  } else if (item.type === "value") {
    item.getter ||= "getInt";
    item.ctx ||= "0";
    item.min ??= 0;
    item.max ??= 100;
    item.step ??= 1;
  } else if (item.type === "func") {
    item.actionSymbol ||= "action";
  } else if (item.type === "menu") {
    if (!item.childMenuId || !byId(model.menus, item.childMenuId)) {
      const child = { id: newId("menu"), title: item.label || "Submenu", itemIds: [] };
      model.menus.push(child);
      item.childMenuId = child.id;
    }
  }
}

function addItem() {
  const menu = currentMenu();
  if (!menu) return;
  const item = intItem(newId("item"), "New item", "newValue", 0, 100, 1, 0, "", "Generated menu row.");
  model.items.push(item);
  menu.itemIds.push(item.id);
  selectedItemId = item.id;
  renderAll();
}

function deleteSelectedItem() {
  const item = selectedItem();
  if (!item) return;
  model.items = model.items.filter((entry) => entry.id !== item.id);
  model.menus.forEach((menu) => {
    menu.itemIds = menu.itemIds.filter((id) => id !== item.id);
  });
  selectedItemId = currentMenu()?.itemIds[0] || "";
  renderAll();
}

function moveItem(itemId, direction) {
  const menu = currentMenu();
  const index = menu?.itemIds.indexOf(itemId) ?? -1;
  const nextIndex = index + (direction === "up" ? -1 : 1);
  if (!menu || index < 0 || nextIndex < 0 || nextIndex >= menu.itemIds.length) return;
  const [item] = menu.itemIds.splice(index, 1);
  menu.itemIds.splice(nextIndex, 0, item);
  selectedItemId = itemId;
  renderAll();
}

async function addSvgAssetFromSource(source, keyValue) {
  const key = keyValue || els.assetKey.value || `icon_${model.assets.length + 1}`;
  const asset = makeSvgAsset(key, sanitizeSvgSource(source).source, "rowIcon");
  asset.id = uniqueAssetId(asset.id);
  asset.settings.size = numberOr(els.assetSize.value, 18);
  await encodeAssetForRgb565(asset, asset.settings.size);
  model.assets.push(asset);
  els.assetSvgSource.value = "";
  els.assetKey.value = "";
  renderAll();
}

async function addRasterAssetFromFiles() {
  const [imageFile] = els.assetRasterFile.files || [];
  if (!imageFile) return;
  const [maskFile] = els.assetMaskFile.files || [];
  const key = els.assetKey.value || imageFile.name.replace(/\.[^.]+$/, "") || `image_${model.assets.length + 1}`;
  const source = await fileToDataUrl(imageFile);
  const maskSource = maskFile ? await fileToDataUrl(maskFile) : "";
  const asset = {
    id: uniqueAssetId(`asset_${safeAssetName(key)}`),
    key,
    kind: maskSource ? "rasterMask" : "raster",
    source,
    maskSource,
    width: 0,
    height: 0,
    safeName: safeAssetName(key),
    usage: "rowIcon",
    settings: {
      size: numberOr(els.assetSize.value, 18),
      threshold: 1,
      invertMask: false,
      fit: "contain",
      colorDepth: "rgb565"
    },
    encoded: null
  };
  await encodeAssetForRgb565(asset, asset.settings.size);
  model.assets.push(asset);
  els.assetRasterFile.value = "";
  els.assetMaskFile.value = "";
  els.assetKey.value = "";
  renderAll();
}

async function loadRoverAssets() {
  const existing = new Set(model.assets.map((asset) => asset.key));
  const additions = defaultRoverAssets().filter((asset) => !existing.has(asset.key));
  for (const asset of additions) {
    asset.id = uniqueAssetId(asset.id);
    await encodeAssetForRgb565(asset, asset.settings.size);
    model.assets.push(asset);
  }
  for (const item of model.items) {
    if (!item.iconAssetId && item.icon) {
      item.iconAssetId = assetIdForIconKey(model.assets, item.icon);
    }
  }
  renderAll();
}

function deleteAsset(assetId) {
  model.assets = model.assets.filter((asset) => asset.id !== assetId);
  for (const item of model.items) {
    if (item.iconAssetId === assetId) item.iconAssetId = "";
  }
  model.statusWidgets.forEach((widget) => {
    if (widget.assetId === assetId) widget.assetId = "";
  });
  renderAll();
}

function uniqueAssetId(baseId) {
  let id = baseId || `asset_${Date.now().toString(36)}`;
  let suffix = 2;
  while (byId(model.assets, id)) {
    id = `${baseId}_${suffix++}`;
  }
  return id;
}

function updateTargetSetting(prop, value) {
  if (["width", "height", "rotation"].includes(prop)) {
    model.targetSettings[prop] = numberOr(value, 0);
  } else {
    model.targetSettings[prop] = value;
  }
  model.targetSettings = normalizeTargetSettings(model.targetSettings);
  model.previewSettings.skinId = model.targetSettings.skinId;
  renderAll();
}

function adjustPreviewZoom(direction) {
  const current = clamp(numberOr(model.previewSettings.zoom, 1), 0.75, 2);
  model.previewSettings.zoom = clamp(Math.round((current + direction * 0.25) * 100) / 100, 0.75, 2);
  renderPreview();
  saveModel();
}

function newId(prefix) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

function installEventHandlers() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab;
      renderAll();
    });
  });

  els.projectName.addEventListener("input", () => {
    model.projectName = els.projectName.value;
    renderOutput();
    saveModel();
  });
  els.rootTitle.addEventListener("input", () => {
    const root = byId(model.menus, model.rootMenuId);
    if (root) root.title = els.rootTitle.value;
    renderPreview();
    renderOutput();
    saveModel();
  });
  els.menuSelect.addEventListener("change", () => {
    selectedMenuId = els.menuSelect.value;
    selectedItemId = currentMenu()?.itemIds[0] || "";
    renderAll();
  });
  els.itemList.addEventListener("click", (event) => {
    const moveButton = event.target.closest("[data-move]");
    if (moveButton) {
      moveItem(moveButton.dataset.itemId, moveButton.dataset.move);
      return;
    }
    const picker = event.target.closest("[data-item-id]");
    if (picker) {
      selectedItemId = picker.dataset.itemId;
      renderAll();
    }
  });
  els.itemEditor.addEventListener("input", handleEditorInput);
  els.itemEditor.addEventListener("change", handleEditorInput);
  els.addItem.addEventListener("click", addItem);
  els.deleteItem.addEventListener("click", deleteSelectedItem);
  els.assetList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-asset]");
    if (deleteButton) deleteAsset(deleteButton.dataset.deleteAsset);
  });
  els.addSvgAsset.addEventListener("click", () => {
    addSvgAssetFromSource(els.assetSvgSource.value).catch(showAssetError);
  });
  els.assetSvgFile.addEventListener("change", async () => {
    const [file] = els.assetSvgFile.files || [];
    if (!file) return;
    try {
      await addSvgAssetFromSource(await file.text(), els.assetKey.value || file.name.replace(/\.[^.]+$/, ""));
    } catch (error) {
      showAssetError(error);
    } finally {
      els.assetSvgFile.value = "";
    }
  });
  els.addRasterAsset.addEventListener("click", () => {
    addRasterAssetFromFiles().catch(showAssetError);
  });
  els.loadRoverAssets.addEventListener("click", () => {
    loadRoverAssets().catch(showAssetError);
  });
  els.targetProfile.addEventListener("change", () => {
    model.targetSettings = defaultTargetSettings(els.targetProfile.value);
    model.previewSettings.skinId = model.targetSettings.skinId;
    renderAll();
  });
  els.targetSkin.addEventListener("change", () => updateTargetSetting("skinId", els.targetSkin.value));
  document.querySelectorAll("[data-target-prop]").forEach((field) => {
    const readValue = () => field.type === "checkbox" ? field.checked : field.value;
    field.addEventListener("input", () => updateTargetSetting(field.dataset.targetProp, readValue()));
    field.addEventListener("change", () => updateTargetSetting(field.dataset.targetProp, readValue()));
  });
  document.querySelectorAll("[data-target-pin]").forEach((field) => {
    field.addEventListener("input", () => {
      model.targetSettings.pins[field.dataset.targetPin] = field.value;
      model.targetSettings = normalizeTargetSettings(model.targetSettings);
      renderAll();
    });
  });
  els.generateStubs.addEventListener("change", () => {
    model.generateStubs = els.generateStubs.checked;
    renderOutput();
    saveModel();
  });
  els.backingSnippet.addEventListener("input", () => {
    model.snippets.backing = els.backingSnippet.value;
    renderOutput();
    saveModel();
  });
  els.callbackSnippet.addEventListener("input", () => {
    model.snippets.callbacks = els.callbackSnippet.value;
    renderOutput();
    saveModel();
  });
  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      previewChoice(Number(button.dataset.choice));
    });
  });
  els.previewZoomOut.addEventListener("click", () => adjustPreviewZoom(-1));
  els.previewZoomIn.addEventListener("click", () => adjustPreviewZoom(1));
  els.previewMenu.addEventListener("click", (event) => {
    const row = event.target.closest("[data-preview-index]");
    if (!row) return;
    setPreviewSelected(currentPreviewMenuId(), Number(row.dataset.previewIndex), visibleItemsForMenu(currentPreviewMenuId()).length);
    previewChoice(Choice.Select);
  });
  els.outputSelect.addEventListener("change", renderOutput);
  els.copyOutput.addEventListener("click", () => {
    navigator.clipboard.writeText(activeOutputText()).catch(() => {});
  });
  els.downloadOutput.addEventListener("click", () => {
    downloadText(outputFilename(), activeOutputText());
  });
  els.saveJson.addEventListener("click", () => {
    downloadText(`${safeCppIdentifier(model.projectName || "bettermenu", "Project")}.json`, JSON.stringify(model, null, 2));
  });
  els.loadJson.addEventListener("change", importJson);
  els.loadSample.addEventListener("click", async () => {
    model = roverConsoleModel();
    await prepareModelAssets();
    selectedMenuId = model.rootMenuId;
    selectedItemId = byId(model.menus, selectedMenuId)?.itemIds[0] || "";
    preview = createPreviewState(model);
    renderAll();
  });
  els.clearModel.addEventListener("click", () => {
    model = defaultModel();
    selectedMenuId = model.rootMenuId;
    selectedItemId = byId(model.menus, selectedMenuId)?.itemIds[0] || "";
    preview = createPreviewState(model);
    renderAll();
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
    if (keymap[event.key] && activeTab === "preview") {
      event.preventDefault();
      previewChoice(keymap[event.key]);
    }
  });
}

function showAssetError(error) {
  const message = error?.message || String(error);
  els.assetSvgSource.value = `Asset import failed: ${message}`;
}

function handleEditorInput(event) {
  const target = event.target;
  const item = selectedItem();
  if (!item) return;
  let needsFullRender = false;
  if (target.dataset.decorator) {
    const key = target.dataset.decorator;
    const prop = target.dataset.decoratorProp;
    item.decorators[key][prop] = prop === "enabled" ? target.checked : target.value;
    preview = createPreviewState(model);
    renderLiveSections();
    return;
  }
  const prop = target.dataset.prop;
  if (!prop) return;
  const value = target.type === "checkbox" ? target.checked : target.value;
  needsFullRender = prop === "type" || prop === "childMenuId";
  updateSelectedItem(prop, value);
  if (needsFullRender) {
    renderAll();
  } else {
    renderLiveSections();
  }
}

function renderLiveSections() {
  const item = selectedItem();
  els.editorTitle.textContent = item?.label || "Item settings";
  renderMenuSelect();
  renderItemList();
  renderPreview();
  renderOutput();
  renderInstructions();
  saveModel();
}

async function importJson(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    model = normalizeModel(JSON.parse(await file.text()));
    await prepareModelAssets();
    selectedMenuId = model.rootMenuId;
    selectedItemId = byId(model.menus, selectedMenuId)?.itemIds[0] || "";
    preview = createPreviewState(model);
    renderAll();
  } finally {
    event.target.value = "";
  }
}

async function initApp() {
  await prepareModelAssets();
  installEventHandlers();
  selectedMenuId = byId(model.menus, selectedMenuId)?.id || model.rootMenuId;
  selectedItemId = byId(model.menus, selectedMenuId)?.itemIds[0] || "";
  renderAll();
}

initApp().catch((error) => {
  document.body.textContent = error.message || String(error);
});
