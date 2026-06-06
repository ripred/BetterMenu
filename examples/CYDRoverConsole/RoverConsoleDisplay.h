#pragma once

#ifndef MENU_MAX_LINE
#define MENU_MAX_LINE 64
#endif

#include <BetterMenu.h>

struct rover_console_display_ctx_t {
    menu_runtime_t *runtime;
    int *batteryCentiV;
    bool *armed;
};

void rover_console_display_begin();
display_t make_rover_console_display(rover_console_display_ctx_t &ctx, menu_runtime_t &runtime, int &batteryCentiV, bool &armed);
