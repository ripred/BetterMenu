const Choice = {
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

const Type = {
  Func: 0,
  Menu: 1,
  Int: 2,
  Bool: 3,
  Select: 4,
  Value: 5
};

const Flags = {
  Selected: 1 << 0,
  Editing: 1 << 1,
  Disabled: 1 << 2,
  HasChild: 1 << 3,
  BackAvailable: 1 << 4,
  ScrollUp: 1 << 5,
  ScrollDown: 1 << 6
};

let menuElement;
let contentPanel;
let titleElement;
let bodyElement;
let content = {};
let icons = {};
let wasmPath = "./bettermenu_demo.wasm";
let wasm;
let memory;
let resizeFrame = 0;

function iconUrl(name) {
  return `url("./icons/${name}.svg")`;
}

function applyIcon(element, name) {
  element.style.setProperty("--icon-url", iconUrl(name));
}

function maskedIcon(name, className) {
  const icon = document.createElement("span");
  icon.className = className;
  icon.setAttribute("aria-hidden", "true");
  applyIcon(icon, name);
  return icon;
}

function batteryTone(percent) {
  if (percent > 50) return "good";
  if (percent > 20) return "warn";
  return "low";
}

function renderHeader(text, flags) {
  const header = document.createElement("div");
  header.className = "menu-header";
  if (flags & Flags.BackAvailable) header.classList.add("has-back");

  const titleGroup = document.createElement("div");
  titleGroup.className = "header-title-group";

  const affordance = document.createElement("span");
  affordance.className = "header-affordance";
  affordance.setAttribute("aria-hidden", "true");
  if (flags & Flags.BackAvailable) applyIcon(affordance, "back");
  titleGroup.append(affordance);

  const title = document.createElement("div");
  title.className = "header-title";
  const parts = text.split("/");
  if (parts.length > 1) {
    const root = document.createElement("span");
    root.className = "crumb";
    root.textContent = parts[0];
    const sep = document.createElement("span");
    sep.className = "crumb-separator";
    sep.textContent = ">";
    const leaf = document.createElement("strong");
    leaf.textContent = parts.slice(1).join(" / ");
    title.append(root, sep, leaf);
  } else {
    title.textContent = text;
  }
  titleGroup.append(title);

  const stateGroup = document.createElement("div");
  stateGroup.className = "header-state-group";

  const armed = wasm.bm_armed() !== 0;
  const chip = document.createElement("span");
  chip.className = `state-chip ${armed ? "armed" : "ready"}`;
  chip.innerHTML = `<span aria-hidden="true"></span>${armed ? "ARMED" : "READY"}`;

  const percent = wasm.bm_battery_percent();
  const battery = document.createElement("span");
  battery.className = `battery-meter ${batteryTone(percent)}`;
  battery.setAttribute("aria-label", `Battery ${percent}%`);

  const batteryText = document.createElement("span");
  batteryText.className = "battery-percent";
  batteryText.textContent = `${percent}%`;

  const batteryCase = document.createElement("span");
  batteryCase.className = "battery-case";
  const batteryFill = document.createElement("span");
  batteryFill.className = "battery-fill";
  batteryFill.style.width = `${percent}%`;
  batteryCase.append(batteryFill);
  battery.append(batteryText, batteryCase);

  stateGroup.append(chip, battery);
  header.append(titleGroup, stateGroup);
  return header;
}

function sendChoice(choice) {
  if (!wasm) return;
  wasm.bm_send_choice(choice);
  render();
}

function editButton(choice, iconName, label) {
  const button = document.createElement("button");
  button.className = "edit-button";
  button.type = "button";
  button.setAttribute("aria-label", label);
  applyIcon(button, iconName);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    sendChoice(choice);
  });
  return button;
}

function editControls(valueText) {
  const controls = document.createElement("span");
  controls.className = "edit-controls";
  const value = document.createElement("span");
  value.className = "edit-value";
  value.textContent = valueText;
  controls.append(
    editButton(Choice.Left, "minus", "Decrease value"),
    value,
    editButton(Choice.Right, "plus", "Increase value")
  );
  return controls;
}

function renderScrollbar() {
  const total = wasm.bm_visible_total();
  const windowSize = wasm.bm_visible_window();
  if (total <= windowSize || windowSize <= 0) return null;

  const track = document.createElement("div");
  track.className = "menu-scrollbar";
  track.setAttribute("aria-hidden", "true");

  const thumb = document.createElement("span");
  const thumbHeight = Math.max(18, Math.round((windowSize / total) * 100));
  const denom = Math.max(1, total - windowSize);
  const top = Math.round(((100 - thumbHeight) * wasm.bm_visible_top()) / denom);
  thumb.style.height = `${thumbHeight}%`;
  thumb.style.top = `${top}%`;
  track.append(thumb);
  return track;
}

function readCString(ptr) {
  if (!ptr) return "";
  const bytes = new Uint8Array(memory.buffer);
  let end = ptr;
  while (bytes[end] !== 0) {
    end += 1;
  }
  return new TextDecoder().decode(bytes.subarray(ptr, end));
}

function parseLine(text) {
  let clean = text.replace(/^>\s*/, "").trim();
  clean = clean.replace(/\s+\(edit\)$/, "");
  const parts = clean.split(": ");
  return {
    label: parts[0] || clean,
    value: parts.length > 1 ? parts.slice(1).join(": ") : ""
  };
}

