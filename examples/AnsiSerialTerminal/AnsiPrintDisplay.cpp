#include "AnsiPrintDisplay.h"

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

display_t make_ansi_print_display(ansi_display_ctx_t &ctx, Print &out, uint8_t width, uint8_t height, uint8_t originRow, uint8_t originCol) {
    ctx.out = &out;
    ctx.width = width;
    ctx.height = height;
    ctx.originRow = originRow;
    ctx.originCol = originCol;
    ctx.begun = false;
    return make_display(width, height, &ctx, &ANSI_DISPLAY_OPS);
}
