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
import {
  activeStatusWidgets,
  defaultStatusWidget,
  firstStatusWidget,
  normalizeStatusWidgets,
  statusWidgetDiagnostics
} from "./status_widgets.mjs";
import { roverConsoleModel } from "./samples/rover_console_model.mjs";
import { createWebDomWasmPackage } from "./web_dom_wasm_templates.mjs";

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
  targetOriginRow: document.querySelector("#target-origin-row"),
  targetOriginCol: document.querySelector("#target-origin-col"),
  targetSerialBaud: document.querySelector("#target-serial-baud"),
  targetDisplayObject: document.querySelector("#target-display-object"),
  targetPinCs: document.querySelector("#target-pin-cs"),
  targetPinDc: document.querySelector("#target-pin-dc"),
  targetPinRst: document.querySelector("#target-pin-rst"),
  targetInputAdapter: document.querySelector("#target-input-adapter"),
  targetKeyUp: document.querySelector("#target-key-up"),
  targetKeyDown: document.querySelector("#target-key-down"),
  targetKeySelect: document.querySelector("#target-key-select"),
  targetKeyCancel: document.querySelector("#target-key-cancel"),
  targetKeyLeft: document.querySelector("#target-key-left"),
  targetKeyRight: document.querySelector("#target-key-right"),
  targetKeyCaseInsensitive: document.querySelector("#target-key-case-insensitive"),
  targetButtonUp: document.querySelector("#target-button-up"),
  targetButtonDown: document.querySelector("#target-button-down"),
  targetButtonSelect: document.querySelector("#target-button-select"),
  targetButtonCancel: document.querySelector("#target-button-cancel"),
  targetButtonLeft: document.querySelector("#target-button-left"),
  targetButtonRight: document.querySelector("#target-button-right"),
  targetButtonDebounce: document.querySelector("#target-button-debounce"),
  targetButtonsActiveLow: document.querySelector("#target-buttons-active-low"),
  targetGesturePin: document.querySelector("#target-gesture-pin"),
  targetCustomEventReader: document.querySelector("#target-custom-event-reader"),
  targetNavigationWrap: document.querySelector("#target-navigation-wrap"),
  targetSerialAutoscroll: document.querySelector("#target-serial-autoscroll"),
  targetSerialTimestamps: document.querySelector("#target-serial-timestamps"),
  targetAnsiColor: document.querySelector("#target-ansi-color"),
  targetAnsiHideCursor: document.querySelector("#target-ansi-hide-cursor"),
  targetAnsiClearOnBegin: document.querySelector("#target-ansi-clear-on-begin"),
  targetSummary: document.querySelector("#target-summary"),
  statusWidgetEditor: document.querySelector("#status-widget-editor")
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
    statusWidgets: normalizeStatusWidgets(Array.isArray(input?.statusWidgets) ? input.statusWidgets : base.statusWidgets),
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
    rendererId: "",
    needsRender: true,
    textBlocks: [],
    serialTick: 0,
    values
  };
}

function resetPreviewOutput() {
  if (!preview) return;
  preview.rendererId = "";
  preview.needsRender = true;
  preview.textBlocks = [];
  preview.serialTick = 0;
}

function currentPreviewMenuId() {
  return preview.stack[preview.stack.length - 1] || model.rootMenuId;
}

