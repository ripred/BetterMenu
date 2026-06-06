export const STATUS_WIDGET_TYPES = ["chip", "battery"];

export function defaultStatusWidget(type) {
  if (type === "battery") {
    return {
      id: "battery-status",
      type: "battery",
      label: "Battery",
      sourceSymbol: "battCentiV",
      min: 900,
      max: 1260
    };
  }
  return {
    id: "state-status",
    type: "chip",
    label: "State",
    sourceSymbol: "armed",
    falseLabel: "READY",
    trueLabel: "ARMED"
  };
}

export function normalizeStatusWidgets(widgets) {
  if (!Array.isArray(widgets)) return [];
  return widgets
    .filter((widget) => widget && typeof widget === "object")
    .map((widget, index) => normalizeStatusWidget(widget, index));
}

export function normalizeStatusWidget(widget, index = 0) {
  const rawType = textOrDefault(widget.type, "chip").trim();
  const type = rawType || "chip";
  const defaults = STATUS_WIDGET_TYPES.includes(type)
    ? defaultStatusWidget(type)
    : {
        id: `status-widget-${index + 1}`,
        type,
        label: "Status",
        sourceSymbol: ""
      };
  const normalized = {
    ...widget,
    id: safeStatusWidgetId(type, widget.id || defaults.id),
    type,
    label: textOrDefault(widget.label, defaults.label),
    sourceSymbol: textOrDefault(widget.sourceSymbol, defaults.sourceSymbol)
  };
  if ("enabled" in widget) {
    normalized.enabled = widget.enabled !== false;
  }
  if (type === "chip") {
    normalized.falseLabel = textOrDefault(widget.falseLabel, defaults.falseLabel);
    normalized.trueLabel = textOrDefault(widget.trueLabel, defaults.trueLabel);
  } else if (type === "battery") {
    normalized.min = numberOr(widget.min, defaults.min);
    normalized.max = numberOr(widget.max, defaults.max);
  }
  return normalized;
}

export function isStatusWidgetEnabled(widget) {
  return Boolean(widget) && widget.enabled !== false;
}

export function firstStatusWidget(widgets, type, options = {}) {
  const enabledOnly = options.enabledOnly !== false;
  return (widgets || []).find((widget) => (
    widget?.type === type && (!enabledOnly || isStatusWidgetEnabled(widget))
  )) || null;
}

export function activeStatusWidgets(widgets) {
  return (widgets || []).filter(isStatusWidgetEnabled);
}

export function statusWidgetDiagnostics(widgets) {
  const diagnostics = [];
  const active = activeStatusWidgets(widgets);
  for (const type of STATUS_WIDGET_TYPES) {
    const matching = active.filter((widget) => widget.type === type);
    const [widget] = matching;
    if (matching.length > 1) {
      diagnostics.push(`Only the first active ${statusWidgetLabel(type)} status widget is rendered.`);
    }
    if (!widget) continue;
    if (!String(widget.sourceSymbol || "").trim()) {
      diagnostics.push(`${statusWidgetLabel(type)} status widget needs a source symbol.`);
    }
    if (type === "battery" && numberOr(widget.max, 0) <= numberOr(widget.min, 0)) {
      diagnostics.push("Battery status widget max must be greater than min.");
    }
  }
  for (const widget of active) {
    if (!STATUS_WIDGET_TYPES.includes(widget.type)) {
      diagnostics.push(`Status widget ${widget.id || widget.type} has unsupported type ${widget.type || "(missing)"}.`);
    }
  }
  return diagnostics;
}

function textOrDefault(value, fallback) {
  return value == null ? String(fallback || "") : String(value);
}

function numberOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeStatusWidgetId(type, value) {
  const fallback = `${type || "status"}-status`;
  return String(value || fallback)
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

function statusWidgetLabel(type) {
  return type === "battery" ? "Battery" : "Chip";
}
