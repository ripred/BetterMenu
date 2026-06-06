import { defaultRoverAssets } from "../asset_utils.mjs";
import { defaultTargetSettings } from "../target_profiles.mjs";

export function roverConsoleModel() {
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
    appendText(out, cap, pos, "v0.5.5");
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
