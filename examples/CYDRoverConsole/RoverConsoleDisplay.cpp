#include "RoverConsoleDisplay.h"

#include <TFT_eSPI.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

static TFT_eSPI tft;

// Viewport rows: one title row plus this many item rows.
static const int VIEW_ROWS = 5;

static uint16_t rgb(uint8_t r, uint8_t g, uint8_t b) {
    return tft.color565(r, g, b);
}

static uint16_t mix(uint8_t r0, uint8_t g0, uint8_t b0, uint8_t r1, uint8_t g1, uint8_t b1, float t) {
    return rgb((uint8_t)(r0 + (r1 - r0) * t), (uint8_t)(g0 + (g1 - g0) * t), (uint8_t)(b0 + (b1 - b0) * t));
}

static void fillCardGrad(int x, int y, int w, int h, int r,
                         uint8_t tr, uint8_t tg, uint8_t tb, uint8_t br, uint8_t bg, uint8_t bb) {
    tft.fillRoundRect(x, y, w, h, r, rgb(br, bg, bb));
    for (int i = r; i < h - r; ++i) {
        float t = (float)i / (float)(h - 1);
        tft.drawFastHLine(x, y + i, w, mix(tr, tg, tb, br, bg, bb, t));
    }
}

static void degPt(int cx, int cy, float r, float deg, int &ox, int &oy) {
    float a = deg * 3.14159265f / 180.0f;
    ox = cx + (int)lroundf(r * sinf(a));
    oy = cy - (int)lroundf(r * cosf(a));
}

static void arcSeg(int cx, int cy, float r, float d0, float d1, uint16_t c) {
    int px, py, x, y;
    degPt(cx, cy, r, d0, px, py);
    float step = (d1 > d0) ? 6.0f : -6.0f;
    for (float d = d0 + step; (step > 0) ? (d <= d1) : (d >= d1); d += step) {
        degPt(cx, cy, r, d, x, y);
        tft.drawLine(px, py, x, y, c);
        px = x;
        py = y;
    }
}

static void icCompass(int cx, int cy, uint16_t c) {
    tft.drawCircle(cx, cy, 9, c);
    tft.fillTriangle(cx, cy - 7, cx - 3, cy + 1, cx + 3, cy + 1, c);
    tft.drawLine(cx, cy + 1, cx, cy + 7, c);
    tft.fillCircle(cx, cy, 1, c);
}

static void icSpeedo(int cx, int cy, uint16_t c) {
    arcSeg(cx, cy + 2, 9, 270, 450, c);
    int ex, ey;
    degPt(cx, cy + 2, 8, 45, ex, ey);
    tft.drawLine(cx, cy + 2, ex, ey, c);
    tft.fillCircle(cx, cy + 2, 2, c);
}

static void icHeadlight(int cx, int cy, uint16_t c) {
    arcSeg(cx - 2, cy, 9, 180, 360, c);
    tft.drawLine(cx - 2, cy - 9, cx - 2, cy + 9, c);
    for (int dy = -5; dy <= 5; dy += 5) {
        tft.drawLine(cx + 5, cy + dy, cx + 11, cy + dy, c);
    }
}

static void icLevel(int cx, int cy, uint16_t c) {
    tft.drawCircle(cx, cy, 9, c);
    tft.drawLine(cx - 8, cy + 3, cx + 8, cy - 3, c);
    tft.drawCircle(cx + 1, cy - 1, 2, c);
}

static void icSliders(int cx, int cy, uint16_t c) {
    int ys[3] = { cy - 5, cy, cy + 5 };
    int kx[3] = { cx + 3, cx - 3, cx + 5 };
    for (int i = 0; i < 3; ++i) {
        tft.drawFastHLine(cx - 8, ys[i], 16, c);
        tft.fillCircle(kx[i], ys[i], 2, c);
    }
}

static void icSlider1(int cx, int cy, uint16_t c) {
    tft.drawFastHLine(cx - 8, cy, 16, c);
    tft.drawFastVLine(cx - 8, cy - 3, 7, c);
    tft.drawFastVLine(cx + 8, cy - 3, 7, c);
    tft.fillCircle(cx + 3, cy, 3, c);
}