function previewSelectedFor(menuId, rowCount) {
  const rows = visibleItemsForMenu(menuId);
  if (!rowCount || !rows.length) {
    preview.selectedByMenu ||= {};
    preview.selectedByMenu[menuId] = 0;
    preview.selected = 0;
    return 0;
  }
  let selected = clamp(numberOr(preview.selectedByMenu?.[menuId], preview.selected), 0, Math.max(0, rowCount - 1));
  if (rows[selected] && isDisabled(rows[selected])) {
    selected = firstSelectableIndex(rows);
  }
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

function previewSignature() {
  const selectedByMenu = {};
  for (const key of Object.keys(preview.selectedByMenu || {}).sort()) {
    selectedByMenu[key] = preview.selectedByMenu[key];
  }
  const values = {};
  for (const key of Object.keys(preview.values || {}).sort()) {
    values[key] = preview.values[key];
  }
  return JSON.stringify({
    stack: preview.stack,
    selected: preview.selected,
    selectedByMenu,
    editingItemId: preview.editingItemId,
    editingOriginal: preview.editingOriginal,
    lastAction: preview.lastAction,
    values
  });
}

function firstSelectableIndex(rows) {
  const index = rows.findIndex((row) => !isDisabled(row));
  return index >= 0 ? index : 0;
}

function nextSelectableIndex(rows, selected, direction, wrap) {
  if (!rows.length) return selected;
  let index = selected;
  for (let tries = 0; tries < rows.length; tries += 1) {
    if (direction < 0) {
      if (index === 0) {
        if (!wrap) return selected;
        index = rows.length - 1;
      } else {
        index -= 1;
      }
    } else if (index + 1 >= rows.length) {
      if (!wrap) return selected;
      index = 0;
    } else {
      index += 1;
    }
    if (!isDisabled(rows[index])) return index;
  }
  return selected;
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
  for (const widget of activeStatusWidgets(model.statusWidgets)) {
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
  renderStatusWidgetEditor();
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
    const label = document.createElement("strong");
    label.textContent = item.label || "(untitled)";
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${typeLabel(item.type)}${decoratorSummary(item)}`;
    text.append(label, meta);

    const controls = document.createElement("span");
    controls.className = "row-actions";
    controls.append(
      moveItemButton("up", item.id, index === 0, "Move up", "↑"),
      moveItemButton("down", item.id, index === menu.itemIds.length - 1, "Move down", "↓")
    );
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
  els.itemEditor.textContent = "";
  const formGrid = document.createElement("div");
  formGrid.className = "form-grid";
  formGrid.append(
    fieldElement("label", "Label", item.label || ""),
    itemTypeFieldElement(item),
    fieldElement("icon", "Icon key", item.icon || ""),
    assetSelectElement(item),
    fieldElement("contentTitle", "Content title", item.contentTitle || "")
  );
  const decoratorGrid = document.createElement("section");
  decoratorGrid.className = "decorator-grid";
  decoratorGrid.setAttribute("aria-label", "Decorators");
  for (const [key, macro, role] of decoratorTypes) {
    decoratorGrid.append(decoratorElement(item, key, macro, role));
  }
  els.itemEditor.append(
    formGrid,
    textareaFieldElement("contentBody", "Content/help text", item.contentBody || ""),
    ...typeFieldElements(item),
    decoratorGrid
  );
}

function moveItemButton(direction, itemId, disabled, label, text) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.move = direction;
  button.dataset.itemId = itemId;
  button.disabled = disabled;
  button.setAttribute("aria-label", label);
  button.textContent = text;
  return button;
}

function assetSelectElement(item) {
  const field = document.createElement("div");
  field.className = "field";
  const label = document.createElement("label");
  label.setAttribute("for", "iconAssetId");
  label.textContent = "Icon asset";
  const select = document.createElement("select");
  select.id = "iconAssetId";
  select.dataset.prop = "iconAssetId";
  select.append(optionElement("", "No asset", !item.iconAssetId));
  for (const asset of model.assets) {
    select.append(optionElement(asset.id, asset.key, item.iconAssetId === asset.id));
  }
  field.append(label, select);
  return field;
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
    const name = document.createElement("strong");
    name.textContent = asset.key;
    const dimensions = document.createElement("span");
    dimensions.className = "meta";
    dimensions.textContent = `${asset.kind} · ${numberOr(asset.encoded?.width, asset.width)}x${numberOr(asset.encoded?.height, asset.height)} · used ${counts[asset.id] || 0}x`;
    const encoding = document.createElement("span");
    encoding.className = "meta";
    encoding.textContent = asset.encoded ? `${asset.encoded.flashBytes || 0} bytes estimated Adafruit asset data` : "encoding pending";
    info.append(name, dimensions, encoding);
    const controls = document.createElement("div");
    controls.className = "row-actions";
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.dataset.deleteAsset = asset.id;
    deleteButton.setAttribute("aria-label", "Delete asset");
    deleteButton.textContent = "Delete";
    controls.append(deleteButton);
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
  els.targetOriginRow.value = settings.originRow;
  els.targetOriginCol.value = settings.originCol;
  els.targetSerialBaud.value = String(settings.serialBaud);
  els.targetDisplayObject.value = settings.displayObject;
  els.targetPinCs.value = settings.pins.cs;
  els.targetPinDc.value = settings.pins.dc;
  els.targetPinRst.value = settings.pins.rst;
  els.targetInputAdapter.value = settings.inputAdapter;
  els.targetKeyUp.value = settings.serialKeyMap.up;
  els.targetKeyDown.value = settings.serialKeyMap.down;
  els.targetKeySelect.value = settings.serialKeyMap.select;
  els.targetKeyCancel.value = settings.serialKeyMap.cancel;
  els.targetKeyLeft.value = settings.serialKeyMap.left;
  els.targetKeyRight.value = settings.serialKeyMap.right;
  els.targetKeyCaseInsensitive.checked = Boolean(settings.serialKeyCaseInsensitive);
  els.targetButtonUp.value = settings.buttonPins.up;
  els.targetButtonDown.value = settings.buttonPins.down;
  els.targetButtonSelect.value = settings.buttonPins.select;
  els.targetButtonCancel.value = settings.buttonPins.cancel;
  els.targetButtonLeft.value = settings.buttonPins.left;
  els.targetButtonRight.value = settings.buttonPins.right;
  els.targetButtonDebounce.value = settings.buttonDebounceMs;
  els.targetButtonsActiveLow.checked = Boolean(settings.buttonsActiveLow);
  els.targetGesturePin.value = settings.gesturePin;
  els.targetCustomEventReader.value = settings.customEventReader;
  els.targetNavigationWrap.checked = Boolean(settings.navigationWrap);
  els.targetSerialAutoscroll.checked = Boolean(settings.serialAutoscroll);
  els.targetSerialTimestamps.checked = Boolean(settings.serialTimestamps);
  els.targetAnsiColor.checked = Boolean(settings.ansiColor);
  els.targetAnsiHideCursor.checked = Boolean(settings.ansiHideCursor);
  els.targetAnsiClearOnBegin.checked = Boolean(settings.ansiClearOnBegin);
  updateTargetSettingVisibility(settings, profile);
  updateInputSettingVisibility(settings.inputAdapter, profile);
  renderTargetSummary(settings, profile);
}

function renderTargetSummary(settings, profile) {
  els.targetSummary.textContent = "";
  const section = document.createElement("section");
  const title = document.createElement("h3");
  title.textContent = profile.label;
  const list = document.createElement("ul");
  for (const line of profileInstructions(profile)) {
    list.append(listItem(line));
  }
  list.append(
    listItem(`Selected input adapter: ${inputAdapterLabel(settings.inputAdapter)}.`),
    listItem(`Navigation: ${settings.navigationWrap ? "wraps from either menu end to the other" : "stops at the first and last selectable rows"}.`)
  );
  if (targetUsesSerialBaud(settings, profile)) {
    list.append(listItem(`Serial baud: ${settings.serialBaud}.`));
  }
  if (profile.previewRendererId === "serial-stream") {
    list.append(listItem(`Serial preview: ${settings.serialAutoscroll ? "autoscroll on" : "autoscroll off"}, timestamps ${settings.serialTimestamps ? "on" : "off"}.`));
  }
  if (profile.capabilities.terminal) {
    list.append(listItem(`Terminal region: ${settings.width}x${settings.height} at row ${settings.originRow}, column ${settings.originCol}.`));
  }
  section.append(title, list);
  els.targetSummary.append(section);
}

function updateTargetSettingVisibility(settings, profile) {
  const rendererId = profile.previewRendererId;
  const outputKind = profile.outputKind;
  const driverPins = profile.displayDriver?.pinDefines || [];
  const pinDefines = (token) => driverPins.some(([name]) => String(name).includes(token));
  const showSkin = rendererId === "web-dom" || outputKind === "color-gfx";
  const showDimensions = rendererId !== "web-dom";
  const showRotation = outputKind === "color-gfx" || outputKind === "mono-gfx";
  const showTerminalOrigin = rendererId === "ansi-terminal";
  const showDisplayObject = ["color-gfx", "mono-gfx", "u8g2", "character-lcd"].includes(outputKind);
  const showInputAdapter = profileSupportsInputSelection(profile);
  setControlGroupHidden(els.targetSkin, !showSkin);
  setControlGroupHidden(els.targetWidth, !showDimensions);
  setControlGroupHidden(els.targetHeight, !showDimensions);
  setControlGroupHidden(els.targetRotation, !showRotation);
  setControlGroupHidden(els.targetOriginRow, !showTerminalOrigin);
  setControlGroupHidden(els.targetOriginCol, !showTerminalOrigin);
  setControlGroupHidden(els.targetSerialBaud, !targetUsesSerialBaud(settings, profile));
  setControlGroupHidden(els.targetDisplayObject, !showDisplayObject);
  setControlGroupHidden(els.targetPinCs, !pinDefines("{cs}"));
  setControlGroupHidden(els.targetPinDc, !pinDefines("{dc}"));
  setControlGroupHidden(els.targetPinRst, !pinDefines("{rst}"));
  setControlGroupHidden(els.targetInputAdapter, !showInputAdapter);
  setControlGroupHidden(els.targetSerialAutoscroll, rendererId !== "serial-stream");
  setControlGroupHidden(els.targetSerialTimestamps, rendererId !== "serial-stream");
  setControlGroupHidden(els.targetAnsiColor, rendererId !== "ansi-terminal");
  setControlGroupHidden(els.targetAnsiHideCursor, rendererId !== "ansi-terminal");
  setControlGroupHidden(els.targetAnsiClearOnBegin, rendererId !== "ansi-terminal");
}

function updateInputSettingVisibility(inputAdapter, profile = targetProfileById(model.targetSettings.profileId)) {
  const showInputAdapter = profileSupportsInputSelection(profile);
  const showSerial = inputAdapter === "serial-keys";
  const showGpio = inputAdapter === "gpio-buttons";
  const showGesture = inputAdapter === "button-gestures";
  const showCustom = inputAdapter === "custom-event";
  [
    els.targetKeyUp,
    els.targetKeyDown,
    els.targetKeySelect,
    els.targetKeyCancel,
    els.targetKeyLeft,
    els.targetKeyRight,
    els.targetKeyCaseInsensitive
  ].forEach((field) => setControlGroupHidden(field, !showInputAdapter || !showSerial));
  [
    els.targetButtonUp,
    els.targetButtonDown,
    els.targetButtonSelect,
    els.targetButtonCancel,
    els.targetButtonLeft,
    els.targetButtonRight,
    els.targetButtonDebounce,
    els.targetButtonsActiveLow
  ].forEach((field) => setControlGroupHidden(field, !showInputAdapter || !showGpio));
  setControlGroupHidden(els.targetGesturePin, !showInputAdapter || !showGesture);
  setControlGroupHidden(els.targetCustomEventReader, !showInputAdapter || !showCustom);
}

function setControlGroupHidden(field, hidden) {
  const group = field?.closest(".field, .checkline");
  if (group) group.hidden = hidden;
}

function profileSupportsInputSelection(profile) {
  return profile.outputKind !== "desktop-stdio" && profile.outputKind !== "web-dom-wasm";
}

function targetUsesSerialBaud(settings, profile) {
  return profile.outputKind === "arduino-serial"
    || profile.outputKind === "arduino-ansi-serial"
    || (profileSupportsInputSelection(profile) && settings.inputAdapter === "serial-keys");
}

function arduinoSerialSetupCode(settings, profile) {
  if (!targetUsesSerialBaud(settings, profile)) {
    return "";
  }
  return `    Serial.begin(${settings.serialBaud});
    while (!Serial) {
    }
`;
}

function renderStatusWidgetEditor() {
  if (!els.statusWidgetEditor) return;
  const chip = firstStatusWidget(model.statusWidgets, "chip", { enabledOnly: false }) || defaultStatusWidget("chip");
  const battery = firstStatusWidget(model.statusWidgets, "battery", { enabledOnly: false }) || defaultStatusWidget("battery");
  const chipEnabled = Boolean(firstStatusWidget(model.statusWidgets, "chip"));
  const batteryEnabled = Boolean(firstStatusWidget(model.statusWidgets, "battery"));
  els.statusWidgetEditor.textContent = "";
  const grid = document.createElement("div");
  grid.className = "status-widget-grid";
  grid.append(
    statusWidgetCardElement("chip", "Chip", chip, chipEnabled, [
      ["label", "Label", "text"],
      ["sourceSymbol", "Source symbol", "text"],
      ["falseLabel", "False label", "text"],
      ["trueLabel", "True label", "text"]
    ]),
    statusWidgetCardElement("battery", "Battery", battery, batteryEnabled, [
      ["label", "Label", "text"],
      ["sourceSymbol", "Source symbol", "text"],
      ["min", "Min", "number"],
      ["max", "Max", "number"]
    ])
  );
  els.statusWidgetEditor.append(grid);
}

function statusWidgetCardElement(type, title, widget, enabled, fields) {
  const card = document.createElement("article");
  card.className = `status-widget-card${enabled ? "" : " disabled"}`;
  const heading = document.createElement("div");
  heading.className = "panel-heading";
  const titleBlock = document.createElement("div");
  const label = document.createElement("p");
  label.className = "panel-label";
  label.textContent = "Status widget";
  const headingTitle = document.createElement("h3");
  headingTitle.textContent = title;
  titleBlock.append(label, headingTitle);
  const toggle = document.createElement("label");
  toggle.className = "checkline";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.dataset.statusEnabled = type;
  checkbox.checked = enabled;
  toggle.append(checkbox, " Enabled");
  heading.append(titleBlock, toggle);
  const grid = document.createElement("div");
  grid.className = "form-grid";
  for (const [prop, fieldLabel, inputType] of fields) {
    grid.append(statusWidgetFieldElement(type, prop, fieldLabel, widget[prop], inputType, !enabled));
  }
  card.append(heading, grid);
  return card;
}

function statusWidgetFieldElement(type, prop, labelText, value, inputType, disabled) {
  const id = `status-${type}-${prop}`;
  const field = document.createElement("div");
  field.className = "field";
  const label = document.createElement("label");
  label.setAttribute("for", id);
  label.textContent = labelText;
  const input = document.createElement("input");
  input.id = id;
  input.dataset.statusType = type;
  input.dataset.statusProp = prop;
  input.type = inputType;
  input.value = value ?? "";
  input.disabled = disabled;
  field.append(label, input);
  return field;
}

function typeFieldElements(item) {
  if (item.type === "int") {
    return [formGridElement(
      fieldElement("stateSymbol", "Backing int symbol", item.stateSymbol || ""),
      numberFieldElement("initial", "Initial value", item.initial ?? 0),
      numberFieldElement("min", "Min", item.min ?? 0),
      numberFieldElement("max", "Max", item.max ?? 100),
      numberFieldElement("step", "Step", item.step ?? 1)
    )];
  }
  if (item.type === "bool") {
    const initial = document.createElement("label");
    initial.className = "checkline editor-check";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.prop = "initial";
    checkbox.checked = Boolean(item.initial);
    initial.append(checkbox, " Initial true");
    return [formGridElement(
      fieldElement("stateSymbol", "Backing bool symbol", item.stateSymbol || ""),
      fieldElement("falseLabel", "False label", item.falseLabel || "Off"),
      fieldElement("trueLabel", "True label", item.trueLabel || "On"),
      initial
    )];
  }
  if (item.type === "select") {
    return [
      formGridElement(
        fieldElement("stateSymbol", "Backing int symbol", item.stateSymbol || ""),
        numberFieldElement("initial", "Initial value", item.initial ?? 0)
      ),
      textareaFieldElement("choices", "Choices, one per line as Label=value", choicesToText(item.choices || []))
    ];
  }
  if (item.type === "value") {
    return [formGridElement(
      fieldElement("getter", "Getter symbol", item.getter || "getInt"),
      fieldElement("setter", "Setter symbol, blank for read-only", item.setter || ""),
      fieldElement("ctx", "Context expression", item.ctx || "0"),
      numberFieldElement("min", "Min", item.min ?? 0),
      numberFieldElement("max", "Max", item.max ?? 100),
      numberFieldElement("step", "Step", item.step ?? 1)
    )];
  }
  if (item.type === "func") {
    return [formGridElement(fieldElement("actionSymbol", "Callback symbol", item.actionSymbol || "action"))];
  }
  const child = byId(model.menus, item.childMenuId);
  const childField = document.createElement("div");
  childField.className = "field";
  const childLabel = document.createElement("label");
  childLabel.setAttribute("for", "childMenuId");
  childLabel.textContent = "Child menu";
  const childSelect = document.createElement("select");
  childSelect.id = "childMenuId";
  childSelect.dataset.prop = "childMenuId";
  for (const menu of model.menus.filter((entry) => entry.id !== selectedMenuId)) {
    childSelect.append(optionElement(menu.id, menu.title, item.childMenuId === menu.id));
  }
  childField.append(childLabel, childSelect);
  return [formGridElement(
    childField,
    fieldElement("childTitle", "Child title", child?.title || item.label || "")
  )];
}

function formGridElement(...children) {
  const grid = document.createElement("div");
  grid.className = "form-grid";
  grid.append(...children);
  return grid;
}

function itemTypeFieldElement(item) {
  const field = document.createElement("div");
  field.className = "field";
  const label = document.createElement("label");
  label.setAttribute("for", "item-type");
  label.textContent = "Type";
  const select = document.createElement("select");
  select.id = "item-type";
  select.dataset.prop = "type";
  for (const [value, typeName] of itemTypes) {
    select.append(optionElement(value, typeName, item.type === value));
  }
  field.append(label, select);
  return field;
}

function fieldElement(prop, labelText, value, type = "text") {
  const field = document.createElement("div");
  field.className = "field";
  const label = document.createElement("label");
  label.setAttribute("for", prop);
  label.textContent = labelText;
  const input = document.createElement("input");
  input.id = prop;
  input.dataset.prop = prop;
  input.type = type;
  input.value = value ?? "";
  field.append(label, input);
  return field;
}

function numberFieldElement(prop, label, value) {
  return fieldElement(prop, label, value, "number");
}

function textareaFieldElement(prop, labelText, value) {
  const field = document.createElement("div");
  field.className = "field";
  const label = document.createElement("label");
  label.setAttribute("for", prop);
  label.textContent = labelText;
  const textarea = document.createElement("textarea");
  textarea.id = prop;
  textarea.dataset.prop = prop;
  textarea.spellcheck = false;
  textarea.value = value ?? "";
  field.append(label, textarea);
  return field;
}

function optionElement(value, label, selected = false) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = selected;
  return option;
}

function decoratorElement(item, key, macro, role) {
  const dec = item.decorators?.[key] || emptyDecorators()[key];
  const card = document.createElement("div");
  card.className = "decorator-card";
  const toggle = document.createElement("label");
  toggle.className = "checkline";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.dataset.decorator = key;
  checkbox.dataset.decoratorProp = "enabled";
  checkbox.checked = Boolean(dec.enabled);
  toggle.append(checkbox, ` ${macro}`);
  card.append(
    toggle,
    decoratorFieldElement(key, "symbol", role, dec.symbol || ""),
    decoratorFieldElement(key, "ctx", "ctx", dec.ctx || "0")
  );
  return card;
}

function decoratorFieldElement(key, prop, labelText, value) {
  const field = document.createElement("div");
  field.className = "field";
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "text";
  input.dataset.decorator = key;
  input.dataset.decoratorProp = prop;
  input.value = value;
  field.append(label, input);
  return field;
}

function renderPreview() {
  const profile = targetProfileById(model.targetSettings.profileId);
  const rendererId = profile.previewRendererId || (profile.capabilities.graphical ? "graphical-viewport" : "serial-stream");
  if (preview.rendererId !== rendererId) {
    preview.rendererId = rendererId;
    preview.needsRender = true;
    preview.textBlocks = [];
  }
  clearPreviewSurface(rendererId);
  if (rendererId === "serial-stream") {
    renderSerialStreamPreview();
  } else if (rendererId === "stdio-screen") {
    renderStdioScreenPreview();
  } else if (rendererId === "ansi-terminal") {
    renderAnsiTerminalPreview();
  } else if (rendererId === "monochrome-viewport") {
    renderMonochromeViewportPreview();
  } else if (rendererId === "character-lcd") {
    renderCharacterLcdPreview();
  } else {
    renderGraphicalPreview(rendererId);
  }
}

function clearPreviewSurface(rendererId) {
  const zoom = clamp(numberOr(model.previewSettings.zoom, 1), 0.75, 2);
  els.previewMenu.textContent = "";
  els.previewMenu.className = "preview-menu";
  els.previewFrame.className = "preview-frame";
  els.previewFrame.style.removeProperty("--preview-width");
  els.previewFrame.style.removeProperty("--preview-height");
  els.previewFrame.style.removeProperty("--preview-zoom");
  els.previewMenu.style.removeProperty("--preview-width");
  els.previewMenu.style.removeProperty("--preview-height");
  els.previewMenu.style.removeProperty("--preview-aspect");
  els.previewMenu.style.removeProperty("--preview-zoom");
  els.previewMenu.style.removeProperty("--lcd-cols");
  els.previewMenu.style.removeProperty("--lcd-rows");
  els.previewZoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  els.previewZoomOut.disabled = !isZoomableRenderer(rendererId) || zoom <= 0.75;
  els.previewZoomIn.disabled = !isZoomableRenderer(rendererId) || zoom >= 2;
}

function isZoomableRenderer(rendererId) {
  return rendererId === "graphical-viewport" || rendererId === "monochrome-viewport" || rendererId === "character-lcd";
}

function renderGraphicalPreview(rendererId) {
  const menuId = currentPreviewMenuId();
  const rows = visibleItemsForMenu(menuId);
  const selected = previewSelectedFor(menuId, rows.length);
  const profile = targetProfileById(model.targetSettings.profileId);
  const graphicalPreview = rendererId === "graphical-viewport";
  const targetWidth = numberOr(model.targetSettings.width, 0);
  const targetHeight = numberOr(model.targetSettings.height, 0);
  const zoom = clamp(numberOr(model.previewSettings.zoom, 1), 0.75, 2);
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
  }

  const header = document.createElement("div");
  header.className = "preview-header";
  const breadcrumb = document.createElement("span");
  breadcrumb.className = "breadcrumb";
  breadcrumb.textContent = menuPathTitle();
  header.append(breadcrumb, previewStatusElement());
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
    const disabled = isDisabled(item);
    if (index === selected && !disabled) row.classList.add("selected");
    if (disabled) row.classList.add("disabled");
    if (item.type === "bool" || item.type === "select") row.classList.add("choice");
    const value = previewValueText(item);
    const main = document.createElement("span");
    main.className = "row-main";
    const label = document.createElement("strong");
    label.textContent = item.label || "(untitled)";
    main.append(label);
    const itemAssetLabel = assetLabel(item);
    if (!graphicalPreview) {
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = `${typeLabel(item.type)}${itemAssetLabel ? ` · ${itemAssetLabel}` : ""}`;
      main.append(meta);
    }
    row.append(previewIconElement(item), main, previewValueElement(item, value));
    els.previewMenu.append(row);
  });
  if (rows.length > windowSize) {
    const scrollbar = document.createElement("div");
    const thumbHeight = Math.max(18, Math.round((windowSize / rows.length) * 100));
    const denom = Math.max(1, rows.length - windowSize);
    const thumbTop = Math.round(((100 - thumbHeight) * top) / denom);
    scrollbar.className = "preview-scrollbar";
    const thumb = document.createElement("span");
    thumb.style.height = `${thumbHeight}%`;
    thumb.style.top = `${thumbTop}%`;
    scrollbar.append(thumb);
    els.previewMenu.append(scrollbar);
  }

  renderPreviewDetails(rows[selected]);
  preview.needsRender = false;
}

function renderSerialStreamPreview() {
  const snapshot = currentTextSnapshot();
  const settings = normalizeTargetSettings(model.targetSettings);
  if (preview.needsRender || !preview.textBlocks.length) {
    preview.textBlocks.push(formatSerialBlock(snapshot.lines, settings));
  }
  els.previewMenu.classList.add("text-stream-preview", "serial-stream-preview");
  const pre = document.createElement("pre");
  pre.className = "stream-output";
  const blocks = settings.serialAutoscroll ? preview.textBlocks : preview.textBlocks.slice(-1);
  pre.textContent = blocks.join("\n");
  els.previewMenu.append(pre);
  if (settings.serialAutoscroll) {
    pre.scrollTop = pre.scrollHeight;
  }
  renderPreviewDetails(snapshot.selectedItem);
  preview.needsRender = false;
}

function renderStdioScreenPreview() {
  const snapshot = currentTextSnapshot();
  els.previewMenu.classList.add("text-stream-preview", "stdio-screen-preview");
  const pre = document.createElement("pre");
  pre.className = "stream-output";
  pre.textContent = [
    ...snapshot.lines,
    "",
    "[w/s] move  [e/d] select or edit +  [a] back or edit -  [q] back  [x] quit"
  ].join("\n");
  els.previewMenu.append(pre);
  renderPreviewDetails(snapshot.selectedItem);
  preview.needsRender = false;
}

function renderAnsiTerminalPreview() {
  const snapshot = currentTextSnapshot();
  const settings = normalizeTargetSettings(model.targetSettings);
  const width = Math.max(1, settings.width || 48);
  const height = Math.max(1, settings.height || snapshot.lines.length || 1);
  els.previewMenu.classList.add("ansi-terminal-preview");
  els.previewMenu.style.setProperty("--terminal-cols", String(width));
  const header = document.createElement("div");
  header.className = "terminal-region-label";
  header.textContent = `ANSI region ${width}x${height} at ${settings.originRow},${settings.originCol}`;
  const terminal = document.createElement("div");
  terminal.className = "ansi-terminal";
  terminal.style.setProperty("--terminal-lines", String(height));
  snapshot.rows.forEach((line) => {
    const row = document.createElement("div");
    row.className = "ansi-line";
    if (line.kind === "title") row.classList.add("title");
    if (line.selected) row.classList.add("selected");
    if (line.disabled) row.classList.add("disabled");
    if (line.editing) row.classList.add("editing");
    if (settings.ansiColor) row.classList.add("color");
    row.textContent = padTerminalLine(line.text, width);
    terminal.append(row);
  });
  els.previewMenu.append(header, terminal);
  renderPreviewDetails(snapshot.selectedItem);
  preview.needsRender = false;
}

function renderMonochromeViewportPreview() {
  const settings = normalizeTargetSettings(model.targetSettings);
  const targetWidth = Math.max(1, numberOr(settings.width, 128));
  const targetHeight = Math.max(1, numberOr(settings.height, 64));
  const zoom = clamp(numberOr(model.previewSettings.zoom, 1), 0.75, 2);
  const rowHeight = targetHeight <= 32 ? 8 : 10;
  const textRows = Math.max(2, Math.floor(targetHeight / rowHeight));
  const textCols = Math.max(8, Math.min(32, Math.floor(targetWidth / 6)));
  const snapshot = currentTextSnapshot({ width: textCols, height: textRows });
  els.previewFrame.classList.add("graphical-frame");
  els.previewFrame.style.setProperty("--preview-width", `${targetWidth}px`);
  els.previewFrame.style.setProperty("--preview-height", `${targetHeight}px`);
  els.previewFrame.style.setProperty("--preview-zoom", String(zoom));
  els.previewMenu.classList.add("monochrome-viewport");
  els.previewMenu.style.setProperty("--preview-width", `${targetWidth}px`);
  els.previewMenu.style.setProperty("--preview-height", `${targetHeight}px`);
  els.previewMenu.style.setProperty("--preview-aspect", `${targetWidth} / ${targetHeight}`);
  els.previewMenu.style.setProperty("--preview-zoom", String(zoom));

  const rows = snapshot.rows;
  rows.forEach((line, index) => {
    const row = document.createElement("div");
    row.className = "mono-line";
    row.style.setProperty("--mono-top", `${index * rowHeight}px`);
    row.style.setProperty("--mono-height", `${rowHeight}px`);
    if (line.kind === "title") row.classList.add("title");
    if (line.selected) row.classList.add("selected");
    if (line.disabled) row.classList.add("disabled");
    if (line.editing) row.classList.add("editing");
    row.textContent = line.text;
    els.previewMenu.append(row);
  });
  const status = compactStatusText();
  if (status) {
    const statusEl = document.createElement("div");
    statusEl.className = "mono-status";
    statusEl.textContent = status;
    els.previewMenu.append(statusEl);
  }
  renderPreviewDetails(snapshot.selectedItem);
  preview.needsRender = false;
}

function renderCharacterLcdPreview() {
  const snapshot = currentTextSnapshot();
  const settings = normalizeTargetSettings(model.targetSettings);
  const width = Math.max(1, settings.width || 16);
  const height = Math.max(1, settings.height || 2);
  const zoom = clamp(numberOr(model.previewSettings.zoom, 1), 0.75, 2);
  els.previewMenu.classList.add("character-lcd-preview");
  els.previewMenu.style.setProperty("--lcd-cols", String(width));
  els.previewMenu.style.setProperty("--lcd-rows", String(height));
  els.previewMenu.style.setProperty("--preview-zoom", String(zoom));
  const lcd = document.createElement("div");
  lcd.className = "lcd-window";
  snapshot.lines.slice(0, height).forEach((line) => {
    const row = document.createElement("div");
    row.className = "lcd-line";
    row.textContent = padTerminalLine(line, width);
    lcd.append(row);
  });
  els.previewMenu.append(lcd);
  renderPreviewDetails(snapshot.selectedItem);
  preview.needsRender = false;
}

function compactStatusText() {
  const parts = [];
  const chip = firstStatusWidget(model.statusWidgets, "chip");
  const battery = firstStatusWidget(model.statusWidgets, "battery");
  if (chip?.sourceSymbol) {
    const value = Boolean(preview.values[chip.sourceSymbol]);
    parts.push(value ? chip.trueLabel || "ON" : chip.falseLabel || "OFF");
  }
  if (battery?.sourceSymbol) {
    parts.push(`${batteryPercent(preview.values[battery.sourceSymbol], battery)}%`);
  }
  return parts.join(" ");
}

function currentTextSnapshot(overrides = {}) {
  const menuId = currentPreviewMenuId();
  const rows = visibleItemsForMenu(menuId);
  const selected = previewSelectedFor(menuId, rows.length);
  const settings = normalizeTargetSettings(model.targetSettings);
  const width = overrides.width || settings.width || 32;
  const height = overrides.height || settings.height || rows.length + 1;
  const itemWindow = height > 0 ? Math.max(0, height - 1) : rows.length;
  const top = previewTop(rows.length, selected, itemWindow || rows.length || 1);
  const rendered = [];
  rendered.push({
    kind: "title",
    text: clipTextLine(textPreviewTitle(), width),
    selected: false,
    disabled: false,
    editing: false,
    item: null
  });
  for (let offset = 0; offset < itemWindow; offset += 1) {
    const index = top + offset;
    const item = rows[index];
    rendered.push(textRenderLine(item, index, selected, width));
  }
  while (rendered.length < height) {
    rendered.push({ kind: "blank", text: "", selected: false, disabled: false, editing: false, item: null });
  }
  return {
    rows: rendered.slice(0, height),
    lines: rendered.slice(0, height).map((line) => line.text),
    selectedItem: rows[selected] || null
  };
}

function textRenderLine(item, index, selected, width) {
  if (!item) {
    return { kind: "blank", text: "", selected: false, disabled: false, editing: false, item: null };
  }
  const disabled = isDisabled(item);
  const isSelected = index === selected && !disabled;
  const editing = preview.editingItemId === item.id;
  let line = `${isSelected ? ">" : " "}${item.label || "(untitled)"}`;
  const value = textPreviewValue(item);
  if (value) {
    line += `: ${value}`;
  }
  if (editing && previewValueKey(item)) {
    line += "  (edit)";
  }
  return {
    kind: "item",
    text: clipTextLine(line, width),
    selected: isSelected,
    disabled,
    editing,
    item
  };
}

function textPreviewValue(item) {
  if (!item || item.type === "menu" || item.type === "func") return "";
  if (item.type === "bool") return preview.values[item.stateSymbol] ? item.trueLabel || "On" : item.falseLabel || "Off";
  if (item.type === "select") {
    const value = preview.values[item.stateSymbol];
    const choice = (item.choices || []).find((entry) => Number(entry.value) === Number(value)) || item.choices?.[0];
    return choice?.label || "";
  }
  const value = item.type === "value" ? preview.values[symbolFromCtx(item.ctx)] : preview.values[item.stateSymbol];
  return formatPreviewValue(item, numberOr(value, 0));
}

function textPreviewTitle() {
  return preview.stack.map((id) => byId(model.menus, id)?.title || id).join("/");
}

function formatSerialBlock(lines, settings = normalizeTargetSettings(model.targetSettings)) {
  const prefix = settings.serialTimestamps ? `[${formatSerialTimestamp(preview.serialTick++)}] ` : "";
  return ["", `${prefix}--------------------------------`, ...lines.map((line) => `${prefix}${line}`)].join("\n");
}

function formatSerialTimestamp(tick) {
  const seconds = tick % 60;
  const minutes = Math.floor(tick / 60) % 60;
  const hours = Math.floor(tick / 3600);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function clipTextLine(line, width) {
  const text = String(line || "");
  return width > 0 ? text.slice(0, width) : text;
}

function padTerminalLine(line, width) {
  const clipped = clipTextLine(line, width);
  return `${clipped}${" ".repeat(Math.max(0, width - clipped.length))}`;
}

function previewTop(total, selected, windowSize) {
  if (total <= windowSize) return 0;
  return clamp(selected - Math.floor(windowSize / 2), 0, total - windowSize);
}

function previewStatusElement() {
  const armedWidget = firstStatusWidget(model.statusWidgets, "chip");
  const batteryWidget = firstStatusWidget(model.statusWidgets, "battery");
  const status = document.createElement("span");
  status.className = "preview-status";
  if (armedWidget) {
    const armed = Boolean(preview.values[armedWidget.sourceSymbol]);
    const chip = document.createElement("span");
    chip.className = `state-chip ${armed ? "armed" : "ready"}`;
    const dot = document.createElement("span");
    dot.setAttribute("aria-hidden", "true");
    chip.append(dot, armed ? armedWidget.trueLabel || "ARMED" : armedWidget.falseLabel || "READY");
    status.append(chip);
  }
  if (batteryWidget) {
    const pct = batteryPercent(preview.values[batteryWidget.sourceSymbol], batteryWidget);
    const tone = pct > 50 ? "good" : (pct > 20 ? "warn" : "low");
    const meter = document.createElement("span");
    meter.className = `battery-meter ${tone}`;
    meter.setAttribute("aria-label", `Battery ${pct}%`);
    const percent = document.createElement("span");
    percent.className = "battery-percent";
    percent.textContent = `${pct}%`;
    const batteryCase = document.createElement("span");
    batteryCase.className = "battery-case";
    const fill = document.createElement("span");
    fill.className = "battery-fill";
    fill.style.width = `${pct}%`;
    batteryCase.append(fill);
    meter.append(percent, batteryCase);
    status.append(meter);
  }
  if (!status.childElementCount) {
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${visibleItemsForMenu(currentPreviewMenuId()).length} rows`;
    status.append(meta);
  }
  return status;
}

function previewIconElement(item) {
  const icon = document.createElement("span");
  const asset = assetForItem(item);
  icon.className = `preview-icon${asset ? "" : " empty"}`;
  icon.setAttribute("aria-hidden", "true");
  if (!asset) return icon;
  const cssUrl = assetCssUrl(asset);
  icon.style.setProperty("--asset-url", `url("${cssUrl.replace(/"/g, "%22")}")`);
  return icon;
}

function previewValueElement(item, value) {
  if (preview.editingItemId === item.id && value) {
    const controls = document.createElement("span");
    controls.className = "edit-controls";
    const minus = document.createElement("span");
    minus.className = "edit-button minus";
    minus.setAttribute("aria-hidden", "true");
    const editValue = document.createElement("span");
    editValue.className = "edit-value";
    editValue.textContent = value;
    const plus = document.createElement("span");
    plus.className = "edit-button plus";
    plus.setAttribute("aria-hidden", "true");
    controls.append(minus, editValue, plus);
    return controls;
  }
  const valueElement = document.createElement("span");
  if (item.type === "menu") {
    valueElement.className = "value value-icon";
    valueElement.setAttribute("aria-hidden", "true");
    valueElement.textContent = "›";
    return valueElement;
  }
  valueElement.className = "value";
  valueElement.textContent = value;
  return valueElement;
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
  els.instructions.textContent = "";
  els.instructions.append(
    instructionSection("Static hosting", "ol", [
      listItem("Place this folder under ", codeElement("docs/menu-builder/"), " and publish the repository with GitHub Pages from ", codeElement("docs/"), "."),
      listItem("The app stores the working project in browser local storage and can export/import the JSON model."),
      listItem("No backend, local-file access, or browser compiler is required. The app exports text assets for the user's normal development environment.")
    ]),
    instructionSection("Selected target", "ol", profileInstructions(profile).map((line) => listItem(line))),
    instructionSection("Samples", "ol", [
      listItem("Start with the empty project to build a new declaration from scratch."),
      listItem("Use ", codeElement("Load RoverConsole sample"), " to inspect a complete nested menu with backing values, formatters, decorators, and callbacks."),
      listItem("Use ", codeElement("Clear project"), " to return to a blank model after exploring or modifying the sample.")
    ]),
    instructionSection("Firmware export", "ol", [
      listItem("Use the declaration-only output when the sketch already owns setup, loop, input, and display adapters."),
      listItem("Use the Arduino Serial sketch output for a complete text-console starting point."),
      listItem("Use the ANSI Serial sketch output for terminal apps that support cursor positioning and ANSI styles."),
      listItem("Use the Desktop C++ stdio program for command-line testing without Arduino or browser dependencies."),
      listItem("Use the selected target sketch/source output for the active profile."),
      listItem("Use the selected target asset header with graphical profiles that generate bitmap data."),
      listItem("Adafruit_GFX and TFT_eSPI color targets use RGB565 assets; Adafruit monochrome and U8g2 targets use 1-bit bitmap assets."),
      listItem("LiquidCrystal and hd44780 character LCD targets ignore graphical assets and render fixed-width text rows."),
      listItem("Move generated backing variables and callbacks into normal sketch files when replacing stubs with real application logic.")
    ]),
    instructionSection("Assets", "ol", [
      listItem("SVG assets are sanitized before preview or export."),
      listItem("Raster assets and optional masks are decoded in browser memory and exported without local filesystem paths."),
      listItem("Text targets report assigned icons as ignored; graphical targets export only used assets unless the profile says otherwise.")
    ]),
    instructionSection("Web export", "ol", [
      listItem("Use the WebAssembly bridge source together with ", codeElement("BetterMenu.h"), " and the reusable DOM input/display adapter."),
      listItem("Build the generated bridge with the same WebAssembly-capable C++ toolchain used by the project or development environment."),
      listItem("Copy the compiled ", codeElement(".wasm"), " and static web files into the deployed web demo package.")
    ]),
    instructionSection("Diagnostics", "ul", diagnostics.length ? diagnostics.map((line) => listItem(line)) : [listItem("No model diagnostics.")])
  );
}

function instructionSection(titleText, listTag, items) {
  const section = document.createElement("section");
  const title = document.createElement("h3");
  title.textContent = titleText;
  const list = document.createElement(listTag);
  list.append(...items);
  section.append(title, list);
  return section;
}

function listItem(...children) {
  const item = document.createElement("li");
  item.append(...children);
  return item;
}

function codeElement(text) {
  const code = document.createElement("code");
  code.textContent = text;
  return code;
}

function generateOutputs() {
  const declaration = generateFirmwareDeclaration();
  const sketch = generateFirmwareSketch();
  const ansiSketch = generateAnsiSerialSketch();
  const stdio = generateStdioProgram();
  const bridge = generateWasmBridgeCpp();
  const adafruitAssets = generateAdafruitAssetHeader();
  const adafruitSketch = generateAdafruitSketch();
  const targetFiles = generateSelectedTargetFiles({ declaration, sketch, ansiSketch, stdio, bridge, adafruitSketch, adafruitAssets });
  return {
    firmwareDeclaration: declaration,
    firmwareSketch: sketch,
    ansiSketch,
    stdioProgram: stdio,
    wasmBridgeCpp: bridge,
    webPackageFiles: JSON.stringify(generateWebPackageFiles(bridge), null, 2),
    targetSketch: targetFiles.sketch,
    targetAssets: targetFiles.assets,
    adafruitSketch,
    adafruitAssets,
    targetPackageFiles: JSON.stringify(generateTargetPackageFiles(targetFiles), null, 2),
    diagnostics: collectDiagnostics().join("\n") || "No model diagnostics."
  };
}

function generateSelectedTargetFiles(fallbacks = {}) {
  const profile = targetProfileById(model.targetSettings.profileId);
  const settings = normalizeTargetSettings(model.targetSettings);
  if (profile.outputKind === "arduino-serial") {
    return targetFilesFor(profile, { [profile.files[0]]: fallbacks.sketch || generateFirmwareSketch() });
  }
  if (profile.outputKind === "arduino-ansi-serial") {
    return targetFilesFor(profile, { [profile.files[0]]: fallbacks.ansiSketch || generateAnsiSerialSketch() });
  }
  if (profile.outputKind === "desktop-stdio") {
    return targetFilesFor(profile, { [profile.files[0]]: fallbacks.stdio || generateStdioProgram() });
  }
  if (profile.outputKind === "web-dom-wasm") {
    const bridge = fallbacks.bridge || generateWasmBridgeCpp();
    return targetFilesFor(profile, {
      "bettermenu_wasm.cpp": bridge,
      "web-package-manifest.json": generateWebPackageFiles(bridge)
    });
  }
  if (profile.outputKind === "color-gfx") {
    return targetFilesFor(profile, {
      [profile.displayDriver.sketchFile]: generateColorGfxSketch(profile.id),
      [profile.displayDriver.assetHeader]: generateRgb565AssetHeader()
    });
  }
  if (profile.outputKind === "mono-gfx") {
    return targetFilesFor(profile, {
      [profile.displayDriver.sketchFile]: generateAdafruitMonoGfxSketch(profile.id),
      [profile.displayDriver.assetHeader]: generateMonoAssetHeader()
    });
  }
  if (profile.outputKind === "u8g2") {
    return targetFilesFor(profile, {
      [profile.displayDriver.sketchFile]: generateU8g2Sketch(profile.id),
      [profile.displayDriver.assetHeader]: generateMonoAssetHeader()
    });
  }
  if (profile.outputKind === "character-lcd") {
    return targetFilesFor(profile, {
      [profile.displayDriver.sketchFile]: generateCharacterLcdSketch(profile.id)
    });
  }
  return targetFilesFor(profile, { "BetterMenuDeclaration.h": fallbacks.declaration || generateFirmwareDeclaration() }, settings);
}

function targetFilesFor(profile, files) {
  const entries = Object.entries(files || {});
  const sketchEntry = entries.find(([name]) => /\.(ino|cpp|h)$/i.test(name) && !/Assets\.h$/i.test(name)) || entries[0] || ["", ""];
  const assetEntry = entries.find(([name]) => /Assets\.h$/i.test(name)) || ["", ""];
  return {
    profile: profile.id,
    profileLabel: profile.label,
    sketchName: sketchEntry[0],
    assetName: assetEntry[0],
    sketch: typeof sketchEntry[1] === "string" ? sketchEntry[1] : JSON.stringify(sketchEntry[1], null, 2),
    assets: assetEntry[0]
      ? (typeof assetEntry[1] === "string" ? assetEntry[1] : JSON.stringify(assetEntry[1], null, 2))
      : targetAssetMessage(profile),
    files
  };
}

function targetAssetMessage(profile) {
  if (profile.assetEncoding === "none") {
    return `${profile.label} does not generate an asset header.`;
  }
  return `${profile.label} has no generated assets for the current model.`;
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

function arduinoInputInclude(settings) {
  if (settings.inputAdapter === "button-gestures") {
    return "#include <ButtonGestures.h>\n";
  }
  return "";
}

function arduinoInputGlobals(settings, inputName = "input") {
  if (settings.inputAdapter === "gpio-buttons") {
    return `static buttons_ctx_t ${inputName}Buttons;`;
  }
  if (settings.inputAdapter === "button-gestures") {
    return `#define BM_GESTURE_BUTTON_PIN ${settings.gesturePin}

static ButtonGestures ${inputName}Button(BM_GESTURE_BUTTON_PIN, LOW, INPUT_PULLUP);
static input_rich_event_ctx_t ${inputName}EventStorage;

struct ${inputName}_gesture_input_t {
    ButtonGestures *button;
};

static ${inputName}_gesture_input_t ${inputName}GestureInput = { &${inputName}Button };

static menu_event_t read${capitalize(inputName)}GestureInput(void *raw) {
    ${inputName}_gesture_input_t *ctx = static_cast<${inputName}_gesture_input_t *>(raw);
    if (!ctx || !ctx->button) {
        return menu_event(Choice_Invalid);
    }
    switch (ctx->button->check_button()) {
        case SINGLE_PRESS_SHORT: return menu_event(Choice_Select);
        case SINGLE_PRESS_LONG: return menu_choice_event(Choice_Cancel, MENU_EVENT_LONG);
        case DOUBLE_PRESS_SHORT: return menu_event(Choice_Down);
        case DOUBLE_PRESS_LONG: return menu_choice_event(Choice_Up, MENU_EVENT_LONG);
        case TRIPLE_PRESS_SHORT: return menu_event(Choice_Right);
        case TRIPLE_PRESS_LONG: return menu_choice_event(Choice_Left, MENU_EVENT_LONG);
        default: return menu_event(Choice_Invalid);
    }
}`;
  }
  if (settings.inputAdapter === "custom-event") {
    const reader = safeCppIdentifier(settings.customEventReader || "readMenuInput");
    const supportSource = `${model.snippets.backing || ""}\n${model.snippets.callbacks || ""}`;
    const readerStub = hasSymbol(supportSource, reader) ? "" : `

static menu_event_t ${reader}(void *) {
    return menu_event(Choice_Invalid);
}`;
    return `static input_rich_event_ctx_t ${inputName}EventStorage;${readerStub}`;
  }
  const keys = settings.serialKeyMap;
  return `static serial_keys_ctx_t ${inputName}Serial;
static stream_keymap_t const ${inputName}KeyMap = {
    ${cppCharLiteral(keys.up)},
    ${cppCharLiteral(keys.down)},
    ${cppCharLiteral(keys.select)},
    ${cppCharLiteral(keys.cancel)},
    ${cppCharLiteral(keys.left)},
    ${cppCharLiteral(keys.right)},
    ${settings.serialKeyCaseInsensitive ? "1" : "0"}
};`;
}

function arduinoInputSetup(settings, inputName = "input") {
  if (settings.inputAdapter === "gpio-buttons") {
    const pins = settings.buttonPins;
    return `input_source_t input = make_buttons_input(
        ${inputName}Buttons,
        ${pins.up},
        ${pins.down},
        ${pins.select},
        ${pins.cancel},
        ${pins.left},
        ${pins.right},
        ${settings.buttonsActiveLow ? "true" : "false"},
        ${settings.buttonDebounceMs}
    );`;
  }
  if (settings.inputAdapter === "button-gestures") {
    return `input_source_t input = make_event_input(${inputName}EventStorage, &${inputName}GestureInput, read${capitalize(inputName)}GestureInput);`;
  }
  if (settings.inputAdapter === "custom-event") {
    const reader = safeCppIdentifier(settings.customEventReader || "readMenuInput");
    return `input_source_t input = make_event_input(${inputName}EventStorage, 0, ${reader});`;
  }
  return `input_source_t input = make_serial_keys_input(${inputName}Serial, ${inputName}KeyMap);`;
}

function inputAdapterLabel(id) {
  return {
    "serial-keys": "Serial keys",
    "stdio-keys": "stdio keys",
    "gpio-buttons": "Direct GPIO buttons",
    "button-gestures": "ButtonGestures single button",
    "custom-event": "Custom event input"
  }[id] || id;
}

function capitalize(value) {
  const text = String(value || "");
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

function cppCharLiteral(value) {
  const ch = String(value || "").charAt(0);
  if (!ch) return "0";
  if (ch === "\\") return "'\\\\'";
  if (ch === "'") return "'\\''";
  if (ch === "\n") return "'\\n'";
  if (ch === "\r") return "'\\r'";
  if (ch === "\t") return "'\\t'";
  return `'${ch}'`;
}

function settingsForProfile(profileId) {
  const settings = model.targetSettings.profileId === profileId ? model.targetSettings : defaultTargetSettings(profileId);
  return normalizeTargetSettings(settings);
}

function generateFirmwareSketch() {
  const menuName = safeCppIdentifier(model.projectName || "menu", "Menu");
  const settings = settingsForProfile("arduino-serial");
  const profile = targetProfileById(settings.profileId);
  return `#include <BetterMenu.h>
${arduinoInputInclude(settings)}

${generateSupportCode()}

static const auto ${menuName} =
${menuExpression(model.rootMenuId, 0)};

static menu_runtime_t runtime;
${arduinoInputGlobals(settings, "keyInput")}
static print_display_ctx_t serialDisplay;

void setup() {
${arduinoSerialSetupCode(settings, profile)}
    Serial.println(F("BetterMenu Serial demo"));
    Serial.println(F("Use W/S to move, E to select, Q to go back, A/D to edit."));

    ${arduinoInputSetup(settings, "keyInput")}
    display_t display = make_print_display(serialDisplay, Serial, ${settings.width}, ${settings.height});
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

function generateAnsiSerialSketch() {
  const menuName = safeCppIdentifier(model.projectName || "menu", "Menu");
  const settings = settingsForProfile("arduino-ansi-serial");
  const profile = targetProfileById(settings.profileId);
  const width = Math.max(1, settings.width || 48);
  const height = Math.max(1, settings.height || 8);
  return `#include <BetterMenu.h>
${arduinoInputInclude(settings)}

#define BM_ANSI_COLOR ${settings.ansiColor ? 1 : 0}
#define BM_ANSI_HIDE_CURSOR ${settings.ansiHideCursor ? 1 : 0}
#define BM_ANSI_CLEAR_ON_BEGIN ${settings.ansiClearOnBegin ? 1 : 0}

${generateSupportCode()}

static const auto ${menuName} =
${menuExpression(model.rootMenuId, 0)};

static menu_runtime_t menuRuntime;
${arduinoInputGlobals(settings, "serialInput")}

struct ansi_display_ctx_t {
    Print *out;
    uint8_t width;
    uint8_t height;
    uint8_t originRow;
    uint8_t originCol;
    bool begun;
};

static ansi_display_ctx_t ansiDisplay;

static void ansiCursor(Print &out, uint8_t row, uint8_t col) {
    out.print(F("\\033["));
    out.print(row);
    out.print(';');
    out.print(col);
    out.print('H');
}

static void ansiStyle(Print &out, menu_render_line_t const *line) {
    if (!line) {
        out.print(F("\\033[0m"));
        return;
    }
#if BM_ANSI_COLOR
    if (line->kind == MENU_RENDER_TITLE) {
        out.print(F("\\033[1;36m"));
    } else if (line->flags & MENU_RENDER_DISABLED) {
        out.print(F("\\033[2;37m"));
    } else if (line->flags & MENU_RENDER_EDITING) {
        out.print(F("\\033[1;30;43m"));
    } else if (line->flags & MENU_RENDER_SELECTED) {
        out.print(F("\\033[1;30;46m"));
    } else {
        out.print(F("\\033[0m"));
    }
#else
    if (line->flags & MENU_RENDER_SELECTED) {
        out.print(F("\\033[7m"));
    } else if (line->flags & MENU_RENDER_DISABLED) {
        out.print(F("\\033[2m"));
    } else if (line->flags & MENU_RENDER_EDITING) {
        out.print(F("\\033[4m"));
    } else if (line->kind == MENU_RENDER_TITLE) {
        out.print(F("\\033[1m"));
    } else {
        out.print(F("\\033[0m"));
    }
#endif
}

static void ansiPrintPadded(Print &out, const char *text, uint8_t width) {
    uint8_t written = 0;
    while (text && *text && written < width) {
        out.print(*text++);
        ++written;
    }
    while (written < width) {
        out.print(' ');
        ++written;
    }
}

static void ansiClearRegion(ansi_display_ctx_t *ctx) {
    if (!ctx || !ctx->out) {
        return;
    }
    for (uint8_t row = 0; row < ctx->height; ++row) {
        ansiCursor(*ctx->out, ctx->originRow + row, ctx->originCol);
        ansiPrintPadded(*ctx->out, "", ctx->width);
    }
}

static void ansiClear(void *raw) {
    ansi_display_ctx_t *ctx = static_cast<ansi_display_ctx_t *>(raw);
    if (!ctx || !ctx->out) {
        return;
    }
    if (!ctx->begun) {
#if BM_ANSI_CLEAR_ON_BEGIN
        ctx->out->print(F("\\033[2J"));
#endif
#if BM_ANSI_HIDE_CURSOR
        ctx->out->print(F("\\033[?25l"));
#endif
        ctx->begun = true;
    }
    ctx->out->print(F("\\033[0m"));
    ansiClearRegion(ctx);
}

static void ansiFlush(void *raw) {
    ansi_display_ctx_t *ctx = static_cast<ansi_display_ctx_t *>(raw);
    if (!ctx || !ctx->out) {
        return;
    }
    ctx->out->print(F("\\033[0m"));
    ansiCursor(*ctx->out, ctx->originRow + ctx->height, ctx->originCol);
    ctx->out->print(F("w/s move  e/d select or edit +  a/q back or edit -"));
}

static void ansiRenderLine(void *raw, menu_render_line_t const *line) {
    ansi_display_ctx_t *ctx = static_cast<ansi_display_ctx_t *>(raw);
    if (!ctx || !ctx->out || !line || line->row >= ctx->height) {
        return;
    }
    ansiCursor(*ctx->out, ctx->originRow + line->row, ctx->originCol);
    ansiStyle(*ctx->out, line);
    ansiPrintPadded(*ctx->out, line->text ? line->text : "", ctx->width);
    ctx->out->print(F("\\033[0m"));
}

static display_ops_t const ANSI_DISPLAY_OPS = {
    &ansiClear,
    0,
    &ansiFlush,
    &ansiRenderLine
};

static display_t make_ansi_print_display(ansi_display_ctx_t &ctx, Print &out, uint8_t width, uint8_t height, uint8_t originRow, uint8_t originCol) {
    ctx.out = &out;
    ctx.width = width;
    ctx.height = height;
    ctx.originRow = originRow;
    ctx.originCol = originCol;
    ctx.begun = false;
    return make_display(width, height, &ctx, &ANSI_DISPLAY_OPS);
}

void setup() {
${arduinoSerialSetupCode(settings, profile)}
    ${arduinoInputSetup(settings, "serialInput")}
    display_t display = make_ansi_print_display(ansiDisplay, Serial, ${width}, ${height}, ${settings.originRow}, ${settings.originCol});
    menuRuntime = menu_runtime_t::make(${menuName}, display, input, false);
    menuRuntime.set_show_title(true);
    menuRuntime.set_show_breadcrumbs(true);${navigationSetupCode("menuRuntime")}
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}
`;
}

function generateStdioProgram() {
  const menuName = safeCppIdentifier(model.projectName || "menu", "Menu");
  const settings = settingsForProfile("desktop-stdio");
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
    display_t display = make_callback_display(${settings.width}, ${settings.height}, displayClear, displayWriteLine, displayFlush);

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
  return `#include "WebMenuCapture.h"

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

static menu_event_t readEvent(void *) {
    menu_event_t event = pendingEvent;
    pendingEvent = menu_event(Choice_Invalid);
    return event;
}

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
static const auto ${menuName} =
${menuExpression(model.rootMenuId, 0)};

extern "C" __attribute__((export_name("bm_init"))) void bm_init(void) {
    display_t webDisplay = make_web_menu_capture_display(runtime, 60, 6);
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
    return web_menu_capture_row_count();
}

extern "C" __attribute__((export_name("bm_row_kind"))) int bm_row_kind(int idx) {
    return web_menu_capture_row_kind(idx);
}

extern "C" __attribute__((export_name("bm_row_flags"))) int bm_row_flags(int idx) {
    return web_menu_capture_row_flags(idx);
}

extern "C" __attribute__((export_name("bm_row_entry_type"))) int bm_row_entry_type(int idx) {
    return web_menu_capture_row_entry_type(idx);
}

extern "C" __attribute__((export_name("bm_row_item_index"))) int bm_row_item_index(int idx) {
    return web_menu_capture_row_item_index(idx);
}

extern "C" __attribute__((export_name("bm_row_editable"))) int bm_row_editable(int idx) {
    return web_menu_capture_row_editable(idx);
}

extern "C" __attribute__((export_name("bm_row_text_ptr"))) int bm_row_text_ptr(int idx) {
    char const *text = web_menu_capture_row_text(idx);
    return text ? static_cast<int>(reinterpret_cast<uintptr_t>(text)) : 0;
}

extern "C" __attribute__((export_name("bm_visible_top"))) int bm_visible_top(void) {
    return web_menu_capture_visible_top();
}

extern "C" __attribute__((export_name("bm_visible_total"))) int bm_visible_total(void) {
    return web_menu_capture_visible_total();
}

extern "C" __attribute__((export_name("bm_visible_window"))) int bm_visible_window(void) {
    return web_menu_capture_visible_window();
}
`;
}

function generateWebPackageFiles(bridgeSource) {
  return createWebDomWasmPackage(model, bridgeSource);
}

function generateAdafruitAssetHeader() {
  return generateRgb565AssetHeader();
}

function generateRgb565AssetHeader() {
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

template <typename Display>
static void bmDrawIcon(Display &gfx, int16_t x, int16_t y, const BMIconAsset *icon, uint16_t color, uint16_t fallback) {
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

function displayIncludeLines(driver) {
  return (driver.includeLines || []).join("\n");
}

function displayPinDefines(driver, settings) {
  return (driver.pinDefines || [])
    .map(([name, value]) => `#define ${expandDisplayTemplate(name, settings, targetProfileById(settings.profileId))} ${expandDisplayTemplate(value, settings, targetProfileById(settings.profileId))}`)
    .join("\n");
}

function expandDisplayLines(lines, settings, profile) {
  return (lines || []).map((line) => `    ${expandDisplayTemplate(line, settings, profile)}`).join("\n");
}

function expandDisplayTemplate(template, settings, profile = targetProfileById(settings.profileId)) {
  return String(template || "")
    .replaceAll("{display}", settings.displayObject)
    .replaceAll("{width}", String(Math.max(1, numberOr(settings.width, profile.defaults?.width || 1))))
    .replaceAll("{height}", String(Math.max(1, numberOr(settings.height, profile.defaults?.height || 1))))
    .replaceAll("{rotation}", String(numberOr(settings.rotation, profile.defaults?.rotation || 0)))
    .replaceAll("{cs}", settings.pins?.cs || "TFT_CS")
    .replaceAll("{dc}", settings.pins?.dc || "TFT_DC")
    .replaceAll("{rst}", settings.pins?.rst || "TFT_RST");
}

function generateColorHeaderStatusCode(displayObject) {
  const chip = firstStatusWidget(model.statusWidgets, "chip");
  const battery = firstStatusWidget(model.statusWidgets, "battery");
  const lines = [];
  if (battery) {
    lines.push(`    int pct = batteryPercent();
    uint16_t batteryColor = pct > 50 ? bmRgb(86, 216, 168) : (pct > 20 ? bmRgb(232, 182, 92) : bmRgb(240, 122, 110));
    int16_t bx = BM_SCREEN_W - BM_MARGIN - (BM_COMPACT ? 22 : 28);
    int16_t by = BM_MARGIN + (BM_COMPACT ? 7 : 11);
    ${displayObject}.drawRoundRect(bx, by, BM_COMPACT ? 16 : 22, BM_COMPACT ? 8 : 12, 2, bmRgb(126, 138, 153));
    ${displayObject}.fillRect(bx + (BM_COMPACT ? 17 : 23), by + 3, 2, BM_COMPACT ? 3 : 6, bmRgb(126, 138, 153));
    ${displayObject}.fillRect(bx + 2, by + 2, ((BM_COMPACT ? 12 : 18) * pct) / 100, BM_COMPACT ? 4 : 8, batteryColor);`);
  }
  if (chip?.sourceSymbol) {
    lines.push(`    const bool chipOn = ${chip.sourceSymbol};
    uint16_t chipColor = chipOn ? bmRgb(232, 182, 92) : bmRgb(86, 216, 168);
    int16_t sx = BM_SCREEN_W - BM_MARGIN - (BM_COMPACT ? 46 : 86);
    int16_t sy = BM_MARGIN + (BM_COMPACT ? 9 : 15);
    ${displayObject}.fillCircle(sx, sy + 3, BM_COMPACT ? 2 : 3, chipColor);
    if (!BM_COMPACT) {
        const char *chipText = chipOn ? ${cppString(chip.trueLabel || "ARMED")} : ${cppString(chip.falseLabel || "READY")};
        ${displayObject}.setTextColor(chipColor, bmRgb(23, 31, 43));
        ${displayObject}.setCursor(sx + 6, sy);
        ${displayObject}.print(chipText);
    }`);
  }
  return lines.length ? `\n${lines.join("\n")}` : "";
}

function generateColorGfxSketch(profileId) {
  const menuName = safeCppIdentifier(model.projectName || "menu", "Menu");
  const settings = settingsForProfile(profileId);
  const profile = targetProfileById(settings.profileId);
  const driver = profile.displayDriver || {};
  const width = Math.max(96, numberOr(settings.width, 320));
  const height = Math.max(64, numberOr(settings.height, 240));
  const compact = width < 220 || height < 170;
  const headerH = compact ? 22 : 32;
  const rowH = compact ? 24 : 36;
  const margin = compact ? 4 : 8;
  const itemTop = margin + headerH + (compact ? 4 : 6);
  const viewRows = Math.max(1, Math.min(7, Math.floor((height - itemTop - margin) / rowH)));
  const iconSize = compact ? 12 : 18;
  const displayCols = Math.max(12, Math.min(80, Math.floor(width / 6)));
  return `${displayIncludeLines(driver)}
#include <BetterMenu.h>
${arduinoInputInclude(settings)}

#include <stdio.h>
#include <string.h>

#include "${driver.assetHeader || "BetterMenuRgb565Assets.h"}"

${displayPinDefines(driver, settings)}

${expandDisplayTemplate(driver.constructor || "static TFT_eSPI {display};", settings, profile)}
static menu_runtime_t menuRuntime;
${arduinoInputGlobals(settings, "menuInput")}

${generateSupportCode()}

static const auto ${menuName} =
${menuExpression(model.rootMenuId, 0)};

static const int BM_SCREEN_W = ${width};
static const int BM_SCREEN_H = ${height};
static const int BM_MARGIN = ${margin};
static const int BM_HEADER_H = ${headerH};
static const int BM_ROW_H = ${rowH};
static const int BM_ITEM_TOP = ${itemTop};
static const int BM_ICON_SIZE = ${iconSize};
static const bool BM_COMPACT = ${compact ? "true" : "false"};
static const uint8_t BM_VIEW_ROWS = ${viewRows};
static const uint8_t BM_TEXT_COLUMNS = ${displayCols};

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
    int16_t headerW = BM_SCREEN_W - (BM_MARGIN * 2);
    ${settings.displayObject}.fillRoundRect(BM_MARGIN, BM_MARGIN, headerW, BM_HEADER_H, BM_COMPACT ? 4 : 8, bmRgb(23, 31, 43));
    ${settings.displayObject}.drawRoundRect(BM_MARGIN, BM_MARGIN, headerW, BM_HEADER_H, BM_COMPACT ? 4 : 8, bmRgb(46, 58, 74));
    int16_t tx = BM_MARGIN + (BM_COMPACT ? 8 : 24);
    if (flags & MENU_RENDER_BACK_AVAILABLE) {
        ${settings.displayObject}.drawLine(BM_MARGIN + 12, BM_MARGIN + 6, BM_MARGIN + 6, BM_MARGIN + (BM_HEADER_H / 2), bmRgb(47, 211, 190));
        ${settings.displayObject}.drawLine(BM_MARGIN + 6, BM_MARGIN + (BM_HEADER_H / 2), BM_MARGIN + 12, BM_MARGIN + BM_HEADER_H - 6, bmRgb(47, 211, 190));
        tx = BM_MARGIN + (BM_COMPACT ? 18 : 32);
    }
    char title[MENU_MAX_LINE];
    strncpy(title, text ? text : "", sizeof(title));
    title[sizeof(title) - 1] = '\\0';
    ${settings.displayObject}.setTextWrap(false);
    ${settings.displayObject}.setTextSize(1);
    ${settings.displayObject}.setTextColor(bmRgb(234, 240, 246), bmRgb(23, 31, 43));
    ${settings.displayObject}.setCursor(tx, BM_MARGIN + (BM_COMPACT ? 7 : 11));
    ${settings.displayObject}.print(title);
${generateColorHeaderStatusCode(settings.displayObject)}
}

static void drawScrollbar(menu_cursor_t const *cur, menu_render_line_t const *line) {
    if (!cur || !line || line->row != 1) {
        return;
    }
    uint8_t count = menu_runtime_t::menu_count(*cur);
    int total = menu_runtime_t::visible_count(*cur, count);
    if (total <= BM_VIEW_ROWS) {
        return;
    }
    int top = menu_runtime_t::raw_to_visible(*cur, count, line->item_index);
    int trackY = BM_ITEM_TOP;
    int trackH = BM_VIEW_ROWS * BM_ROW_H;
    int thumbH = trackH * BM_VIEW_ROWS / total;
    if (thumbH < 12) {
        thumbH = 12;
    }
    int denom = total - BM_VIEW_ROWS;
    if (denom < 1) {
        denom = 1;
    }
    int thumbY = trackY + (trackH - thumbH) * top / denom;
    int x = BM_SCREEN_W - BM_MARGIN - 4;
    ${settings.displayObject}.fillRoundRect(x, trackY, 4, trackH, 2, bmRgb(34, 43, 56));
    ${settings.displayObject}.fillRoundRect(x, thumbY, 4, thumbH, 2, bmRgb(58, 150, 140));
}

static void colorClear(void *) {
    ${settings.displayObject}.fillScreen(bmRgb(16, 21, 28));
}

static void colorFlush(void *) {
}

static void colorRenderLine(void *ctx, menu_render_line_t const *line) {
    if (!line) {
        return;
    }
    menu_runtime_t *runtime = static_cast<menu_runtime_t *>(ctx);
    menu_cursor_t const *cur = (runtime && runtime->depth < MENU_MAX_STACK) ? &runtime->stack[runtime->depth] : 0;
    if (line->kind == MENU_RENDER_TITLE) {
        drawHeader(line->text, line->flags);
        return;
    }
    if (line->kind == MENU_RENDER_BLANK) {
        int16_t y = BM_ITEM_TOP + (line->row - 1) * BM_ROW_H;
        ${settings.displayObject}.fillRect(BM_MARGIN, y, BM_SCREEN_W - (BM_MARGIN * 2), BM_ROW_H, bmRgb(16, 21, 28));
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
    int16_t y = BM_ITEM_TOP + (line->row - 1) * BM_ROW_H;
    int16_t rowW = BM_SCREEN_W - (BM_MARGIN * 3) - 8;
    int16_t cy = y + (BM_ROW_H / 2);
    uint16_t cardBg = selected ? bmRgb(15, 45, 50) : bmRgb(20, 26, 35);
    uint16_t border = selected ? bmRgb(47, 211, 190) : bmRgb(38, 48, 62);
    ${settings.displayObject}.fillRoundRect(BM_MARGIN, y, rowW, BM_ROW_H - 4, BM_COMPACT ? 4 : 7, cardBg);
    ${settings.displayObject}.drawRoundRect(BM_MARGIN, y, rowW, BM_ROW_H - 4, BM_COMPACT ? 4 : 7, border);
    if (selected) {
        ${settings.displayObject}.fillRoundRect(BM_MARGIN + 3, y + 4, 3, BM_ROW_H - 12, 1, bmRgb(47, 211, 190));
    }
    char label[MENU_MAX_LINE];
    strncpy(label, line->text ? line->text : "", sizeof(label));
    label[sizeof(label) - 1] = '\\0';
    stripLabel(label);
    char *value = splitValue(label);
    bool alert = bmEq(label, "E-STOP");
    uint16_t textColor = disabled ? bmRgb(74, 86, 98) : (alert ? bmRgb(240, 122, 110) : bmRgb(234, 240, 246));
    uint16_t iconColor = disabled ? bmRgb(74, 86, 98) : (alert ? bmRgb(240, 122, 110) : (selected ? bmRgb(47, 211, 190) : bmRgb(150, 166, 182)));
    bmDrawIcon(${settings.displayObject}, BM_MARGIN + (BM_COMPACT ? 8 : 17), y + ((BM_ROW_H - BM_ICON_SIZE - 4) / 2), bmIconForLabel(label), iconColor, iconColor);
    ${settings.displayObject}.setTextSize(1);
    ${settings.displayObject}.setTextColor(textColor, cardBg);
    ${settings.displayObject}.setCursor(BM_MARGIN + (BM_COMPACT ? 26 : 52), y + ((BM_ROW_H - 10) / 2));
    ${settings.displayObject}.print(label);
    if (editing && value) {
        ${settings.displayObject}.drawRoundRect(BM_SCREEN_W - BM_MARGIN - 54, y + 5, 16, 16, 4, bmRgb(47, 211, 190));
        ${settings.displayObject}.drawLine(BM_SCREEN_W - BM_MARGIN - 50, cy, BM_SCREEN_W - BM_MARGIN - 42, cy, bmRgb(47, 211, 190));
        ${settings.displayObject}.setTextColor(bmRgb(95, 224, 196), cardBg);
        ${settings.displayObject}.setCursor(BM_SCREEN_W - BM_MARGIN - 34, y + ((BM_ROW_H - 10) / 2));
        ${settings.displayObject}.print(value);
    } else if (child) {
        ${settings.displayObject}.drawLine(BM_SCREEN_W - BM_MARGIN - 20, cy - 5, BM_SCREEN_W - BM_MARGIN - 14, cy, bmRgb(126, 138, 153));
        ${settings.displayObject}.drawLine(BM_SCREEN_W - BM_MARGIN - 14, cy, BM_SCREEN_W - BM_MARGIN - 20, cy + 5, bmRgb(126, 138, 153));
    } else if (value) {
        uint16_t valueColor = disabled ? bmRgb(54, 63, 74) : ((line->entry_type == ENTRY_BOOL || line->entry_type == ENTRY_SELECT) ? bmRgb(232, 197, 122) : (editable ? bmRgb(95, 224, 196) : bmRgb(111, 182, 232)));
        ${settings.displayObject}.setTextColor(valueColor, cardBg);
        int16_t x = BM_SCREEN_W - BM_MARGIN - 16 - static_cast<int16_t>(strlen(value)) * 6;
        int16_t minX = BM_MARGIN + (BM_COMPACT ? 82 : 188);
        if (x < minX) {
            x = minX;
        }
        ${settings.displayObject}.setCursor(x, y + ((BM_ROW_H - 10) / 2));
        ${settings.displayObject}.print(value);
    }
}

static display_ops_t const BM_COLOR_DISPLAY_OPS = {
    &colorClear,
    0,
    &colorFlush,
    &colorRenderLine
};

void setup() {
${arduinoSerialSetupCode(settings, profile)}
${expandDisplayLines(driver.setupLines || ["{display}.begin();"], settings, profile)}
    ${settings.displayObject}.setRotation(${settings.rotation});
    ${settings.displayObject}.setTextWrap(false);

    ${arduinoInputSetup(settings, "menuInput")}
    display_t display = make_display(BM_TEXT_COLUMNS, BM_VIEW_ROWS + 1, &menuRuntime, &BM_COLOR_DISPLAY_OPS);
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
// Display pin constants are placeholders when the selected driver uses explicit pins.
`;
}

function generateMonoAssetHeader() {
  const assets = usedAssets(model);
  const declarations = [];
  const structs = [];
  for (const asset of assets) {
    const symbol = assetSymbol(asset);
    const encoded = asset.encoded;
    if (!encoded?.mask?.length) continue;
    declarations.push(`static const uint8_t ${symbol}_BITS[] PROGMEM = {\n${formatMaskArray(encoded.mask)}\n};`);
    structs.push(`static const BMMonoIconAsset ${symbol} = { ${encoded.width}, ${encoded.height}, ${symbol}_BITS };`);
  }
  return `#pragma once

#include <Arduino.h>

struct BMMonoIconAsset {
    uint8_t width;
    uint8_t height;
    const uint8_t *bits;
};

${declarations.join("\n\n")}

${structs.join("\n")}

static bool bmMonoIconBit(const BMMonoIconAsset *icon, uint16_t index) {
    if (!icon || !icon->bits) {
        return false;
    }
    uint8_t value = pgm_read_byte(&icon->bits[index / 8]);
    return (value & (1 << (7 - (index % 8)))) != 0;
}
`;
}

function generateAdafruitMonoGfxSketch(profileId) {
  const menuName = safeCppIdentifier(model.projectName || "menu", "Menu");
  const settings = settingsForProfile(profileId);
  const profile = targetProfileById(settings.profileId);
  const driver = profile.displayDriver || {};
  const width = Math.max(64, numberOr(settings.width, 128));
  const height = Math.max(32, numberOr(settings.height, 64));
  const rowH = height <= 32 ? 8 : 10;
  const viewRows = Math.max(1, Math.floor(height / rowH) - 1);
  const displayCols = Math.max(8, Math.min(32, Math.floor(width / 6)));
  const iconSize = height <= 32 ? 7 : 9;
  return `${displayIncludeLines(driver)}
#include <BetterMenu.h>
${arduinoInputInclude(settings)}

#include <string.h>

#include "${driver.assetHeader || "BetterMenuMonoAssets.h"}"

${displayPinDefines(driver, settings)}

${expandDisplayTemplate(driver.constructor || "static Adafruit_SSD1306 {display}({width}, {height}, &Wire, OLED_RESET);", settings, profile)}
static menu_runtime_t menuRuntime;
${arduinoInputGlobals(settings, "menuInput")}

${generateSupportCode()}

static const auto ${menuName} =
${menuExpression(model.rootMenuId, 0)};

static const int BM_SCREEN_W = ${width};
static const int BM_SCREEN_H = ${height};
static const int BM_ROW_H = ${rowH};
static const int BM_ICON_SIZE = ${iconSize};
static const uint8_t BM_VIEW_ROWS = ${viewRows};
static const uint8_t BM_TEXT_COLUMNS = ${displayCols};

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

${generateMonoIconLookup()}

static int batteryPercent(void) {
${generateAdafruitBatteryCode()}
}

static void drawMonoIcon(int16_t x, int16_t y, const BMMonoIconAsset *icon, uint16_t color) {
    if (!icon || !icon->bits) {
        ${settings.displayObject}.drawCircle(x + 4, y + 4, 3, color);
        return;
    }
    for (uint8_t py = 0; py < icon->height; ++py) {
        for (uint8_t px = 0; px < icon->width; ++px) {
            uint16_t index = static_cast<uint16_t>(py) * icon->width + px;
            if (bmMonoIconBit(icon, index)) {
                ${settings.displayObject}.drawPixel(x + px, y + py, color);
            }
        }
    }
}

static void drawMonoStatus(void) {
${generateMonoStatusCode("adafruit", settings.displayObject)}
}

static void monoClear(void *) {
    ${settings.displayObject}.clearDisplay();
}

static void monoFlush(void *) {
    ${settings.displayObject}.display();
}

static void monoRenderLine(void *, menu_render_line_t const *line) {
    if (!line) {
        return;
    }
    int16_t y = line->row * BM_ROW_H;
    if (line->kind == MENU_RENDER_BLANK) {
        ${settings.displayObject}.fillRect(0, y, BM_SCREEN_W, BM_ROW_H, 0);
        return;
    }
    if (line->kind == MENU_RENDER_TITLE) {
        ${settings.displayObject}.fillRect(0, 0, BM_SCREEN_W, BM_ROW_H, 0);
        ${settings.displayObject}.setTextSize(1);
        ${settings.displayObject}.setTextColor(1, 0);
        ${settings.displayObject}.setCursor((line->flags & MENU_RENDER_BACK_AVAILABLE) ? 8 : 0, 1);
        if (line->flags & MENU_RENDER_BACK_AVAILABLE) {
            ${settings.displayObject}.print('<');
        }
        ${settings.displayObject}.print(line->text ? line->text : "");
        drawMonoStatus();
        return;
    }
    if (line->kind != MENU_RENDER_ITEM) {
        return;
    }
    bool selected = (line->flags & MENU_RENDER_SELECTED) != 0;
    bool disabled = (line->flags & MENU_RENDER_DISABLED) != 0;
    bool editing = (line->flags & MENU_RENDER_EDITING) != 0;
    ${settings.displayObject}.fillRect(0, y, BM_SCREEN_W, BM_ROW_H, selected ? 1 : 0);
    char label[MENU_MAX_LINE];
    strncpy(label, line->text ? line->text : "", sizeof(label));
    label[sizeof(label) - 1] = '\\0';
    stripLabel(label);
    char *value = splitValue(label);
    uint16_t fg = selected ? 0 : 1;
    uint16_t bg = selected ? 1 : 0;
    if (disabled) {
        fg = 1;
        bg = 0;
    }
    ${settings.displayObject}.setTextSize(1);
    ${settings.displayObject}.setTextColor(fg, bg);
    drawMonoIcon(1, y + 1, bmMonoIconForLabel(label), fg);
    ${settings.displayObject}.setCursor(BM_ICON_SIZE + 3, y + 1);
    ${settings.displayObject}.print(label);
    if (value) {
        int16_t x = BM_SCREEN_W - static_cast<int16_t>(strlen(value)) * 6 - 1;
        if (x < BM_ICON_SIZE + 42) {
            x = BM_ICON_SIZE + 42;
        }
        ${settings.displayObject}.setCursor(x, y + 1);
        ${settings.displayObject}.print(value);
    }
    if (editing) {
        ${settings.displayObject}.drawRect(BM_SCREEN_W - 8, y + 1, 7, BM_ROW_H - 2, fg);
    }
}

static display_ops_t const BM_MONO_DISPLAY_OPS = {
    &monoClear,
    0,
    &monoFlush,
    &monoRenderLine
};

void setup() {
${arduinoSerialSetupCode(settings, profile)}
${expandDisplayLines(driver.setupLines || ["{display}.begin(SSD1306_SWITCHCAPVCC, 0x3C);"], settings, profile)}
    ${settings.displayObject}.setRotation(${settings.rotation});
    ${settings.displayObject}.setTextWrap(false);
    ${settings.displayObject}.clearDisplay();

    ${arduinoInputSetup(settings, "menuInput")}
    display_t display = make_display(BM_TEXT_COLUMNS, BM_VIEW_ROWS + 1, 0, &BM_MONO_DISPLAY_OPS);
    menuRuntime = menu_runtime_t::make(${menuName}, display, input, false);
    menuRuntime.set_show_title(true);
    menuRuntime.set_show_breadcrumbs(true);${navigationSetupCode("menuRuntime")}
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}

// Profile: ${profile.label}
`;
}

function generateU8g2Sketch(profileId) {
  const menuName = safeCppIdentifier(model.projectName || "menu", "Menu");
  const settings = settingsForProfile(profileId);
  const profile = targetProfileById(settings.profileId);
  const driver = profile.displayDriver || {};
  const width = Math.max(64, numberOr(settings.width, 128));
  const height = Math.max(32, numberOr(settings.height, 64));
  const rowH = height <= 32 ? 8 : 10;
  const viewRows = Math.max(1, Math.floor(height / rowH) - 1);
  const displayCols = Math.max(8, Math.min(32, Math.floor(width / 6)));
  const iconSize = height <= 32 ? 7 : 9;
  return `${displayIncludeLines(driver)}
#include <BetterMenu.h>
${arduinoInputInclude(settings)}

#include <string.h>

#include "${driver.assetHeader || "BetterMenuMonoAssets.h"}"

${expandDisplayTemplate(driver.constructor || "static U8G2_SSD1306_128X64_NONAME_F_HW_I2C {display}(U8G2_R0, U8X8_PIN_NONE);", settings, profile)}
static menu_runtime_t menuRuntime;
${arduinoInputGlobals(settings, "menuInput")}

${generateSupportCode()}

static const auto ${menuName} =
${menuExpression(model.rootMenuId, 0)};

static const int BM_SCREEN_W = ${width};
static const int BM_SCREEN_H = ${height};
static const int BM_ROW_H = ${rowH};
static const int BM_ICON_SIZE = ${iconSize};
static const uint8_t BM_VIEW_ROWS = ${viewRows};
static const uint8_t BM_TEXT_COLUMNS = ${displayCols};

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

${generateMonoIconLookup()}

static int batteryPercent(void) {
${generateAdafruitBatteryCode()}
}

static void drawMonoIcon(int16_t x, int16_t y, const BMMonoIconAsset *icon, uint8_t color) {
    ${settings.displayObject}.setDrawColor(color ? 1 : 0);
    if (!icon || !icon->bits) {
        ${settings.displayObject}.drawCircle(x + 4, y + 4, 3);
        return;
    }
    for (uint8_t py = 0; py < icon->height; ++py) {
        for (uint8_t px = 0; px < icon->width; ++px) {
            uint16_t index = static_cast<uint16_t>(py) * icon->width + px;
            if (bmMonoIconBit(icon, index)) {
                ${settings.displayObject}.drawPixel(x + px, y + py);
            }
        }
    }
}

static void drawMonoStatus(void) {
${generateMonoStatusCode("u8g2", settings.displayObject)}
}

static void u8g2Clear(void *) {
    ${settings.displayObject}.clearBuffer();
    ${settings.displayObject}.setFont(u8g2_font_5x8_tf);
}

static void u8g2Flush(void *) {
    ${settings.displayObject}.sendBuffer();
}

static void u8g2RenderLine(void *, menu_render_line_t const *line) {
    if (!line) {
        return;
    }
    int16_t y = line->row * BM_ROW_H;
    if (line->kind == MENU_RENDER_BLANK) {
        ${settings.displayObject}.setDrawColor(0);
        ${settings.displayObject}.drawBox(0, y, BM_SCREEN_W, BM_ROW_H);
        ${settings.displayObject}.setDrawColor(1);
        return;
    }
    if (line->kind == MENU_RENDER_TITLE) {
        ${settings.displayObject}.setDrawColor(0);
        ${settings.displayObject}.drawBox(0, 0, BM_SCREEN_W, BM_ROW_H);
        ${settings.displayObject}.setDrawColor(1);
        if (line->flags & MENU_RENDER_BACK_AVAILABLE) {
            ${settings.displayObject}.drawStr(0, BM_ROW_H - 2, "<");
        }
        ${settings.displayObject}.drawStr((line->flags & MENU_RENDER_BACK_AVAILABLE) ? 8 : 0, BM_ROW_H - 2, line->text ? line->text : "");
        drawMonoStatus();
        return;
    }
    if (line->kind != MENU_RENDER_ITEM) {
        return;
    }
    bool selected = (line->flags & MENU_RENDER_SELECTED) != 0;
    bool disabled = (line->flags & MENU_RENDER_DISABLED) != 0;
    bool editing = (line->flags & MENU_RENDER_EDITING) != 0;
    ${settings.displayObject}.setDrawColor(selected ? 1 : 0);
    ${settings.displayObject}.drawBox(0, y, BM_SCREEN_W, BM_ROW_H);
    char label[MENU_MAX_LINE];
    strncpy(label, line->text ? line->text : "", sizeof(label));
    label[sizeof(label) - 1] = '\\0';
    stripLabel(label);
    char *value = splitValue(label);
    uint8_t fg = selected ? 0 : 1;
    if (disabled) {
        fg = 1;
    }
    ${settings.displayObject}.setDrawColor(fg);
    drawMonoIcon(1, y + 1, bmMonoIconForLabel(label), fg);
    ${settings.displayObject}.drawStr(BM_ICON_SIZE + 3, y + BM_ROW_H - 2, label);
    if (value) {
        int16_t x = BM_SCREEN_W - static_cast<int16_t>(strlen(value)) * 6 - 1;
        if (x < BM_ICON_SIZE + 42) {
            x = BM_ICON_SIZE + 42;
        }
        ${settings.displayObject}.drawStr(x, y + BM_ROW_H - 2, value);
    }
    if (editing) {
        ${settings.displayObject}.drawFrame(BM_SCREEN_W - 8, y + 1, 7, BM_ROW_H - 2);
    }
    ${settings.displayObject}.setDrawColor(1);
}

static display_ops_t const BM_U8G2_DISPLAY_OPS = {
    &u8g2Clear,
    0,
    &u8g2Flush,
    &u8g2RenderLine
};

void setup() {
${arduinoSerialSetupCode(settings, profile)}
${expandDisplayLines(driver.setupLines || ["{display}.begin();"], settings, profile)}
    ${settings.displayObject}.setFont(u8g2_font_5x8_tf);

    ${arduinoInputSetup(settings, "menuInput")}
    display_t display = make_display(BM_TEXT_COLUMNS, BM_VIEW_ROWS + 1, 0, &BM_U8G2_DISPLAY_OPS);
    menuRuntime = menu_runtime_t::make(${menuName}, display, input, false);
    menuRuntime.set_show_title(true);
    menuRuntime.set_show_breadcrumbs(true);${navigationSetupCode("menuRuntime")}
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}

// Profile: ${profile.label}
`;
}

function generateCharacterLcdSketch(profileId) {
  const menuName = safeCppIdentifier(model.projectName || "menu", "Menu");
  const settings = settingsForProfile(profileId);
  const profile = targetProfileById(settings.profileId);
  const driver = profile.displayDriver || {};
  const width = Math.max(8, numberOr(settings.width, 16));
  const height = Math.max(1, numberOr(settings.height, 2));
  return `${displayIncludeLines(driver)}
#include <BetterMenu.h>
${arduinoInputInclude(settings)}

${displayPinDefines(driver, settings)}

${expandDisplayTemplate(driver.constructor || "static LiquidCrystal {display}(LCD_RS, LCD_E, LCD_D4, LCD_D5, LCD_D6, LCD_D7);", settings, profile)}
static menu_runtime_t menuRuntime;
${arduinoInputGlobals(settings, "menuInput")}

${generateSupportCode()}

static const auto ${menuName} =
${menuExpression(model.rootMenuId, 0)};

static void lcdClear(void *) {
    ${settings.displayObject}.clear();
}

static void lcdWriteLine(void *, uint8_t row, char const *text) {
    ${settings.displayObject}.setCursor(0, row);
    bool ended = (text == 0);
    for (uint8_t col = 0; col < ${width}; ++col) {
        char ch = ended ? '\\0' : text[col];
        if (ch == '\\0') {
            ended = true;
        }
        ${settings.displayObject}.print(ch ? ch : ' ');
    }
}

static void lcdFlush(void *) {
}

static display_ops_t const BM_LCD_DISPLAY_OPS = {
    &lcdClear,
    &lcdWriteLine,
    &lcdFlush,
    0
};

void setup() {
${arduinoSerialSetupCode(settings, profile)}
${expandDisplayLines(driver.setupLines || ["{display}.begin({width}, {height});"], settings, profile)}

    ${arduinoInputSetup(settings, "menuInput")}
    display_t display = make_display(${width}, ${height}, 0, &BM_LCD_DISPLAY_OPS);
    menuRuntime = menu_runtime_t::make(${menuName}, display, input, false);
    menuRuntime.set_show_title(true);
    menuRuntime.set_show_breadcrumbs(true);${navigationSetupCode("menuRuntime")}
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}

// Profile: ${profile.label}
// Replace placeholder LCD pin constants with the wiring for the target board.
`;
}

function generateAdafruitSketch() {
  const menuName = safeCppIdentifier(model.projectName || "menu", "Menu");
  const settings = settingsForProfile("adafruit-ili9341-320x240-spi");
  const profile = targetProfileById(settings.profileId);
  return `#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <BetterMenu.h>
${arduinoInputInclude(settings)}

#include <stdio.h>
#include <string.h>

#include "BetterMenuRgb565Assets.h"

#define ${settings.pins.cs} 10
#define ${settings.pins.dc} 9
#define ${settings.pins.rst} 8

static Adafruit_ILI9341 ${settings.displayObject}(${settings.pins.cs}, ${settings.pins.dc}, ${settings.pins.rst});
static menu_runtime_t menuRuntime;
${arduinoInputGlobals(settings, "menuInput")}

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
${arduinoSerialSetupCode(settings, profile)}
    ${settings.displayObject}.begin();
    ${settings.displayObject}.setRotation(${settings.rotation});
    ${settings.displayObject}.setTextWrap(false);

    ${arduinoInputSetup(settings, "menuInput")}
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

function generateTargetPackageFiles(targetFiles) {
  const profile = targetProfileById(model.targetSettings.profileId);
  return {
    profile: profile.id,
    profileLabel: profile.label,
    files: targetFiles.files || {},
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

function generateMonoIconLookup() {
  const lines = [];
  const seen = new Set();
  for (const item of model.items) {
    const asset = assetForItem(item);
    if (!asset?.encoded || seen.has(`${item.label}:${asset.id}`)) continue;
    seen.add(`${item.label}:${asset.id}`);
    lines.push(`    if (strcmp(label, ${cppString(item.label)}) == 0) { return &${assetSymbol(asset)}; }`);
  }
  return `static const BMMonoIconAsset *bmMonoIconForLabel(const char *label) {
${lines.join("\n") || "    (void)label;"}
    return 0;
}`;
}

function generateAdafruitBatteryCode() {
  const widget = firstStatusWidget(model.statusWidgets, "battery");
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

function generateMonoStatusCode(kind, displayObject) {
  const chip = firstStatusWidget(model.statusWidgets, "chip");
  const battery = firstStatusWidget(model.statusWidgets, "battery");
  const lines = [];
  const drawOn = kind === "u8g2"
    ? `${displayObject}.setDrawColor(1);`
    : "";
  if (battery) {
    if (kind === "u8g2") {
      lines.push(`    int pct = batteryPercent();
    int16_t bx = BM_SCREEN_W - 18;
    ${displayObject}.setDrawColor(1);
    ${displayObject}.drawFrame(bx, 1, 14, 7);
    ${displayObject}.drawBox(bx + 14, 3, 2, 3);
    ${displayObject}.drawBox(bx + 2, 3, (10 * pct) / 100, 3);`);
    } else {
      lines.push(`    int pct = batteryPercent();
    int16_t bx = BM_SCREEN_W - 18;
    ${displayObject}.drawRect(bx, 1, 14, 7, 1);
    ${displayObject}.fillRect(bx + 14, 3, 2, 3, 1);
    ${displayObject}.fillRect(bx + 2, 3, (10 * pct) / 100, 3, 1);`);
    }
  }
  if (chip?.sourceSymbol) {
    if (kind === "u8g2") {
      lines.push(`    if (${chip.sourceSymbol}) {
        ${displayObject}.setDrawColor(1);
        ${displayObject}.drawDisc(BM_SCREEN_W - 24, 4, 2);
    }`);
    } else {
      lines.push(`    if (${chip.sourceSymbol}) {
        ${displayObject}.fillCircle(BM_SCREEN_W - 24, 4, 2, 1);
    }`);
    }
  }
  return lines.length ? lines.join("\n") : `    ${drawOn}\n    return;`;
}

function generateAdafruitHeaderStatusCode(displayObject) {
  const chip = firstStatusWidget(model.statusWidgets, "chip");
  const battery = firstStatusWidget(model.statusWidgets, "battery");
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
  const renderedStatusWidgets = activeStatusWidgets(model.statusWidgets);
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
    if (profile.assetEncoding === "rgb565" && usedAssetList.includes(asset) && !asset.encoded?.rgb565?.length) {
      diagnostics.push(`Asset ${asset.key || asset.id} is used by ${profile.label} but has not been RGB565 encoded yet.`);
    }
    if (profile.assetEncoding === "mono1" && usedAssetList.includes(asset) && !asset.encoded?.mask?.length) {
      diagnostics.push(`Asset ${asset.key || asset.id} is used by ${profile.label} but has not been encoded as a 1-bit bitmap yet.`);
    }
  }
  diagnostics.push(...statusWidgetDiagnostics(model.statusWidgets));
  if (profile.capabilities.statusWidgets === false && renderedStatusWidgets.length) {
    diagnostics.push(`${profile.label} does not render graphical status widgets.`);
  }
  if (profile.id === "desktop-stdio" && model.targetSettings.inputAdapter !== "stdio-keys") {
    diagnostics.push("Desktop stdio output uses getchar-style input; Arduino Serial, GPIO, ButtonGestures, and custom firmware adapters are not used by that profile.");
  }
  if (profile.id !== "desktop-stdio" && model.targetSettings.inputAdapter === "stdio-keys") {
    diagnostics.push(`${profile.label} is an Arduino/web target; stdio keys are only used by the desktop C++ profile.`);
  }
  if (model.targetSettings.inputAdapter === "gpio-buttons") {
    const pins = model.targetSettings.buttonPins || {};
    for (const [role, pin] of Object.entries(pins)) {
      if (!pin) diagnostics.push(`GPIO button ${role} pin needs a value or MENU_BUTTON_UNUSED.`);
    }
  }
  if (model.targetSettings.inputAdapter === "custom-event" && !isCppIdentifier(model.targetSettings.customEventReader)) {
    diagnostics.push(`Custom event reader has an invalid C++ symbol: ${model.targetSettings.customEventReader}.`);
  }
  if (model.targetSettings.inputAdapter === "button-gestures") {
    diagnostics.push("ButtonGestures input requires the ButtonGestures library in the Arduino development environment.");
  }
  for (const widget of renderedStatusWidgets.filter((entry) => entry.type === "chip" || entry.type === "battery")) {
    const symbol = String(widget.sourceSymbol || "").trim();
    const label = `${widget.label || widget.type} status widget`;
    if (!symbol) continue;
    if (!isCppIdentifier(symbol)) {
      diagnostics.push(`${label} has an invalid source symbol: ${symbol}.`);
    } else if (!model.generateStubs && !hasSymbol(supportSource, symbol)) {
      diagnostics.push(`${label} references source symbol ${symbol}, but it is not in the support snippets and generated stubs are off.`);
    }
  }
  if (["color-gfx", "mono-gfx", "u8g2", "character-lcd"].includes(profile.outputKind)) {
    if (!model.targetSettings.width || !model.targetSettings.height) diagnostics.push(`${profile.label} target needs non-zero width and height.`);
    if (!model.targetSettings.displayObject?.trim()) diagnostics.push(`${profile.label} target needs a display object name.`);
  }
  if (profile.outputKind === "color-gfx" && model.targetSettings.width < 220 && model.targetSettings.skinId === "rover-console") {
    diagnostics.push(`${profile.label} uses a compact RoverConsole layout because the display is smaller than 220 pixels wide.`);
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
  if (symbol === "formatFirmware") return "v0.5.5";
  if (symbol === "formatUptime") return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`;
  return String(value);
}

function previewChoice(choice) {
  const before = previewSignature();
  const menuId = currentPreviewMenuId();
  const rows = visibleItemsForMenu(menuId);
  if (!rows.length) {
    if ((choice === Choice.Cancel || choice === Choice.Left) && preview.stack.length > 1) {
      preview.stack.pop();
    }
    preview.needsRender = preview.needsRender || before !== previewSignature();
    renderPreview();
    return;
  }
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
    preview.needsRender = preview.needsRender || before !== previewSignature();
    renderPreview();
    return;
  }
  if (choice === Choice.Up) {
    setPreviewSelected(menuId, nextSelectableIndex(rows, selected, -1, model.targetSettings.navigationWrap), rows.length);
  } else if (choice === Choice.Down) {
    setPreviewSelected(menuId, nextSelectableIndex(rows, selected, 1, model.targetSettings.navigationWrap), rows.length);
  } else if (choice === Choice.Cancel) {
    if (preview.stack.length > 1) preview.stack.pop();
  } else if (choice === Choice.Left) {
    if (preview.stack.length > 1) preview.stack.pop();
  } else if (choice === Choice.Right) {
    if (item) activatePreviewItem(item);
  } else if (choice === Choice.Select) {
    if (item) activatePreviewItem(item);
  }
  preview.needsRender = preview.needsRender || before !== previewSignature();
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
  if (next === preview.values[key]) return;
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
  if (els.outputSelect.value === "targetSketch") {
    return generateSelectedTargetFiles().sketchName || "BetterMenuTarget.ino";
  }
  if (els.outputSelect.value === "targetAssets") {
    return generateSelectedTargetFiles().assetName || "BetterMenuTargetAssets.txt";
  }
  const map = {
    firmwareDeclaration: "BetterMenuDeclaration.h",
    firmwareSketch: "BetterMenuSerialDemo.ino",
    ansiSketch: "BetterMenuAnsiSerialDemo.ino",
    stdioProgram: "BetterMenuStdioDemo.cpp",
    wasmBridgeCpp: "bettermenu_wasm.cpp",
    webPackageFiles: "web-package-manifest.json",
    targetSketch: "BetterMenuTarget.ino",
    targetAssets: "BetterMenuTargetAssets.h",
    adafruitSketch: "BetterMenuAdafruitILI9341.ino",
    adafruitAssets: "BetterMenuRgb565Assets.h",
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

function ensureStatusWidget(type) {
  let widget = firstStatusWidget(model.statusWidgets, type, { enabledOnly: false });
  if (!widget) {
    widget = defaultStatusWidget(type);
    model.statusWidgets.push(widget);
  }
  widget.enabled = true;
  model.statusWidgets = normalizeStatusWidgets(model.statusWidgets);
  return firstStatusWidget(model.statusWidgets, type, { enabledOnly: false });
}

function setStatusWidgetEnabled(type, enabled) {
  if (enabled) {
    ensureStatusWidget(type);
  } else {
    for (const widget of model.statusWidgets) {
      if (widget.type === type) widget.enabled = false;
    }
  }
  model.statusWidgets = normalizeStatusWidgets(model.statusWidgets);
  resetPreviewOutput();
  renderAll();
}

function handleStatusWidgetInput(event) {
  const enabledToggle = event.target.closest("[data-status-enabled]");
  if (enabledToggle) {
    setStatusWidgetEnabled(enabledToggle.dataset.statusEnabled, enabledToggle.checked);
    return;
  }
  const field = event.target.closest("[data-status-prop]");
  if (!field) return;
  const widget = ensureStatusWidget(field.dataset.statusType);
  if (!widget) return;
  const prop = field.dataset.statusProp;
  widget[prop] = field.type === "number" ? numberOr(field.value, 0) : field.value;
  model.statusWidgets = normalizeStatusWidgets(model.statusWidgets);
  resetPreviewOutput();
  renderPreview();
  renderOutput();
  renderInstructions();
  saveModel();
}

function updateTargetSetting(prop, value) {
  if (["width", "height", "rotation", "originRow", "originCol", "serialBaud", "buttonDebounceMs"].includes(prop)) {
    model.targetSettings[prop] = numberOr(value, 0);
  } else {
    model.targetSettings[prop] = value;
  }
  model.targetSettings = normalizeTargetSettings(model.targetSettings);
  model.previewSettings.skinId = model.targetSettings.skinId;
  resetPreviewOutput();
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
  els.statusWidgetEditor.addEventListener("input", handleStatusWidgetInput);
  els.statusWidgetEditor.addEventListener("change", handleStatusWidgetInput);
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
    resetPreviewOutput();
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
  document.querySelectorAll("[data-target-key]").forEach((field) => {
    field.addEventListener("input", () => {
      model.targetSettings.serialKeyMap[field.dataset.targetKey] = field.value;
      model.targetSettings = normalizeTargetSettings(model.targetSettings);
      renderAll();
    });
  });
  document.querySelectorAll("[data-target-button-pin]").forEach((field) => {
    field.addEventListener("input", () => {
      model.targetSettings.buttonPins[field.dataset.targetButtonPin] = field.value;
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
    const menuId = currentPreviewMenuId();
    const rows = visibleItemsForMenu(menuId);
    const index = Number(row.dataset.previewIndex);
    const item = rows[index];
    if (!item || isDisabled(item)) return;
    setPreviewSelected(menuId, index, rows.length);
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
