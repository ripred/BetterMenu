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
assert.equal(TARGET_PROFILES.length, 4);

const adafruitDefaults = defaultTargetSettings("adafruit-ili9341-320x240-spi");
assert.equal(adafruitDefaults.width, 320);
assert.equal(adafruitDefaults.height, 240);
assert.equal(adafruitDefaults.pins.cs, "TFT_CS");
assert.equal(adafruitDefaults.navigationWrap, false);

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
  navigationWrap: true
});
assert.equal(wrapNavigation.navigationWrap, true);

assert.match(profileInstructions(targetProfileById("desktop-stdio")).join("\n"), /getchar/);

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