static void icRadar(int cx, int cy, uint16_t c) {
    tft.drawCircle(cx, cy, 4, c);
    tft.drawCircle(cx, cy, 8, c);
    int ex, ey;
    degPt(cx, cy, 8, 45, ex, ey);
    tft.drawLine(cx, cy, ex, ey, c);
    int bx, by;
    degPt(cx, cy, 6, 45, bx, by);
    tft.fillCircle(bx, by, 1, c);
}

static void icBroadcast(int cx, int cy, uint16_t c) {
    tft.fillCircle(cx, cy, 2, c);
    arcSeg(cx, cy, 6, 20, 160, c);
    arcSeg(cx, cy, 9, 30, 150, c);
    arcSeg(cx, cy, 6, 200, 340, c);
    arcSeg(cx, cy, 9, 210, 330, c);
}

static void icClock(int cx, int cy, uint16_t c) {
    tft.drawCircle(cx, cy, 9, c);
    tft.drawLine(cx, cy, cx, cy - 5, c);
    tft.drawLine(cx, cy, cx + 5, cy + 1, c);
    tft.fillCircle(cx, cy, 1, c);
}

static void icCrosshair(int cx, int cy, uint16_t c) {
    tft.drawCircle(cx, cy, 6, c);
    int x0, y0, x1, y1;
    for (int d = 0; d < 360; d += 90) {
        degPt(cx, cy, 6, d, x0, y0);
        degPt(cx, cy, 10, d, x1, y1);
        tft.drawLine(x0, y0, x1, y1, c);
    }
    tft.fillCircle(cx, cy, 1, c);
}

static void icShield(int cx, int cy, uint16_t c) {
    int xs[6] = { cx, cx + 7, cx + 7, cx, cx - 7, cx - 7 };
    int ys[6] = { cy - 9, cy - 5, cy + 2, cy + 9, cy + 2, cy - 5 };
    for (int i = 0; i < 6; ++i) {
        tft.drawLine(xs[i], ys[i], xs[(i + 1) % 6], ys[(i + 1) % 6], c);
    }
    tft.drawLine(cx - 3, cy, cx - 1, cy + 3, c);
    tft.drawLine(cx - 1, cy + 3, cx + 4, cy - 3, c);
}

static void icStop(int cx, int cy, uint16_t c) {
    tft.drawCircle(cx, cy, 9, c);
    tft.fillCircle(cx, cy, 4, c);
}

static void icGear(int cx, int cy, uint16_t c) {
    int x0, y0, x1, y1;
    for (int d = 0; d < 360; d += 45) {
        degPt(cx, cy, 5, d, x0, y0);
        degPt(cx, cy, 9, d, x1, y1);
        tft.drawLine(x0, y0, x1, y1, c);
        tft.drawLine(x0 + 1, y0, x1 + 1, y1, c);
    }
    tft.drawCircle(cx, cy, 5, c);
    tft.fillCircle(cx, cy, 2, c);
}

static void icSave(int cx, int cy, uint16_t c) {
    tft.drawRoundRect(cx - 8, cy - 8, 17, 17, 2, c);
    tft.drawRect(cx - 4, cy + 1, 9, 7, c);
    tft.fillRect(cx + 1, cy - 7, 5, 5, c);
}

static void icDot(int cx, int cy, uint16_t c) {
    tft.drawCircle(cx, cy, 3, c);
}

static char lowerAscii(char c) {
    return (c >= 'A' && c <= 'Z') ? static_cast<char>(c + ('a' - 'A')) : c;
}

static bool eqi(const char *a, const char *b) {
    if (!a || !b) {
        return false;
    }
    while (*a && *b) {
        if (lowerAscii(*a++) != lowerAscii(*b++)) {
            return false;
        }
    }
    return *a == '\0' && *b == '\0';
}

