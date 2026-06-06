const storageKey = "bettermenu.menuBuilder.project.v2";

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
  previewMenu: document.querySelector("#preview-menu"),
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
  instructions: document.querySelector("#instructions")
};

let selectedMenuId = "root";
let selectedItemId = "";
let activeTab = "builder";
let model = loadModel();
let idCounter = 0;
let preview = createPreviewState(model);

function defaultModel() {
  return {
    version: 1,
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
    content: {}
  };
}

function roverConsoleModel() {
  return {
    version: 1,
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
      selectItem("drive", "Drive mode", "driveMode", [["Idle", 0], ["Manual", 1], ["Auto", 2], ["Follow", 3]], 1, "compass", "A fixed-choice select row for rover operating mode."),
      intItem("maxSpeed", "Max speed", "maxSpeedPct", 0, 100, 5, 65, "speed", "An editable integer row formatted as a percentage.", formatDec("formatPercent", "&maxSpeedPct")),
      boolItem("headlights", "Headlights", "headlights", "Off", "On", false, "beam", "A boolean row rendered through BetterMenu value labels."),
      valueItem("pitchTrim", "Pitch trim", "getInt", "setInt", "&pitchTrimTenth", -50, 50, 1, "level", "A mutable getter/setter value row with a signed degree formatter.", formatDec("formatTrim", "&pitchTrimTenth")),
      menuItem("pidMenu", "PID tuning", "pid", "sliders", "A child menu with mutable PID gains and a save action."),
      menuItem("sensorsMenu", "Sensors", "sensors", "radar", "A child menu of read-only telemetry values."),
      boolItem("telemetry", "Telemetry", "telemetryStream", "Quiet", "Stream", false, "broadcast", "A boolean row with an on-change callback.", onChangeDec("onChanged", "0")),
      intItem("telemetryRate", "Telemetry rate", "telemetryHz", 1, 50, 1, 5, "clock", "A disabled row until telemetry streaming is enabled.", mergeDecorators(formatDec("formatHz", "&telemetryHz"), disabledDec("telemetryRateDisabled", "0"))),
      funcItem("calibrate", "Calibrate IMU", "action", "crosshair", "A function row that forwards selection to firmware code."),
      boolItem("armed", "Arm motors", "armed", "Safe", "Armed", false, "shield", "A boolean row using custom labels.", onChangeDec("onChanged", "0")),
      funcItem("estop", "E-STOP", "action", "stop", "A high-priority function row carried through the same action path."),
      menuItem("systemMenu", "System", "system", "gear", "Display preferences and system metadata."),
      valueItem("kp", "Kp", "getInt", "setInt", "&kpMilli", 0, 5000, 10, "slider", "A mutable fixed-point value row.", formatDec("formatMilli2", "&kpMilli")),
      valueItem("ki", "Ki", "getInt", "setInt", "&kiMilli", 0, 5000, 10, "slider", "A mutable fixed-point value row.", formatDec("formatMilli2", "&kiMilli")),
      valueItem("kd", "Kd", "getInt", "setInt", "&kdMilli", 0, 5000, 10, "slider", "A mutable fixed-point value row.", formatDec("formatMilli2", "&kdMilli")),
      intItem("loopRate", "Loop rate", "loopRateHz", 50, 400, 10, 200, "clock", "A standard integer row inside the PID submenu."),
      funcItem("saveTune", "Save tune", "action", "save", "A function row for persisting PID values."),
      valueItem("pitch", "Pitch", "getInt", "", "&pitchTenth", 0, 0, 1, "level", "A read-only value formatted as signed tenths of a degree.", formatDec("formatPitch", "&pitchTenth")),
      valueItem("heading", "Heading", "getInt", "", "&headingDeg", 0, 0, 1, "compass", "A read-only heading value.", formatDec("formatHeading", "&headingDeg")),
      valueItem("battery", "Battery", "getInt", "", "&battCentiV", 0, 0, 1, "battery", "A read-only centivolt value formatted as volts.", formatDec("formatVolts", "&battCentiV")),
      valueItem("range", "Range", "getInt", "", "&rangeMm", 0, 0, 1, "radar", "A read-only distance value.", formatDec("formatMm", "&rangeMm")),
      valueItem("cellTemp", "Cell temp", "getInt", "", "&cellTempC", 0, 0, 1, "thermo", "A read-only temperature value.", formatDec("formatTempC", "&cellTempC")),
      intItem("brightness", "Brightness", "brightnessPct", 10, 100, 10, 80, "sun", "A display brightness integer row."),
      selectItem("theme", "Theme", "themeSel", [["Aurora", 0], ["Slate", 1], ["Mono", 2]], 0, "swatch", "A select row that also controls the hidden Dev tools row."),
      boolItem("screenFlip", "Screen flip", "screenFlip", "Off", "On", false, "flip", "A boolean display orientation row."),
      funcItem("devTools", "Dev tools", "action", "tool", "A hidden row that appears only for the Mono theme.", hiddenDec("devToolsHidden", "0")),
      valueItem("firmware", "Firmware", "getInt", "", "&uptimeMin", 0, 0, 1, "chip", "A formatted read-only value.", formatDec("formatFirmware", "0")),
      valueItem("uptime", "Uptime", "getInt", "", "&uptimeMin", 0, 0, 1, "clock", "A formatted runtime value.", formatDec("formatUptime", "&uptimeMin"))
    ],
    snippets: {
      backing: defaultBackingSnippet(),
      callbacks: defaultCallbackSnippet()
    },
    icons: {},
    content: {}
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

function emptyDecorators() {
  return {
    format: { enabled: false, symbol: "", ctx: "0" },
    disabled: { enabled: false, symbol: "", ctx: "0" },
    hidden: { enabled: false, symbol: "", ctx: "0" },
    onChange: { enabled: false, symbol: "", ctx: "0" }
  };
}

function formatDec(symbol, ctx) {
  return mergeDecorators({ format: { enabled: true, symbol, ctx } });
}

function disabledDec(symbol, ctx) {
  return mergeDecorators({ disabled: { enabled: true, symbol, ctx } });
}

function hiddenDec(symbol, ctx) {
  return mergeDecorators({ hidden: { enabled: true, symbol, ctx } });
}

function onChangeDec(symbol, ctx) {
  return mergeDecorators({ onChange: { enabled: true, symbol, ctx } });
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
    appendText(out, cap, pos, "v0.5.3");
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
    content: input?.content || {}
  };
  normalized.items = normalized.items.map((item) => ({
    ...item,
    decorators: mergeDecorators(item.decorators || {})
  }));
  if (!normalized.menus.some((menu) => menu.id === normalized.rootMenuId)) {
    normalized.rootMenuId = normalized.menus[0]?.id || "root";
  }
  return normalized;
}

