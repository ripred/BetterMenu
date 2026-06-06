import assert from "node:assert/strict";

import {
  defaultRoverAssets,
  makeSvgAsset,
  safeAssetName,
  sanitizeSvgSource
} from "../docs/menu-builder/asset_utils.mjs";
import {
  TARGET_PROFILES,
  defaultTargetSettings,
  normalizeTargetSettings,
  profileInstructions,
  targetProfileById
} from "../docs/menu-builder/target_profiles.mjs";

assert.equal(targetProfileById("arduino-serial").capabilities.text, true);
assert.equal(targetProfileById("adafruit-ili9341-320x240-spi").capabilities.bitmap, true);
assert.equal(TARGET_PROFILES.length, 5);
assert.equal(targetProfileById("arduino-serial").previewRendererId, "serial-stream");
assert.equal(targetProfileById("arduino-ansi-serial").previewRendererId, "ansi-terminal");
assert.equal(targetProfileById("desktop-stdio").previewRendererId, "stdio-screen");
assert.equal(targetProfileById("web-dom-wasm").previewRendererId, "web-dom");
assert.equal(targetProfileById("adafruit-ili9341-320x240-spi").previewRendererId, "graphical-viewport");

const serialDefaults = defaultTargetSettings("arduino-serial");
assert.equal(serialDefaults.width, 32);
assert.equal(serialDefaults.height, 8);
assert.equal(serialDefaults.serialBaud, 115200);
assert.equal(serialDefaults.serialAutoscroll, true);
assert.equal(serialDefaults.serialTimestamps, false);

const ansiDefaults = defaultTargetSettings("arduino-ansi-serial");
assert.equal(ansiDefaults.width, 48);
assert.equal(ansiDefaults.height, 8);
assert.equal(ansiDefaults.originRow, 1);
assert.equal(ansiDefaults.originCol, 1);
assert.equal(ansiDefaults.serialBaud, 115200);
assert.equal(ansiDefaults.ansiColor, true);
assert.equal(ansiDefaults.ansiHideCursor, true);
assert.equal(ansiDefaults.ansiClearOnBegin, true);

const stdioDefaults = defaultTargetSettings("desktop-stdio");
assert.equal(stdioDefaults.width, 60);
assert.equal(stdioDefaults.height, 8);

const adafruitDefaults = defaultTargetSettings("adafruit-ili9341-320x240-spi");
assert.equal(adafruitDefaults.width, 320);
assert.equal(adafruitDefaults.height, 240);
assert.equal(adafruitDefaults.pins.cs, "TFT_CS");
assert.equal(adafruitDefaults.navigationWrap, false);
assert.equal(adafruitDefaults.serialBaud, 115200);

const normalized = normalizeTargetSettings({
  profileId: "adafruit-ili9341-320x240-spi",
  width: "320",
  height: "240",
  displayObject: "main display",
  pins: { cs: "5", dc: "TFT DC", rst: "TFT_RST" }
});
assert.equal(normalized.displayObject, "main_display");
assert.equal(normalized.pins.cs, "_5");
assert.equal(normalized.pins.dc, "TFT_DC");
assert.equal(normalized.navigationWrap, false);

const wrapNavigation = normalizeTargetSettings({
  profileId: "arduino-serial",
  navigationWrap: true,
  serialBaud: "57600",
  serialAutoscroll: false,
  serialTimestamps: true
});
assert.equal(wrapNavigation.navigationWrap, true);
assert.equal(wrapNavigation.serialBaud, 57600);
assert.equal(wrapNavigation.serialAutoscroll, false);
assert.equal(wrapNavigation.serialTimestamps, true);

assert.match(profileInstructions(targetProfileById("desktop-stdio")).join("\n"), /getchar/);
assert.match(profileInstructions(targetProfileById("arduino-ansi-serial")).join("\n"), /ANSI terminal/);

const safeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/></svg>`;
const sanitized = sanitizeSvgSource(safeSvg);
assert.equal(sanitized.width, 24);
assert.equal(sanitized.height, 24);

assert.throws(() => sanitizeSvgSource(`<svg onload="alert(1)"></svg>`), /event attributes/);
assert.throws(() => sanitizeSvgSource(`<svg><script>alert(1)</script></svg>`), /scripts/);
assert.throws(() => sanitizeSvgSource(`<svg><foreignObject></foreignObject></svg>`), /foreignObject/);

assert.equal(safeAssetName("Battery % Icon"), "Battery_Icon");
assert.equal(makeSvgAsset("dot", safeSvg).safeName, "dot");
assert.ok(defaultRoverAssets().some((asset) => asset.key === "battery"));