static void drawItemIcon(const char *label, uint8_t etype, int cx, int cy, uint16_t c) {
    if (eqi(label, "Drive mode")) icCompass(cx, cy, c);
    else if (eqi(label, "Max speed")) icSpeedo(cx, cy, c);
    else if (eqi(label, "Headlights")) icHeadlight(cx, cy, c);
    else if (eqi(label, "Pitch trim") || eqi(label, "Pitch")) icLevel(cx, cy, c);
    else if (eqi(label, "PID tuning")) icSliders(cx, cy, c);
    else if (eqi(label, "Sensors") || eqi(label, "Range")) icRadar(cx, cy, c);
    else if (eqi(label, "Telemetry")) icBroadcast(cx, cy, c);
    else if (eqi(label, "Telemetry rate") || eqi(label, "Loop rate") || eqi(label, "Cell temp") || eqi(label, "Uptime")) icClock(cx, cy, c);
    else if (eqi(label, "Calibrate IMU")) icCrosshair(cx, cy, c);
    else if (eqi(label, "Arm motors")) icShield(cx, cy, c);
    else if (eqi(label, "E-STOP")) icStop(cx, cy, c);
    else if (eqi(label, "System")) icGear(cx, cy, c);
    else if (eqi(label, "Save tune")) icSave(cx, cy, c);
    else if (eqi(label, "Kp") || eqi(label, "Ki") || eqi(label, "Kd")) icSlider1(cx, cy, c);
    else if (eqi(label, "Heading")) icCompass(cx, cy, c);
    else if (etype == ENTRY_MENU) icSliders(cx, cy, c);
    else icDot(cx, cy, c);
}

static void stripLabel(char *text) {
    while (*text == '>' || *text == ' ') {
        memmove(text, text + 1, strlen(text));
    }
    char *edit = strstr(text, "  (edit)");
    if (edit) {
        *edit = '\0';
    }
}

static char *splitValue(char *text) {
    char *colon = strchr(text, ':');
    if (!colon) {
        return 0;
    }
    *colon = '\0';
    ++colon;
    while (*colon == ' ') {
        ++colon;
    }
    return colon;
}

static const int ROW_X0 = 8;
static const int ROW_X1 = 302;
static const int ROW_W = ROW_X1 - ROW_X0;
static const int ROW_Y0 = 44;
static const int ROW_PITCH = 36;
static const int ROW_H = 32;

static void cydClear(void *) {
    for (int y = 0; y < 240; ++y) {
        tft.drawFastHLine(0, y, 320, mix(16, 21, 28, 11, 15, 21, (float)y / 239.0f));
    }
}

static void cydFlush(void *) {
}

