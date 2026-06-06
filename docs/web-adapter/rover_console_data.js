export const roverConsoleContent = {
  "Drive mode": [
    "Drive mode",
    "A BetterMenu select row with fixed rover operating modes: Idle, Manual, Auto, and Follow."
  ],
  "Max speed": [
    "Speed limit",
    "An editable integer row formatted as a percentage with a five-point step."
  ],
  "Headlights": [
    "Headlights",
    "A boolean row rendered from the BetterMenu value labels Off and On."
  ],
  "Pitch trim": [
    "Pitch trim",
    "A getter/setter value row with a signed tenths-of-a-degree formatter."
  ],
  "PID tuning": [
    "PID tuning",
    "A child menu containing Kp, Ki, Kd, loop rate, and a save action."
  ],
  Kp: [
    "Proportional gain",
    "A mutable value row exposed through BetterMenu getter and setter callbacks."
  ],
  Ki: [
    "Integral gain",
    "A mutable value row using the same fixed-point formatter as the RoverConsole sketch."
  ],
  Kd: [
    "Derivative gain",
    "A mutable value row bounded by BetterMenu while the DOM only renders the current value."
  ],
  "Loop rate": [
    "Control loop rate",
    "An editable integer row inside the PID tuning submenu."
  ],
  "Save tune": [
    "Save tune",
    "A function row. The sketch owns the action; the web adapter only forwards the selection event."
  ],
  Sensors: [
    "Sensors",
    "A child menu of read-only live telemetry values."
  ],
  Pitch: [
    "Pitch",
    "A read-only value formatted as signed tenths of a degree."
  ],
  Heading: [
    "Heading",
    "A read-only value formatted in degrees."
  ],
  Battery: [
    "Battery",
    "A read-only centivolt value formatted as volts."
  ],
  Range: [
    "Range",
    "A read-only distance value formatted in millimeters."
  ],
  "Cell temp": [
    "Cell temperature",
    "A read-only temperature value from the Sensors submenu."
  ],
  Telemetry: [
    "Telemetry stream",
    "A boolean row that controls whether the telemetry-rate row is disabled."
  ],
  "Telemetry rate": [
    "Telemetry rate",
    "An editable integer row that is disabled until Telemetry is set to Stream."
  ],
  "Calibrate IMU": [
    "Calibrate IMU",
    "A function row for sensor calibration."
  ],
  "Arm motors": [
    "Motor arming",
    "A boolean row using Safe and Armed labels."
  ],
  "E-STOP": [
    "Emergency stop",
    "A high-priority function row carried through the same BetterMenu action path."
  ],
  System: [
    "System",
    "A child menu containing display preferences and read-only system metadata."
  ],
  Brightness: [
    "Brightness",
    "An editable integer row with a ten-point step."
  ],
  Theme: [
    "Theme",
    "A select row that also drives the hidden Dev tools row when Mono is selected."
  ],
  "Screen flip": [
    "Screen flip",
    "A boolean row for display orientation."
  ],
  "Dev tools": [
    "Dev tools",
    "A hidden function row that appears only when the theme is set to Mono."
  ],
  Firmware: [
    "Firmware",
    "A read-only formatted value supplied by the menu declaration."
  ],
  Uptime: [
    "Uptime",
    "A read-only formatted runtime value."
  ]
};

export const roverConsoleIcons = {
  "Drive mode": "compass",
  "Max speed": "speed",
  Headlights: "beam",
  "Pitch trim": "level",
  "PID tuning": "sliders",
  Kp: "slider",
  Ki: "slider",
  Kd: "slider",
  "Loop rate": "clock",
  "Save tune": "save",
  Sensors: "radar",
  Pitch: "level",
  Heading: "compass",
  Battery: "battery",
  Range: "radar",
  "Cell temp": "thermo",
  Telemetry: "broadcast",
  "Telemetry rate": "clock",
  "Calibrate IMU": "crosshair",
  "Arm motors": "shield",
  "E-STOP": "stop",
  System: "gear",
  Brightness: "sun",
  Theme: "swatch",
  "Screen flip": "flip",
  "Dev tools": "tool",
  Firmware: "chip",
  Uptime: "clock"
};
