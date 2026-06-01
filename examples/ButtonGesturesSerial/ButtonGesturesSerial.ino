#include <BetterMenu.h>
#include <ButtonGestures.h>

// One momentary pushbutton wired from this pin to GND.
// ButtonGestures configures INPUT_PULLUP through its constructor below.
#define GESTURE_BUTTON_PIN 2

static int volume = 5;
static int brightness = 50;
static bool outputEnabled = true;
static int runMode = 0;
static uint8_t lastGesture = NOT_PRESSED;
static uint16_t gestureCount = 0;

static menu_runtime_t menuRuntime;
static print_display_ctx_t serialDisplay;
static input_rich_event_ctx_t gestureInputStorage;
static ButtonGestures gestureButton(GESTURE_BUTTON_PIN, LOW, INPUT_PULLUP);

struct gesture_input_ctx_t {
    ButtonGestures *button;
};

static gesture_input_ctx_t gestureInput = { &gestureButton };

static void copyText(char *out, uint8_t cap, char const *text) {
    if (!out || cap == 0) {
        return;
    }

    uint8_t i = 0;
    if (text) {
        while (i < static_cast<uint8_t>(cap - 1) && text[i]) {
            out[i] = text[i];
            ++i;
        }
    }
    out[i] = '\0';
}

static void printGestureHelp() {
    Serial.println(F("ButtonGestures controls on one button:"));
    Serial.println(F("  single click       select / save"));
    Serial.println(F("  single long-hold   cancel / back"));
    Serial.println(F("  double click       down"));
    Serial.println(F("  double long-hold   up"));
    Serial.println(F("  triple click       right / increment"));
    Serial.println(F("  triple long-hold   left / decrement"));
    Serial.println(F("Keep loop() non-blocking so ButtonGestures can be polled often."));
}

static char const *gestureName(uint8_t gesture) {
    switch (gesture) {
        case SINGLE_PRESS_SHORT: return "single short";
        case SINGLE_PRESS_LONG:  return "single long";
        case DOUBLE_PRESS_SHORT: return "double short";
        case DOUBLE_PRESS_LONG:  return "double long";
        case TRIPLE_PRESS_SHORT: return "triple short";
        case TRIPLE_PRESS_LONG:  return "triple long";
        case NOT_PRESSED:
        default:                 return "none";
    }
}

static void formatLastGesture(void *, char *out, uint8_t cap) {
    copyText(out, cap, gestureName(lastGesture));
}

static int getGestureCount(void *) {
    return gestureCount;
}

static int getLastGestureCode(void *) {
    return lastGesture;
}

static int getButtonPin(void *) {
    return GESTURE_BUTTON_PIN;
}

static void applySettings() {
    Serial.print(F("[action] apply: volume="));
    Serial.print(volume);
    Serial.print(F(" brightness="));
    Serial.print(brightness);
    Serial.print(F(" enabled="));
    Serial.print(outputEnabled ? F("yes") : F("no"));
    Serial.print(F(" mode="));
    Serial.println(runMode);
}

static void resetSettings() {
    volume = 5;
    brightness = 50;
    outputEnabled = true;
    runMode = 0;
    Serial.println(F("[action] reset"));
    menuRuntime.request_redraw();
}

static menu_event_t mapGestureToMenuEvent(uint8_t gesture) {
    if (gesture == NOT_PRESSED) {
        return menu_event(Choice_Invalid);
    }

    lastGesture = gesture;
    ++gestureCount;

    switch (gesture) {
        case SINGLE_PRESS_SHORT:
            return menu_event(Choice_Select);

        case SINGLE_PRESS_LONG:
            return menu_choice_event(Choice_Cancel, MENU_EVENT_LONG);

        case DOUBLE_PRESS_SHORT:
            return menu_event(Choice_Down);

        case DOUBLE_PRESS_LONG:
            return menu_choice_event(Choice_Up, MENU_EVENT_LONG);

        case TRIPLE_PRESS_SHORT:
            return menu_event(Choice_Right);

        case TRIPLE_PRESS_LONG:
            return menu_choice_event(Choice_Left, MENU_EVENT_LONG);

        default:
            return menu_event(Choice_Invalid);
    }
}

static menu_event_t readGestureMenuInput(void *ctx) {
    gesture_input_ctx_t *input = static_cast<gesture_input_ctx_t *>(ctx);
    if (!input || !input->button) {
        return menu_event(Choice_Invalid);
    }

    return mapGestureToMenuEvent(input->button->check_button());
}

void setup() {
    Serial.begin(115200);
    uint32_t timer = millis() + 2000;
    while (!Serial && millis() < timer) {
    }

    Serial.println(F("\n\nBetterMenu ButtonGestures Serial demo"));
    Serial.println(F("Wire one button from pin 2 to GND."));
    printGestureHelp();

    // Single-shot mode avoids one long cancel press backing out through several menu levels.
    gestureButton.set_long_press_mode(LONG_PRESS_SINGLE_SHOT);
    gestureButton.reset();

    static const auto rootMenu =
        MENU(F("Gesture Menu"),
            ITEM_MENU(F("Settings"),
                MENU(F("Settings"),
                    ITEM_INT(F("Volume"), &volume, 0, 10),
                    ITEM_INT(F("Brightness"), &brightness, 0, 100, 5),
                    ITEM_BOOL(F("Output"), &outputEnabled),
                    ITEM_SELECT(F("Run Mode"), &runMode,
                        MENU_CHOICE(F("Idle"), 0),
                        MENU_CHOICE(F("Auto"), 1),
                        MENU_CHOICE(F("Manual"), 2)
                    )
                )
            ),
            ITEM_MENU(F("Input Status"),
                MENU(F("Input Status"),
                    ITEM_FORMAT(ITEM_VALUE(F("Last gesture"), getLastGestureCode, 0), formatLastGesture, 0),
                    ITEM_VALUE(F("Gesture count"), getGestureCount, 0),
                    ITEM_VALUE(F("Button pin"), getButtonPin, 0)
                )
            ),
            ITEM_MENU(F("Actions"),
                MENU(F("Actions"),
                    ITEM_FUNC(F("Apply Settings"), applySettings),
                    ITEM_FUNC(F("Reset Settings"), resetSettings),
                    ITEM_FUNC(F("Print Help"), printGestureHelp)
                )
            )
        );

    display_t display = make_print_display(serialDisplay, Serial, 48, 0);
    input_source_t input = make_event_input(gestureInputStorage, &gestureInput, readGestureMenuInput);

    menuRuntime = menu_runtime_t::make(rootMenu, display, input, true);
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}
