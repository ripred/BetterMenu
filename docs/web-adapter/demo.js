import { roverConsoleContent, roverConsoleIcons } from "./rover_console_data.js";
import { initWebMenuDomAdapter } from "./web_menu_dom_adapter.js";

initWebMenuDomAdapter({
  content: roverConsoleContent,
  icons: roverConsoleIcons,
  wasmPath: "./bettermenu_demo.wasm"
});
