#define MENU_MAX_LINE 96

#include "../../BetterMenu.h"

#include <stddef.h>
#include <stdint.h>

extern "C" size_t strlen(char const *s) {
    size_t n = 0;
    while (s && s[n]) {
        ++n;
    }
    return n;
}

extern "C" void *memcpy(void *dst, void const *src, size_t n) {
    char *d = static_cast<char *>(dst);
    char const *s = static_cast<char const *>(src);
    for (size_t i = 0; i < n; ++i) {
        d[i] = s[i];
    }
    return dst;
}

extern "C" void *memmove(void *dst, void const *src, size_t n) {
    char *d = static_cast<char *>(dst);
    char const *s = static_cast<char const *>(src);
    if (d < s) {
        for (size_t i = 0; i < n; ++i) {
            d[i] = s[i];
        }
    } else if (d > s) {
        for (size_t i = n; i > 0; --i) {
            d[i - 1] = s[i - 1];
        }
    }
    return dst;
}

extern "C" void *memset(void *dst, int value, size_t n) {
    unsigned char *d = static_cast<unsigned char *>(dst);
    for (size_t i = 0; i < n; ++i) {
        d[i] = static_cast<unsigned char>(value);
    }
    return dst;
}

static menu_runtime_t runtime;
static menu_event_t pendingEvent = menu_event(Choice_Invalid);

static int driveMode = 1;
static int maxSpeedPct = 65;
static bool headlights = false;
static int pitchTrimTenth = -15;
static int kpMilli = 1200;
static int kiMilli = 80;
static int kdMilli = 450;
static int loopRateHz = 200;
static int pitchTenth = 23;
static int headingDeg = 247;
static int battCentiV = 1187;
static int rangeMm = 412;
static int cellTempC = 34;
static bool telemetryStream = false;
static int telemetryHz = 5;
static bool armed = false;
static int brightnessPct = 80;
static int themeSel = 0;
static bool screenFlip = false;
static int uptimeMin = 154;

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

static void action(void) {
}

static void onChanged(void *) {
}

static bool telemetryRateDisabled(void *) {
    return !telemetryStream;
}

static bool devToolsHidden(void *) {
    return themeSel != 2;
}

static int getInt(void *ctx) {
    return ctx ? *static_cast<int *>(ctx) : 0;
}

static void setInt(void *ctx, int value) {
    if (ctx) {
        *static_cast<int *>(ctx) = value;
    }
}

static void appendChar(char *out, uint8_t cap, uint8_t &pos, char c) {
    if (pos + 1 < cap) {
        out[pos++] = c;
        out[pos] = '\0';
    }
}

static void appendInt(char *out, uint8_t cap, uint8_t &pos, int value) {
    char tmp[12];
    bool neg = value < 0;
    unsigned int v = neg ? (0U - static_cast<unsigned int>(value)) : static_cast<unsigned int>(value);
    uint8_t len = 0;
    do {
        tmp[len++] = static_cast<char>('0' + (v % 10U));
        v /= 10U;
    } while (v && len < sizeof(tmp));
    if (neg) {
        appendChar(out, cap, pos, '-');
    }
    while (len) {
        appendChar(out, cap, pos, tmp[--len]);
    }
}

static void appendText(char *out, uint8_t cap, uint8_t &pos, char const *text) {
    while (text && *text) {
        appendChar(out, cap, pos, *text++);
    }
}

static void formatIntUnit(int value, char const *unit, char *out, uint8_t cap) {
    if (!out || cap == 0) {
        return;
    }
    uint8_t pos = 0;
    out[0] = '\0';
    appendInt(out, cap, pos, value);
    appendText(out, cap, pos, unit);
}

static unsigned int absUnsigned(int value) {
    return value < 0 ? (0U - static_cast<unsigned int>(value)) : static_cast<unsigned int>(value);
}

