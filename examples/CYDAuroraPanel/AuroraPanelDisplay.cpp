#include "AuroraPanelDisplay.h"

#include <TFT_eSPI.h>
#include <string.h>

static TFT_eSPI tft;

static void stripBetterMenuPrefix(char *text) {
    while (*text == '>' || *text == ' ') {
        memmove(text, text + 1, strlen(text));
    }
    while (*text >= '0' && *text <= '9') {
        memmove(text, text + 1, strlen(text));
    }
    if (*text == ' ') {
        memmove(text, text + 1, strlen(text));
    }

    char *edit = strstr(text, "  (edit)");
    if (edit) {
        *edit = '\0';
    }

    size_t len = strlen(text);
    if (len > 2 && text[len - 2] == ' ' && text[len - 1] == '>') {
        text[len - 2] = '\0';
    }
}

static void splitLabelValue(char *text, char **value) {
    *value = strchr(text, ':');
    if (*value) {
        **value = '\0';
        ++(*value);
        if (**value == ' ') {
            ++(*value);
        }
    }
}

static uint16_t rgb(uint8_t r, uint8_t g, uint8_t b) {
    return tft.color565(r, g, b);
}

static void drawThermometer(int x, int y, uint16_t color) {
    tft.drawRoundRect(x + 9, y + 3, 7, 20, 4, color);
    tft.fillCircle(x + 12, y + 25, 7, color);
    tft.drawFastVLine(x + 12, y + 8, 17, color);
}

static void drawSun(int x, int y, uint16_t color) {
    tft.drawCircle(x + 13, y + 15, 6, color);
    tft.drawFastHLine(x + 1, y + 15, 6, color);
    tft.drawFastHLine(x + 20, y + 15, 6, color);
    tft.drawFastVLine(x + 13, y + 2, 6, color);
    tft.drawFastVLine(x + 13, y + 22, 6, color);
}

static void drawDrop(int x, int y, uint16_t color) {
    tft.fillTriangle(x + 13, y + 3, x + 4, y + 18, x + 22, y + 18, color);
    tft.fillCircle(x + 13, y + 19, 9, color);
}

static void drawFan(int x, int y, uint16_t color) {
    tft.fillCircle(x + 13, y + 15, 3, color);
    tft.drawLine(x + 13, y + 15, x + 23, y + 8, color);
    tft.drawLine(x + 13, y + 15, x + 4, y + 8, color);
    tft.drawLine(x + 13, y + 15, x + 13, y + 28, color);
}

static void drawMenuGlyph(int x, int y, uint16_t color) {
    tft.drawRoundRect(x + 4, y + 6, 22, 18, 5, color);
    tft.drawFastHLine(x + 9, y + 12, 12, color);
    tft.drawFastHLine(x + 9, y + 18, 10, color);
}

static void drawIcon(uint8_t entryType, char const *label, int x, int y, uint16_t color) {
    if (strstr(label, "Light")) {
        drawSun(x, y, color);
    } else if (strstr(label, "Humidity")) {
        drawDrop(x, y, color);
    } else if (strstr(label, "Pump") || strstr(label, "Auto vent")) {
        drawFan(x, y, color);
    } else if (entryType == ENTRY_MENU) {
        drawMenuGlyph(x, y, color);
    } else {
        drawThermometer(x, y, color);
    }
}

static void cydClear(void *) {
    tft.fillScreen(rgb(46, 52, 64));
}

static void cydFlush(void *) {
}

