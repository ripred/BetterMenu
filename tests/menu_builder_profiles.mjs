import assert from "node:assert/strict";

import {
  TARGET_PROFILES,
  defaultTargetSettings,
  normalizeTargetSettings,
  profileInstructions,
  targetProfileById
} from "../docs/menu-builder/target_profiles.mjs";

const expectedProfiles = {
  "arduino-serial": ["serial-stream", "arduino-serial", "none"],
  "arduino-ansi-serial": ["ansi-terminal", "arduino-ansi-serial", "none"],
  "desktop-stdio": ["stdio-screen", "desktop-stdio", "none"],
  "web-dom-wasm": ["web-dom", "web-dom-wasm", "web"],
  "adafruit-ili9341-320x240-spi": ["graphical-viewport", "color-gfx", "rgb565"],
  "adafruit-st7789-240x240-spi": ["graphical-viewport", "color-gfx", "rgb565"],
  "adafruit-st7735-160x128-spi": ["graphical-viewport", "color-gfx", "rgb565"],
  "adafruit-ssd1306-128x64-i2c": ["monochrome-viewport", "mono-gfx", "mono1"],
  "adafruit-sh110x-128x64-i2c": ["monochrome-viewport", "mono-gfx", "mono1"],
  "tft-espi-320x240": ["graphical-viewport", "color-gfx", "rgb565"],
  "tft-espi-cyd-320x240": ["graphical-viewport", "color-gfx", "rgb565"],
  "u8g2-ssd1306-128x64-i2c": ["monochrome-viewport", "u8g2", "mono1"],
  "u8g2-ssd1306-128x32-i2c": ["monochrome-viewport", "u8g2", "mono1"],
  "liquidcrystal-16x2": ["character-lcd", "character-lcd", "none"],
  "liquidcrystal-20x4": ["character-lcd", "character-lcd", "none"],
  "hd44780-i2c-20x4": ["character-lcd", "character-lcd", "none"]
};

for (const [id, [previewRendererId, outputKind, assetEncoding]] of Object.entries(expectedProfiles)) {
  const profile = targetProfileById(id);
  assert.equal(profile.id, id);
  assert.equal(profile.previewRendererId, previewRendererId);
  assert.equal(profile.outputKind, outputKind);
  assert.equal(profile.assetEncoding, assetEncoding);
  assert.ok(profile.files.length > 0, `${id} should declare generated files`);
  assert.ok(profile.includes.includes("BetterMenu.h"), `${id} should include BetterMenu.h`);
  assert.ok(profileInstructions(profile).join("\n").includes(profile.label));
}

assert.equal(TARGET_PROFILES.length, Object.keys(expectedProfiles).length);
assert.equal(defaultTargetSettings("desktop-stdio").inputAdapter, "stdio-keys");
assert.equal(defaultTargetSettings("liquidcrystal-16x2").inputAdapter, "gpio-buttons");
assert.equal(defaultTargetSettings("adafruit-ili9341-320x240-spi").inputAdapter, "serial-keys");

const normalized = normalizeTargetSettings({
  profileId: "u8g2-ssd1306-128x32-i2c",
  width: "128",
  height: "32",
  displayObject: "oled-display",
  inputAdapter: "gpio-buttons",
  buttonPins: {
    up: "D2",
    down: "D3",
    select: "D4",
    cancel: "D5",
    left: "",
    right: ""
  }
});

assert.equal(normalized.profileId, "u8g2-ssd1306-128x32-i2c");
assert.equal(normalized.width, 128);
assert.equal(normalized.height, 32);
assert.equal(normalized.displayObject, "oled_display");
assert.equal(normalized.inputAdapter, "gpio-buttons");
assert.equal(normalized.buttonPins.left, "MENU_BUTTON_UNUSED");
assert.equal(normalized.buttonPins.right, "MENU_BUTTON_UNUSED");
