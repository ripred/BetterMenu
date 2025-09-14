#if  1



#include <LiquidCrystal.h>
#include "BetterMenu.h"

/* LCD pins (adjust as needed) */
#define LCD_RS 7
#define LCD_E  8
#define LCD_D4 9
#define LCD_D5 10
#define LCD_D6 11
#define LCD_D7 12
static LiquidCrystal lcd(LCD_RS, LCD_E, LCD_D4, LCD_D5, LCD_D6, LCD_D7);

/* Buttons (active-low, INPUT_PULLUP) */
#define BTN_UP       2
#define BTN_DOWN     3
#define BTN_SELECT   4
#define BTN_CANCEL   5
#define BTN_LEFT     6
#define BTN_RIGHT    A1

/* Demo values & actions */
static int volume = 5, brightness = 50, speed = 3;
#ifndef LED_BUILTIN
#define LED_BUILTIN 13
#endif
static void fn_blink() { pinMode(LED_BUILTIN, OUTPUT); for (uint8_t i=0;i<3;++i){ digitalWrite(LED_BUILTIN,HIGH); delay(120); digitalWrite(LED_BUILTIN,LOW); delay(120);} }
static void fn_hello() { /* optional Serial.println */ }
static void fn_reset() { volume=5; brightness=50; speed=3; }

/* Declarative menu */
static auto root_menu =
    MENU("Main Menu",
        ITEM_MENU("Config Settings",
            MENU("Config Settings",
                ITEM_INT("Volume",     &volume,     0, 10),
                ITEM_INT("Brightness", &brightness, 0, 100),
                ITEM_INT("Speed",      &speed,      1, 5)
            )
        ),
        ITEM_MENU("Run Actions",
            MENU("Run Actions",
                ITEM_FUNC("Blink LED",    fn_blink),
                ITEM_FUNC("Say Hello",    fn_hello),
                ITEM_FUNC("Reset Values", fn_reset)
            )
        )
    );

/* Minimal LCD display adapter (16x2) */
static uint8_t g_w = 16, g_h = 2;
static void lcd_clear() { lcd.clear(); lcd.setCursor(0,0); }
static void lcd_print_padded(uint8_t row, char const *text) {
    lcd.setCursor(0, row);
    for (uint8_t i=0;i<g_w;++i) { char ch = text[i]; lcd.print(ch ? ch : ' '); if (!ch) { for (uint8_t j=i+1;j<g_w;++j) lcd.print(' '); break; } }
}
static void lcd_write_line(uint8_t row, char const *text) { if (row < g_h) { lcd_print_padded(row, text); } }
static void lcd_flush() { }
static display_t make_hd44780(uint8_t w, uint8_t h) { g_w=w; g_h=h; display_t d{w,h,&lcd_clear,&lcd_write_line,&lcd_flush}; return d; }

static menu_runtime_t g_menu;

void setup() {
    Serial.begin(115200); while(!Serial){ }
    lcd.begin(16,2);

    display_t disp = make_hd44780(16,2);
    /* DRY GPIO buttons provider: order (up, down, select, cancel, left, right), active_low=true, debounce=20ms */
    input_source_t in = make_buttons_input(BTN_UP, BTN_DOWN, BTN_SELECT, BTN_CANCEL, BTN_LEFT, BTN_RIGHT, true, 20);

    g_menu = menu_runtime_t::make(root_menu, disp, in, false /*numbers off on narrow LCD*/);
    g_menu.begin();
}

void loop() {
    g_menu.service();
    // other work...
}



#else



/**
 * BetterMenu.ino
 * 
 * example program for the BetterMenu library
 * 
 */

#include "BetterMenu.h"

/* Demo values & actions */
static int volume = 5, brightness = 50, speed = 3;

#ifndef LED_BUILTIN
#define LED_BUILTIN 13
#endif

static void fn_blink() {
    pinMode(LED_BUILTIN, OUTPUT);
    for (uint8_t i=0; i < 3; ++i) {
        digitalWrite(LED_BUILTIN,HIGH); delay(120);
        digitalWrite(LED_BUILTIN,LOW); delay(120);
    }
    pinMode(LED_BUILTIN, INPUT);
    Serial.println(F("\n[action] blink\n"));
}

static void fn_hello() {
    Serial.println(F("\n[action] hello\n"));
}

static void fn_reset() {
    volume=5;
    brightness=50;
    speed=3;
    Serial.println(F("\n[action] reset\n"));
}

/* Declarative menu */
static auto root_menu =
MENU("Main Menu",
    ITEM_MENU("Config Settings",
        MENU("Config Settings",
            ITEM_INT("Volume",     &volume,     0, 10),
            ITEM_INT("Brightness", &brightness, 0, 100),
            ITEM_INT("Speed",      &speed,      1, 5)
        )
    ),
    ITEM_MENU("Run Actions",
        MENU("Run Actions",
            ITEM_FUNC("Blink LED",    fn_blink),
            ITEM_FUNC("Say Hello",    fn_hello),
            ITEM_FUNC("Reset Values", fn_reset)
        )
    )
);

static menu_runtime_t g_menu;

void setup() {
    Serial.begin(115200);
    while (!Serial) { }
    Serial.println();
    Serial.println(F("=== Declarative Menu Demo: SERIAL (provider) ==="));
    Serial.println(F("keys: w/s move, e select, q back"));

    display_t disp = make_serial_display(0, 0);
    input_source_t in = make_serial_keys_input();   /* DRY provider */
    g_menu = menu_runtime_t::make(root_menu, disp, in, true /*use numbers*/);
    g_menu.begin();
}

void loop() {
    g_menu.service();

    // other app work...
}


#endif
