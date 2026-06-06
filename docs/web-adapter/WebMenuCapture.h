#pragma once

#ifndef MENU_MAX_LINE
#define MENU_MAX_LINE 96
#endif

#include "../../BetterMenu.h"

#include <stdint.h>

display_t make_web_menu_capture_display(menu_runtime_t &runtime, uint8_t width, uint8_t height);

uint8_t web_menu_capture_row_count(void);
uint8_t web_menu_capture_row_kind(int index);
uint8_t web_menu_capture_row_flags(int index);
uint8_t web_menu_capture_row_entry_type(int index);
uint8_t web_menu_capture_row_item_index(int index);
uint8_t web_menu_capture_row_editable(int index);
char const *web_menu_capture_row_text(int index);

uint8_t web_menu_capture_visible_top(void);
uint8_t web_menu_capture_visible_total(void);
uint8_t web_menu_capture_visible_window(void);