static void cydRenderLine(void *, menu_render_line_t const *line) {
    if (!line) {
        return;
    }

    const uint16_t bg = rgb(46, 52, 64);
    const uint16_t titleSurface = rgb(59, 66, 82);
    const uint16_t rowSurface = rgb(59, 66, 82);
    const uint16_t rowSurfaceAlt = rgb(67, 76, 94);
    const uint16_t selectedSurface = rgb(39, 52, 68);
    const uint16_t selectedStroke = rgb(136, 192, 208);
    const uint16_t text = rgb(236, 239, 244);
    const uint16_t frost = rgb(136, 192, 208);
    const uint16_t frostDark = rgb(94, 129, 172);
    const uint16_t success = rgb(163, 190, 140);
    const uint16_t warning = rgb(235, 203, 139);
    const uint16_t disabled = rgb(118, 128, 144);

    if (line->kind == MENU_RENDER_TITLE) {
        tft.fillRect(0, 0, 320, 44, bg);
        tft.fillRoundRect(8, 8, 304, 36, 9, titleSurface);
        tft.fillRoundRect(14, 14, 6, 24, 3, frost);
        tft.setTextColor(text, titleSurface);
        tft.drawString(line->text ? line->text : "", 28, 16, 2);
        tft.fillRoundRect(244, 15, 61, 22, 6, rgb(31, 54, 49));
        tft.setTextColor(success, rgb(31, 54, 49));
        tft.drawString("STABLE", 254, 21, 1);
        return;
    }

    if (line->kind != MENU_RENDER_ITEM) {
        return;
    }

    uint8_t flags = line->flags;
    bool selected = flags & MENU_RENDER_SELECTED;
    bool editing = flags & MENU_RENDER_EDITING;
    bool isDisabled = flags & MENU_RENDER_DISABLED;
    bool hasChild = flags & MENU_RENDER_HAS_CHILD;

    int y = 52 + (line->row - 1) * 34;
    uint16_t fill = selected ? selectedSurface : ((line->row & 1) ? rowSurfaceAlt : rowSurface);
    uint16_t fg = isDisabled ? disabled : text;
    uint16_t valueFg = isDisabled ? disabled : success;
    uint16_t iconColor = selected ? frost : (isDisabled ? disabled : warning);

    tft.fillRoundRect(8, y, 304, 30, 7, fill);
    tft.drawRoundRect(8, y, 304, 30, 7, selected ? selectedStroke : rgb(76, 86, 106));
    if (selected) {
        tft.fillRoundRect(10, y + 4, 4, 22, 2, frost);
    }

    char rowText[MENU_MAX_LINE];
    strncpy(rowText, line->text ? line->text : "", sizeof(rowText));
    rowText[sizeof(rowText) - 1] = '\0';
    stripBetterMenuPrefix(rowText);

    char *value = 0;
    splitLabelValue(rowText, &value);

    drawIcon(line->entry_type, rowText, 22, y + 2, iconColor);

    tft.setTextColor(fg, fill);
    tft.drawString(rowText, 58, y + 8, 2);

    if (value) {
        tft.setTextColor(valueFg, fill);
        tft.drawRightString(value, editing ? 232 : 288, y + 9, 2);
    }

    if (editing) {
        tft.fillRoundRect(242, y + 6, 28, 18, 5, frostDark);
        tft.fillRoundRect(276, y + 6, 28, 18, 5, frostDark);
        tft.setTextColor(text, frostDark);
        tft.drawString("-", 253, y + 10, 1);
        tft.drawString("+", 286, y + 10, 1);
    } else if (hasChild) {
        tft.setTextColor(frost, fill);
        tft.drawString(">", 294, y + 8, 2);
    } else if (isDisabled) {
        tft.drawRoundRect(288, y + 10, 12, 10, 2, disabled);
    }

    if (flags & MENU_RENDER_SCROLL_DOWN) {
        tft.fillTriangle(304, y + 24, 312, y + 24, 308, y + 29, frost);
    }

    if (line->row == 5) {
        tft.fillRoundRect(8, 224, 304, 12, 4, titleSurface);
        tft.fillRoundRect(12, 227, 84, 6, 3, frostDark);
    }
}

static display_ops_t const CYD_DISPLAY_OPS = {
    &cydClear,
    0,
    &cydFlush,
    &cydRenderLine
};

void aurora_panel_display_begin() {
    tft.init();
    tft.setRotation(1);
    tft.setTextDatum(TL_DATUM);
    tft.fillScreen(TFT_BLACK);
}

display_t make_aurora_panel_display() {
    return make_display(36, 6, 0, &CYD_DISPLAY_OPS);
}
