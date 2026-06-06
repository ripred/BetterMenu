const SVG_PREFIX = "data:image/svg+xml;charset=utf-8,";

export const BUILTIN_ICON_SVGS = {
  battery: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="17" height="10" rx="2"/><path d="M22 10v4"/><path d="M7 12h6"/><path d="m11 9-3 3 3 3"/></svg>`,
  beam: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5a8 8 0 0 0 0 14"/><path d="M7 5v14"/><path d="M13 8h7"/><path d="M13 12h8"/><path d="M13 16h7"/></svg>`,
  broadcast: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2" fill="#000" stroke="none"/><path d="M8 8a6 6 0 0 0 0 8"/><path d="M16 8a6 6 0 0 1 0 8"/><path d="M5 5a10 10 0 0 0 0 14"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>`,
  chip: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 2v3"/><path d="M15 2v3"/><path d="M9 19v3"/><path d="M15 19v3"/><path d="M2 9h3"/><path d="M2 15h3"/><path d="M19 9h3"/><path d="M19 15h3"/><rect x="10" y="10" width="4" height="4" rx="1" fill="#000" stroke="none"/></svg>`,
  clock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l4 2"/><circle cx="12" cy="12" r="1.5" fill="#000" stroke="none"/></svg>`,
  compass: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="m12 4-3 9 3-2 3 2-3-9z" fill="#000" stroke="none"/><path d="M12 13v7"/><circle cx="12" cy="12" r="1.5" fill="#000" stroke="none"/></svg>`,
  crosshair: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="6"/><path d="M12 2v5"/><path d="M12 17v5"/><path d="M2 12h5"/><path d="M17 12h5"/><circle cx="12" cy="12" r="1.5" fill="#000" stroke="none"/></svg>`,
  flip: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M8 2h7a4 4 0 0 1 4 4"/><path d="m16 2 3 4 3-4"/><path d="M16 22H9a4 4 0 0 1-4-4"/><path d="m8 22-3-4-3 4"/></svg>`,
  gear: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.9 4.9 2.8 2.8"/><path d="m16.3 16.3 2.8 2.8"/><path d="m19.1 4.9-2.8 2.8"/><path d="m7.7 16.3-2.8 2.8"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2" fill="#000" stroke="none"/></svg>`,
  level: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M5 15 19 9"/><circle cx="13" cy="11" r="2" fill="#000" stroke="none"/></svg>`,
  radar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8"/><path d="M12 12 18 6"/><circle cx="16" cy="8" r="1.5" fill="#000" stroke="none"/></svg>`,
  save: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h13l2 2v16H5z"/><path d="M8 3v6h8V3"/><path d="M8 14h8v7H8z"/><path d="M13 5h3v3h-3z" fill="#000" stroke="none"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 19 6v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="m8.5 12 2.5 2.5 5-5"/></svg>`,
  slider: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8v8"/><path d="M20 8v8"/><circle cx="15" cy="12" r="3" fill="#000" stroke="none"/></svg>`,
  sliders: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/><circle cx="14" cy="7" r="2.2" fill="#000" stroke="none"/><circle cx="9" cy="12" r="2.2" fill="#000" stroke="none"/><circle cx="16" cy="17" r="2.2" fill="#000" stroke="none"/></svg>`,
  speed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16 17 9"/><circle cx="12" cy="16" r="2" fill="#000" stroke="none"/></svg>`,
  stop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><circle cx="12" cy="12" r="4" fill="#000" stroke="none"/></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="m4.2 4.2 2.1 2.1"/><path d="m17.7 17.7 2.1 2.1"/><path d="m19.8 4.2-2.1 2.1"/><path d="m6.3 17.7-2.1 2.1"/></svg>`,
  swatch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6h10v14H5z"/><path d="m10 6 6-3 6 12-7 4"/><circle cx="10" cy="16" r="1.5" fill="#000" stroke="none"/></svg>`,
  thermo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0z"/><path d="M13 8v8"/><circle cx="13" cy="17" r="2" fill="#000" stroke="none"/></svg>`,
  tool: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5a5 5 0 0 0 6 6L11 21l-6-6 9.5-9.5z"/><path d="m6.5 13.5 6 6"/></svg>`,
  dot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="#000"/></svg>`,
  "chevron-right": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>`,
  back: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 14-5-5 5-5"/><path d="M4 9h9a6 6 0 1 1 0 12h-2"/></svg>`,
  minus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h12"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12"/><path d="M6 12h12"/></svg>`
};

export function defaultRoverAssets() {
  return Object.entries(BUILTIN_ICON_SVGS).map(([key, svg]) => makeSvgAsset(key, svg, "rowIcon"));
}

export function makeSvgAsset(key, svg, usage = "rowIcon") {
  const sanitized = sanitizeSvgSource(svg);
  return {
    id: `asset_${safeAssetName(key)}`,
    key,
    kind: "svg",
    source: sanitized.source,
    width: sanitized.width || 24,
    height: sanitized.height || 24,
    safeName: safeAssetName(key),
    usage,
    settings: {
      size: 18,
      threshold: 1,
      invertMask: false,
      fit: "contain",
      colorDepth: "rgb565"
    },
    encoded: null
  };
}

export function sanitizeSvgSource(svg) {
  const source = String(svg || "").trim();
  if (!source) {
    throw new Error("SVG source is empty.");
  }
  const checks = [
    [/<script\b/i, "SVG scripts are not allowed."],
    [/\son[a-z]+\s*=/i, "SVG event attributes are not allowed."],
    [/<foreignObject\b/i, "SVG foreignObject content is not allowed."],
    [/\b(?:href|src|xlink:href)\s*=\s*["']\s*(?:https?:|\/\/|javascript:|data:text\/html)/i, "SVG external or executable references are not allowed."]
  ];
  for (const [pattern, message] of checks) {
    if (pattern.test(source)) {
      throw new Error(message);
    }
  }
  if (!/^<svg[\s>]/i.test(source)) {
    throw new Error("SVG source must start with an svg element.");
  }
  const viewBox = /\bviewBox\s*=\s*["']([^"']+)["']/i.exec(source)?.[1]?.trim();
  const parts = viewBox ? viewBox.split(/\s+/).map(Number) : [];
  const width = parts.length === 4 && Number.isFinite(parts[2]) ? parts[2] : numericAttr(source, "width");
  const height = parts.length === 4 && Number.isFinite(parts[3]) ? parts[3] : numericAttr(source, "height");
  return {
    source,
    width: width || 24,
    height: height || 24
  };
}

export function safeAssetName(key) {
  return String(key || "asset")
    .trim()
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/^([^A-Za-z_])/, "_$1")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "asset";
}

export function assetCssUrl(asset) {
  if (!asset) return "";
  if (asset.kind === "svg") {
    return `${SVG_PREFIX}${encodeURIComponent(asset.source || "")}`;
  }
  return asset.source || "";
}

export function usedAssets(model) {
  const used = new Set();
  for (const item of model.items || []) {
    if (item.iconAssetId) used.add(item.iconAssetId);
  }
  for (const widget of model.statusWidgets || []) {
    if (widget.assetId) used.add(widget.assetId);
  }
  return (model.assets || []).filter((asset) => used.has(asset.id));
}

export async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("Unable to read file.")));
    reader.readAsDataURL(file);
  });
}

export async function encodeAssetForRgb565(asset, size = 18) {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return asset;
  }
  const source = assetCssUrl(asset);
  if (!source) return asset;
  const image = await loadImage(source);
  const width = Number(asset.settings?.size || size || 18);
  const height = width;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, width, height);
  const scale = Math.min(width / image.width, height / image.height);
  const drawW = Math.max(1, Math.round(image.width * scale));
  const drawH = Math.max(1, Math.round(image.height * scale));
  const x = Math.floor((width - drawW) / 2);
  const y = Math.floor((height - drawH) / 2);
  ctx.drawImage(image, x, y, drawW, drawH);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const maskPixels = asset.maskSource ? await maskPixelsFor(asset.maskSource, width, height) : null;
  const rgb565 = [];
  const mask = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    rgb565.push(toRgb565(pixels[i], pixels[i + 1], pixels[i + 2]));
    if (maskPixels) {
      const level = maskPixels[i + 3] > 0 ? (maskPixels[i] + maskPixels[i + 1] + maskPixels[i + 2]) / 3 : 0;
      const active = level > Number(asset.settings?.threshold || 1);
      mask.push(asset.settings?.invertMask ? Number(!active) : Number(active));
    } else {
      mask.push(alpha > Number(asset.settings?.threshold || 1) ? 1 : 0);
    }
  }
  asset.encoded = {
    width,
    height,
    rgb565,
    mask,
    flashBytes: rgb565.length * 2 + Math.ceil(mask.length / 8)
  };
  return asset;
}

export function formatRgb565Array(values, indent = "    ") {
  return formatHexArray(values, 16, 12, indent);
}

export function formatMaskArray(mask, indent = "    ") {
  const bytes = [];
  for (let i = 0; i < mask.length; i += 8) {
    let value = 0;
    for (let bit = 0; bit < 8; ++bit) {
      if (mask[i + bit]) value |= 1 << (7 - bit);
    }
    bytes.push(value);
  }
  return formatHexArray(bytes, 8, 16, indent);
}

function numericAttr(source, attr) {
  const value = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, "i").exec(source)?.[1];
  const number = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Unable to decode asset image.")));
    image.src = source;
  });
}

async function maskPixelsFor(source, width, height) {
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
}

function toRgb565(r, g, b) {
  return ((r & 0xf8) << 8) | ((g & 0xf8) << 3) | (b >> 3);
}

function formatHexArray(values, bits, perLine, indent) {
  const width = bits / 4;
  const formatted = values.map((value) => `0x${Number(value).toString(16).toUpperCase().padStart(width, "0")}`);
  const lines = [];
  for (let i = 0; i < formatted.length; i += perLine) {
    lines.push(`${indent}${formatted.slice(i, i + perLine).join(", ")}`);
  }
  return lines.join(",\n");
}