static void formatPercent(void *ctx, char *out, uint8_t cap) {
    formatIntUnit(ctx ? *static_cast<int *>(ctx) : 0, "%", out, cap);
}

static void formatMilli2(void *ctx, char *out, uint8_t cap) {
    if (!out || cap == 0) {
        return;
    }
    int value = ctx ? *static_cast<int *>(ctx) : 0;
    unsigned int whole = absUnsigned(value) / 1000U;
    unsigned int hundredths = (absUnsigned(value) % 1000U) / 10U;
    uint8_t pos = 0;
    out[0] = '\0';
    if (value < 0) {
        appendChar(out, cap, pos, '-');
    }
    appendInt(out, cap, pos, static_cast<int>(whole));
    appendChar(out, cap, pos, '.');
    appendChar(out, cap, pos, static_cast<char>('0' + (hundredths / 10U)));
    appendChar(out, cap, pos, static_cast<char>('0' + (hundredths % 10U)));
}

static void formatSignedTenths(int value, char *out, uint8_t cap) {
    if (!out || cap == 0) {
        return;
    }
    unsigned int av = absUnsigned(value);
    uint8_t pos = 0;
    out[0] = '\0';
    appendChar(out, cap, pos, value < 0 ? '-' : '+');
    appendInt(out, cap, pos, static_cast<int>(av / 10U));
    appendChar(out, cap, pos, '.');
    appendChar(out, cap, pos, static_cast<char>('0' + (av % 10U)));
    appendText(out, cap, pos, " deg");
}

static void formatTrim(void *ctx, char *out, uint8_t cap) {
    formatSignedTenths(ctx ? *static_cast<int *>(ctx) : 0, out, cap);
}

static void formatPitch(void *ctx, char *out, uint8_t cap) {
    formatSignedTenths(ctx ? *static_cast<int *>(ctx) : 0, out, cap);
}

static void formatHeading(void *ctx, char *out, uint8_t cap) {
    formatIntUnit(ctx ? *static_cast<int *>(ctx) : 0, " deg", out, cap);
}

static void formatVolts(void *ctx, char *out, uint8_t cap) {
    if (!out || cap == 0) {
        return;
    }
    int value = ctx ? *static_cast<int *>(ctx) : 0;
    unsigned int av = absUnsigned(value);
    uint8_t pos = 0;
    out[0] = '\0';
    if (value < 0) {
        appendChar(out, cap, pos, '-');
    }
    appendInt(out, cap, pos, static_cast<int>(av / 100U));
    appendChar(out, cap, pos, '.');
    appendChar(out, cap, pos, static_cast<char>('0' + ((av % 100U) / 10U)));
    appendChar(out, cap, pos, static_cast<char>('0' + (av % 10U)));
    appendText(out, cap, pos, " V");
}

static void formatMm(void *ctx, char *out, uint8_t cap) {
    formatIntUnit(ctx ? *static_cast<int *>(ctx) : 0, " mm", out, cap);
}

static void formatTempC(void *ctx, char *out, uint8_t cap) {
    formatIntUnit(ctx ? *static_cast<int *>(ctx) : 0, " C", out, cap);
}

static void formatHz(void *ctx, char *out, uint8_t cap) {
    formatIntUnit(ctx ? *static_cast<int *>(ctx) : 0, " Hz", out, cap);
}

static void formatFirmware(void *, char *out, uint8_t cap) {
    if (!out || cap == 0) {
        return;
    }
    uint8_t pos = 0;
    out[0] = '\0';
    appendText(out, cap, pos, "v0.5.3");
}

