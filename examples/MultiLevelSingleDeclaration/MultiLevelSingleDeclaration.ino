#include <BetterMenu.h>

static int volume = 5;
static int brightness = 60;
static int contrast = 40;
static int sleepMinutes = 10;
static int telemetryRateHz = 2;
static int motorSpeed = 3;
static bool telemetryEnabled = false;
static int motorMode = 0;
static serial_keys_ctx_t serialInput;
static stream_keymap_t const menuKeys = {
    'w', 's', 'e', 'q', 'a', 'd', 1
};

static void applySettings() {
    Serial.println(F("[action] apply settings"));
}

static void runSelfTest() {
    Serial.println(F("[action] run self-test"));
}

static void resetDefaults() {
    volume = 5;
    brightness = 60;
    contrast = 40;
    sleepMinutes = 10;
    telemetryRateHz = 2;
    motorSpeed = 3;
    telemetryEnabled = false;
    motorMode = 0;
    Serial.println(F("[action] defaults restored"));
}

static bool telemetryRateDisabled(void *) {
    return !telemetryEnabled;
}

static int uptimeSeconds(void *) {
    return static_cast<int>(millis() / 1000UL);
}

static menu_runtime_t menuRuntime;

void setup() {
    Serial.begin(115200);
    while (!Serial) {
    }

    Serial.println(F("BetterMenu multi-level single-declaration demo"));
    Serial.println(F("w/s move, e or d select/toggle/cycle, q or a back, a/d adjust while editing"));

    static const auto appMenu =
        MENU(F("Device"),
            ITEM_MENU(F("Settings"),
                MENU(F("Settings"),
                    ITEM_MENU(F("Display"),
                        MENU(F("Display"),
                            ITEM_INT(F("Brightness"), &brightness, 0, 100),
                            ITEM_INT(F("Contrast"), &contrast, 0, 100),
                            ITEM_INT(F("Sleep min"), &sleepMinutes, 0, 120, 5)
                        )
                    ),
                    ITEM_MENU(F("Audio"),
                        MENU(F("Audio"),
                            ITEM_INT(F("Volume"), &volume, 0, 10)
                        )
                    ),
                    ITEM_MENU(F("Telemetry"),
                        MENU(F("Telemetry"),
                            ITEM_BOOL(F("Enabled"), &telemetryEnabled),
                            ITEM_DISABLED(ITEM_INT(F("Rate Hz"), &telemetryRateHz, 1, 20), telemetryRateDisabled, 0),
                            ITEM_VALUE(F("Uptime s"), uptimeSeconds, 0)
                        )
                    )
                )
            ),
            ITEM_MENU(F("Motor"),
                MENU(F("Motor"),
                    ITEM_SELECT(F("Mode"), &motorMode,
                        MENU_CHOICE(F("Off"), 0),
                        MENU_CHOICE(F("Closed Loop"), 1),
                        MENU_CHOICE(F("Manual"), 2)
                    ),
                    ITEM_INT(F("Speed"), &motorSpeed, 0, 5),
                    ITEM_FUNC(F("Self Test"), runSelfTest)
                )
            ),
            ITEM_MENU(F("Actions"),
                MENU(F("Actions"),
                    ITEM_FUNC(F("Apply"), applySettings),
                    ITEM_FUNC(F("Reset Defaults"), resetDefaults)
                )
            )
        );

    display_t display = make_serial_display(48, 0);
    input_source_t input = make_serial_keys_input(serialInput, menuKeys);
    menuRuntime = menu_runtime_t::make(appMenu, display, input, true);
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}
