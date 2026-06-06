#pragma once

#include <Arduino.h>
#include <BetterMenu.h>

#ifndef BM_ANSI_COLOR
#define BM_ANSI_COLOR 1
#endif

#ifndef BM_ANSI_HIDE_CURSOR
#define BM_ANSI_HIDE_CURSOR 1
#endif

#ifndef BM_ANSI_CLEAR_ON_BEGIN
#define BM_ANSI_CLEAR_ON_BEGIN 1
#endif

struct ansi_display_ctx_t {
    Print *out;
    uint8_t width;
    uint8_t height;
    uint8_t originRow;
    uint8_t originCol;
    bool begun;
};

display_t make_ansi_print_display(ansi_display_ctx_t &ctx, Print &out, uint8_t width, uint8_t height, uint8_t originRow, uint8_t originCol);
