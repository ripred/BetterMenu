/*
    BetterMenu CYD Rover Console
    ----------------------------
    A graphical BetterMenu example for ESP32-2432S028R-style "Cheap Yellow
    Display" boards with a 320x240 ILI9341 TFT.

    The menu is declared once in this sketch. RoverConsoleDisplay.h/.cpp holds
    the TFT_eSPI display adapter that draws BetterMenu render metadata.

    Input is Serial keys (w/s = up/down, e or d = select/enter/edit/save,
    q or a = back/cancel) so the display stays independent of touch wiring.
*/

#include "RoverConsoleDisplay.h"
#include <stdio.h>
#include <stdlib.h>

menu_runtime_t menuRuntime;
serial_keys_ctx_t serialInput;
rover_console_display_ctx_t roverDisplay;

// ----------------------------- backing state -----------------------------
static int  driveMode      = 1;     // 0 Idle 1 Manual 2 Auto 3 Follow
static int  maxSpeedPct    = 65;
static bool headlights     = false;
static int  pitchTrimTenth = -15;   // -1.5 deg
static int  kpMilli        = 1200;  // 1.20
static int  kiMilli        = 80;    // 0.08
static int  kdMilli        = 450;   // 0.45
static int  loopRateHz     = 200;
static int  pitchTenth     = 23;    // +2.3 deg (live IMU)
static int  headingDeg     = 247;
static int  battCentiV     = 1187;  // 11.87 V
static int  rangeMm        = 412;
static int  cellTempC      = 34;
static bool telemetryStream = false;
static int  telemetryHz    = 5;
static bool armed          = false;
static int  brightnessPct  = 80;
static int  themeSel       = 0;     // 0 Aurora 1 Slate 2 Mono
static bool screenFlip     = false;
static int  uptimeMin      = 154;   // 2h 34m

// ----------------------------- getters / setters -----------------------------
static int  gi(void *c) { return *static_cast<int *>(c); }
static void se(void *c, int v) { *static_cast<int *>(c) = v; }

static void fmtPct(void *c, char *o, uint8_t n)     { snprintf(o, n, "%d%%", *(int *)c); }
static void fmtMilli2(void *c, char *o, uint8_t n)  { int v = *(int *)c; snprintf(o, n, "%d.%02d", v / 1000, (v % 1000) / 10); }
static void fmtSignedTenths(int v, char *o, uint8_t n) {
    char sign = v < 0 ? '-' : '+';
    int av = abs(v);
    snprintf(o, n, "%c%d.%d deg", sign, av / 10, av % 10);
}

static void fmtTrim(void *c, char *o, uint8_t n)    { fmtSignedTenths(*(int *)c, o, n); }
static void fmtPitch(void *c, char *o, uint8_t n)   { fmtSignedTenths(*(int *)c, o, n); }
static void fmtHeading(void *c, char *o, uint8_t n) { snprintf(o, n, "%d deg", *(int *)c); }
static void fmtVolts(void *c, char *o, uint8_t n)   { int v = *(int *)c; snprintf(o, n, "%d.%02d V", v / 100, v % 100); }
static void fmtMm(void *c, char *o, uint8_t n)      { snprintf(o, n, "%d mm", *(int *)c); }
static void fmtTempC(void *c, char *o, uint8_t n)   { snprintf(o, n, "%d C", *(int *)c); }
static void fmtHz(void *c, char *o, uint8_t n)      { snprintf(o, n, "%d Hz", *(int *)c); }
static void fmtFirmware(void *, char *o, uint8_t n) { snprintf(o, n, "v0.5.4"); }
static void fmtUptime(void *c, char *o, uint8_t n)  { int m = *(int *)c; snprintf(o, n, "%dh %02dm", m / 60, m % 60); }

static bool telemetryRateDisabled(void *) { return !telemetryStream; }
static bool devToolsHidden(void *)        { return themeSel != 2; }
static void onChanged(void *) {}
static void act() {}

