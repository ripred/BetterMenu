export const TARGET_PROFILES = [
  {
    id: "arduino-serial",
    label: "Arduino Serial",
    family: "Text",
    defaultSkinId: "text-rows",
    previewRendererId: "serial-stream",
    capabilities: {
      text: true,
      graphical: false,
      terminal: false,
      color: false,
      monochrome: false,
      bitmap: false,
      mask: false,
      statusWidgets: false,
      customInput: true
    },
    files: ["BetterMenuSerialDemo.ino"],
    includes: ["BetterMenu.h"],
    dependencies: ["Arduino core"],
    input: "Serial keys through make_serial_keys_input",
    display: "Print display through make_print_display",
    memory: "Assets are ignored because this is a text target.",
    outputKind: "arduino-serial",
    assetEncoding: "none",
    defaults: {
      width: 32,
      height: 8,
      serialBaud: 115200
    }
  },
  {
    id: "arduino-ansi-serial",
    label: "ANSI Serial Terminal",
    family: "Terminal",
    defaultSkinId: "text-rows",
    previewRendererId: "ansi-terminal",
    capabilities: {
      text: true,
      graphical: false,
      terminal: true,
      color: true,
      monochrome: false,
      bitmap: false,
      mask: false,
      statusWidgets: false,
      customInput: true
    },
    files: ["BetterMenuAnsiSerialDemo.ino"],
    includes: ["BetterMenu.h"],
    dependencies: ["Arduino core", "ANSI-capable serial terminal"],
    input: "Serial keys through make_serial_keys_input",
    display: "ANSI terminal region over Arduino Print",
    memory: "Assets are ignored because this is a terminal text target.",
    outputKind: "arduino-ansi-serial",
    assetEncoding: "none",
    defaults: {
      width: 48,
      height: 8,
      originRow: 1,
      originCol: 1,
      serialBaud: 115200,
      ansiColor: true,
      ansiHideCursor: true,
      ansiClearOnBegin: true
    }
  },
  {
    id: "desktop-stdio",
    label: "Desktop C++ stdio",
    family: "Text",
    defaultSkinId: "text-rows",
    previewRendererId: "stdio-screen",
    capabilities: {
      text: true,
      graphical: false,
      terminal: false,
      color: false,
      monochrome: false,
      bitmap: false,
      mask: false,
      statusWidgets: false,
      customInput: true
    },
    files: ["BetterMenuStdioDemo.cpp"],
    includes: ["BetterMenu.h", "stdint.h", "stdio.h"],
    dependencies: ["C++11 compiler"],
    input: "getchar key loop",
    display: "callback display using puts/fputs",
    memory: "Assets are ignored because this is a text target.",
    outputKind: "desktop-stdio",
    assetEncoding: "none",
    defaults: {
      width: 60,
      height: 8
    }
  },
  {
    id: "web-dom-wasm",
    label: "Web DOM + WebAssembly",
    family: "Web",
    defaultSkinId: "rover-console",
    previewRendererId: "web-dom",
    capabilities: {
      text: true,
      graphical: true,
      terminal: false,
      color: true,
      monochrome: false,
      bitmap: true,
      mask: true,
      statusWidgets: true,
      customInput: true
    },
    files: ["index.html", "demo.js", "styles.css", "bettermenu_wasm.cpp", "icons/*.svg"],
    includes: ["BetterMenu.h"],
    dependencies: ["A local wasm32-capable C++ compiler for the generated bridge"],
    input: "DOM buttons mapped to BetterMenu choices",
    display: "DOM renderer using captured BetterMenu render rows",
    memory: "SVG and raster assets remain browser static files.",
    outputKind: "web-dom-wasm",
    assetEncoding: "web"
  },
  {
    id: "adafruit-ili9341-320x240-spi",
    label: "Adafruit ILI9341 320x240 SPI",
    family: "Adafruit_GFX",
    defaultSkinId: "rover-console",
    previewRendererId: "graphical-viewport",
    capabilities: {
      text: true,
      graphical: true,
      terminal: false,
      color: true,
      monochrome: false,
      bitmap: true,
      mask: true,
      statusWidgets: true,
      customInput: true
    },
    files: ["BetterMenuAdafruitILI9341.ino", "BetterMenuRgb565Assets.h"],
    includes: ["SPI.h", "Adafruit_GFX.h", "Adafruit_ILI9341.h", "BetterMenu.h"],
    dependencies: ["Adafruit GFX Library", "Adafruit ILI9341", "Adafruit BusIO"],
    input: "Serial keys by default so display wiring stays independent",
    display: "Adafruit_GFX primitives mapped from the RoverConsole skin",
    memory: "Used color assets are emitted as RGB565 PROGMEM arrays with optional 1-bit masks.",
    outputKind: "color-gfx",
    assetEncoding: "rgb565",
    displayDriver: {
      family: "Adafruit_GFX",
      includeLines: ["#include <SPI.h>", "#include <Adafruit_GFX.h>", "#include <Adafruit_ILI9341.h>"],
      constructor: "static Adafruit_ILI9341 {display}({cs}, {dc}, {rst});",
      setupLines: ["{display}.begin();"],
      pinDefines: [["{cs}", "10"], ["{dc}", "9"], ["{rst}", "8"]],
      assetHeader: "BetterMenuRgb565Assets.h",
      sketchFile: "BetterMenuAdafruitILI9341.ino"
    },
    defaults: {
      width: 320,
      height: 240,
      rotation: 1,
      displayObject: "tft",
      pins: {
        cs: "TFT_CS",
        dc: "TFT_DC",
        rst: "TFT_RST"
      },
      serialBaud: 115200
    }
  },
  {
    id: "adafruit-st7789-240x240-spi",
    label: "Adafruit ST7789 240x240 SPI",
    family: "Adafruit_GFX",
    defaultSkinId: "rover-console",
    previewRendererId: "graphical-viewport",
    capabilities: {
      text: true,
      graphical: true,
      terminal: false,
      color: true,
      monochrome: false,
      bitmap: true,
      mask: true,
      statusWidgets: true,
      customInput: true
    },
    files: ["BetterMenuAdafruitST7789.ino", "BetterMenuRgb565Assets.h"],
    includes: ["SPI.h", "Adafruit_GFX.h", "Adafruit_ST7789.h", "BetterMenu.h"],
    dependencies: ["Adafruit GFX Library", "Adafruit ST7789", "Adafruit BusIO"],
    input: "Serial keys by default so display wiring stays independent",
    display: "Adafruit_GFX primitives mapped from the RoverConsole skin",
    memory: "Used color assets are emitted as RGB565 PROGMEM arrays with optional 1-bit masks.",
    outputKind: "color-gfx",
    assetEncoding: "rgb565",
    displayDriver: {
      family: "Adafruit_GFX",
      includeLines: ["#include <SPI.h>", "#include <Adafruit_GFX.h>", "#include <Adafruit_ST7789.h>"],
      constructor: "static Adafruit_ST7789 {display}({cs}, {dc}, {rst});",
      setupLines: ["{display}.init({width}, {height});"],
      pinDefines: [["{cs}", "10"], ["{dc}", "9"], ["{rst}", "8"]],
      assetHeader: "BetterMenuRgb565Assets.h",
      sketchFile: "BetterMenuAdafruitST7789.ino"
    },
    defaults: {
      width: 240,
      height: 240,
      rotation: 0,
      displayObject: "tft",
      pins: { cs: "TFT_CS", dc: "TFT_DC", rst: "TFT_RST" },
      serialBaud: 115200
    }
  },
  {
    id: "adafruit-st7735-160x128-spi",
    label: "Adafruit ST7735 160x128 SPI",
    family: "Adafruit_GFX",
    defaultSkinId: "rover-console",
    previewRendererId: "graphical-viewport",
    capabilities: {
      text: true,
      graphical: true,
      terminal: false,
      color: true,
      monochrome: false,
      bitmap: true,
      mask: true,
      statusWidgets: true,
      customInput: true
    },
    files: ["BetterMenuAdafruitST7735.ino", "BetterMenuRgb565Assets.h"],
    includes: ["SPI.h", "Adafruit_GFX.h", "Adafruit_ST7735.h", "BetterMenu.h"],
    dependencies: ["Adafruit GFX Library", "Adafruit ST7735 and ST7789", "Adafruit BusIO"],
    input: "Serial keys by default so display wiring stays independent",
    display: "Adafruit_GFX primitives mapped from the RoverConsole skin with compact rows",
    memory: "Used color assets are emitted as RGB565 PROGMEM arrays with optional 1-bit masks.",
    outputKind: "color-gfx",
    assetEncoding: "rgb565",
    displayDriver: {
      family: "Adafruit_GFX",
      includeLines: ["#include <SPI.h>", "#include <Adafruit_GFX.h>", "#include <Adafruit_ST7735.h>"],
      constructor: "static Adafruit_ST7735 {display}({cs}, {dc}, {rst});",
      setupLines: ["{display}.initR(INITR_BLACKTAB);"],
      pinDefines: [["{cs}", "10"], ["{dc}", "9"], ["{rst}", "8"]],
      assetHeader: "BetterMenuRgb565Assets.h",
      sketchFile: "BetterMenuAdafruitST7735.ino"
    },
    defaults: {
      width: 160,
      height: 128,
      rotation: 1,
      displayObject: "tft",
      pins: { cs: "TFT_CS", dc: "TFT_DC", rst: "TFT_RST" },
      serialBaud: 115200
    }
  },
  {
    id: "adafruit-ssd1306-128x64-i2c",
    label: "Adafruit SSD1306 128x64 I2C",
    family: "Adafruit_GFX",
    defaultSkinId: "text-rows",
    previewRendererId: "monochrome-viewport",
    capabilities: {
      text: true,
      graphical: true,
      terminal: false,
      color: false,
      monochrome: true,
      bitmap: true,
      mask: false,
      statusWidgets: true,
      customInput: true
    },
    files: ["BetterMenuAdafruitSSD1306.ino", "BetterMenuMonoAssets.h"],
    includes: ["Wire.h", "Adafruit_GFX.h", "Adafruit_SSD1306.h", "BetterMenu.h"],
    dependencies: ["Adafruit GFX Library", "Adafruit SSD1306", "Adafruit BusIO"],
    input: "Serial keys by default so display wiring stays independent",
    display: "Adafruit_GFX monochrome rows with compact status markers",
    memory: "Used assets are emitted as 1-bit PROGMEM bitmap data.",
    outputKind: "mono-gfx",
    assetEncoding: "mono1",
    displayDriver: {
      family: "Adafruit_GFX",
      includeLines: ["#include <Wire.h>", "#include <Adafruit_GFX.h>", "#include <Adafruit_SSD1306.h>"],
      constructor: "static Adafruit_SSD1306 {display}({width}, {height}, &Wire, OLED_RESET);",
      setupLines: ["{display}.begin(SSD1306_SWITCHCAPVCC, 0x3C);"],
      pinDefines: [["OLED_RESET", "-1"]],
      assetHeader: "BetterMenuMonoAssets.h",
      sketchFile: "BetterMenuAdafruitSSD1306.ino"
    },
    defaults: {
      width: 128,
      height: 64,
      rotation: 0,
      displayObject: "display",
      serialBaud: 115200
    }
  },
  {
    id: "adafruit-sh110x-128x64-i2c",
    label: "Adafruit SH110x 128x64 I2C",
    family: "Adafruit_GFX",
    defaultSkinId: "text-rows",
    previewRendererId: "monochrome-viewport",
    capabilities: {
      text: true,
      graphical: true,
      terminal: false,
      color: false,
      monochrome: true,
      bitmap: true,
      mask: false,
      statusWidgets: true,
      customInput: true
    },
    files: ["BetterMenuAdafruitSH110x.ino", "BetterMenuMonoAssets.h"],
    includes: ["Wire.h", "Adafruit_GFX.h", "Adafruit_SH110X.h", "BetterMenu.h"],
    dependencies: ["Adafruit GFX Library", "Adafruit SH110X", "Adafruit BusIO"],
    input: "Serial keys by default so display wiring stays independent",
    display: "Adafruit_GFX monochrome rows with compact status markers",
    memory: "Used assets are emitted as 1-bit PROGMEM bitmap data.",
    outputKind: "mono-gfx",
    assetEncoding: "mono1",
    displayDriver: {
      family: "Adafruit_GFX",
      includeLines: ["#include <Wire.h>", "#include <Adafruit_GFX.h>", "#include <Adafruit_SH110X.h>"],
      constructor: "static Adafruit_SH1106G {display}({width}, {height}, &Wire, OLED_RESET);",
      setupLines: ["{display}.begin(0x3C, true);"],
      pinDefines: [["OLED_RESET", "-1"]],
      assetHeader: "BetterMenuMonoAssets.h",
      sketchFile: "BetterMenuAdafruitSH110x.ino"
    },
    defaults: {
      width: 128,
      height: 64,
      rotation: 0,
      displayObject: "display",
      serialBaud: 115200
    }
  },
  {
    id: "tft-espi-320x240",
    label: "TFT_eSPI 320x240",
    family: "TFT_eSPI",
    defaultSkinId: "rover-console",
    previewRendererId: "graphical-viewport",
    capabilities: {
      text: true,
      graphical: true,
      terminal: false,
      color: true,
      monochrome: false,
      bitmap: true,
      mask: true,
      statusWidgets: true,
      customInput: true
    },
    files: ["BetterMenuTftESPI.ino", "BetterMenuRgb565Assets.h"],
    includes: ["TFT_eSPI.h", "BetterMenu.h"],
    dependencies: ["TFT_eSPI configured for the target board"],
    input: "Serial keys by default so display wiring stays independent",
    display: "TFT_eSPI primitives mapped from the RoverConsole skin",
    memory: "Used color assets are emitted as RGB565 PROGMEM arrays with optional 1-bit masks.",
    outputKind: "color-gfx",
    assetEncoding: "rgb565",
    displayDriver: {
      family: "TFT_eSPI",
      includeLines: ["#include <TFT_eSPI.h>"],
      constructor: "static TFT_eSPI {display};",
      setupLines: ["{display}.init();"],
      pinDefines: [],
      assetHeader: "BetterMenuRgb565Assets.h",
      sketchFile: "BetterMenuTftESPI.ino"
    },
    defaults: {
      width: 320,
      height: 240,
      rotation: 1,
      displayObject: "tft",
      serialBaud: 115200
    }
  },
  {
    id: "tft-espi-cyd-320x240",
    label: "TFT_eSPI CYD 320x240",
    family: "TFT_eSPI",
    defaultSkinId: "rover-console",
    previewRendererId: "graphical-viewport",
    capabilities: {
      text: true,
      graphical: true,
      terminal: false,
      color: true,
      monochrome: false,
      bitmap: true,
      mask: true,
      statusWidgets: true,
      customInput: true
    },
    files: ["BetterMenuTftESPICYD.ino", "BetterMenuRgb565Assets.h"],
    includes: ["TFT_eSPI.h", "BetterMenu.h"],
    dependencies: ["TFT_eSPI configured for the ESP32-2432S028R/CYD display"],
    input: "Serial keys by default so display wiring stays independent",
    display: "TFT_eSPI primitives mapped from the RoverConsole skin",
    memory: "Used color assets are emitted as RGB565 PROGMEM arrays with optional 1-bit masks.",
    outputKind: "color-gfx",
    assetEncoding: "rgb565",
    displayDriver: {
      family: "TFT_eSPI",
      includeLines: ["#include <TFT_eSPI.h>"],
      constructor: "static TFT_eSPI {display};",
      setupLines: ["{display}.init();"],
      pinDefines: [],
      assetHeader: "BetterMenuRgb565Assets.h",
      sketchFile: "BetterMenuTftESPICYD.ino"
    },
    defaults: {
      width: 320,
      height: 240,
      rotation: 1,
      displayObject: "tft",
      serialBaud: 115200
    }
  },
  {
    id: "u8g2-ssd1306-128x64-i2c",
    label: "U8g2 SSD1306 128x64 I2C",
    family: "U8g2",
    defaultSkinId: "text-rows",
    previewRendererId: "monochrome-viewport",
    capabilities: {
      text: true,
      graphical: true,
      terminal: false,
      color: false,
      monochrome: true,
      bitmap: true,
      mask: false,
      statusWidgets: true,
      customInput: true
    },
    files: ["BetterMenuU8g2SSD1306_128x64.ino", "BetterMenuMonoAssets.h"],
    includes: ["Wire.h", "U8g2lib.h", "BetterMenu.h"],
    dependencies: ["U8g2"],
    input: "Serial keys by default so display wiring stays independent",
    display: "U8g2 monochrome rows with compact status markers",
    memory: "Used assets are emitted as 1-bit PROGMEM bitmap data.",
    outputKind: "u8g2",
    assetEncoding: "mono1",
    displayDriver: {
      family: "U8g2",
      includeLines: ["#include <Wire.h>", "#include <U8g2lib.h>"],
      constructor: "static U8G2_SSD1306_128X64_NONAME_F_HW_I2C {display}(U8G2_R0, U8X8_PIN_NONE);",
      setupLines: ["{display}.begin();"],
      assetHeader: "BetterMenuMonoAssets.h",
      sketchFile: "BetterMenuU8g2SSD1306_128x64.ino"
    },
    defaults: {
      width: 128,
      height: 64,
      rotation: 0,
      displayObject: "u8g2",
      serialBaud: 115200
    }
  },
  {
    id: "u8g2-ssd1306-128x32-i2c",
    label: "U8g2 SSD1306 128x32 I2C",
    family: "U8g2",
    defaultSkinId: "text-rows",
    previewRendererId: "monochrome-viewport",
    capabilities: {
      text: true,
      graphical: true,
      terminal: false,
      color: false,
      monochrome: true,
      bitmap: true,
      mask: false,
      statusWidgets: true,
      customInput: true
    },
    files: ["BetterMenuU8g2SSD1306_128x32.ino", "BetterMenuMonoAssets.h"],
    includes: ["Wire.h", "U8g2lib.h", "BetterMenu.h"],
    dependencies: ["U8g2"],
    input: "Serial keys by default so display wiring stays independent",
    display: "U8g2 monochrome rows with compact status markers",
    memory: "Used assets are emitted as 1-bit PROGMEM bitmap data.",
    outputKind: "u8g2",
    assetEncoding: "mono1",
    displayDriver: {
      family: "U8g2",
      includeLines: ["#include <Wire.h>", "#include <U8g2lib.h>"],
      constructor: "static U8G2_SSD1306_128X32_UNIVISION_F_HW_I2C {display}(U8G2_R0, U8X8_PIN_NONE);",
      setupLines: ["{display}.begin();"],
      assetHeader: "BetterMenuMonoAssets.h",
      sketchFile: "BetterMenuU8g2SSD1306_128x32.ino"
    },
    defaults: {
      width: 128,
      height: 32,
      rotation: 0,
      displayObject: "u8g2",
      serialBaud: 115200
    }
  },
  {
    id: "liquidcrystal-16x2",
    label: "LiquidCrystal 16x2",
    family: "Character LCD",
    defaultSkinId: "text-rows",
    previewRendererId: "character-lcd",
    capabilities: {
      text: true,
      graphical: false,
      terminal: false,
      color: false,
      monochrome: true,
      bitmap: false,
      mask: false,
      statusWidgets: false,
      customInput: true
    },
    files: ["BetterMenuLiquidCrystal16x2.ino"],
    includes: ["LiquidCrystal.h", "BetterMenu.h"],
    dependencies: ["Arduino LiquidCrystal"],
    input: "GPIO buttons by default, with other Arduino input adapters selectable",
    display: "Fixed 16x2 character window using LiquidCrystal",
    memory: "Graphical assets are ignored. Custom characters can be added in sketch code if needed.",
    outputKind: "character-lcd",
    assetEncoding: "none",
    displayDriver: {
      family: "LiquidCrystal",
      includeLines: ["#include <LiquidCrystal.h>"],
      constructor: "static LiquidCrystal {display}(LCD_RS, LCD_E, LCD_D4, LCD_D5, LCD_D6, LCD_D7);",
      setupLines: ["{display}.begin({width}, {height});"],
      pinDefines: [["LCD_RS", "7"], ["LCD_E", "8"], ["LCD_D4", "9"], ["LCD_D5", "10"], ["LCD_D6", "11"], ["LCD_D7", "12"]],
      sketchFile: "BetterMenuLiquidCrystal16x2.ino"
    },
    defaults: {
      width: 16,
      height: 2,
      rotation: 0,
      displayObject: "lcd",
      inputAdapter: "gpio-buttons",
      serialBaud: 115200
    }
  },
  {
    id: "liquidcrystal-20x4",
    label: "LiquidCrystal 20x4",
    family: "Character LCD",
    defaultSkinId: "text-rows",
    previewRendererId: "character-lcd",
    capabilities: {
      text: true,
      graphical: false,
      terminal: false,
      color: false,
      monochrome: true,
      bitmap: false,
      mask: false,
      statusWidgets: false,
      customInput: true
    },
    files: ["BetterMenuLiquidCrystal20x4.ino"],
    includes: ["LiquidCrystal.h", "BetterMenu.h"],
    dependencies: ["Arduino LiquidCrystal"],
    input: "GPIO buttons by default, with other Arduino input adapters selectable",
    display: "Fixed 20x4 character window using LiquidCrystal",
    memory: "Graphical assets are ignored. Custom characters can be added in sketch code if needed.",
    outputKind: "character-lcd",
    assetEncoding: "none",
    displayDriver: {
      family: "LiquidCrystal",
      includeLines: ["#include <LiquidCrystal.h>"],
      constructor: "static LiquidCrystal {display}(LCD_RS, LCD_E, LCD_D4, LCD_D5, LCD_D6, LCD_D7);",
      setupLines: ["{display}.begin({width}, {height});"],
      pinDefines: [["LCD_RS", "7"], ["LCD_E", "8"], ["LCD_D4", "9"], ["LCD_D5", "10"], ["LCD_D6", "11"], ["LCD_D7", "12"]],
      sketchFile: "BetterMenuLiquidCrystal20x4.ino"
    },
    defaults: {
      width: 20,
      height: 4,
      rotation: 0,
      displayObject: "lcd",
      inputAdapter: "gpio-buttons",
      serialBaud: 115200
    }
  },
  {
    id: "hd44780-i2c-20x4",
    label: "hd44780 I2C 20x4",
    family: "Character LCD",
    defaultSkinId: "text-rows",
    previewRendererId: "character-lcd",
    capabilities: {
      text: true,
      graphical: false,
      terminal: false,
      color: false,
      monochrome: true,
      bitmap: false,
      mask: false,
      statusWidgets: false,
      customInput: true
    },
    files: ["BetterMenuHd44780I2C20x4.ino"],
    includes: ["Wire.h", "hd44780.h", "hd44780ioClass/hd44780_I2Cexp.h", "BetterMenu.h"],
    dependencies: ["hd44780"],
    input: "GPIO buttons by default, with other Arduino input adapters selectable",
    display: "Fixed 20x4 character window using hd44780_I2Cexp",
    memory: "Graphical assets are ignored. Custom characters can be added in sketch code if needed.",
    outputKind: "character-lcd",
    assetEncoding: "none",
    displayDriver: {
      family: "hd44780",
      includeLines: ["#include <Wire.h>", "#include <hd44780.h>", "#include <hd44780ioClass/hd44780_I2Cexp.h>"],
      constructor: "static hd44780_I2Cexp {display};",
      setupLines: ["{display}.begin({width}, {height});"],
      pinDefines: [],
      sketchFile: "BetterMenuHd44780I2C20x4.ino"
    },
    defaults: {
      width: 20,
      height: 4,
      rotation: 0,
      displayObject: "lcd",
      inputAdapter: "gpio-buttons",
      serialBaud: 115200
    }
  }
];

