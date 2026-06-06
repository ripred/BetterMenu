#include <BetterMenu.h>
#include "AnsiPrintDisplay.h"

static int volume = 5;
static int brightness = 60;
static bool telemetry = false;
static int telemetryRate = 5;
static int runMode = 0;

static bool telemetryRateDisabled(void *) {
    return !telemetry;
}

static void applySettings(void) {
    Serial.print(F("\033[12;1H"));
    Serial.print(F("Settings applied.                                      "));
}

static menu_runtime_t menuRuntime;
static serial_keys_ctx_t serialInput;
static ansi_display_ctx_t ansiDisplay;

void setup() {
    Serial.begin(115200);
    while (!Serial) {
    }

    static const auto rootMenu =
        MENU(F("ANSI Console"),
            ITEM_MENU(F("Controls"),
                MENU(F("Controls"),
                    ITEM_INT(F("Volume"), &volume, 0, 10),
                    ITEM_INT(F("Brightness"), &brightness, 0, 100),
                    ITEM_BOOL(F("Telemetry"), &telemetry, F("Off"), F("On")),
                    ITEM_DISABLED(ITEM_INT(F("Telemetry rate"), &telemetryRate, 1, 50), telemetryRateDisabled, 0),
                    ITEM_SELECT(F("Run mode"), &runMode,
                        MENU_CHOICE(F("Idle"), 0),
                        MENU_CHOICE(F("Auto"), 1),
                        MENU_CHOICE(F("Manual"), 2)
                    )
                )
            ),
            ITEM_FUNC(F("Apply settings"), applySettings)
        );

    input_source_t input = make_serial_keys_input(serialInput);
    display_t display = make_ansi_print_display(ansiDisplay, Serial, 52, 9, 1, 1);
    menuRuntime = menu_runtime_t::make(rootMenu, display, input, false);
    menuRuntime.set_show_title(true);
    menuRuntime.set_show_breadcrumbs(true);
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}