static void cydRenderLine(void *raw, menu_render_line_t const *line) {
    if (!line) {
        return;
    }
    rover_console_display_ctx_t *displayCtx = static_cast<rover_console_display_ctx_t *>(raw);
    menu_runtime_t *rt = displayCtx ? displayCtx->runtime : 0;
    menu_cursor_t const *cur = (rt && rt->depth < MENU_MAX_STACK) ? &rt->stack[rt->depth] : 0;

    const uint16_t ACCENT = rgb(47, 211, 190);
    const uint16_t STEEL = rgb(150, 166, 182);
    const uint16_t TEXT = rgb(234, 240, 246);
    const uint16_t TEXT_SEL = rgb(248, 253, 253);
    const uint16_t MUTED = rgb(126, 138, 153);
    const uint16_t DIS = rgb(74, 86, 98);
    const uint16_t DIS_DIM = rgb(54, 63, 74);
    const uint16_t VAL_EDIT = rgb(95, 224, 196);
    const uint16_t VAL_RO = rgb(111, 182, 232);
    const uint16_t VAL_SEL = rgb(232, 197, 122);
    const uint16_t VAL_ALERT = rgb(240, 122, 110);
    const uint16_t ROW_BORDER = rgb(38, 48, 62);
    const uint16_t SEL_BORDER = rgb(47, 211, 190);
    const uint16_t SEL_GLOW = rgb(26, 96, 90);

    if (line->kind == MENU_RENDER_TITLE) {
        fillCardGrad(8, 6, 304, 32, 8, 28, 38, 52, 18, 25, 35);
        tft.drawRoundRect(8, 6, 304, 32, 8, rgb(46, 58, 74));
        char title[MENU_MAX_LINE];
        strncpy(title, line->text ? line->text : "", sizeof(title));
        title[sizeof(title) - 1] = '\0';
        int tx = 24;
        if (line->flags & MENU_RENDER_BACK_AVAILABLE) {
            tft.drawRoundRect(11, 12, 16, 20, 4, ACCENT);
            tft.drawLine(22, 16, 17, 22, ACCENT);
            tft.drawLine(17, 22, 22, 28, ACCENT);
            tx = 36;
        } else {
            tft.fillRoundRect(11, 13, 5, 18, 2, ACCENT);
        }
        tft.setTextDatum(TL_DATUM);
        char *slash = strchr(title, '/');
        if (slash) {
            *slash = '\0';
            char *leaf = slash + 1;
            tft.setTextColor(MUTED, rgb(23, 31, 43));
            int w = tft.drawString(title, tx, 13, 2);
            tft.drawString(">", tx + w + 5, 13, 2);
            int w2 = tft.textWidth(">", 2);
            tft.setTextColor(TEXT, rgb(23, 31, 43));
            tft.drawString(leaf, tx + w + 5 + w2 + 5, 12, 2);
        } else {
            tft.setTextColor(TEXT, rgb(23, 31, 43));
            tft.drawString(title, tx, 12, 2);
        }

        int batteryCentiV = (displayCtx && displayCtx->batteryCentiV) ? *displayCtx->batteryCentiV : 0;
        int pct = (int)lroundf((batteryCentiV / 100.0f - 9.0f) / (12.6f - 9.0f) * 100.0f);
        if (pct < 0) pct = 0;
        if (pct > 100) pct = 100;
        uint16_t bcol = pct > 50 ? rgb(86, 216, 168) : (pct > 20 ? rgb(232, 182, 92) : rgb(240, 122, 110));
        int bx1 = 304, bw = 22, bx0 = bx1 - bw, by0 = 16, by1 = 28;
        tft.drawRoundRect(bx0, by0, bw, by1 - by0, 2, MUTED);
        tft.fillRect(bx1 + 1, by0 + 3, 2, by1 - by0 - 6, MUTED);
        tft.fillRect(bx0 + 2, by0 + 2, (bw - 4) * pct / 100, (by1 - by0) - 4, bcol);
        char pbuf[8];
        snprintf(pbuf, sizeof(pbuf), "%d%%", pct);
        tft.setTextDatum(TR_DATUM);
        tft.setTextColor(MUTED, rgb(23, 31, 43));
        int wp = tft.textWidth(pbuf, 1);
        tft.drawString(pbuf, bx0 - 6, 18, 1);

        bool isArmed = (displayCtx && displayCtx->armed) ? *displayCtx->armed : false;
        const char *ctxt = isArmed ? "ARMED" : "READY";
        uint16_t cfg = isArmed ? rgb(232, 182, 92) : rgb(86, 216, 168);
        uint16_t cbg = isArmed ? rgb(58, 42, 18) : rgb(18, 52, 43);
        int wc = tft.textWidth(ctxt, 1), cw = wc + 18, cx1 = bx0 - 6 - wp - 10, cx0 = cx1 - cw;
        tft.fillRoundRect(cx0, 15, cw, 14, 7, cbg);
        tft.fillCircle(cx0 + 8, 22, 2, cfg);
        tft.setTextDatum(TL_DATUM);
        tft.setTextColor(cfg, cbg);
        tft.drawString(ctxt, cx0 + 13, 17, 1);
        return;
    }
    if (line->kind != MENU_RENDER_ITEM) {
        return;
    }

    if (line->row == 1) {
        uint8_t cnt = cur ? menu_runtime_t::menu_count(*cur) : 0;
        int total = cur ? menu_runtime_t::visible_count(*cur, cnt) : 0;
        int vtop = cur ? menu_runtime_t::raw_to_visible(*cur, cnt, line->item_index) : 0;
        int tbY0 = ROW_Y0, tbY1 = ROW_Y0 + ROW_PITCH * 4 + ROW_H, span = tbY1 - tbY0;
        if (total > VIEW_ROWS) {
            tft.fillRoundRect(307, tbY0, 4, span, 2, rgb(34, 43, 56));
            int th = span * VIEW_ROWS / total;
            if (th < 20) th = 20;
            int denom = total - VIEW_ROWS;
            if (denom < 1) denom = 1;
            int ty = tbY0 + (span - th) * vtop / denom;
            tft.fillRoundRect(307, ty, 4, th, 2, rgb(58, 150, 140));
        }
    }

    uint8_t f = line->flags;
    bool sel = f & MENU_RENDER_SELECTED;
    bool edit = f & MENU_RENDER_EDITING;
    bool dis = f & MENU_RENDER_DISABLED;
    bool child = f & MENU_RENDER_HAS_CHILD;
    bool editable = cur ? menu_runtime_t::menu_int_has(*cur, line->item_index) : false;

    int y = ROW_Y0 + (line->row - 1) * ROW_PITCH, cy = y + ROW_H / 2;
    uint16_t cardBg;
    if (sel) {
        tft.fillRoundRect(ROW_X0 - 1, y - 1, ROW_W + 2, ROW_H + 2, 8, SEL_GLOW);
        fillCardGrad(ROW_X0, y, ROW_W, ROW_H, 7, 17, 55, 60, 12, 35, 41);
        tft.drawRoundRect(ROW_X0, y, ROW_W, ROW_H, 7, SEL_BORDER);
        tft.drawRoundRect(ROW_X0 + 1, y + 1, ROW_W - 2, ROW_H - 2, 6, SEL_BORDER);
        tft.fillRoundRect(ROW_X0 + 3, y + 4, 4, ROW_H - 8, 1, ACCENT);
        cardBg = rgb(15, 45, 50);
    } else {
        fillCardGrad(ROW_X0, y, ROW_W, ROW_H, 7, 23, 30, 40, 16, 22, 31);
        tft.drawRoundRect(ROW_X0, y, ROW_W, ROW_H, 7, ROW_BORDER);
        cardBg = rgb(20, 26, 35);
    }

    char buf[MENU_MAX_LINE];
    strncpy(buf, line->text ? line->text : "", sizeof(buf));
    buf[sizeof(buf) - 1] = '\0';
    stripLabel(buf);
    char *val = splitValue(buf);
    bool estop = eqi(buf, "E-STOP");

    uint16_t icol = dis ? DIS : (estop ? VAL_ALERT : (sel ? ACCENT : STEEL));
    drawItemIcon(buf, line->entry_type, ROW_X0 + 22, cy, icol);

    uint16_t lcol = dis ? DIS : (sel ? TEXT_SEL : (estop ? VAL_ALERT : TEXT));
    tft.setTextDatum(TL_DATUM);
    tft.setTextColor(lcol, cardBg);
    tft.drawString(buf, ROW_X0 + 44, y + 9, 2);

    if (edit && val) {
        int minusX = 196, plusX = 284;
        tft.setTextDatum(MC_DATUM);
        tft.setTextColor(VAL_EDIT, cardBg);
        tft.drawString(val, 251, cy, 2);
        tft.fillRoundRect(minusX, y + 7, 18, ROW_H - 14, 4, cardBg);
        tft.drawRoundRect(minusX, y + 7, 18, ROW_H - 14, 4, ACCENT);
        tft.drawLine(minusX + 5, cy, minusX + 13, cy, ACCENT);
        tft.fillRoundRect(plusX, y + 7, 18, ROW_H - 14, 4, cardBg);
        tft.drawRoundRect(plusX, y + 7, 18, ROW_H - 14, 4, ACCENT);
        tft.drawLine(plusX + 5, cy, plusX + 13, cy, ACCENT);
        tft.drawLine(plusX + 9, cy - 4, plusX + 9, cy + 4, ACCENT);
    } else if (child) {
        uint16_t cc = sel ? ACCENT : MUTED;
        tft.drawLine(292, y + 11, 297, y + 16, cc);
        tft.drawLine(297, y + 16, 292, y + 21, cc);
    } else if (val) {
        uint16_t vcol = dis ? DIS_DIM
                      : (line->entry_type == ENTRY_BOOL || line->entry_type == ENTRY_SELECT) ? VAL_SEL
                      : (editable ? VAL_EDIT : VAL_RO);
        int vr = dis ? 286 : 295;
        tft.setTextDatum(TR_DATUM);
        tft.setTextColor(vcol, cardBg);
        tft.drawString(val, vr, y + 9, 2);
        if (dis) {
            tft.drawRoundRect(294, y + 16, 8, 7, 1, DIS);
            arcSeg(298, y + 16, 3, 180, 360, DIS);
        }
    }
}

static display_ops_t const CYD_DISPLAY_OPS = {
    &cydClear,
    0,
    &cydFlush,
    &cydRenderLine
};

void rover_console_display_begin() {
    tft.init();
    tft.setRotation(1);
    tft.fillScreen(TFT_BLACK);
}

display_t make_rover_console_display(rover_console_display_ctx_t &ctx, menu_runtime_t &runtime, int &batteryCentiV, bool &armed) {
    ctx.runtime = &runtime;
    ctx.batteryCentiV = &batteryCentiV;
    ctx.armed = &armed;
    return make_display(60, VIEW_ROWS + 1, &ctx, &CYD_DISPLAY_OPS);
}