export const FUTURE_PROFILES = [
  "arduino-gfx-controller-presets",
  "gxepd2-e-paper-profiles",
  "lvgl-widget-generator"
];

export const SKINS = [
  {
    id: "text-rows",
    label: "Text rows",
    description: "Plain BetterMenu row text for Serial and stdio targets."
  },
  {
    id: "rover-console",
    label: "RoverConsole",
    description: "Graphical card rows, icon slots, header status widgets, inline edit controls, and a faux scrollbar."
  }
];

export function targetProfileById(id) {
  return TARGET_PROFILES.find((profile) => profile.id === id) || TARGET_PROFILES[0];
}

export function skinById(id) {
  return SKINS.find((skin) => skin.id === id) || SKINS[0];
}

export function defaultTargetSettings(profileId = "arduino-serial") {
  const profile = targetProfileById(profileId);
  const defaults = profile.defaults || {};
  return {
    profileId: profile.id,
    skinId: profile.defaultSkinId,
    width: defaults.width || 0,
    height: defaults.height || 0,
    rotation: defaults.rotation || 0,
    originRow: defaults.originRow || 1,
    originCol: defaults.originCol || 1,
    serialBaud: defaults.serialBaud || 115200,
    displayObject: defaults.displayObject || "display",
    pins: {
      cs: defaults.pins?.cs || "TFT_CS",
      dc: defaults.pins?.dc || "TFT_DC",
      rst: defaults.pins?.rst || "TFT_RST"
    },
    buttonPins: {
      up: "2",
      down: "3",
      select: "4",
      cancel: "5",
      left: "MENU_BUTTON_UNUSED",
      right: "MENU_BUTTON_UNUSED"
    },
    serialKeyMap: {
      up: "w",
      down: "s",
      select: "e",
      cancel: "q",
      left: "a",
      right: "d"
    },
    inputAdapter: defaults.inputAdapter || (profile.id === "desktop-stdio" ? "stdio-keys" : "serial-keys"),
    serialKeyCaseInsensitive: true,
    buttonsActiveLow: true,
    buttonDebounceMs: 20,
    gesturePin: "2",
    customEventReader: "readMenuInput",
    navigationWrap: false,
    serialAutoscroll: true,
    serialTimestamps: false,
    ansiColor: defaults.ansiColor !== undefined ? Boolean(defaults.ansiColor) : false,
    ansiHideCursor: defaults.ansiHideCursor !== undefined ? Boolean(defaults.ansiHideCursor) : false,
    ansiClearOnBegin: defaults.ansiClearOnBegin !== undefined ? Boolean(defaults.ansiClearOnBegin) : false,
    assetExport: {
      includeUnused: false,
      iconSize: 18,
      colorDepth: "rgb565",
      mask: true
    }
  };
}