function saveModel() {
  localStorage.setItem(storageKey, JSON.stringify(model));
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
    editingItemId: "",
    lastAction: "",
    values
  };
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
  const menuId = preview.stack[preview.stack.length - 1] || model.rootMenuId;
  const menu = byId(model.menus, menuId);
  const rows = visibleItemsForMenu(menuId);
  preview.selected = clamp(preview.selected, 0, Math.max(0, rows.length - 1));
  els.previewMenu.textContent = "";

  const header = document.createElement("div");
  header.className = "preview-header";
  header.innerHTML = `<strong>${escapeHtml(menuPathTitle())}</strong><span>${rows.length} rows</span>`;
  els.previewMenu.append(header);

  rows.forEach((item, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `preview-row ${item.type}`;
    row.dataset.previewIndex = String(index);
    if (index === preview.selected) row.classList.add("selected");
    if (isDisabled(item)) row.classList.add("disabled");
    if (item.type === "bool" || item.type === "select") row.classList.add("choice");
    const value = previewValueText(item);
    row.innerHTML = `<span><strong>${escapeHtml(item.label || "(untitled)")}</strong><span class="meta">${typeLabel(item.type)}${item.icon ? ` · ${escapeHtml(item.icon)}` : ""}</span></span><span class="value">${escapeHtml(value)}</span>`;
    els.previewMenu.append(row);
  });

  renderPreviewDetails(rows[preview.selected]);
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
        <li>Move generated backing variables and callbacks into normal sketch files when replacing stubs with real application logic.</li>
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
  return {
    firmwareDeclaration: declaration,
    firmwareSketch: sketch,
    stdioProgram: stdio,
    wasmBridgeCpp: bridge,
    webPackageFiles: JSON.stringify(generateWebPackageFiles(bridge), null, 2),
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
    runtime.set_show_breadcrumbs(true);
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
    runtime.set_show_breadcrumbs(true);
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
    runtime.set_show_affordances(false);
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
  return {
    files: {
      "bettermenu_wasm.cpp": bridgeSource,
      "BetterMenu.h": "Copy the current repository BetterMenu.h beside bettermenu_wasm.cpp before compiling.",
      "index.html": generatedWebIndex(),
      "demo.js": generatedWebDemoJs(),
      "styles.css": generatedWebCss()
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
  return `const menu = document.querySelector("#menu");
let wasm;
let memory;

function readCString(ptr) {
  const bytes = new Uint8Array(memory.buffer);
  let end = ptr;
  while (bytes[end] !== 0) end += 1;
  return new TextDecoder().decode(bytes.subarray(ptr, end));
}

function render() {
  menu.textContent = "";
  for (let i = 0; i < wasm.bm_row_count(); i += 1) {
    const row = document.createElement("button");
    row.type = "button";
    row.textContent = readCString(wasm.bm_row_text_ptr(i));
    if (wasm.bm_row_flags(i) & 1) row.classList.add("selected");
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

.selected {
  border-color: #7fc7c0;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}`;
}

function collectDiagnostics() {
  const diagnostics = [];
  const supportSource = `${model.snippets.backing || ""}\n${model.snippets.callbacks || ""}`;
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
  if (isDisabled(item)) return "disabled";
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
  if (symbol === "formatFirmware") return "v0.5.3";
  if (symbol === "formatUptime") return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`;
  return String(value);
}

function previewChoice(choice) {
  const rows = visibleItemsForMenu(preview.stack[preview.stack.length - 1]);
  if (!rows.length) return;
  const item = rows[preview.selected];
  if (choice === Choice.Up) {
    preview.selected = (preview.selected + rows.length - 1) % rows.length;
    preview.editingItemId = "";
  } else if (choice === Choice.Down) {
    preview.selected = (preview.selected + 1) % rows.length;
    preview.editingItemId = "";
  } else if (choice === Choice.Cancel) {
    if (preview.editingItemId) preview.editingItemId = "";
    else if (preview.stack.length > 1) preview.stack.pop();
    preview.selected = 0;
  } else if (choice === Choice.Left) {
    if (preview.editingItemId && item) adjustPreviewValue(item, -1);
    else if (preview.stack.length > 1) preview.stack.pop();
  } else if (choice === Choice.Right) {
    if (item) activatePreviewItem(item, true);
  } else if (choice === Choice.Select) {
    if (item) activatePreviewItem(item, false);
  }
  renderPreview();
}

function activatePreviewItem(item, rightPressed) {
  if (isDisabled(item)) return;
  if (item.type === "menu" && item.childMenuId) {
    preview.stack.push(item.childMenuId);
    preview.selected = 0;
    preview.editingItemId = "";
  } else if (item.type === "bool") {
    preview.values[item.stateSymbol] = !preview.values[item.stateSymbol];
    preview.lastAction = `${item.label} changed`;
  } else if (item.type === "select") {
    cyclePreviewSelect(item);
    preview.lastAction = `${item.label} changed`;
  } else if (item.type === "int" || item.type === "value") {
    if (preview.editingItemId === item.id || rightPressed) {
      preview.editingItemId = item.id;
      adjustPreviewValue(item, 1);
    } else {
      preview.editingItemId = item.id;
    }
  } else if (item.type === "func") {
    preview.lastAction = item.label || "Function called";
  }
}

function cyclePreviewSelect(item) {
  const choices = item.choices || [];
  if (!choices.length) return;
  const current = preview.values[item.stateSymbol];
  const index = Math.max(0, choices.findIndex((choice) => Number(choice.value) === Number(current)));
  preview.values[item.stateSymbol] = Number(choices[(index + 1) % choices.length].value);
}

function adjustPreviewValue(item, direction) {
  const key = item.type === "value" ? symbolFromCtx(item.ctx) : item.stateSymbol;
  if (!key) return;
  const step = numberOr(item.step, 1);
  const min = numberOr(item.min, -2147483648);
  const max = numberOr(item.max, 2147483647);
  const next = clamp(numberOr(preview.values[key], 0) + direction * step, min, max);
  preview.values[key] = next;
  preview.lastAction = `${item.label} changed`;
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
  els.previewMenu.addEventListener("click", (event) => {
    const row = event.target.closest("[data-preview-index]");
    if (!row) return;
    preview.selected = Number(row.dataset.previewIndex);
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
  els.loadSample.addEventListener("click", () => {
    model = roverConsoleModel();
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
    selectedMenuId = model.rootMenuId;
    selectedItemId = byId(model.menus, selectedMenuId)?.itemIds[0] || "";
    preview = createPreviewState(model);
    renderAll();
  } finally {
    event.target.value = "";
  }
}

installEventHandlers();
selectedMenuId = byId(model.menus, selectedMenuId)?.id || model.rootMenuId;
selectedItemId = byId(model.menus, selectedMenuId)?.itemIds[0] || "";
renderAll();