function selectedLabel(rows) {
  const selected = rows.find((row) => row.flags & Flags.Selected);
  return selected ? parseLine(selected.text).label : "";
}

function updateContent(rows) {
  const label = selectedLabel(rows);
  const entry = content[label] || [
    label || "BetterMenu",
    "This content pane is ordinary HTML keyed from the row currently selected by the C++ BetterMenu runtime."
  ];
  titleElement.textContent = entry[0];
  bodyElement.textContent = entry[1];
}

function reserveContentPanelHeight() {
  if (!contentPanel) return;

  const rect = contentPanel.getBoundingClientRect();
  if (!rect.width) return;

  const probe = document.createElement("section");
  probe.className = "content-panel content-measure";
  probe.style.width = `${rect.width}px`;
  probe.innerHTML = `
    <p class="eyebrow">Dynamic content pane</p>
    <h2></h2>
    <p class="measure-body"></p>
  `;
  const facts = document.querySelector(".facts");
  if (facts) {
    probe.append(facts.cloneNode(true));
  }
  document.body.append(probe);

  let maxHeight = 0;
  Object.values(content).forEach(([title, body]) => {
    probe.querySelector("h2").textContent = title;
    probe.querySelector(".measure-body").textContent = body;
    maxHeight = Math.max(maxHeight, probe.getBoundingClientRect().height);
  });

  probe.remove();
  if (maxHeight > 0) {
    contentPanel.style.minHeight = `${Math.ceil(maxHeight)}px`;
  }
}

function render() {
  const rows = [];
  const count = wasm.bm_row_count();
  menuElement.textContent = "";

  for (let i = 0; i < count; i += 1) {
    const kind = wasm.bm_row_kind(i);
    const flags = wasm.bm_row_flags(i);
    const type = wasm.bm_row_entry_type(i);
    const editable = wasm.bm_row_editable(i) !== 0;
    const text = readCString(wasm.bm_row_text_ptr(i));
    rows.push({ kind, flags, type, text, editable });

    if (kind === Kind.Blank) continue;
    if (kind === Kind.Title) {
      menuElement.append(renderHeader(text, flags));
      continue;
    }

    const row = document.createElement("div");
    row.className = "row";
    if (flags & Flags.Selected) row.classList.add("selected");
    if (flags & Flags.Editing) row.classList.add("editing");
    if (flags & Flags.Disabled) row.classList.add("disabled");
    if (type === Type.Menu || flags & Flags.HasChild) row.classList.add("menu");
    if (editable) row.classList.add("editable");
    if (!editable && type === Type.Value) row.classList.add("readonly");
    if (type === Type.Bool || type === Type.Select) row.classList.add("choice");

    const parsed = parseLine(text);
    if (parsed.label === "E-STOP") row.classList.add("alert");
    row.append(maskedIcon(icons[parsed.label] || "dot", "row-icon"));

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = parsed.label;
    row.append(label);

    if (flags & Flags.Editing && parsed.value) {
      row.append(editControls(parsed.value));
    } else {
      const value = document.createElement("span");
      value.className = "value";
      if (type === Type.Menu || flags & Flags.HasChild) {
        value.classList.add("value-icon");
        applyIcon(value, "chevron-right");
      } else {
        value.textContent = parsed.value;
        if (flags & Flags.Disabled) {
          value.append(maskedIcon("lock", "value-lock"));
        }
      }
      row.append(value);
    }

    row.addEventListener("click", () => {
      wasm.bm_send_row(i, 1);
      render();
    });

    menuElement.append(row);
  }

  const scrollbar = renderScrollbar();
  if (scrollbar) menuElement.append(scrollbar);
  updateContent(rows);
}

async function init() {
  const response = await fetch(wasmPath);
  let result;
  try {
    result = await WebAssembly.instantiateStreaming(Promise.resolve(response.clone()), {});
  } catch {
    result = await WebAssembly.instantiate(await response.arrayBuffer(), {});
  }
  wasm = result.instance.exports;
  memory = wasm.memory;
  wasm.bm_init();
  reserveContentPanelHeight();
  render();
}

function onResize() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(reserveContentPanelHeight);
}

function onKeydown(event) {
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
}

export function initWebMenuDomAdapter(options = {}) {
  content = options.content || {};
  icons = options.icons || {};
  wasmPath = options.wasmPath || wasmPath;
  menuElement = document.querySelector(options.menuSelector || "#menu");
  contentPanel = document.querySelector(options.contentPanelSelector || ".content-panel");
  titleElement = document.querySelector(options.titleSelector || "#content-title");
  bodyElement = document.querySelector(options.bodySelector || "#content-body");

  if (!menuElement || !contentPanel || !titleElement || !bodyElement) {
    throw new Error("Web menu adapter could not find the required DOM elements.");
  }

  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", onKeydown);

  if (document.fonts) {
    document.fonts.ready.then(reserveContentPanelHeight);
  }

  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      sendChoice(Number(button.dataset.choice));
    });
  });

  init().catch((error) => {
    titleElement.textContent = "Runtime unavailable";
    bodyElement.textContent = String(error);
    console.error(error);
  });
}
