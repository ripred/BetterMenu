#include <LiquidCrystal.h>
#include <BetterMenu.h>

#define LCD_RS 7
#define LCD_E  8
#define LCD_D4 9
#define LCD_D5 10
#define LCD_D6 11
#define LCD_D7 12

#define BTN_UP     2
#define BTN_DOWN   3
#define BTN_SELECT 4
#define BTN_CANCEL 5
#define BTN_LEFT   6
#define BTN_RIGHT  A1

static LiquidCrystal lcd(LCD_RS, LCD_E, LCD_D4, LCD_D5, LCD_D6, LCD_D7);

struct hd44780_display_ctx_t {
    LiquidCrystal *lcd;
    uint8_t width;
};

static hd44780_display_ctx_t lcdDisplay = { &lcd, 16 };

static int volume = 5;
static int brightness = 50;
static int speed = 3;
static bool backlight = true;
static int profile = 0;

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
}

static void resetValues() {
    volume = 5;
    brightness = 50;
    speed = 3;
    backlight = true;
    profile = 0;
}

static void lcdClear(void *ctx) {
    hd44780_display_ctx_t &display = *static_cast<hd44780_display_ctx_t *>(ctx);
    display.lcd->clear();
    display.lcd->setCursor(0, 0);
}

static void lcdWriteLine(void *ctx, uint8_t row, char const *text) {
    hd44780_display_ctx_t &display = *static_cast<hd44780_display_ctx_t *>(ctx);
    display.lcd->setCursor(0, row);
    bool ended = (text == 0);
    for (uint8_t col = 0; col < display.width; ++col) {
        char ch = ended ? '\0' : text[col];
        if (ch == '\0') {
            ended = true;
        }
        display.lcd->print(ch ? ch : ' ');
    }
}

static void lcdFlush(void *) {
}

static display_ops_t const HD44780_DISPLAY_OPS = {
    &lcdClear, &lcdWriteLine, &lcdFlush, 0
};

static display_t makeHd44780Display(uint8_t width, uint8_t height) {
    lcdDisplay.width = width;
    return make_display(width, height, &lcdDisplay, &HD44780_DISPLAY_OPS);
}

static menu_runtime_t menuRuntime;
static buttons_ctx_t buttonsInput;

void setup() {
    lcd.begin(16, 2);

    static const auto rootMenu =
        MENU(F("Main Menu"),
            ITEM_MENU(F("Config Settings"),
                MENU(F("Config Settings"),
                    ITEM_INT(F("Volume"), &volume, 0, 10),
                    ITEM_INT(F("Brightness"), &brightness, 0, 100),
                    ITEM_INT(F("Speed"), &speed, 1, 5),
                    ITEM_BOOL(F("Backlight"), &backlight),
                    ITEM_SELECT(F("Profile"), &profile,
                        MENU_CHOICE(F("Normal"), 0),
                        MENU_CHOICE(F("Quiet"), 1),
                        MENU_CHOICE(F("Fast"), 2)
                    )
                )
            ),
            ITEM_MENU(F("Run Actions"),
                MENU(F("Run Actions"),
                    ITEM_FUNC(F("Blink LED"), blinkLed),
                    ITEM_FUNC(F("Reset Values"), resetValues)
                )
            )
        );

    display_t display = makeHd44780Display(16, 2);
    input_source_t input = make_buttons_input(
        buttonsInput,
        BTN_UP,
        BTN_DOWN,
        BTN_SELECT,
        BTN_CANCEL,
        BTN_LEFT,
        BTN_RIGHT,
        true,
        20
    );

    menuRuntime = menu_runtime_t::make(rootMenu, display, input, false);
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}
