#include <BetterMenu.h>

static int volume = 5;
static int brightness = 50;
static int speed = 3;
static bool telemetry = false;
static int runMode = 0;

#ifndef LED_BUILTIN
#define LED_BUILTIN 13
#endif

static void blinkLed() {
    pinMode(LED_BUILTIN, OUTPUT);
    for (uint8_t i = 0; i < 3; ++i) {
        digitalWrite(LED_BUILTIN, HIGH);
        delay(120);
        digitalWrite(LED_BUILTIN, LOW);
        delay(120);
    }
    pinMode(LED_BUILTIN, INPUT);
    Serial.println(F("[action] blink"));
}

static void sayHello() {
    Serial.println(F("[action] hello"));
}

static void resetValues() {
    volume = 5;
    brightness = 50;
    speed = 3;
    telemetry = false;
    runMode = 0;
    Serial.println(F("[action] reset"));
}

static menu_runtime_t menuRuntime;
static print_display_ctx_t serialDisplay;
static serial_keys_ctx_t serialInput;

void setup() {
    Serial.begin(115200);
    while (!Serial) {
    }

    Serial.println(F("BetterMenu Serial demo"));
    Serial.println(F("w/s move, e or d select/toggle/cycle, q or a back"));
    Serial.println(F("while editing: w/d increment, s/a decrement, e save, q cancel"));

    static const auto rootMenu =
        MENU(F("Main Menu"),
            ITEM_MENU(F("Config Settings"),
                MENU(F("Config Settings"),
                    ITEM_INT(F("Volume"), &volume, 0, 10),
                    ITEM_INT(F("Brightness"), &brightness, 0, 100),
                    ITEM_INT(F("Speed"), &speed, 1, 5),
                    ITEM_BOOL(F("Telemetry"), &telemetry),
                    ITEM_SELECT(F("Run Mode"), &runMode,
                        MENU_CHOICE(F("Idle"), 0),
                        MENU_CHOICE(F("Auto"), 1),
                        MENU_CHOICE(F("Manual"), 2)
                    )
                )
            ),
            ITEM_MENU(F("Run Actions"),
                MENU(F("Run Actions"),
                    ITEM_FUNC(F("Blink LED"), blinkLed),
                    ITEM_FUNC(F("Say Hello"), sayHello),
                    ITEM_FUNC(F("Reset Values"), resetValues)
                )
            )
        );

    display_t display = make_print_display(serialDisplay, Serial, 48, 0);
    input_source_t input = make_serial_keys_input(serialInput);
    menuRuntime = menu_runtime_t::make(rootMenu, display, input, true);
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}
