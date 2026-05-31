#include <BetterMenu.h>

// Four individual momentary pushbuttons wired from these pins to GND.
// The button adapter enables INPUT_PULLUP, so no input expander or multiplexer is needed.
#define BTN_UP     2
#define BTN_DOWN   3
#define BTN_SELECT 4
#define BTN_CANCEL 5

static int volume = 5;
static int brightness = 50;
static bool enabled = true;
static int mode = 0;

static menu_runtime_t menuRuntime;
static buttons_ctx_t buttonsInput;

static void applySettings() {
    Serial.println(F("[action] apply"));
}

static void resetSettings() {
    volume = 5;
    brightness = 50;
    enabled = true;
    mode = 0;
    Serial.println(F("[action] reset"));
}

void setup() {
    Serial.begin(115200);
    while (!Serial) {
    }

    Serial.println(F("BetterMenu direct-button Serial demo"));
    Serial.println(F("Wire buttons from pins 2,3,4,5 to GND"));
    Serial.println(F("Buttons: up, down, select, cancel"));

    static const auto rootMenu =
        MENU(F("Direct Buttons"),
            ITEM_INT(F("Volume"), &volume, 0, 10),
            ITEM_INT(F("Brightness"), &brightness, 0, 100, 5),
            ITEM_BOOL(F("Enabled"), &enabled),
            ITEM_SELECT(F("Mode"), &mode,
                MENU_CHOICE(F("Off"), 0),
                MENU_CHOICE(F("Auto"), 1),
                MENU_CHOICE(F("Manual"), 2)
            ),
            ITEM_FUNC(F("Apply"), applySettings),
            ITEM_FUNC(F("Reset"), resetSettings)
        );

    display_t display = make_serial_display(48, 0);
    input_source_t input = make_buttons_input(
        buttonsInput,
        BTN_UP,
        BTN_DOWN,
        BTN_SELECT,
        BTN_CANCEL,
        true,
        20
    );

    menuRuntime = menu_runtime_t::make(rootMenu, display, input, true);
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}