export function normalizeTargetSettings(input) {
  const profile = targetProfileById(input?.profileId || "arduino-serial");
  const base = defaultTargetSettings(profile.id);
  const merged = {
    ...base,
    ...(input || {}),
    pins: {
      ...base.pins,
      ...(input?.pins || {})
    },
    buttonPins: {
      ...base.buttonPins,
      ...(input?.buttonPins || {})
    },
    serialKeyMap: {
      ...base.serialKeyMap,
      ...(input?.serialKeyMap || {})
    },
    assetExport: {
      ...base.assetExport,
      ...(input?.assetExport || {})
    }
  };
  if (!SKINS.some((skin) => skin.id === merged.skinId)) {
    merged.skinId = profile.defaultSkinId;
  }
  merged.width = nonNegativeNumber(merged.width, base.width);
  merged.height = nonNegativeNumber(merged.height, base.height);
  merged.rotation = nonNegativeNumber(merged.rotation, base.rotation);
  merged.originRow = positiveNumber(merged.originRow, base.originRow);
  merged.originCol = positiveNumber(merged.originCol, base.originCol);
  merged.serialBaud = positiveNumber(merged.serialBaud, base.serialBaud);
  merged.displayObject = safeName(merged.displayObject || base.displayObject || "display");
  merged.pins.cs = safeName(merged.pins.cs || "TFT_CS");
  merged.pins.dc = safeName(merged.pins.dc || "TFT_DC");
  merged.pins.rst = safeName(merged.pins.rst || "TFT_RST");
  merged.inputAdapter = normalizeInputAdapter(merged.inputAdapter, profile.id);
  merged.buttonPins.up = pinName(merged.buttonPins.up || base.buttonPins.up);
  merged.buttonPins.down = pinName(merged.buttonPins.down || base.buttonPins.down);
  merged.buttonPins.select = pinName(merged.buttonPins.select || base.buttonPins.select);
  merged.buttonPins.cancel = pinName(merged.buttonPins.cancel || base.buttonPins.cancel);
  merged.buttonPins.left = pinName(merged.buttonPins.left || base.buttonPins.left);
  merged.buttonPins.right = pinName(merged.buttonPins.right || base.buttonPins.right);
  merged.serialKeyMap.up = keyChar(merged.serialKeyMap.up || base.serialKeyMap.up);
  merged.serialKeyMap.down = keyChar(merged.serialKeyMap.down || base.serialKeyMap.down);
  merged.serialKeyMap.select = keyChar(merged.serialKeyMap.select || base.serialKeyMap.select);
  merged.serialKeyMap.cancel = keyChar(merged.serialKeyMap.cancel || base.serialKeyMap.cancel);
  merged.serialKeyMap.left = keyChar(merged.serialKeyMap.left || base.serialKeyMap.left);
  merged.serialKeyMap.right = keyChar(merged.serialKeyMap.right || base.serialKeyMap.right);
  merged.serialKeyCaseInsensitive = Boolean(merged.serialKeyCaseInsensitive);
  merged.buttonsActiveLow = Boolean(merged.buttonsActiveLow);
  merged.buttonDebounceMs = nonNegativeNumber(merged.buttonDebounceMs, base.buttonDebounceMs);
  merged.gesturePin = pinName(merged.gesturePin || base.gesturePin);
  merged.customEventReader = safeName(merged.customEventReader || base.customEventReader);
  merged.navigationWrap = Boolean(merged.navigationWrap);
  merged.serialAutoscroll = Boolean(merged.serialAutoscroll);
  merged.serialTimestamps = Boolean(merged.serialTimestamps);
  merged.ansiColor = Boolean(merged.ansiColor);
  merged.ansiHideCursor = Boolean(merged.ansiHideCursor);
  merged.ansiClearOnBegin = Boolean(merged.ansiClearOnBegin);
  return merged;
}

export function profileInstructions(profile) {
  return [
    `Target profile: ${profile.label}.`,
    `Generated files: ${profile.files.join(", ")}.`,
    `Required includes: ${profile.includes.join(", ")}.`,
    `Dependencies: ${profile.dependencies.join(", ")}.`,
    `Input adapter: ${profile.input}.`,
    `Display adapter: ${profile.display}.`,
    profile.memory
  ];
}

function nonNegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 ? number : fallback;
}

function safeName(value) {
  return String(value || "").replace(/[^A-Za-z0-9_]/g, "_").replace(/^([^A-Za-z_])/, "_$1") || "value";
}

function pinName(value) {
  return String(value || "").trim().replace(/[^A-Za-z0-9_]/g, "_") || "MENU_BUTTON_UNUSED";
}

function keyChar(value) {
  return String(value || "").charAt(0);
}

function normalizeInputAdapter(value, profileId) {
  const valid = ["serial-keys", "stdio-keys", "gpio-buttons", "button-gestures", "custom-event"];
  if (valid.includes(value)) return value;
  return profileId === "desktop-stdio" ? "stdio-keys" : "serial-keys";
}
