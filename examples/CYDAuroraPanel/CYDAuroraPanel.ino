/*
    BetterMenu CYD Aurora Panel

    Target: ESP32-2432S028R-style "Cheap Yellow Display" boards.
    Display: 320x240 ILI9341 through TFT_eSPI.
    Input: Serial keys, to keep this display example independent of any one
           touch controller wiring. Touch adapters can emit menu_row_event().

    Configure TFT_eSPI for your CYD board before compiling this sketch.
*/

#include "AuroraPanelDisplay.h"
#include <stdio.h>

menu_runtime_t menuRuntime;
serial_keys_ctx_t serialInput;

static int canopyTempF = 74;
static int targetTempF = 72;
static int humidityPercent = 48;
static int lightOutputPercent = 62;
static int pumpMode = 1;
static bool autoVentEnabled = true;
static bool maintenanceUnlocked = false;
static int savedSettingCount = 18;

static int getCanopyTemp(void *) { return canopyTempF; }
static int getHumidity(void *) { return humidityPercent; }
static int getSavedSettingCount(void *) { return savedSettingCount; }

static bool maintenanceActionIsDisabled(void *) { return !maintenanceUnlocked; }

static void recordSettingChanged(void *) { ++savedSettingCount; }
static void runPumpPrime() {}
static void calibrateSensors() {}
static void resetRuntimeCounters() {}

static void formatDegreesF(void *ctx, char *out, uint8_t cap) {
    int value = ctx ? *static_cast<int *>(ctx) : 0;
    snprintf(out, cap, "%d F", value);
}

static void formatCanopyTemp(void *, char *out, uint8_t cap) {
    snprintf(out, cap, "%d F", canopyTempF);
}

static void formatHumidity(void *, char *out, uint8_t cap) {
    snprintf(out, cap, "%d%% RH", humidityPercent);
}

static void formatLightOutput(void *ctx, char *out, uint8_t cap) {
    int value = ctx ? *static_cast<int *>(ctx) : 0;
    snprintf(out, cap, "%d%%", value);
}

void setup() {
    Serial.begin(115200);

    aurora_panel_display_begin();

    static const auto rootMenu =
        MENU(F("Grow room"),
            ITEM_FORMAT(
                ITEM_ON_CHANGE(
                    ITEM_INT_STEP(F("Target temp"), &targetTempF, 60, 88, 1),
                    recordSettingChanged,
                    0
                ),
                formatDegreesF,
                &targetTempF
            ),
            ITEM_FORMAT(
                ITEM_ON_CHANGE(
                    ITEM_INT_STEP(F("Light output"), &lightOutputPercent, 0, 100, 5),
                    recordSettingChanged,
                    0
                ),
                formatLightOutput,
                &lightOutputPercent
            ),
            ITEM_SELECT(F("Pump mode"), &pumpMode,
                MENU_CHOICE(F("Off"), 0),
                MENU_CHOICE(F("Auto"), 1),
                MENU_CHOICE(F("Prime"), 2)
            ),
            ITEM_BOOL(F("Auto vent"), &autoVentEnabled, F("Closed"), F("Enabled")),
            ITEM_MENU(F("Maintenance"),
                MENU(F("Maintenance"),
                    ITEM_FUNC(F("Prime pump"), runPumpPrime),
                    ITEM_FUNC(F("Calibrate sensors"), calibrateSensors),
                    ITEM_BOOL(F("Unlock actions"), &maintenanceUnlocked),
                    ITEM_DISABLED(
                        ITEM_FUNC(F("Reset counters"), resetRuntimeCounters),
                        maintenanceActionIsDisabled,
                        0
                    ),
                    ITEM_VALUE(F("Saved settings"), getSavedSettingCount, 0)
                )
            ),
            ITEM_FORMAT(ITEM_VALUE(F("Canopy temp"), getCanopyTemp, 0), formatCanopyTemp, 0),
            ITEM_FORMAT(ITEM_VALUE(F("Humidity"), getHumidity, 0), formatHumidity, 0)
        );

    display_t display = make_aurora_panel_display();
    input_source_t input = make_serial_keys_input(serialInput);

    menuRuntime = menu_runtime_t::make(rootMenu, display, input, true);
    menuRuntime.set_show_title(true);
    menuRuntime.set_show_breadcrumbs(true);
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}
