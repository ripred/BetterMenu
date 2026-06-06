#include "WebMenuCapture.h"

struct captured_row_t {
    uint8_t row;
    uint8_t item_index;
    uint8_t kind;
    uint8_t entry_type;
    uint8_t flags;
    uint8_t editable;
    char text[MENU_MAX_LINE];
};

static captured_row_t rows[8];
static uint8_t rowCount = 0;
static uint8_t visibleTop = 0;
static uint8_t visibleTotal = 0;
static uint8_t visibleWindow = 5;

static bool validIndex(int index) {
    return index >= 0 && index < rowCount;
}

static void clearDisplay(void *) {
    rowCount = 0;
    visibleTop = 0;
    visibleTotal = 0;
    visibleWindow = 5;
    for (uint8_t i = 0; i < 8; ++i) {
        rows[i].editable = 0;
        rows[i].text[0] = '\0';
    }
}

static void flushDisplay(void *) {
}

static void renderLine(void *ctx, menu_render_line_t const *line) {
    if (!line || line->row >= 8) {
        return;
    }
    menu_runtime_t *rt = static_cast<menu_runtime_t *>(ctx);
    menu_cursor_t const *cur = (rt && rt->depth < MENU_MAX_STACK) ? &rt->stack[rt->depth] : 0;

    captured_row_t &row = rows[line->row];
    row.row = line->row;
    row.item_index = line->item_index;
    row.kind = line->kind;
    row.entry_type = line->entry_type;
    row.flags = line->flags;
    row.editable = 0;

    if (cur && line->kind == MENU_RENDER_ITEM) {
        uint8_t total = menu_runtime_t::menu_count(*cur);
        visibleTotal = menu_runtime_t::visible_count(*cur, total);
        visibleWindow = visibleTotal < 5 ? visibleTotal : 5;
        row.editable = menu_runtime_t::menu_int_has(*cur, line->item_index) ? 1 : 0;
        if (line->row == 1) {
            visibleTop = menu_runtime_t::raw_to_visible(*cur, total, line->item_index);
        }
    }

    char const *src = line->text ? line->text : "";
    uint8_t i = 0;
    while (src[i] && i + 1 < MENU_MAX_LINE) {
        row.text[i] = src[i];
        ++i;
    }
    row.text[i] = '\0';
    if (line->row + 1 > rowCount) {
        rowCount = static_cast<uint8_t>(line->row + 1);
    }
}

static display_ops_t const WEB_CAPTURE_DISPLAY_OPS = {
    &clearDisplay,
    0,
    &flushDisplay,
    &renderLine
};

display_t make_web_menu_capture_display(menu_runtime_t &runtime, uint8_t width, uint8_t height) {
    return make_display(width, height, &runtime, &WEB_CAPTURE_DISPLAY_OPS);
}

uint8_t web_menu_capture_row_count(void) {
    return rowCount;
}

uint8_t web_menu_capture_row_kind(int index) {
    return validIndex(index) ? rows[index].kind : 0;
}

uint8_t web_menu_capture_row_flags(int index) {
    return validIndex(index) ? rows[index].flags : 0;
}

uint8_t web_menu_capture_row_entry_type(int index) {
    return validIndex(index) ? rows[index].entry_type : 0;
}

uint8_t web_menu_capture_row_item_index(int index) {
    return validIndex(index) ? rows[index].item_index : 255;
}

uint8_t web_menu_capture_row_editable(int index) {
    return validIndex(index) ? rows[index].editable : 0;
}

char const *web_menu_capture_row_text(int index) {
    return validIndex(index) ? rows[index].text : 0;
}

uint8_t web_menu_capture_visible_top(void) {
    return visibleTop;
}

uint8_t web_menu_capture_visible_total(void) {
    return visibleTotal;
}

uint8_t web_menu_capture_visible_window(void) {
    return visibleWindow;
}