void setup() {
    Serial.begin(115200);
    rover_console_display_begin();

    auto sub_pid =
        MENU(F("PID tuning"),
            ITEM_FORMAT(ITEM_VALUE(F("Kp"), gi, se, &kpMilli, 0, 5000, 10), fmtMilli2, &kpMilli),
            ITEM_FORMAT(ITEM_VALUE(F("Ki"), gi, se, &kiMilli, 0, 5000, 10), fmtMilli2, &kiMilli),
            ITEM_FORMAT(ITEM_VALUE(F("Kd"), gi, se, &kdMilli, 0, 5000, 10), fmtMilli2, &kdMilli),
            ITEM_INT(F("Loop rate"), &loopRateHz, 50, 400, 10),
            ITEM_FUNC(F("Save tune"), act));
    auto sub_sensors =
        MENU(F("Sensors"),
            ITEM_FORMAT(ITEM_VALUE(F("Pitch"),     gi, &pitchTenth), fmtPitch,   &pitchTenth),
            ITEM_FORMAT(ITEM_VALUE(F("Heading"),   gi, &headingDeg), fmtHeading, &headingDeg),
            ITEM_FORMAT(ITEM_VALUE(F("Battery"),   gi, &battCentiV), fmtVolts,   &battCentiV),
            ITEM_FORMAT(ITEM_VALUE(F("Range"),     gi, &rangeMm),    fmtMm,      &rangeMm),
            ITEM_FORMAT(ITEM_VALUE(F("Cell temp"), gi, &cellTempC),  fmtTempC,   &cellTempC));
    auto sub_system =
        MENU(F("System"),
            ITEM_INT(F("Brightness"), &brightnessPct, 10, 100, 10),
            ITEM_SELECT(F("Theme"), &themeSel,
                MENU_CHOICE(F("Aurora"),0), MENU_CHOICE(F("Slate"),1), MENU_CHOICE(F("Mono"),2)),
            ITEM_BOOL(F("Screen flip"), &screenFlip, F("Off"), F("On")),
            ITEM_HIDDEN(ITEM_FUNC(F("Dev tools"), act), devToolsHidden, 0),
            ITEM_FORMAT(ITEM_VALUE(F("Firmware"), gi, &uptimeMin), fmtFirmware, 0),
            ITEM_FORMAT(ITEM_VALUE(F("Uptime"),   gi, &uptimeMin), fmtUptime, &uptimeMin));

    static const auto rootMenu =
        MENU(F("Rover"),
            ITEM_SELECT(F("Drive mode"), &driveMode,
                MENU_CHOICE(F("Idle"),0), MENU_CHOICE(F("Manual"),1),
                MENU_CHOICE(F("Auto"),2), MENU_CHOICE(F("Follow"),3)),
            ITEM_FORMAT(ITEM_INT(F("Max speed"), &maxSpeedPct, 0, 100, 5), fmtPct, &maxSpeedPct),
            ITEM_BOOL(F("Headlights"), &headlights, F("Off"), F("On")),
            ITEM_FORMAT(ITEM_VALUE(F("Pitch trim"), gi, se, &pitchTrimTenth, -50, 50, 1), fmtTrim, &pitchTrimTenth),
            ITEM_MENU(F("PID tuning"), sub_pid),
            ITEM_MENU(F("Sensors"), sub_sensors),
            ITEM_ON_CHANGE(ITEM_BOOL(F("Telemetry"), &telemetryStream, F("Quiet"), F("Stream")), onChanged, 0),
            ITEM_DISABLED(ITEM_FORMAT(ITEM_INT(F("Telemetry rate"), &telemetryHz, 1, 50, 1), fmtHz, &telemetryHz),
                          telemetryRateDisabled, 0),
            ITEM_FUNC(F("Calibrate IMU"), act),
            ITEM_ON_CHANGE(ITEM_BOOL(F("Arm motors"), &armed, F("Safe"), F("Armed")), onChanged, 0),
            ITEM_FUNC(F("E-STOP"), act),
            ITEM_MENU(F("System"), sub_system));

    display_t display = make_rover_console_display(roverDisplay, menuRuntime, battCentiV, armed);
    input_source_t input = make_serial_keys_input(serialInput);

    menuRuntime = menu_runtime_t::make(rootMenu, display, input, false);
    menuRuntime.set_show_title(true);
    menuRuntime.set_show_breadcrumbs(true);
    menuRuntime.set_show_affordances(false);
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}