static void formatUptime(void *ctx, char *out, uint8_t cap) {
    if (!out || cap == 0) {
        return;
    }
    int minutes = ctx ? *static_cast<int *>(ctx) : 0;
    uint8_t pos = 0;
    out[0] = '\0';
    appendInt(out, cap, pos, minutes / 60);
    appendChar(out, cap, pos, 'h');
    appendChar(out, cap, pos, ' ');
    int rem = minutes % 60;
    appendChar(out, cap, pos, static_cast<char>('0' + ((rem / 10) % 10)));
    appendChar(out, cap, pos, static_cast<char>('0' + (rem % 10)));
    appendChar(out, cap, pos, 'm');
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

static menu_event_t readEvent(void *) {
    menu_event_t event = pendingEvent;
    pendingEvent = menu_event(Choice_Invalid);
    return event;
}

static display_ops_t const WEB_DISPLAY_OPS = {
    &clearDisplay,
    0,
    &flushDisplay,
    &renderLine
};

static input_ops_t const WEB_INPUT_OPS = {
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    &readEvent
};

static input_source_t webInput = make_input_source(0, &WEB_INPUT_OPS);
static display_t webDisplay = make_display(60, 6, &runtime, &WEB_DISPLAY_OPS);

extern "C" __attribute__((export_name("bm_init"))) void bm_init(void) {
    auto pidMenu =
        MENU("PID tuning",
            ITEM_FORMAT(ITEM_VALUE("Kp", getInt, setInt, &kpMilli, 0, 5000, 10), formatMilli2, &kpMilli),
            ITEM_FORMAT(ITEM_VALUE("Ki", getInt, setInt, &kiMilli, 0, 5000, 10), formatMilli2, &kiMilli),
            ITEM_FORMAT(ITEM_VALUE("Kd", getInt, setInt, &kdMilli, 0, 5000, 10), formatMilli2, &kdMilli),
            ITEM_INT_STEP("Loop rate", &loopRateHz, 50, 400, 10),
            ITEM_FUNC("Save tune", action)
        );

    auto sensorsMenu =
        MENU("Sensors",
            ITEM_FORMAT(ITEM_VALUE("Pitch", getInt, &pitchTenth), formatPitch, &pitchTenth),
            ITEM_FORMAT(ITEM_VALUE("Heading", getInt, &headingDeg), formatHeading, &headingDeg),
            ITEM_FORMAT(ITEM_VALUE("Battery", getInt, &battCentiV), formatVolts, &battCentiV),
            ITEM_FORMAT(ITEM_VALUE("Range", getInt, &rangeMm), formatMm, &rangeMm),
            ITEM_FORMAT(ITEM_VALUE("Cell temp", getInt, &cellTempC), formatTempC, &cellTempC)
        );

    auto systemMenu =
        MENU("System",
            ITEM_INT_STEP("Brightness", &brightnessPct, 10, 100, 10),
            ITEM_SELECT("Theme", &themeSel,
                MENU_CHOICE("Aurora", 0),
                MENU_CHOICE("Slate", 1),
                MENU_CHOICE("Mono", 2)
            ),
            ITEM_BOOL("Screen flip", &screenFlip, "Off", "On"),
            ITEM_HIDDEN(ITEM_FUNC("Dev tools", action), devToolsHidden, 0),
            ITEM_FORMAT(ITEM_VALUE("Firmware", getInt, &uptimeMin), formatFirmware, 0),
            ITEM_FORMAT(ITEM_VALUE("Uptime", getInt, &uptimeMin), formatUptime, &uptimeMin)
        );

    static const auto rootMenu =
        MENU("Rover",
            ITEM_SELECT("Drive mode", &driveMode,
                MENU_CHOICE("Idle", 0),
                MENU_CHOICE("Manual", 1),
                MENU_CHOICE("Auto", 2),
                MENU_CHOICE("Follow", 3)
            ),
            ITEM_FORMAT(ITEM_INT_STEP("Max speed", &maxSpeedPct, 0, 100, 5), formatPercent, &maxSpeedPct),
            ITEM_BOOL("Headlights", &headlights, "Off", "On"),
            ITEM_FORMAT(ITEM_VALUE("Pitch trim", getInt, setInt, &pitchTrimTenth, -50, 50, 1), formatTrim, &pitchTrimTenth),
            ITEM_MENU("PID tuning", pidMenu),
            ITEM_MENU("Sensors", sensorsMenu),
            ITEM_ON_CHANGE(ITEM_BOOL("Telemetry", &telemetryStream, "Quiet", "Stream"), onChanged, 0),
            ITEM_DISABLED(ITEM_FORMAT(ITEM_INT_STEP("Telemetry rate", &telemetryHz, 1, 50, 1), formatHz, &telemetryHz), telemetryRateDisabled, 0),
            ITEM_FUNC("Calibrate IMU", action),
            ITEM_ON_CHANGE(ITEM_BOOL("Arm motors", &armed, "Safe", "Armed"), onChanged, 0),
            ITEM_FUNC("E-STOP", action),
            ITEM_MENU("System", systemMenu)
        );

    runtime = menu_runtime_t::make(rootMenu, webDisplay, webInput, false);
    runtime.set_show_title(true);
    runtime.set_show_breadcrumbs(true);
    runtime.set_show_affordances(false);
    runtime.begin();
    runtime.service();
}

extern "C" __attribute__((export_name("bm_send_choice"))) void bm_send_choice(int choice) {
    pendingEvent = menu_event(static_cast<choice_t>(choice));
    runtime.service();
    runtime.service();
}

extern "C" __attribute__((export_name("bm_send_row"))) void bm_send_row(int row, int activate) {
    pendingEvent = menu_row_event(static_cast<uint8_t>(row), activate != 0);
    runtime.service();
    runtime.service();
}

extern "C" __attribute__((export_name("bm_row_count"))) int bm_row_count(void) {
    return rowCount;
}

extern "C" __attribute__((export_name("bm_row_kind"))) int bm_row_kind(int idx) {
    return (idx >= 0 && idx < rowCount) ? rows[idx].kind : 0;
}

extern "C" __attribute__((export_name("bm_row_flags"))) int bm_row_flags(int idx) {
    return (idx >= 0 && idx < rowCount) ? rows[idx].flags : 0;
}

extern "C" __attribute__((export_name("bm_row_entry_type"))) int bm_row_entry_type(int idx) {
    return (idx >= 0 && idx < rowCount) ? rows[idx].entry_type : 0;
}

extern "C" __attribute__((export_name("bm_row_item_index"))) int bm_row_item_index(int idx) {
    return (idx >= 0 && idx < rowCount) ? rows[idx].item_index : 255;
}

extern "C" __attribute__((export_name("bm_row_editable"))) int bm_row_editable(int idx) {
    return (idx >= 0 && idx < rowCount) ? rows[idx].editable : 0;
}

extern "C" __attribute__((export_name("bm_row_text_ptr"))) int bm_row_text_ptr(int idx) {
    return (idx >= 0 && idx < rowCount) ? static_cast<int>(reinterpret_cast<uintptr_t>(rows[idx].text)) : 0;
}

extern "C" __attribute__((export_name("bm_battery_centivolts"))) int bm_battery_centivolts(void) {
    return battCentiV;
}

extern "C" __attribute__((export_name("bm_battery_percent"))) int bm_battery_percent(void) {
    int pct = ((battCentiV - 900) * 100 + 180) / 360;
    if (pct < 0) {
        return 0;
    }
    if (pct > 100) {
        return 100;
    }
    return pct;
}

extern "C" __attribute__((export_name("bm_armed"))) int bm_armed(void) {
    return armed ? 1 : 0;
}

extern "C" __attribute__((export_name("bm_visible_top"))) int bm_visible_top(void) {
    return visibleTop;
}

extern "C" __attribute__((export_name("bm_visible_total"))) int bm_visible_total(void) {
    return visibleTotal;
}

extern "C" __attribute__((export_name("bm_visible_window"))) int bm_visible_window(void) {
    return visibleWindow;
}
