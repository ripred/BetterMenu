#include <BetterMenu.h>

#define BM_ANSI_COLOR 1
#define BM_ANSI_HIDE_CURSOR 1
#define BM_ANSI_CLEAR_ON_BEGIN 1

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

static menu_runtime_t menuRuntime;
static serial_keys_ctx_t serialInput;

struct ansi_display_ctx_t {
    Print *out;
    uint8_t width;
    uint8_t height;
    uint8_t originRow;
    uint8_t originCol;
    bool begun;
};

static ansi_display_ctx_t ansiDisplay;

static void ansiCursor(Print &out, uint8_t row, uint8_t col) {
    out.print(F("\033["));
    out.print(row);
    out.print(';');
    out.print(col);
    out.print('H');
}

static void ansiStyle(Print &out, menu_render_line_t const *line) {
    if (!line) {
        out.print(F("\033[0m"));
        return;
    }
#if BM_ANSI_COLOR
    if (line->kind == MENU_RENDER_TITLE) {
        out.print(F("\033[1;36m"));
    } else if (line->flags & MENU_RENDER_DISABLED) {
        out.print(F("\033[2;37m"));
    } else if (line->flags & MENU_RENDER_EDITING) {
        out.print(F("\033[1;30;43m"));
    } else if (line->flags & MENU_RENDER_SELECTED) {
        out.print(F("\033[1;30;46m"));
    } else {
        out.print(F("\033[0m"));
    }
#else
    if (line->flags & MENU_RENDER_SELECTED) {
        out.print(F("\033[7m"));
    } else if (line->flags & MENU_RENDER_DISABLED) {
        out.print(F("\033[2m"));
    } else if (line->flags & MENU_RENDER_EDITING) {
        out.print(F("\033[4m"));
    } else if (line->kind == MENU_RENDER_TITLE) {
        out.print(F("\033[1m"));
    } else {
        out.print(F("\033[0m"));
    }
#endif
}

static void ansiPrintPadded(Print &out, const char *text, uint8_t width) {
    uint8_t written = 0;
    while (text && *text && written < width) {
        out.print(*text++);
        ++written;
    }
    while (written < width) {
        out.print(' ');
        ++written;
    }
}

static void ansiClearRegion(ansi_display_ctx_t *ctx) {
    if (!ctx || !ctx->out) {
        return;
    }
    for (uint8_t row = 0; row < ctx->height; ++row) {
        ansiCursor(*ctx->out, ctx->originRow + row, ctx->originCol);
        ansiPrintPadded(*ctx->out, "", ctx->width);
    }
}

static void ansiClear(void *raw) {
    ansi_display_ctx_t *ctx = static_cast<ansi_display_ctx_t *>(raw);
    if (!ctx || !ctx->out) {
        return;
    }
    if (!ctx->begun) {
#if BM_ANSI_CLEAR_ON_BEGIN
        ctx->out->print(F("\033[2J"));
#endif
#if BM_ANSI_HIDE_CURSOR
        ctx->out->print(F("\033[?25l"));
#endif
        ctx->begun = true;
    }
    ctx->out->print(F("\033[0m"));
    ansiClearRegion(ctx);
}

static void ansiFlush(void *raw) {
    ansi_display_ctx_t *ctx = static_cast<ansi_display_ctx_t *>(raw);
    if (!ctx || !ctx->out) {
        return;
    }
    ctx->out->print(F("\033[0m"));
    ansiCursor(*ctx->out, ctx->originRow + ctx->height, ctx->originCol);
    ctx->out->print(F("w/s move  e/d select or edit +  a/q back or edit -"));
}

static void ansiRenderLine(void *raw, menu_render_line_t const *line) {
    ansi_display_ctx_t *ctx = static_cast<ansi_display_ctx_t *>(raw);
    if (!ctx || !ctx->out || !line || line->row >= ctx->height) {
        return;
    }
    ansiCursor(*ctx->out, ctx->originRow + line->row, ctx->originCol);
    ansiStyle(*ctx->out, line);
    ansiPrintPadded(*ctx->out, line->text ? line->text : "", ctx->width);
    ctx->out->print(F("\033[0m"));
}

static display_ops_t const ANSI_DISPLAY_OPS = {
    &ansiClear,
    0,
    &ansiFlush,
    &ansiRenderLine
};

static display_t make_ansi_print_display(ansi_display_ctx_t &ctx, Print &out, uint8_t width, uint8_t height, uint8_t originRow, uint8_t originCol) {
    ctx.out = &out;
    ctx.width = width;
    ctx.height = height;
    ctx.originRow = originRow;
    ctx.originCol = originCol;
    ctx.begun = false;
    return make_display(width, height, &ctx, &ANSI_DISPLAY_OPS);
}

void setup() {
    Serial.begin(115200);
    while (!Serial) {
    }

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
