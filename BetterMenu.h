/*\
|*| BetterMenu.h
|*|
|*| Declarative, non-STL, inline-nested menu system for Arduino-class targets.
|*| Entry kinds: INT, BOOL, SELECT, VALUE, FUNC, MENU.
|*| Pluggable output adapters (Print/Serial, LCD/OLED via thin wrappers).
|*|
|*| Non-blocking: call menu_runtime_t::service() each loop().
|*| DRY input: generic input providers (6 controls). Built-ins: Stream keys, GPIO buttons.
|*|
|*| (c) 2022-2026 Trent M. Wyatt.
\*/

#ifndef BETTER_MENU_H
#define BETTER_MENU_H

#include <stdint.h>
#include <string.h>

#ifdef ARDUINO
#include <Arduino.h>
#endif

/* =============================== Text API ================================ */

enum menu_text_storage_t {
    MENU_TEXT_RAM = 0,
    MENU_TEXT_FLASH = 1
};

struct menu_text_t {
    void const *ptr;
    uint8_t storage;
};

static inline menu_text_t menu_text(char const *text) {
    menu_text_t t;
    t.ptr = text;
    t.storage = MENU_TEXT_RAM;
    return t;
}

static inline menu_text_t menu_text(menu_text_t text) {
    return text;
}

#ifdef ARDUINO
static inline menu_text_t menu_text(__FlashStringHelper const *text) {
    menu_text_t t;
    t.ptr = text;
    t.storage = MENU_TEXT_FLASH;
    return t;
}
#endif

static inline char menu_text_char_at(menu_text_t text, uint8_t idx) {
    if (!text.ptr) { return '\0'; }
#ifdef ARDUINO
    if (text.storage == MENU_TEXT_FLASH) {
        return static_cast<char>(pgm_read_byte(static_cast<PGM_P>(text.ptr) + idx));
    }
#endif
    return static_cast<char const *>(text.ptr)[idx];
}

/* ============================= Configuration ============================= */

#ifndef MENU_MAX_STACK
#define MENU_MAX_STACK 8
#endif

#ifndef MENU_MAX_LINE
#define MENU_MAX_LINE 64
#endif

#if MENU_MAX_STACK < 1
#error "MENU_MAX_STACK must be at least 1"
#endif

#if MENU_MAX_STACK > 255
#error "MENU_MAX_STACK must be 255 or less"
#endif

#if MENU_MAX_LINE < 2
#error "MENU_MAX_LINE must be at least 2"
#endif

#if MENU_MAX_LINE > 255
#error "MENU_MAX_LINE must be 255 or less"
#endif

#define BETTER_MENU_VERSION_MAJOR 0
#define BETTER_MENU_VERSION_MINOR 5
#define BETTER_MENU_VERSION_PATCH 0
#define BETTER_MENU_VERSION "0.5.0"

/* =============================== Input API =============================== */
/* Ways to feed input (all non-blocking):
   1) Legacy callback: choice_t (*input_fptr_t)(char const *prompt) - return Choice_Invalid if no event
   2) Context event provider: choice_t (*input_read_ctx_fptr_t)(void *ctx)
   3) Button-like provider: six tiny boolean checks via input_source_t (see below)
*/

enum choice_t {
    Choice_Invalid = 0,
    Choice_Left,
    Choice_Right,
    Choice_Up,
    Choice_Down,
    Choice_Select,
    Choice_Cancel,
    Choice_Row,
    Choice_Delta
};

/* Legacy non-blocking callback; prompt is non-empty only right after a render. */
typedef choice_t (*input_fptr_t)(char const *prompt);

enum menu_event_flags_t {
    MENU_EVENT_ACTIVATE = 1 << 0,
    MENU_EVENT_LONG     = 1 << 1,
    MENU_EVENT_REPEAT   = 1 << 2
};

struct menu_event_t {
    choice_t choice;
    uint8_t row;
    int8_t delta;
    uint8_t flags;
};

static inline menu_event_t menu_event(choice_t choice) {
    menu_event_t event = { choice, 0, 0, 0 };
    return event;
}

static inline menu_event_t menu_choice_event(choice_t choice, uint8_t flags) {
    menu_event_t event = { choice, 0, 0, flags };
    return event;
}

static inline menu_event_t menu_long_event(choice_t choice) {
    return menu_choice_event(choice, MENU_EVENT_LONG);
}

static inline menu_event_t menu_repeat_event(choice_t choice) {
    return menu_choice_event(choice, MENU_EVENT_REPEAT);
}

static inline menu_event_t menu_row_event(uint8_t row, bool activate) {
    menu_event_t event = { Choice_Row, row, 0, static_cast<uint8_t>(activate ? MENU_EVENT_ACTIVATE : 0) };
    return event;
}

static inline menu_event_t menu_delta_event(int8_t delta) {
    menu_event_t event = { Choice_Delta, 0, delta, 0 };
    return event;
}

typedef choice_t (*input_read_ctx_fptr_t)(void *ctx);
typedef menu_event_t (*input_read_event_ctx_fptr_t)(void *ctx);

/* DRY provider vtable:
   - optional capture() once per tick
   - optional read() for sources that naturally produce one menu event
   - optional six edge-trigger checks for button-like sources
*/
struct input_ops_t {
    void (*capture)(void *ctx);              /* optional; may be 0 */
    bool (*up)(void *ctx);
    bool (*down)(void *ctx);
    bool (*select)(void *ctx);
    bool (*cancel)(void *ctx);
    bool (*left)(void *ctx);
    bool (*right)(void *ctx);
    input_read_ctx_fptr_t read;              /* optional; may be 0 */
    input_read_event_ctx_fptr_t read_event;  /* optional; may be 0 */
};

struct input_source_t {
    void *ctx;
    input_ops_t const *ops;

    input_source_t() : ctx(0), ops(0) { }
    input_source_t(void *context, input_ops_t const *operations) : ctx(context), ops(operations) { }
};

static inline input_source_t make_input_source(void *ctx, input_ops_t const *ops) {
    return input_source_t(ctx, ops);
}

struct input_event_ctx_t {
    void *ctx;
    input_read_ctx_fptr_t read;
};

struct input_rich_event_ctx_t {
    void *ctx;
    input_read_event_ctx_fptr_t read;
};

static choice_t event_input_read(void *ctx) {
    input_event_ctx_t *event_ctx = static_cast<input_event_ctx_t *>(ctx);
    if (!event_ctx || !event_ctx->read) { return Choice_Invalid; }
    return event_ctx->read(event_ctx->ctx);
}

static menu_event_t rich_event_input_read(void *ctx) {
    input_rich_event_ctx_t *event_ctx = static_cast<input_rich_event_ctx_t *>(ctx);
    if (!event_ctx || !event_ctx->read) { return menu_event(Choice_Invalid); }
    return event_ctx->read(event_ctx->ctx);
}

static input_ops_t const EVENT_INPUT_OPS = {
    0, 0, 0, 0, 0, 0, 0, &event_input_read, 0
};

static input_ops_t const RICH_EVENT_INPUT_OPS = {
    0, 0, 0, 0, 0, 0, 0, 0, &rich_event_input_read
};

static inline input_source_t make_event_input(input_event_ctx_t &storage, void *ctx, input_read_ctx_fptr_t read) {
    storage.ctx = ctx;
    storage.read = read;
    return make_input_source(&storage, &EVENT_INPUT_OPS);
}

static inline input_source_t make_event_input(input_rich_event_ctx_t &storage, void *ctx, input_read_event_ctx_fptr_t read) {
    storage.ctx = ctx;
    storage.read = read;
    return make_input_source(&storage, &RICH_EVENT_INPUT_OPS);
}

/* ============================== Display API ============================== */
/* width of 0 uses the MENU_MAX_LINE buffer limit; height of 0 means all items */

typedef void (*display_clear_fptr_t)(void);
typedef void (*display_write_line_fptr_t)(uint8_t row, char const *text);
typedef void (*display_flush_fptr_t)(void);

typedef void (*display_clear_ctx_fptr_t)(void *ctx);
typedef void (*display_write_line_ctx_fptr_t)(void *ctx, uint8_t row, char const *text);
typedef void (*display_flush_ctx_fptr_t)(void *ctx);

enum menu_render_kind_t {
    MENU_RENDER_TITLE = 1,
    MENU_RENDER_ITEM = 2,
    MENU_RENDER_BLANK = 3
};

enum menu_render_flags_t {
    MENU_RENDER_SELECTED       = 1 << 0,
    MENU_RENDER_EDITING        = 1 << 1,
    MENU_RENDER_DISABLED       = 1 << 2,
    MENU_RENDER_HAS_CHILD      = 1 << 3,
    MENU_RENDER_BACK_AVAILABLE = 1 << 4,
    MENU_RENDER_SCROLL_UP      = 1 << 5,
    MENU_RENDER_SCROLL_DOWN    = 1 << 6
};

struct menu_render_line_t {
    uint8_t row;
    // cppcheck-suppress unusedStructMember
    uint8_t item_index;
    // cppcheck-suppress unusedStructMember
    uint8_t kind;
    // cppcheck-suppress unusedStructMember
    uint8_t entry_type;
    // cppcheck-suppress unusedStructMember
    uint8_t flags;
    char const *text;
};

typedef void (*display_render_line_ctx_fptr_t)(void *ctx, menu_render_line_t const *line);

struct display_ops_t {
    display_clear_ctx_fptr_t       clear;      /* optional; may be 0 */
    display_write_line_ctx_fptr_t  write_line; /* optional; may be 0 */
    display_flush_ctx_fptr_t       flush;      /* optional; may be 0 */
    display_render_line_ctx_fptr_t render_line;/* optional; may be 0 */
};

struct display_t {
    uint8_t                     width;   /* 0 => MENU_MAX_LINE buffer limit */
    uint8_t                     height;  /* 0 => all rendered items */
    display_clear_fptr_t        clear;
    display_write_line_fptr_t   write_line;
    display_flush_fptr_t        flush;
    void                       *ctx;
    display_ops_t const        *ops;

    display_t() :
        width(0),
        height(0),
        clear(0),
        write_line(0),
        flush(0),
        ctx(0),
        ops(0) {
    }

    display_t(uint8_t w, uint8_t h,
              display_clear_fptr_t clear_cb,
              display_write_line_fptr_t write_line_cb,
              display_flush_fptr_t flush_cb) :
        width(w),
        height(h),
        clear(clear_cb),
        write_line(write_line_cb),
        flush(flush_cb),
        ctx(0),
        ops(0) {
    }

    display_t(uint8_t w, uint8_t h, void *context, display_ops_t const *operations) :
        width(w),
        height(h),
        clear(0),
        write_line(0),
        flush(0),
        ctx(context),
        ops(operations) {
    }

    display_t(uint8_t w, uint8_t h,
              display_clear_fptr_t clear_cb,
              display_write_line_fptr_t write_line_cb,
              display_flush_fptr_t flush_cb,
              void *context,
              display_ops_t const *operations) :
        width(w),
        height(h),
        clear(clear_cb),
        write_line(write_line_cb),
        flush(flush_cb),
        ctx(context),
        ops(operations) {
    }
};

static inline display_t make_callback_display(uint8_t width, uint8_t height,
                                               display_clear_fptr_t clear,
                                               display_write_line_fptr_t write_line,
                                               display_flush_fptr_t flush) {
    return display_t(width, height, clear, write_line, flush);
}

static inline display_t make_display(uint8_t width, uint8_t height, void *ctx, display_ops_t const *ops) {
    return display_t(width, height, ctx, ops);
}

/* --------------------- Built-in Print/Serial adapter --------------------- */
#ifdef ARDUINO
struct print_display_ctx_t {
    Print *out;
};

static inline void print_display_clear(void *ctx) {
    print_display_ctx_t *display = static_cast<print_display_ctx_t *>(ctx);
    if (!display || !display->out) { return; }
    display->out->println();
    display->out->println(F("--------------------------------"));
}
static inline void print_display_write_line(void *ctx, uint8_t row, char const *text) {
    (void)row;
    print_display_ctx_t *display = static_cast<print_display_ctx_t *>(ctx);
    if (!display || !display->out) { return; }
    display->out->println(text ? text : "");
}
static inline void print_display_flush(void *) { }
static display_ops_t const PRINT_DISPLAY_OPS = {
    &print_display_clear, &print_display_write_line, &print_display_flush, 0
};

static inline display_t make_print_display(print_display_ctx_t &ctx, Print &out, uint8_t width, uint8_t height) {
    ctx.out = &out;
    return make_display(width, height, &ctx, &PRINT_DISPLAY_OPS);
}

static display_ops_t const SERIAL_DISPLAY_OPS = {
    &print_display_clear, &print_display_write_line, &print_display_flush, 0
};
static inline display_t make_serial_display(uint8_t width, uint8_t height) {
    static print_display_ctx_t ctx;
    ctx.out = &Serial;
    return make_display(width, height, &ctx, &SERIAL_DISPLAY_OPS);
}
#endif

/* ============================== Menu Entities ============================ */

enum entry_t : uint8_t { ENTRY_FUNC = 0, ENTRY_MENU = 1, ENTRY_INT = 2, ENTRY_BOOL = 3, ENTRY_SELECT = 4, ENTRY_VALUE = 5 };

/* INT item: edited in place, value pointer lives in RAM */
struct item_int_t { menu_text_t label; int *ptr; int minv; int maxv; int step; };

/* BOOL item: toggled in place, value pointer lives in RAM */
struct item_bool_t { menu_text_t label; bool *ptr; menu_text_t false_label; menu_text_t true_label; };

typedef void (*menu_func_fptr_t)(void);
typedef void (*menu_func_ctx_fptr_t)(void *ctx);
typedef bool (*menu_predicate_ctx_fptr_t)(void *ctx);
typedef int  (*menu_get_int_ctx_fptr_t)(void *ctx);
typedef void (*menu_set_int_ctx_fptr_t)(void *ctx, int value);
typedef void (*menu_format_ctx_fptr_t)(void *ctx, char *out, uint8_t cap);
typedef void (*menu_on_change_ctx_fptr_t)(void *ctx);
typedef void (*menu_persistence_ctx_fptr_t)(void *ctx);

/* FUNC item: plain callback */
struct item_func_t { menu_text_t label; menu_func_fptr_t fn; };

/* FUNC item with caller-owned context */
struct item_func_ctx_t { menu_text_t label; menu_func_ctx_fptr_t fn; void *ctx; };

/* SELECT choice: one fixed integer value with a display label */
struct select_choice_t { menu_text_t label; int value; };

/* Generic integer-like value; set == 0 makes it read-only. */
struct item_value_t { menu_text_t label; menu_get_int_ctx_fptr_t get; menu_set_int_ctx_fptr_t set; void *ctx; int minv; int maxv; int step; };

struct menu_condition_t {
    menu_predicate_ctx_fptr_t fn;
    void *ctx;
};

template<typename Item>
struct item_meta_t {
    Item item;
    menu_condition_t hidden;
    menu_condition_t disabled;
    item_meta_t(Item const &i, menu_condition_t h, menu_condition_t d) : item(i), hidden(h), disabled(d) { }
};

template<typename Item>
struct item_format_t {
    Item item;
    menu_format_ctx_fptr_t fn;
    void *ctx;
    item_format_t(Item const &i, menu_format_ctx_fptr_t f, void *c) : item(i), fn(f), ctx(c) { }
};

template<typename Item>
struct item_change_t {
    Item item;
    menu_on_change_ctx_fptr_t fn;
    void *ctx;
    item_change_t(Item const &i, menu_on_change_ctx_fptr_t f, void *c) : item(i), fn(f), ctx(c) { }
};

struct menu_persistence_t {
    menu_persistence_ctx_fptr_t load;
    menu_persistence_ctx_fptr_t save;
    void *ctx;
    menu_persistence_t() : load(0), save(0), ctx(0) { }
    menu_persistence_t(menu_persistence_ctx_fptr_t load_cb, menu_persistence_ctx_fptr_t save_cb, void *context) :
        load(load_cb), save(save_cb), ctx(context) { }
};

/* Forward: inline menu type below */
template<typename... Items> struct menu_t;
template<typename... Choices> struct item_select_t;

/* MENU item: contains a child menu by value (inline) */
template<typename ChildMenu>
struct item_menu_t { menu_text_t label; ChildMenu child; };

/* ========================== Minimal tuple-less pack ====================== */

struct pack_nil { };
template<typename Head, typename Tail> struct pack_node { Head head; Tail tail; pack_node():head(),tail(){} pack_node(Head const &h, Tail const &t):head(h),tail(t){} };

template<typename... Items> struct pack;
template<> struct pack<> { typedef pack_nil type; static inline type make(){ return type(); } };
template<typename First, typename... Rest>
struct pack<First, Rest...> {
    typedef pack_node<First, typename pack<Rest...>::type> type;
    static inline type make(First const &f, Rest const &... r) { return type(f, pack<Rest...>::make(r...)); }
};

/* SELECT item: cycles through fixed choices stored inline by value */
template<typename... Choices>
struct item_select_t {
    menu_text_t label;
    int *ptr;
    typename pack<Choices...>::type choices;
    item_select_t(menu_text_t l, int *p, Choices const &... cs) : label(l), ptr(p), choices(pack<Choices...>::make(cs...)) { }
    static_assert(sizeof...(Choices) <= 255, "BetterMenu supports at most 255 choices per select item");
    static inline uint8_t count() { return static_cast<uint8_t>(sizeof...(Choices)); }
};

/* ================================= menu_t ================================= */

template<typename... Items>
struct menu_t {
    menu_text_t title;
    typename pack<Items...>::type items;
    menu_t(menu_text_t t, Items const &... its) : title(t), items(pack<Items...>::make(its...)) { }
    static_assert(sizeof...(Items) <= 255, "BetterMenu supports at most 255 items per menu");
    static inline uint8_t count() { return static_cast<uint8_t>(sizeof...(Items)); }
};

/* Factory + sugar */
template<typename... Items> static inline menu_t<Items...> menu_make(menu_text_t title, Items const &... items) { return menu_t<Items...>(title, items...); }
template<typename... Items> static inline menu_t<Items...> menu_make(char const *title, Items const &... items) { return menu_t<Items...>(menu_text(title), items...); }
#ifdef ARDUINO
template<typename... Items> static inline menu_t<Items...> menu_make(__FlashStringHelper const *title, Items const &... items) { return menu_t<Items...>(menu_text(title), items...); }
#endif

static inline item_int_t make_item_int(menu_text_t label, int *ptr, int minv, int maxv, int step) {
    item_int_t item = { label, ptr, minv, maxv, step };
    return item;
}
static inline item_int_t make_item_int(menu_text_t label, int *ptr, int minv, int maxv) {
    return make_item_int(label, ptr, minv, maxv, 1);
}
static inline item_int_t make_item_int(char const *label, int *ptr, int minv, int maxv) {
    return make_item_int(menu_text(label), ptr, minv, maxv);
}
static inline item_int_t make_item_int(char const *label, int *ptr, int minv, int maxv, int step) {
    return make_item_int(menu_text(label), ptr, minv, maxv, step);
}
#ifdef ARDUINO
static inline item_int_t make_item_int(__FlashStringHelper const *label, int *ptr, int minv, int maxv) {
    return make_item_int(menu_text(label), ptr, minv, maxv);
}
static inline item_int_t make_item_int(__FlashStringHelper const *label, int *ptr, int minv, int maxv, int step) {
    return make_item_int(menu_text(label), ptr, minv, maxv, step);
}
#endif

static inline item_bool_t make_item_bool(menu_text_t label, bool *ptr, menu_text_t false_label, menu_text_t true_label) {
    item_bool_t item = { label, ptr, false_label, true_label };
    return item;
}
template<typename Label>
static inline item_bool_t make_item_bool(Label label, bool *ptr) {
#ifdef ARDUINO
    return make_item_bool(menu_text(label), ptr, menu_text(F("Off")), menu_text(F("On")));
#else
    return make_item_bool(menu_text(label), ptr, menu_text("Off"), menu_text("On"));
#endif
}
template<typename Label, typename FalseLabel, typename TrueLabel>
static inline item_bool_t make_item_bool(Label label, bool *ptr, FalseLabel false_label, TrueLabel true_label) {
    return make_item_bool(menu_text(label), ptr, menu_text(false_label), menu_text(true_label));
}

static inline item_func_t make_item_func(menu_text_t label, void (*fn)()) {
    item_func_t item = { label, fn };
    return item;
}
static inline item_func_t make_item_func(char const *label, void (*fn)()) {
    return make_item_func(menu_text(label), fn);
}
#ifdef ARDUINO
static inline item_func_t make_item_func(__FlashStringHelper const *label, void (*fn)()) {
    return make_item_func(menu_text(label), fn);
}
#endif

static inline item_func_ctx_t make_item_func_ctx(menu_text_t label, menu_func_ctx_fptr_t fn, void *ctx) {
    item_func_ctx_t item = { label, fn, ctx };
    return item;
}
static inline item_func_ctx_t make_item_func_ctx(char const *label, menu_func_ctx_fptr_t fn, void *ctx) {
    return make_item_func_ctx(menu_text(label), fn, ctx);
}
#ifdef ARDUINO
static inline item_func_ctx_t make_item_func_ctx(__FlashStringHelper const *label, menu_func_ctx_fptr_t fn, void *ctx) {
    return make_item_func_ctx(menu_text(label), fn, ctx);
}
#endif

template<typename ChildMenu>
static inline item_menu_t<ChildMenu> make_item_menu(menu_text_t label, ChildMenu const &child) {
    item_menu_t<ChildMenu> item = { label, child };
    return item;
}
template<typename ChildMenu>
static inline item_menu_t<ChildMenu> make_item_menu(char const *label, ChildMenu const &child) {
    return make_item_menu(menu_text(label), child);
}
#ifdef ARDUINO
template<typename ChildMenu>
static inline item_menu_t<ChildMenu> make_item_menu(__FlashStringHelper const *label, ChildMenu const &child) {
    return make_item_menu(menu_text(label), child);
}
#endif

static inline select_choice_t menu_choice(menu_text_t label, int value) {
    select_choice_t choice = { label, value };
    return choice;
}
template<typename Label>
static inline select_choice_t menu_choice(Label label, int value) {
    return menu_choice(menu_text(label), value);
}

template<typename... Choices>
static inline item_select_t<Choices...> make_item_select(menu_text_t label, int *ptr, Choices const &... choices) {
    return item_select_t<Choices...>(label, ptr, choices...);
}
template<typename Label, typename... Choices>
static inline item_select_t<Choices...> make_item_select(Label label, int *ptr, Choices const &... choices) {
    return make_item_select(menu_text(label), ptr, choices...);
}

static inline item_value_t make_item_value(menu_text_t label, menu_get_int_ctx_fptr_t get, void *ctx) {
    item_value_t item = { label, get, 0, ctx, 0, 0, 1 };
    return item;
}
template<typename Label>
static inline item_value_t make_item_value(Label label, menu_get_int_ctx_fptr_t get, void *ctx) {
    return make_item_value(menu_text(label), get, ctx);
}

static inline item_value_t make_item_value(menu_text_t label, menu_get_int_ctx_fptr_t get, menu_set_int_ctx_fptr_t set, void *ctx, int minv, int maxv, int step) {
    item_value_t item = { label, get, set, ctx, minv, maxv, step };
    return item;
}
static inline item_value_t make_item_value(menu_text_t label, menu_get_int_ctx_fptr_t get, menu_set_int_ctx_fptr_t set, void *ctx, int minv, int maxv) {
    return make_item_value(label, get, set, ctx, minv, maxv, 1);
}
template<typename Label>
static inline item_value_t make_item_value(Label label, menu_get_int_ctx_fptr_t get, menu_set_int_ctx_fptr_t set, void *ctx, int minv, int maxv, int step) {
    return make_item_value(menu_text(label), get, set, ctx, minv, maxv, step);
}
template<typename Label>
static inline item_value_t make_item_value(Label label, menu_get_int_ctx_fptr_t get, menu_set_int_ctx_fptr_t set, void *ctx, int minv, int maxv) {
    return make_item_value(menu_text(label), get, set, ctx, minv, maxv, 1);
}

template<typename Item>
static inline item_meta_t<Item> menu_item_hidden(Item const &item, menu_predicate_ctx_fptr_t fn, void *ctx) {
    menu_condition_t hidden = { fn, ctx };
    menu_condition_t disabled = { 0, 0 };
    return item_meta_t<Item>(item, hidden, disabled);
}

template<typename Item>
static inline item_meta_t<Item> menu_item_disabled(Item const &item, menu_predicate_ctx_fptr_t fn, void *ctx) {
    menu_condition_t hidden = { 0, 0 };
    menu_condition_t disabled = { fn, ctx };
    return item_meta_t<Item>(item, hidden, disabled);
}

template<typename Item>
static inline item_format_t<Item> menu_item_format(Item const &item, menu_format_ctx_fptr_t fn, void *ctx) {
    return item_format_t<Item>(item, fn, ctx);
}

template<typename Item>
static inline item_change_t<Item> menu_item_on_change(Item const &item, menu_on_change_ctx_fptr_t fn, void *ctx) {
    return item_change_t<Item>(item, fn, ctx);
}

#define MENU(/*title, items...*/...) (menu_make(__VA_ARGS__))
#define ITEM_INT(/*label, ptr, minv, maxv, optional step*/...) make_item_int(__VA_ARGS__)
#define ITEM_INT_STEP(label, ptr, minv, maxv, step) make_item_int((label), (ptr), (minv), (maxv), (step))
#define ITEM_BOOL(/*label, ptr, optional false/true labels*/...) make_item_bool(__VA_ARGS__)
#define ITEM_FUNC(label, fn)             make_item_func((label), (fn))
#define ITEM_FUNC_CTX(label, fn, ctx)    make_item_func_ctx((label), (fn), (ctx))
#define ITEM_MENU(label, submenu_expr)   make_item_menu((label), (submenu_expr))
#define ITEM_SELECT(/*label, ptr, choices...*/...) make_item_select(__VA_ARGS__)
#define MENU_CHOICE(label, value)        menu_choice((label), (value))
#define ITEM_VALUE(/*label, getter, ctx, optional setter/min/max/step*/...) make_item_value(__VA_ARGS__)
#define ITEM_HIDDEN(item, fn, ctx)       menu_item_hidden((item), (fn), (ctx))
#define ITEM_DISABLED(item, fn, ctx)     menu_item_disabled((item), (fn), (ctx))
#define ITEM_FORMAT(item, fn, ctx)       menu_item_format((item), (fn), (ctx))
#define ITEM_ON_CHANGE(item, fn, ctx)    menu_item_on_change((item), (fn), (ctx))

/* =========================== Runtime type erasure ======================== */

struct menu_ops_t {
    uint8_t      (*count)(void const *);
    menu_text_t  (*label_at)(void const *, uint8_t idx);
    entry_t      (*type_at)(void const *, uint8_t idx);
    bool         (*int_has)(void const *, uint8_t idx);
    bool         (*scalar_has)(void const *, uint8_t idx);
    int          (*int_get)(void const *, uint8_t idx);
    void         (*int_set)(void const *, uint8_t idx, int v);
    int          (*int_min)(void const *, uint8_t idx);
    int          (*int_max)(void const *, uint8_t idx);
    int          (*int_step)(void const *, uint8_t idx);
    bool         (*child_at)(void const *, uint8_t idx, void const **out_child, menu_ops_t const **out_ops);
    void         (*call_func)(void const *, uint8_t idx);
    menu_text_t  (*title)(void const *);
    uint8_t      (*value_count)(void const *, uint8_t idx);
    menu_text_t  (*value_label_at)(void const *, uint8_t idx, uint8_t value_idx);
    uint8_t      (*value_selected)(void const *, uint8_t idx);
    void         (*value_select)(void const *, uint8_t idx, uint8_t value_idx);
    bool         (*hidden)(void const *, uint8_t idx);
    bool         (*disabled)(void const *, uint8_t idx);
    bool         (*format_value)(void const *, uint8_t idx, char *out, uint8_t cap);
    void         (*on_change)(void const *, uint8_t idx);
};

/* Item trait helpers */
static inline menu_text_t item_label(item_int_t const &i)  { return i.label; }
static inline menu_text_t item_label(item_bool_t const &b) { return b.label; }
static inline menu_text_t item_label(item_func_t const &f) { return f.label; }
static inline menu_text_t item_label(item_func_ctx_t const &f) { return f.label; }
static inline menu_text_t item_label(item_value_t const &v) { return v.label; }
template<typename CM> static inline menu_text_t item_label(item_menu_t<CM> const &m) { return m.label; }
template<typename... Choices> static inline menu_text_t item_label(item_select_t<Choices...> const &s) { return s.label; }
template<typename Item> static inline menu_text_t item_label(item_meta_t<Item> const &m) { return item_label(m.item); }
template<typename Item> static inline menu_text_t item_label(item_format_t<Item> const &m) { return item_label(m.item); }
template<typename Item> static inline menu_text_t item_label(item_change_t<Item> const &m) { return item_label(m.item); }

static inline entry_t item_type(item_int_t const &)  { return ENTRY_INT; }
static inline entry_t item_type(item_bool_t const &) { return ENTRY_BOOL; }
static inline entry_t item_type(item_func_t const &) { return ENTRY_FUNC; }
static inline entry_t item_type(item_func_ctx_t const &) { return ENTRY_FUNC; }
static inline entry_t item_type(item_value_t const &) { return ENTRY_VALUE; }
template<typename CM> static inline entry_t item_type(item_menu_t<CM> const &) { return ENTRY_MENU; }
template<typename... Choices> static inline entry_t item_type(item_select_t<Choices...> const &) { return ENTRY_SELECT; }
template<typename Item> static inline entry_t item_type(item_meta_t<Item> const &m) { return item_type(m.item); }
template<typename Item> static inline entry_t item_type(item_format_t<Item> const &m) { return item_type(m.item); }
template<typename Item> static inline entry_t item_type(item_change_t<Item> const &m) { return item_type(m.item); }

static inline bool item_int_has(item_int_t const &i)  { return i.ptr != 0; }
static inline bool item_int_has(item_bool_t const &) { return false; }
static inline bool item_int_has(item_func_t const &) { return false; }
static inline bool item_int_has(item_func_ctx_t const &) { return false; }
static inline bool item_int_has(item_value_t const &v) { return v.get != 0 && v.set != 0; }
template<typename CM> static inline bool item_int_has(item_menu_t<CM> const &) { return false; }
template<typename... Choices> static inline bool item_int_has(item_select_t<Choices...> const &) { return false; }
template<typename Item> static inline bool item_int_has(item_meta_t<Item> const &m) { return item_int_has(m.item); }
template<typename Item> static inline bool item_int_has(item_format_t<Item> const &m) { return item_int_has(m.item); }
template<typename Item> static inline bool item_int_has(item_change_t<Item> const &m) { return item_int_has(m.item); }

static inline bool item_scalar_has(item_int_t const &i)  { return i.ptr != 0; }
static inline bool item_scalar_has(item_bool_t const &) { return false; }
static inline bool item_scalar_has(item_func_t const &) { return false; }
static inline bool item_scalar_has(item_func_ctx_t const &) { return false; }
static inline bool item_scalar_has(item_value_t const &v) { return v.get != 0; }
template<typename CM> static inline bool item_scalar_has(item_menu_t<CM> const &) { return false; }
template<typename... Choices> static inline bool item_scalar_has(item_select_t<Choices...> const &) { return false; }
template<typename Item> static inline bool item_scalar_has(item_meta_t<Item> const &m) { return item_scalar_has(m.item); }
template<typename Item> static inline bool item_scalar_has(item_format_t<Item> const &m) { return item_scalar_has(m.item); }
template<typename Item> static inline bool item_scalar_has(item_change_t<Item> const &m) { return item_scalar_has(m.item); }

static inline int  item_int_get(item_int_t const &i) { return i.ptr ? *(i.ptr) : 0; }
static inline void item_int_set(item_int_t const &i, int v) { if (i.ptr) { *(i.ptr) = v; } }
static inline int  item_int_min(item_int_t const &i) { return i.minv; }
static inline int  item_int_max(item_int_t const &i) { return i.maxv; }
static inline int  item_int_step(item_int_t const &i) { return i.step; }

static inline int  item_int_get(item_bool_t const &) { return 0; }
static inline void item_int_set(item_bool_t const &, int) { }
static inline int  item_int_min(item_bool_t const &) { return 0; }
static inline int  item_int_max(item_bool_t const &) { return 0; }
static inline int  item_int_step(item_bool_t const &) { return 1; }

static inline int  item_int_get(item_func_t const &) { return 0; }
static inline void item_int_set(item_func_t const &, int) { }
static inline int  item_int_min(item_func_t const &) { return 0; }
static inline int  item_int_max(item_func_t const &) { return 0; }
static inline int  item_int_step(item_func_t const &) { return 1; }

static inline int  item_int_get(item_func_ctx_t const &) { return 0; }
static inline void item_int_set(item_func_ctx_t const &, int) { }
static inline int  item_int_min(item_func_ctx_t const &) { return 0; }
static inline int  item_int_max(item_func_ctx_t const &) { return 0; }
static inline int  item_int_step(item_func_ctx_t const &) { return 1; }

static inline int  item_int_get(item_value_t const &v) { return v.get ? v.get(v.ctx) : 0; }
static inline void item_int_set(item_value_t const &v, int value) { if (v.set) { v.set(v.ctx, value); } }
static inline int  item_int_min(item_value_t const &v) { return v.minv; }
static inline int  item_int_max(item_value_t const &v) { return v.maxv; }
static inline int  item_int_step(item_value_t const &v) { return v.step; }

template<typename CM> static inline int  item_int_get(item_menu_t<CM> const &) { return 0; }
template<typename CM> static inline void item_int_set(item_menu_t<CM> const &, int)  { }
template<typename CM> static inline int  item_int_min(item_menu_t<CM> const &) { return 0; }
template<typename CM> static inline int  item_int_max(item_menu_t<CM> const &) { return 0; }
template<typename CM> static inline int  item_int_step(item_menu_t<CM> const &) { return 1; }

template<typename... Choices> static inline int  item_int_get(item_select_t<Choices...> const &) { return 0; }
template<typename... Choices> static inline void item_int_set(item_select_t<Choices...> const &, int)  { }
template<typename... Choices> static inline int  item_int_min(item_select_t<Choices...> const &) { return 0; }
template<typename... Choices> static inline int  item_int_max(item_select_t<Choices...> const &) { return 0; }
template<typename... Choices> static inline int  item_int_step(item_select_t<Choices...> const &) { return 1; }

template<typename Item> static inline int  item_int_get(item_meta_t<Item> const &m) { return item_int_get(m.item); }
template<typename Item> static inline void item_int_set(item_meta_t<Item> const &m, int value) { item_int_set(m.item, value); }
template<typename Item> static inline int  item_int_min(item_meta_t<Item> const &m) { return item_int_min(m.item); }
template<typename Item> static inline int  item_int_max(item_meta_t<Item> const &m) { return item_int_max(m.item); }
template<typename Item> static inline int  item_int_step(item_meta_t<Item> const &m) { return item_int_step(m.item); }
template<typename Item> static inline int  item_int_get(item_format_t<Item> const &m) { return item_int_get(m.item); }
template<typename Item> static inline void item_int_set(item_format_t<Item> const &m, int value) { item_int_set(m.item, value); }
template<typename Item> static inline int  item_int_min(item_format_t<Item> const &m) { return item_int_min(m.item); }
template<typename Item> static inline int  item_int_max(item_format_t<Item> const &m) { return item_int_max(m.item); }
template<typename Item> static inline int  item_int_step(item_format_t<Item> const &m) { return item_int_step(m.item); }
template<typename Item> static inline int  item_int_get(item_change_t<Item> const &m) { return item_int_get(m.item); }
template<typename Item> static inline void item_int_set(item_change_t<Item> const &m, int value) { item_int_set(m.item, value); }
template<typename Item> static inline int  item_int_min(item_change_t<Item> const &m) { return item_int_min(m.item); }
template<typename Item> static inline int  item_int_max(item_change_t<Item> const &m) { return item_int_max(m.item); }
template<typename Item> static inline int  item_int_step(item_change_t<Item> const &m) { return item_int_step(m.item); }

static inline void item_call(item_func_t const &f) { if (f.fn) { f.fn(); } }
static inline void item_call(item_func_ctx_t const &f) { if (f.fn) { f.fn(f.ctx); } }
static inline void item_call(item_int_t const &)   { }
static inline void item_call(item_bool_t const &)  { }
static inline void item_call(item_value_t const &) { }
template<typename CM> static inline void item_call(item_menu_t<CM> const &) { }
template<typename... Choices> static inline void item_call(item_select_t<Choices...> const &) { }
template<typename Item> static inline void item_call(item_meta_t<Item> const &m) { item_call(m.item); }
template<typename Item> static inline void item_call(item_format_t<Item> const &m) { item_call(m.item); }
template<typename Item> static inline void item_call(item_change_t<Item> const &m) { item_call(m.item); }

/* Child discovery */
template<typename CM> static inline bool item_child(item_menu_t<CM> const &m, void const **out_child, menu_ops_t const **out_ops);
static inline bool item_child(item_int_t const &,  void const **, menu_ops_t const **) { return false; }
static inline bool item_child(item_bool_t const &, void const **, menu_ops_t const **) { return false; }
static inline bool item_child(item_func_t const &, void const **, menu_ops_t const **) { return false; }
static inline bool item_child(item_func_ctx_t const &, void const **, menu_ops_t const **) { return false; }
static inline bool item_child(item_value_t const &, void const **, menu_ops_t const **) { return false; }
template<typename... Choices> static inline bool item_child(item_select_t<Choices...> const &, void const **, menu_ops_t const **) { return false; }
template<typename Item> static inline bool item_child(item_meta_t<Item> const &m, void const **out_child, menu_ops_t const **out_ops) { return item_child(m.item, out_child, out_ops); }
template<typename Item> static inline bool item_child(item_format_t<Item> const &m, void const **out_child, menu_ops_t const **out_ops) { return item_child(m.item, out_child, out_ops); }
template<typename Item> static inline bool item_child(item_change_t<Item> const &m, void const **out_child, menu_ops_t const **out_ops) { return item_child(m.item, out_child, out_ops); }

static inline menu_text_t choice_label_at_pack(pack_nil const &, uint8_t) { return menu_text(""); }
template<typename Head, typename Tail>
static inline menu_text_t choice_label_at_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? p.head.label : choice_label_at_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline int choice_value_at_pack(pack_nil const &, uint8_t) { return 0; }
template<typename Head, typename Tail>
static inline int choice_value_at_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? p.head.value : choice_value_at_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline uint8_t choice_index_for_value_pack(pack_nil const &, int, uint8_t) { return 255; }
template<typename Head, typename Tail>
static inline uint8_t choice_index_for_value_pack(pack_node<Head, Tail> const &p, int value, uint8_t idx) {
    return (p.head.value == value) ? idx : choice_index_for_value_pack(p.tail, value, static_cast<uint8_t>(idx + 1));
}

static inline uint8_t item_value_count(item_int_t const &) { return 0; }
static inline uint8_t item_value_count(item_bool_t const &b) { return b.ptr ? 2 : 0; }
static inline uint8_t item_value_count(item_func_t const &) { return 0; }
static inline uint8_t item_value_count(item_func_ctx_t const &) { return 0; }
static inline uint8_t item_value_count(item_value_t const &) { return 0; }
template<typename CM> static inline uint8_t item_value_count(item_menu_t<CM> const &) { return 0; }
template<typename... Choices> static inline uint8_t item_value_count(item_select_t<Choices...> const &s) { return s.ptr ? static_cast<uint8_t>(sizeof...(Choices)) : 0; }
template<typename Item> static inline uint8_t item_value_count(item_meta_t<Item> const &m) { return item_value_count(m.item); }
template<typename Item> static inline uint8_t item_value_count(item_format_t<Item> const &m) { return item_value_count(m.item); }
template<typename Item> static inline uint8_t item_value_count(item_change_t<Item> const &m) { return item_value_count(m.item); }

static inline menu_text_t item_value_label_at(item_int_t const &, uint8_t) { return menu_text(""); }
static inline menu_text_t item_value_label_at(item_bool_t const &b, uint8_t idx) { return idx ? b.true_label : b.false_label; }
static inline menu_text_t item_value_label_at(item_func_t const &, uint8_t) { return menu_text(""); }
static inline menu_text_t item_value_label_at(item_func_ctx_t const &, uint8_t) { return menu_text(""); }
static inline menu_text_t item_value_label_at(item_value_t const &, uint8_t) { return menu_text(""); }
template<typename CM> static inline menu_text_t item_value_label_at(item_menu_t<CM> const &, uint8_t) { return menu_text(""); }
template<typename... Choices> static inline menu_text_t item_value_label_at(item_select_t<Choices...> const &s, uint8_t idx) { return choice_label_at_pack(s.choices, idx); }
template<typename Item> static inline menu_text_t item_value_label_at(item_meta_t<Item> const &m, uint8_t idx) { return item_value_label_at(m.item, idx); }
template<typename Item> static inline menu_text_t item_value_label_at(item_format_t<Item> const &m, uint8_t idx) { return item_value_label_at(m.item, idx); }
template<typename Item> static inline menu_text_t item_value_label_at(item_change_t<Item> const &m, uint8_t idx) { return item_value_label_at(m.item, idx); }

static inline uint8_t item_value_selected(item_int_t const &) { return 255; }
static inline uint8_t item_value_selected(item_bool_t const &b) { return (b.ptr && *b.ptr) ? 1 : 0; }
static inline uint8_t item_value_selected(item_func_t const &) { return 255; }
static inline uint8_t item_value_selected(item_func_ctx_t const &) { return 255; }
static inline uint8_t item_value_selected(item_value_t const &) { return 255; }
template<typename CM> static inline uint8_t item_value_selected(item_menu_t<CM> const &) { return 255; }
template<typename... Choices> static inline uint8_t item_value_selected(item_select_t<Choices...> const &s) { return s.ptr ? choice_index_for_value_pack(s.choices, *s.ptr, 0) : 255; }
template<typename Item> static inline uint8_t item_value_selected(item_meta_t<Item> const &m) { return item_value_selected(m.item); }
template<typename Item> static inline uint8_t item_value_selected(item_format_t<Item> const &m) { return item_value_selected(m.item); }
template<typename Item> static inline uint8_t item_value_selected(item_change_t<Item> const &m) { return item_value_selected(m.item); }

static inline void item_value_select(item_int_t const &, uint8_t) { }
static inline void item_value_select(item_bool_t const &b, uint8_t idx) { if (b.ptr) { *b.ptr = idx != 0; } }
static inline void item_value_select(item_func_t const &, uint8_t) { }
static inline void item_value_select(item_func_ctx_t const &, uint8_t) { }
static inline void item_value_select(item_value_t const &, uint8_t) { }
template<typename CM> static inline void item_value_select(item_menu_t<CM> const &, uint8_t) { }
template<typename... Choices> static inline void item_value_select(item_select_t<Choices...> const &s, uint8_t idx) { if (s.ptr) { *s.ptr = choice_value_at_pack(s.choices, idx); } }
template<typename Item> static inline void item_value_select(item_meta_t<Item> const &m, uint8_t idx) { item_value_select(m.item, idx); }
template<typename Item> static inline void item_value_select(item_format_t<Item> const &m, uint8_t idx) { item_value_select(m.item, idx); }
template<typename Item> static inline void item_value_select(item_change_t<Item> const &m, uint8_t idx) { item_value_select(m.item, idx); }

static inline bool menu_condition_matches(menu_condition_t const &condition) {
    return condition.fn ? condition.fn(condition.ctx) : false;
}

static inline bool item_hidden(item_int_t const &) { return false; }
static inline bool item_hidden(item_bool_t const &) { return false; }
static inline bool item_hidden(item_func_t const &) { return false; }
static inline bool item_hidden(item_func_ctx_t const &) { return false; }
static inline bool item_hidden(item_value_t const &) { return false; }
template<typename CM> static inline bool item_hidden(item_menu_t<CM> const &) { return false; }
template<typename... Choices> static inline bool item_hidden(item_select_t<Choices...> const &) { return false; }
template<typename Item> static inline bool item_hidden(item_meta_t<Item> const &m) { return menu_condition_matches(m.hidden) || item_hidden(m.item); }
template<typename Item> static inline bool item_hidden(item_format_t<Item> const &m) { return item_hidden(m.item); }
template<typename Item> static inline bool item_hidden(item_change_t<Item> const &m) { return item_hidden(m.item); }

static inline bool item_disabled(item_int_t const &) { return false; }
static inline bool item_disabled(item_bool_t const &) { return false; }
static inline bool item_disabled(item_func_t const &) { return false; }
static inline bool item_disabled(item_func_ctx_t const &) { return false; }
static inline bool item_disabled(item_value_t const &) { return false; }
template<typename CM> static inline bool item_disabled(item_menu_t<CM> const &) { return false; }
template<typename... Choices> static inline bool item_disabled(item_select_t<Choices...> const &) { return false; }
template<typename Item> static inline bool item_disabled(item_meta_t<Item> const &m) { return menu_condition_matches(m.disabled) || item_disabled(m.item); }
template<typename Item> static inline bool item_disabled(item_format_t<Item> const &m) { return item_disabled(m.item); }
template<typename Item> static inline bool item_disabled(item_change_t<Item> const &m) { return item_disabled(m.item); }

static inline bool item_format_value(item_int_t const &, char *, uint8_t) { return false; }
static inline bool item_format_value(item_bool_t const &, char *, uint8_t) { return false; }
static inline bool item_format_value(item_func_t const &, char *, uint8_t) { return false; }
static inline bool item_format_value(item_func_ctx_t const &, char *, uint8_t) { return false; }
static inline bool item_format_value(item_value_t const &, char *, uint8_t) { return false; }
template<typename CM> static inline bool item_format_value(item_menu_t<CM> const &, char *, uint8_t) { return false; }
template<typename... Choices> static inline bool item_format_value(item_select_t<Choices...> const &, char *, uint8_t) { return false; }
template<typename Item> static inline bool item_format_value(item_meta_t<Item> const &m, char *out, uint8_t cap) { return item_format_value(m.item, out, cap); }
template<typename Item> static inline bool item_format_value(item_format_t<Item> const &m, char *out, uint8_t cap) {
    if (out && cap) { out[0] = '\0'; }
    if (m.fn) {
        m.fn(m.ctx, out, cap);
        if (out && cap) { out[cap - 1] = '\0'; }
        return true;
    }
    return item_format_value(m.item, out, cap);
}
template<typename Item> static inline bool item_format_value(item_change_t<Item> const &m, char *out, uint8_t cap) { return item_format_value(m.item, out, cap); }

static inline void item_on_change(item_int_t const &) { }
static inline void item_on_change(item_bool_t const &) { }
static inline void item_on_change(item_func_t const &) { }
static inline void item_on_change(item_func_ctx_t const &) { }
static inline void item_on_change(item_value_t const &) { }
template<typename CM> static inline void item_on_change(item_menu_t<CM> const &) { }
template<typename... Choices> static inline void item_on_change(item_select_t<Choices...> const &) { }
template<typename Item> static inline void item_on_change(item_meta_t<Item> const &m) { item_on_change(m.item); }
template<typename Item> static inline void item_on_change(item_format_t<Item> const &m) { item_on_change(m.item); }
template<typename Item> static inline void item_on_change(item_change_t<Item> const &m) {
    item_on_change(m.item);
    if (m.fn) { m.fn(m.ctx); }
}

/* pack walkers */
static inline menu_text_t label_at_pack(pack_nil const &, uint8_t) { return menu_text(""); }
template<typename Head, typename Tail>
static inline menu_text_t label_at_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_label(p.head) : label_at_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline entry_t type_at_pack(pack_nil const &, uint8_t) { return ENTRY_FUNC; }
template<typename Head, typename Tail>
static inline entry_t type_at_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_type(p.head) : type_at_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline bool int_has_pack(pack_nil const &, uint8_t) { return false; }
template<typename Head, typename Tail>
static inline bool int_has_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_int_has(p.head) : int_has_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline bool scalar_has_pack(pack_nil const &, uint8_t) { return false; }
template<typename Head, typename Tail>
static inline bool scalar_has_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_scalar_has(p.head) : scalar_has_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline int int_get_pack(pack_nil const &, uint8_t) { return 0; }
template<typename Head, typename Tail>
static inline int int_get_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_int_get(p.head) : int_get_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline void int_set_pack(pack_nil const &, uint8_t, int) { }
template<typename Head, typename Tail>
static inline void int_set_pack(pack_node<Head, Tail> const &p, uint8_t idx, int v) { if (idx==0) { item_int_set(p.head, v); } else { int_set_pack(p.tail, static_cast<uint8_t>(idx-1), v); } }

static inline int int_min_pack(pack_nil const &, uint8_t) { return 0; }
template<typename Head, typename Tail>
static inline int int_min_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_int_min(p.head) : int_min_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline int int_max_pack(pack_nil const &, uint8_t) { return 0; }
template<typename Head, typename Tail>
static inline int int_max_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_int_max(p.head) : int_max_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline int int_step_pack(pack_nil const &, uint8_t) { return 1; }
template<typename Head, typename Tail>
static inline int int_step_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_int_step(p.head) : int_step_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline void call_func_pack(pack_nil const &, uint8_t) { }
template<typename Head, typename Tail>
static inline void call_func_pack(pack_node<Head, Tail> const &p, uint8_t idx) { if (idx==0) { item_call(p.head); } else { call_func_pack(p.tail, static_cast<uint8_t>(idx-1)); } }

static inline bool child_at_pack(pack_nil const &, uint8_t, void const **, menu_ops_t const **) { return false; }
template<typename Head, typename Tail>
static inline bool child_at_pack(pack_node<Head, Tail> const &p, uint8_t idx, void const **out_child, menu_ops_t const **out_ops) { return (idx==0) ? item_child(p.head, out_child, out_ops) : child_at_pack(p.tail, static_cast<uint8_t>(idx-1), out_child, out_ops); }

static inline uint8_t value_count_pack(pack_nil const &, uint8_t) { return 0; }
template<typename Head, typename Tail>
static inline uint8_t value_count_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_value_count(p.head) : value_count_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline menu_text_t value_label_at_pack(pack_nil const &, uint8_t, uint8_t) { return menu_text(""); }
template<typename Head, typename Tail>
static inline menu_text_t value_label_at_pack(pack_node<Head, Tail> const &p, uint8_t idx, uint8_t value_idx) {
    return (idx==0) ? item_value_label_at(p.head, value_idx) : value_label_at_pack(p.tail, static_cast<uint8_t>(idx-1), value_idx);
}

static inline uint8_t value_selected_pack(pack_nil const &, uint8_t) { return 255; }
template<typename Head, typename Tail>
static inline uint8_t value_selected_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_value_selected(p.head) : value_selected_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline void value_select_pack(pack_nil const &, uint8_t, uint8_t) { }
template<typename Head, typename Tail>
static inline void value_select_pack(pack_node<Head, Tail> const &p, uint8_t idx, uint8_t value_idx) {
    if (idx==0) { item_value_select(p.head, value_idx); }
    else { value_select_pack(p.tail, static_cast<uint8_t>(idx-1), value_idx); }
}

static inline bool hidden_pack(pack_nil const &, uint8_t) { return false; }
template<typename Head, typename Tail>
static inline bool hidden_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_hidden(p.head) : hidden_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline bool disabled_pack(pack_nil const &, uint8_t) { return false; }
template<typename Head, typename Tail>
static inline bool disabled_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_disabled(p.head) : disabled_pack(p.tail, static_cast<uint8_t>(idx-1)); }

static inline bool format_value_pack(pack_nil const &, uint8_t, char *, uint8_t) { return false; }
template<typename Head, typename Tail>
static inline bool format_value_pack(pack_node<Head, Tail> const &p, uint8_t idx, char *out, uint8_t cap) {
    return (idx==0) ? item_format_value(p.head, out, cap) : format_value_pack(p.tail, static_cast<uint8_t>(idx-1), out, cap);
}

static inline void on_change_pack(pack_nil const &, uint8_t) { }
template<typename Head, typename Tail>
static inline void on_change_pack(pack_node<Head, Tail> const &p, uint8_t idx) {
    if (idx==0) { item_on_change(p.head); }
    else { on_change_pack(p.tail, static_cast<uint8_t>(idx-1)); }
}

/* ops_for<menu_t<...>> */
template<typename MenuConcrete> struct ops_for;
template<typename... Items>
struct ops_for<menu_t<Items...>> {
    typedef menu_t<Items...> M;
    static uint8_t    _count(void const *) { return static_cast<uint8_t>(sizeof...(Items)); }
    static menu_text_t _title(void const *mptr) { M const &m = *static_cast<M const *>(mptr); return m.title.ptr ? m.title : menu_text(""); }
    static menu_text_t _label_at(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return label_at_pack(m.items, idx); }
    static entry_t    _type_at(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return type_at_pack(m.items, idx); }
    static bool       _int_has(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return int_has_pack(m.items, idx); }
    static bool       _scalar_has(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return scalar_has_pack(m.items, idx); }
    static int        _int_get(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return int_get_pack(m.items, idx); }
    static void       _int_set(void const *mptr, uint8_t idx, int v){ M const &m = *static_cast<M const *>(mptr); return int_set_pack(m.items, idx, v); }
    static int        _int_min(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return int_min_pack(m.items, idx); }
    static int        _int_max(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return int_max_pack(m.items, idx); }
    static int        _int_step(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return int_step_pack(m.items, idx); }
    static bool       _child_at(void const *mptr, uint8_t idx, void const **out_child, menu_ops_t const **out_ops) { M const &m = *static_cast<M const *>(mptr); return child_at_pack(m.items, idx, out_child, out_ops); }
    static void       _call_func(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); call_func_pack(m.items, idx); }
    static uint8_t    _value_count(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return value_count_pack(m.items, idx); }
    static menu_text_t _value_label_at(void const *mptr, uint8_t idx, uint8_t value_idx) { M const &m = *static_cast<M const *>(mptr); return value_label_at_pack(m.items, idx, value_idx); }
    static uint8_t    _value_selected(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return value_selected_pack(m.items, idx); }
    static void       _value_select(void const *mptr, uint8_t idx, uint8_t value_idx) { M const &m = *static_cast<M const *>(mptr); value_select_pack(m.items, idx, value_idx); }
    static bool       _hidden(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return hidden_pack(m.items, idx); }
    static bool       _disabled(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return disabled_pack(m.items, idx); }
    static bool       _format_value(void const *mptr, uint8_t idx, char *out, uint8_t cap) { M const &m = *static_cast<M const *>(mptr); return format_value_pack(m.items, idx, out, cap); }
    static void       _on_change(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); on_change_pack(m.items, idx); }
    static menu_ops_t const ops;
};
template<typename... Items>
menu_ops_t const ops_for<menu_t<Items...>>::ops = {
    &ops_for<menu_t<Items...>>::_count,
    &ops_for<menu_t<Items...>>::_label_at,
    &ops_for<menu_t<Items...>>::_type_at,
    &ops_for<menu_t<Items...>>::_int_has,
    &ops_for<menu_t<Items...>>::_scalar_has,
    &ops_for<menu_t<Items...>>::_int_get,
    &ops_for<menu_t<Items...>>::_int_set,
    &ops_for<menu_t<Items...>>::_int_min,
    &ops_for<menu_t<Items...>>::_int_max,
    &ops_for<menu_t<Items...>>::_int_step,
    &ops_for<menu_t<Items...>>::_child_at,
    &ops_for<menu_t<Items...>>::_call_func,
    &ops_for<menu_t<Items...>>::_title,
    &ops_for<menu_t<Items...>>::_value_count,
    &ops_for<menu_t<Items...>>::_value_label_at,
    &ops_for<menu_t<Items...>>::_value_selected,
    &ops_for<menu_t<Items...>>::_value_select,
    &ops_for<menu_t<Items...>>::_hidden,
    &ops_for<menu_t<Items...>>::_disabled,
    &ops_for<menu_t<Items...>>::_format_value,
    &ops_for<menu_t<Items...>>::_on_change
};

template<typename CM>
static inline bool item_child(item_menu_t<CM> const &m, void const **out_child, menu_ops_t const **out_ops) {
    if (!out_child || !out_ops) { return false; }
    *out_child = static_cast<void const *>(&m.child);
    *out_ops   = &ops_for<CM>::ops;
    return true;
}

/* ============================= Engine Runtime ============================ */

struct menu_cursor_t { void const *menu_ptr; menu_ops_t const *ops; uint8_t selected; uint8_t top; };

struct menu_runtime_t {
    display_t         display;
    input_fptr_t      input_cb;        /* legacy optional */
    input_source_t    input_src;       /* provider optional */
    uint8_t           use_numbers : 1,
	                      show_title  : 1,
	                      initialized : 1,
	                      editing     : 1,
	                      dirty       : 1,
	                      has_src     : 1,
	                      show_breadcrumbs : 1,
	                      show_affordances : 1;

    menu_cursor_t     stack[MENU_MAX_STACK];
    uint8_t           depth;
    int               edit_original;
    menu_persistence_t persistence;

    menu_runtime_t() :
        display(make_display(0, 0, 0, 0)),
        input_cb(0),
        input_src(),
        use_numbers(0),
        show_title(0),
        initialized(0),
        editing(0),
        dirty(1),
        has_src(0),
        show_breadcrumbs(0),
        show_affordances(0),
        stack(),
        depth(0),
        edit_original(0),
        persistence() {
    }

    /* construct with legacy callback */
    template<typename RootMenu>
    static inline menu_runtime_t make(RootMenu const &root, display_t const &disp, input_fptr_t inp, bool use_nums) {
        menu_runtime_t r = base_init(root, disp, use_nums);
        r.input_cb = inp;
        r.has_src  = 0;
        return r;
    }
    template<typename RootMenu>
    static inline menu_runtime_t make(RootMenu const &&root, display_t const &disp, input_fptr_t inp, bool use_nums) = delete;

    /* construct with provider */
    template<typename RootMenu>
    static inline menu_runtime_t make(RootMenu const &root, display_t const &disp, input_source_t src, bool use_nums) {
        menu_runtime_t r = base_init(root, disp, use_nums);
        r.input_cb = 0;
        r.input_src = src;
        r.has_src  = 1;
        return r;
    }
    template<typename RootMenu>
    static inline menu_runtime_t make(RootMenu const &&root, display_t const &disp, input_source_t src, bool use_nums) = delete;

    inline void begin(void) { initialized = 1; dirty = 1; }

    inline void request_redraw(void) { dirty = 1; }

    inline void reset_navigation(void) {
        depth = 0;
        editing = 0;
        edit_original = 0;
        stack[0].selected = 0;
        stack[0].top = 0;
        dirty = 1;
    }

    /* ---------- helpers ---------- */
    static inline menu_runtime_t base_init(void const *root_ptr, menu_ops_t const *root_ops, display_t const &disp, bool use_nums) {
        menu_runtime_t r;
        r.display      = disp;
        r.input_cb     = 0;
        r.input_src.ctx = 0;
        r.input_src.ops = 0;
        r.use_numbers  = use_nums ? 1 : 0;
        r.show_title   = 0;
        r.initialized  = 0;
        r.editing      = 0;
	    r.dirty        = 1;
	    r.has_src      = 0;
	    r.show_breadcrumbs = 0;
	    r.show_affordances = 0;
	    r.depth        = 0;
	    r.edit_original= 0;
	    r.persistence  = menu_persistence_t();
        r.stack[0].menu_ptr = root_ptr;
        r.stack[0].ops      = root_ops;
        r.stack[0].selected = 0;
        r.stack[0].top      = 0;
        return r;
    }
    template<typename RootMenu>
    static inline menu_runtime_t base_init(RootMenu const &root, display_t const &disp, bool use_nums) {
        return base_init(static_cast<void const *>(&root), &ops_for<RootMenu>::ops, disp, use_nums);
    }
    template<typename RootMenu>
    static inline menu_runtime_t base_init(RootMenu const &&root, display_t const &disp, bool use_nums) = delete;

    inline void set_show_title(bool enable) { show_title = enable ? 1 : 0; dirty = 1; }
    inline void set_show_breadcrumbs(bool enable) { show_breadcrumbs = enable ? 1 : 0; dirty = 1; }
    inline void set_show_affordances(bool enable) { show_affordances = enable ? 1 : 0; dirty = 1; }
    inline void set_persistence(menu_persistence_ctx_fptr_t load_cb, menu_persistence_ctx_fptr_t save_cb, void *ctx) {
        persistence = menu_persistence_t(load_cb, save_cb, ctx);
    }
    inline void load_persistence(void) {
        if (persistence.load) { persistence.load(persistence.ctx); dirty = 1; }
    }
    inline void save_persistence(void) {
        if (persistence.save) { persistence.save(persistence.ctx); }
    }

    static inline uint8_t min_u8(uint8_t a, uint8_t b) { return a < b ? a : b; }
    static inline uint8_t effective_width(display_t const &d) { return (d.width == 0 || d.width >= MENU_MAX_LINE) ? static_cast<uint8_t>(MENU_MAX_LINE - 1) : d.width; }
    static inline uint8_t effective_line_capacity(display_t const &d) { return static_cast<uint8_t>(effective_width(d) + 1); }
    static inline void display_clear(display_t const &d) {
        if (d.ops && d.ops->clear) { d.ops->clear(d.ctx); }
        else if (d.clear) { d.clear(); }
    }
    static inline void display_write_line(display_t const &d, uint8_t row, char const *text) {
        if (d.ops && d.ops->write_line) { d.ops->write_line(d.ctx, row, text); }
        else if (d.write_line) { d.write_line(row, text); }
    }
    static inline void display_flush(display_t const &d) {
        if (d.ops && d.ops->flush) { d.ops->flush(d.ctx); }
        else if (d.flush) { d.flush(); }
    }
    static inline void display_render_line(display_t const &d, menu_render_line_t const &line) {
        if (d.ops && d.ops->render_line) { d.ops->render_line(d.ctx, &line); }
        else { display_write_line(d, line.row, line.text); }
    }
    static inline bool menu_cursor_valid(menu_cursor_t const &c) {
        return c.menu_ptr != 0 && c.ops != 0;
    }
    static inline uint8_t menu_count(menu_cursor_t const &c) {
        return (menu_cursor_valid(c) && c.ops->count) ? c.ops->count(c.menu_ptr) : 0;
    }
    static inline menu_text_t menu_title(menu_cursor_t const &c) {
        return (menu_cursor_valid(c) && c.ops->title) ? c.ops->title(c.menu_ptr) : menu_text("");
    }
    static inline menu_text_t menu_label_at(menu_cursor_t const &c, uint8_t idx) {
        return (menu_cursor_valid(c) && c.ops->label_at) ? c.ops->label_at(c.menu_ptr, idx) : menu_text("");
    }
    static inline entry_t menu_type_at(menu_cursor_t const &c, uint8_t idx) {
        return (menu_cursor_valid(c) && c.ops->type_at) ? c.ops->type_at(c.menu_ptr, idx) : ENTRY_FUNC;
    }
    static inline bool menu_int_has(menu_cursor_t const &c, uint8_t idx) {
        return (menu_cursor_valid(c) && c.ops->int_has) ? c.ops->int_has(c.menu_ptr, idx) : false;
    }
    static inline bool menu_scalar_has(menu_cursor_t const &c, uint8_t idx) {
        return (menu_cursor_valid(c) && c.ops->scalar_has) ? c.ops->scalar_has(c.menu_ptr, idx) : false;
    }
    static inline int menu_int_get(menu_cursor_t const &c, uint8_t idx) {
        return (menu_cursor_valid(c) && c.ops->int_get) ? c.ops->int_get(c.menu_ptr, idx) : 0;
    }
    static inline void menu_int_set(menu_cursor_t const &c, uint8_t idx, int value) {
        if (menu_cursor_valid(c) && c.ops->int_set) { c.ops->int_set(c.menu_ptr, idx, value); }
    }
    static inline int menu_int_min(menu_cursor_t const &c, uint8_t idx) {
        return (menu_cursor_valid(c) && c.ops->int_min) ? c.ops->int_min(c.menu_ptr, idx) : 0;
    }
    static inline int menu_int_max(menu_cursor_t const &c, uint8_t idx) {
        return (menu_cursor_valid(c) && c.ops->int_max) ? c.ops->int_max(c.menu_ptr, idx) : 0;
    }
    static inline int menu_int_step(menu_cursor_t const &c, uint8_t idx) {
        return (menu_cursor_valid(c) && c.ops->int_step) ? c.ops->int_step(c.menu_ptr, idx) : 1;
    }
    static inline bool menu_child_at(menu_cursor_t const &c, uint8_t idx, void const **out_child, menu_ops_t const **out_ops) {
        return (menu_cursor_valid(c) && c.ops->child_at) ? c.ops->child_at(c.menu_ptr, idx, out_child, out_ops) : false;
    }
    static inline void menu_call_func(menu_cursor_t const &c, uint8_t idx) {
        if (menu_cursor_valid(c) && c.ops->call_func) { c.ops->call_func(c.menu_ptr, idx); }
    }
    static inline uint8_t menu_value_count(menu_cursor_t const &c, uint8_t idx) {
        return (menu_cursor_valid(c) && c.ops->value_count) ? c.ops->value_count(c.menu_ptr, idx) : 0;
    }
    static inline menu_text_t menu_value_label_at(menu_cursor_t const &c, uint8_t idx, uint8_t value_idx) {
        return (menu_cursor_valid(c) && c.ops->value_label_at) ? c.ops->value_label_at(c.menu_ptr, idx, value_idx) : menu_text("");
    }
    static inline uint8_t menu_value_selected(menu_cursor_t const &c, uint8_t idx) {
        return (menu_cursor_valid(c) && c.ops->value_selected) ? c.ops->value_selected(c.menu_ptr, idx) : 255;
    }
    static inline void menu_value_select(menu_cursor_t const &c, uint8_t idx, uint8_t value_idx) {
        if (menu_cursor_valid(c) && c.ops->value_select) { c.ops->value_select(c.menu_ptr, idx, value_idx); }
    }
    static inline bool menu_hidden(menu_cursor_t const &c, uint8_t idx) {
        return (menu_cursor_valid(c) && c.ops->hidden) ? c.ops->hidden(c.menu_ptr, idx) : false;
    }
    static inline bool menu_disabled(menu_cursor_t const &c, uint8_t idx) {
        return (menu_cursor_valid(c) && c.ops->disabled) ? c.ops->disabled(c.menu_ptr, idx) : false;
    }
    static inline bool menu_format_value(menu_cursor_t const &c, uint8_t idx, char *out, uint8_t cap) {
        return (menu_cursor_valid(c) && c.ops->format_value) ? c.ops->format_value(c.menu_ptr, idx, out, cap) : false;
    }
    static inline void menu_on_change(menu_cursor_t const &c, uint8_t idx) {
        if (menu_cursor_valid(c) && c.ops->on_change) { c.ops->on_change(c.menu_ptr, idx); }
    }
    inline uint8_t title_rows(uint8_t total) const {
        return (show_title && (display.height == 0 || display.height > 1 || total == 0)) ? 1 : 0;
    }
    inline uint8_t item_window_height(uint8_t total) const {
        if (display.height == 0) { return total; }
        uint8_t rows = display.height;
        if (title_rows(total)) { rows = static_cast<uint8_t>(rows - 1); }
        return rows;
    }
    static inline bool menu_visible(menu_cursor_t const &c, uint8_t idx) {
        return !menu_hidden(c, idx);
    }
    static inline bool menu_selectable(menu_cursor_t const &c, uint8_t idx) {
        return menu_visible(c, idx) && !menu_disabled(c, idx);
    }
    static inline uint8_t visible_count(menu_cursor_t const &c, uint8_t total) {
        uint8_t count = 0;
        for (uint8_t idx = 0; idx < total; ++idx) {
            if (menu_visible(c, idx)) { ++count; }
        }
        return count;
    }
    static inline bool visible_to_raw(menu_cursor_t const &c, uint8_t total, uint8_t visible_idx, uint8_t *out_raw) {
        uint8_t pos = 0;
        for (uint8_t idx = 0; idx < total; ++idx) {
            if (!menu_visible(c, idx)) { continue; }
            if (pos == visible_idx) {
                if (out_raw) { *out_raw = idx; }
                return true;
            }
            ++pos;
        }
        return false;
    }
    static inline uint8_t raw_to_visible(menu_cursor_t const &c, uint8_t total, uint8_t raw_idx) {
        uint8_t pos = 0;
        for (uint8_t idx = 0; idx < total && idx < raw_idx; ++idx) {
            if (menu_visible(c, idx)) { ++pos; }
        }
        return pos;
    }
    static inline bool first_selectable(menu_cursor_t const &c, uint8_t total, uint8_t *out_raw) {
        for (uint8_t idx = 0; idx < total; ++idx) {
            if (menu_selectable(c, idx)) {
                if (out_raw) { *out_raw = idx; }
                return true;
            }
        }
        return false;
    }
    static inline bool first_visible(menu_cursor_t const &c, uint8_t total, uint8_t *out_raw) {
        for (uint8_t idx = 0; idx < total; ++idx) {
            if (menu_visible(c, idx)) {
                if (out_raw) { *out_raw = idx; }
                return true;
            }
        }
        return false;
    }
    static inline bool next_selectable(menu_cursor_t const &c, uint8_t total, uint8_t start, int8_t dir, uint8_t *out_raw) {
        if (total == 0) { return false; }
        uint8_t idx = start;
        for (uint8_t tries = 0; tries < total; ++tries) {
            if (dir < 0) { idx = (idx == 0) ? static_cast<uint8_t>(total - 1) : static_cast<uint8_t>(idx - 1); }
            else { idx = static_cast<uint8_t>((idx + 1) % total); }
            if (menu_selectable(c, idx)) {
                if (out_raw) { *out_raw = idx; }
                return true;
            }
        }
        return false;
    }
    static inline void clamp_menu_view(menu_cursor_t &c, uint8_t total, uint8_t visible_total, uint8_t height) {
        if (total == 0 || visible_total == 0) { c.selected = 0; c.top = 0; return; }
        if (c.selected >= total || !menu_visible(c, c.selected)) {
            if (!first_selectable(c, total, &c.selected)) { first_visible(c, total, &c.selected); }
        } else if (menu_disabled(c, c.selected)) {
            uint8_t selectable = 0;
            if (first_selectable(c, total, &selectable)) { c.selected = selectable; }
        }
        uint8_t selected_visible = raw_to_visible(c, total, c.selected);
        menu_cursor_t view = { c.menu_ptr, c.ops, selected_visible, c.top };
        clamp_view(view, visible_total, height);
        c.top = view.top;
    }

    static inline char *int_to_str(int v, char *buf, uint8_t cap) {
        if (cap == 0) { return buf; }
        char tmp[12]; uint8_t i = 0; bool neg = v < 0; unsigned int uv = neg ? (0U - static_cast<unsigned int>(v)) : static_cast<unsigned int>(v);
        do { tmp[i++] = static_cast<char>('0' + (uv % 10U)); uv /= 10U; } while (uv && i < sizeof(tmp));
        uint8_t pos = 0; if (neg && pos < cap - 1) { buf[pos++] = '-'; }
        while (i && pos < cap - 1) { buf[pos++] = tmp[--i]; } buf[pos] = '\0'; return buf;
    }
    static inline void normalize_range(int &mn, int &mx) {
        if (mn > mx) { int tmp = mn; mn = mx; mx = tmp; }
    }
    static inline int clamp_int(int value, int mn, int mx) {
        if (value < mn) { return mn; }
        if (value > mx) { return mx; }
        return value;
    }
    static inline int positive_step(int step) {
        return step > 0 ? step : 1;
    }
    static inline int step_up_int(int value, int step, int mx) {
        step = positive_step(step);
        if (value >= mx) { return mx; }
        unsigned int distance = static_cast<unsigned int>(mx) - static_cast<unsigned int>(value);
        if (static_cast<unsigned int>(step) > distance) { return mx; }
        return value + step;
    }
    static inline int step_down_int(int value, int step, int mn) {
        step = positive_step(step);
        if (value <= mn) { return mn; }
        unsigned int distance = static_cast<unsigned int>(value) - static_cast<unsigned int>(mn);
        if (static_cast<unsigned int>(step) > distance) { return mn; }
        return value - step;
    }
    static inline void append_capped(char *dst, uint8_t cap, char const *src) {
        if (!src) { return; }
        uint8_t len = static_cast<uint8_t>(strlen(dst)); if (len >= cap) { if (cap) dst[cap - 1] = '\0'; return; }
        while (*src && len < cap - 1) { dst[len++] = *src++; } dst[len] = '\0';
    }
    static inline void append_capped(char *dst, uint8_t cap, menu_text_t src) {
        uint8_t len = static_cast<uint8_t>(strlen(dst)); if (len >= cap) { if (cap) dst[cap - 1] = '\0'; return; }
        uint8_t pos = 0;
        while (len < cap - 1) {
            char ch = menu_text_char_at(src, pos++);
            if (!ch) { break; }
            dst[len++] = ch;
        }
        dst[len] = '\0';
    }

    void format_title(menu_cursor_t const &cur, char *out_buf) {
        out_buf[0] = '\0';
        uint8_t const cap = effective_line_capacity(display);
        if (show_breadcrumbs && depth > 0) {
            for (uint8_t i = 0; i <= depth && i < MENU_MAX_STACK; ++i) {
                if (i) { append_capped(out_buf, cap, "/"); }
                append_capped(out_buf, cap, menu_title(stack[i]));
            }
        } else {
            append_capped(out_buf, cap, menu_title(cur));
        }
        if (show_affordances && depth > 0) { append_capped(out_buf, cap, " <"); }
    }

    void format_line(menu_cursor_t const &cur, uint8_t idx, char *out_buf) {
        uint8_t const cap = effective_line_capacity(display); out_buf[0] = '\0';
        bool const disabled = menu_disabled(cur, idx);
        bool const selected = (idx == cur.selected) && !disabled;
        append_capped(out_buf, cap, selected ? ">" : " ");
        if (use_numbers) {
            uint8_t const display_idx = raw_to_visible(cur, menu_count(cur), idx);
            char nb[6]; append_capped(out_buf, cap, int_to_str(static_cast<int>(display_idx) + 1, nb, sizeof(nb))); append_capped(out_buf, cap, " ");
        }
        append_capped(out_buf, cap, menu_label_at(cur, idx));
        entry_t tp = menu_type_at(cur, idx);
        char formatted[MENU_MAX_LINE];
        if (tp == ENTRY_INT || tp == ENTRY_VALUE) {
            bool const has_custom_format = menu_format_value(cur, idx, formatted, sizeof(formatted));
            if (menu_scalar_has(cur, idx) || has_custom_format) {
                append_capped(out_buf, cap, ": ");
                if (has_custom_format) {
                    append_capped(out_buf, cap, formatted);
                } else {
                    char nb[12]; append_capped(out_buf, cap, int_to_str(menu_int_get(cur, idx), nb, sizeof(nb)));
                }
                if (editing && idx == cur.selected && menu_int_has(cur, idx)) { append_capped(out_buf, cap, "  (edit)"); }
            }
        } else if (tp == ENTRY_BOOL || tp == ENTRY_SELECT) {
            uint8_t value_count = menu_value_count(cur, idx);
            bool const has_custom_format = menu_format_value(cur, idx, formatted, sizeof(formatted));
            if (value_count || has_custom_format) {
                uint8_t value_idx = menu_value_selected(cur, idx);
                append_capped(out_buf, cap, ": ");
                if (has_custom_format) {
                    append_capped(out_buf, cap, formatted);
                } else if (value_idx < value_count) {
                    append_capped(out_buf, cap, menu_value_label_at(cur, idx, value_idx));
                } else {
                    append_capped(out_buf, cap, "?");
                }
            }
        } else if (menu_format_value(cur, idx, formatted, sizeof(formatted))) {
            append_capped(out_buf, cap, ": ");
            append_capped(out_buf, cap, formatted);
        }
        if (show_affordances && tp == ENTRY_MENU) {
            append_capped(out_buf, cap, " >");
        }
    }

    static inline void clamp_view(menu_cursor_t &c, uint8_t total, uint8_t height) {
        if (total == 0) { c.selected = c.top = 0; return; }
        if (c.selected >= total) { c.selected = static_cast<uint8_t>(total - 1); }
        uint8_t win = (height == 0 ? total : height); if (win == 0) { win = 1; }
        if (win >= total) { c.top = 0; return; }
        uint8_t max_top = static_cast<uint8_t>(total - win);
        if (c.top > max_top) { c.top = max_top; }
        if (c.selected < c.top) { c.top = c.selected; }
        if ((static_cast<uint16_t>(c.top) + static_cast<uint16_t>(win)) <= c.selected) { c.top = static_cast<uint8_t>(c.selected - (win - 1)); }
    }

    inline bool push(void const *child_ptr, menu_ops_t const *child_ops) {
        if (!child_ptr) { return false; }
        if (!child_ops || !child_ops->count) { return false; }
        if (depth + 1 >= MENU_MAX_STACK) { return false; }
        editing = 0;
        edit_original = 0;
        depth++; stack[depth].menu_ptr = child_ptr; stack[depth].ops = child_ops; stack[depth].selected = 0; stack[depth].top = 0; dirty = 1; return true;
    }
    inline bool pop(void) {
        if (depth == 0) { return false; }
        editing = 0;
        edit_original = 0;
        depth--; dirty = 1; return true;
    }

    void render(menu_cursor_t const &cur) {
        menu_cursor_t view = cur;
        uint8_t const total = menu_count(view);
        uint8_t const visible_total = visible_count(view, total);
        clamp_menu_view(view, total, visible_total, item_window_height(visible_total));
        display_clear(display);
        uint8_t row = 0;
        if (title_rows(visible_total)) {
            char line[MENU_MAX_LINE]; format_title(view, line);
            menu_render_line_t render_line = { row, 255, MENU_RENDER_TITLE, 0, static_cast<uint8_t>(depth > 0 ? MENU_RENDER_BACK_AVAILABLE : 0), line };
            display_render_line(display, render_line);
            ++row;
        }
        uint8_t const visible = min_u8(item_window_height(visible_total), visible_total);
        for (uint8_t i = 0; i < visible; ++i) {
            uint16_t item_pos = static_cast<uint16_t>(view.top) + static_cast<uint16_t>(i);
            if (item_pos >= visible_total) { break; }
            uint8_t item_idx = 0;
            if (!visible_to_raw(view, total, static_cast<uint8_t>(item_pos), &item_idx)) { break; }
            char line[MENU_MAX_LINE]; format_line(view, item_idx, line);
            uint8_t flags = 0;
            if (item_idx == view.selected && !menu_disabled(view, item_idx)) { flags = MENU_RENDER_SELECTED; }
            if (editing && item_idx == view.selected) { flags = static_cast<uint8_t>(flags | MENU_RENDER_EDITING); }
            if (menu_disabled(view, item_idx)) { flags = static_cast<uint8_t>(flags | MENU_RENDER_DISABLED); }
            if (menu_type_at(view, item_idx) == ENTRY_MENU) { flags = static_cast<uint8_t>(flags | MENU_RENDER_HAS_CHILD); }
            if (i == 0 && view.top > 0) { flags = static_cast<uint8_t>(flags | MENU_RENDER_SCROLL_UP); }
            if (i == static_cast<uint8_t>(visible - 1) && static_cast<uint16_t>(view.top) + visible < visible_total) { flags = static_cast<uint8_t>(flags | MENU_RENDER_SCROLL_DOWN); }
            menu_render_line_t render_line = {
                static_cast<uint8_t>(row + i),
                item_idx,
                MENU_RENDER_ITEM,
                static_cast<uint8_t>(menu_type_at(view, item_idx)),
                flags,
                line
            };
            display_render_line(display, render_line);
        }
        if (display.height != 0) {
            uint8_t written = static_cast<uint8_t>(row + visible);
            while (written < display.height) {
                menu_render_line_t render_line = { written, 255, MENU_RENDER_BLANK, 0, 0, "" };
                display_render_line(display, render_line);
                ++written;
            }
        }
        display_flush(display);
    }

    inline void notify_value_change(menu_cursor_t const &cur, uint8_t idx) {
        menu_on_change(cur, idx);
        save_persistence();
    }

    inline void move_selection(menu_cursor_t &cur, uint8_t total, int8_t dir, uint8_t steps) {
        if (total == 0 || steps == 0) { return; }
        uint8_t next = cur.selected;
        bool moved = false;
        for (uint8_t i = 0; i < steps; ++i) {
            if (next_selectable(cur, total, next, dir, &next)) { moved = true; }
        }
        if (moved && next != cur.selected) { cur.selected = next; dirty = 1; }
    }

    inline bool select_display_row(menu_cursor_t &cur, uint8_t total, uint8_t visible_total, uint8_t row) {
        uint8_t title = title_rows(visible_total);
        if (row < title) { return false; }
        uint8_t visible_row = static_cast<uint8_t>(row - title);
        uint16_t visible_pos = static_cast<uint16_t>(cur.top) + static_cast<uint16_t>(visible_row);
        if (visible_pos >= visible_total) { return false; }
        uint8_t raw = 0;
        if (!visible_to_raw(cur, total, static_cast<uint8_t>(visible_pos), &raw)) { return false; }
        if (!menu_selectable(cur, raw)) { return false; }
        if (cur.selected != raw) { cur.selected = raw; dirty = 1; }
        return true;
    }

    inline void activate_current(menu_cursor_t const &cur, uint8_t total) {
        if (total == 0 || !menu_selectable(cur, cur.selected)) { return; }
        switch (menu_type_at(cur, cur.selected)) {
            case ENTRY_INT:
            case ENTRY_VALUE:
                if (menu_int_has(cur, cur.selected)) {
                    edit_original = menu_int_get(cur, cur.selected);
                    int mn = menu_int_min(cur, cur.selected);
                    int mx = menu_int_max(cur, cur.selected);
                    normalize_range(mn, mx);
                    int clamped = clamp_int(edit_original, mn, mx);
                    if (clamped != edit_original) { menu_int_set(cur, cur.selected, clamped); }
                    editing = 1;
                    dirty = 1;
                }
                break;
            case ENTRY_BOOL:
            case ENTRY_SELECT: {
                uint8_t value_count = menu_value_count(cur, cur.selected);
                if (value_count) {
                    uint8_t value_idx = menu_value_selected(cur, cur.selected);
                    value_idx = (value_idx >= value_count) ? 0 : static_cast<uint8_t>(value_idx + 1);
                    if (value_idx >= value_count) { value_idx = 0; }
                    uint8_t old_idx = menu_value_selected(cur, cur.selected);
                    menu_value_select(cur, cur.selected, value_idx);
                    if (old_idx != value_idx) { notify_value_change(cur, cur.selected); }
                    dirty = 1;
                }
            } break;
            case ENTRY_FUNC:
                menu_call_func(cur, cur.selected);
                dirty = 1;
                break;
            case ENTRY_MENU: {
                void const *child_ptr = 0; menu_ops_t const *child_ops = 0;
                if (menu_child_at(cur, cur.selected, &child_ptr, &child_ops)) { push(child_ptr, child_ops); }
            } break;
        }
    }

    /* ============================ Non-Blocking ============================ */
    void service(void) {
        if (!initialized) { begin(); }
        if (depth >= MENU_MAX_STACK) { reset_navigation(); }
        if (depth > 0 && !menu_cursor_valid(stack[depth])) { reset_navigation(); }
        menu_cursor_t &cur = stack[depth];
        uint8_t const total = menu_count(cur);
        uint8_t const visible_total = visible_count(cur, total);
        uint8_t const selected_before_clamp = cur.selected;
        uint8_t const top_before_clamp = cur.top;
        bool const editing_before_clamp = editing != 0;
        clamp_menu_view(cur, total, visible_total, item_window_height(visible_total));
        if (cur.selected != selected_before_clamp || cur.top != top_before_clamp) {
            dirty = 1;
        }
        if (editing_before_clamp &&
            (cur.selected != selected_before_clamp || !menu_selectable(cur, cur.selected) || !menu_int_has(cur, cur.selected))) {
            if (selected_before_clamp < total && menu_int_has(cur, selected_before_clamp)) {
                menu_int_set(cur, selected_before_clamp, edit_original);
            }
            editing = 0;
            edit_original = 0;
            dirty = 1;
        }

        bool just_rendered = false;
        if (dirty) {
            render(cur);
            dirty = 0;
            just_rendered = true;
        }

        menu_event_t event = menu_event(Choice_Invalid);

        if (input_cb) {
            char const *prompt = editing ? "U/R=+  D/L=-  S=save  C=cancel"
                                         : "U/D=move  R/S=select  L/C=back";
            event.choice = input_cb(just_rendered ? prompt : "");
        } else if (has_src && input_src.ops) {
            if (input_src.ops->capture) { input_src.ops->capture(input_src.ctx); }
            if (input_src.ops->read_event) { event = input_src.ops->read_event(input_src.ctx); }
            if (event.choice == Choice_Invalid && input_src.ops->read) { event.choice = input_src.ops->read(input_src.ctx); }
            if (event.choice == Choice_Invalid) {
                if      (input_src.ops->up     && input_src.ops->up(input_src.ctx))       { event.choice = Choice_Up; }
                else if (input_src.ops->down   && input_src.ops->down(input_src.ctx))     { event.choice = Choice_Down; }
                else if (input_src.ops->select && input_src.ops->select(input_src.ctx))   { event.choice = Choice_Select; }
                else if (input_src.ops->cancel && input_src.ops->cancel(input_src.ctx))   { event.choice = Choice_Cancel; }
                else if (input_src.ops->left   && input_src.ops->left(input_src.ctx))     { event.choice = Choice_Left; }
                else if (input_src.ops->right  && input_src.ops->right(input_src.ctx))    { event.choice = Choice_Right; }
            }
        }

        if (event.choice == Choice_Invalid) { return; }

        if (editing) {
            if (!menu_int_has(cur, cur.selected)) { editing = 0; dirty = 1; return; }
            int v  = menu_int_get(cur, cur.selected);
            int mn = menu_int_min(cur, cur.selected);
            int mx = menu_int_max(cur, cur.selected);
            int step = menu_int_step(cur, cur.selected);
            normalize_range(mn, mx);
            switch (event.choice) {
                case Choice_Up:
                case Choice_Right: {
                    int next = step_up_int(v, step, mx);
                    if (next != v) { menu_int_set(cur, cur.selected, next); dirty = 1; }
                } break;
                case Choice_Down:
                case Choice_Left: {
                    int next = step_down_int(v, step, mn);
                    if (next != v) { menu_int_set(cur, cur.selected, next); dirty = 1; }
                } break;
                case Choice_Delta: {
                    int next = v;
                    int8_t delta = event.delta;
                    while (delta > 0) { next = step_up_int(next, step, mx); --delta; }
                    while (delta < 0) { next = step_down_int(next, step, mn); ++delta; }
                    if (next != v) { menu_int_set(cur, cur.selected, next); dirty = 1; }
                } break;
                case Choice_Select:
                    if (menu_int_get(cur, cur.selected) != edit_original) { notify_value_change(cur, cur.selected); }
                    editing = 0;
                    dirty = 1;
                    break;
                case Choice_Cancel: menu_int_set(cur, cur.selected, edit_original); editing = 0; dirty = 1; break;
                default: break;
            }
            return;
        }

        if (event.choice == Choice_Row) {
            if (select_display_row(cur, total, visible_total, event.row) && (event.flags & MENU_EVENT_ACTIVATE)) {
                activate_current(cur, total);
            }
            return;
        }

        if (event.choice == Choice_Delta) {
            int8_t delta = event.delta;
            if (delta > 0) { move_selection(cur, total, 1, static_cast<uint8_t>(delta)); }
            else if (delta < 0) { move_selection(cur, total, -1, static_cast<uint8_t>(-delta)); }
            return;
        }

        switch (event.choice) {
            case Choice_Up:
                move_selection(cur, total, -1, 1);
                break;
            case Choice_Down:
                move_selection(cur, total, 1, 1);
                break;
            case Choice_Right:
            case Choice_Select:
                activate_current(cur, total);
                break;
            case Choice_Left:
            case Choice_Cancel:
                pop();
                break;
            case Choice_Invalid:
            default: break;
        }
    }

    /* Optional blocking wrapper */
    void run(void) {
        for (;;) {
            service();
#ifdef ARDUINO
            yield();
#endif
        }
    }
};

/* =========================== Built-in Input: Serial ====================== */
#ifdef ARDUINO
struct stream_keymap_t {
    uint8_t up;
    uint8_t down;
    uint8_t select;
    uint8_t cancel;
    uint8_t left;
    uint8_t right;
    uint8_t case_insensitive;
};

struct stream_keys_ctx_t {
    Stream *stream;
    stream_keymap_t keymap;
    uint8_t pending_bits;
};
typedef stream_keys_ctx_t serial_keys_ctx_t;
enum { SK_UP=1<<0, SK_DOWN=1<<1, SK_SELECT=1<<2, SK_CANCEL=1<<3, SK_LEFT=1<<4, SK_RIGHT=1<<5 };

static stream_keymap_t const STREAM_KEYS_DEFAULT_MAP = {
    'w', 's', 'e', 'q', 'a', 'd', 1
};

static int stream_key_lower(int ch) {
    return (ch >= 'A' && ch <= 'Z') ? (ch - 'A' + 'a') : ch;
}

static bool stream_key_matches(int ch, uint8_t key, uint8_t case_insensitive) {
    if (!key) { return false; }
    int const expected = static_cast<int>(key);
    if (ch == expected) { return true; }
    return case_insensitive ? (stream_key_lower(ch) == stream_key_lower(expected)) : false;
}

static void stream_keys_capture(void *ctx) {
    if (!ctx) { return; }
    stream_keys_ctx_t &c = *static_cast<stream_keys_ctx_t *>(ctx);
    /* read at most one useful char per tick to throttle */
    if (!c.stream || c.stream->available() <= 0) { return; }
    int ch = c.stream->read();
    if      (stream_key_matches(ch, c.keymap.up,     c.keymap.case_insensitive)) { c.pending_bits |= SK_UP; }
    else if (stream_key_matches(ch, c.keymap.down,   c.keymap.case_insensitive)) { c.pending_bits |= SK_DOWN; }
    else if (stream_key_matches(ch, c.keymap.select, c.keymap.case_insensitive)) { c.pending_bits |= SK_SELECT; }
    else if (stream_key_matches(ch, c.keymap.cancel, c.keymap.case_insensitive)) { c.pending_bits |= SK_CANCEL; }
    else if (stream_key_matches(ch, c.keymap.left,   c.keymap.case_insensitive)) { c.pending_bits |= SK_LEFT; }
    else if (stream_key_matches(ch, c.keymap.right,  c.keymap.case_insensitive)) { c.pending_bits |= SK_RIGHT; }
}
static bool sk_take(stream_keys_ctx_t *c, uint8_t bit) {
    if (!c) { return false; }
    if (c->pending_bits & bit) { c->pending_bits &= static_cast<uint8_t>(~bit); return true; }
    return false;
}
static bool sk_up(void *ctx)     { return sk_take(static_cast<stream_keys_ctx_t *>(ctx), SK_UP); }
static bool sk_down(void *ctx)   { return sk_take(static_cast<stream_keys_ctx_t *>(ctx), SK_DOWN); }
static bool sk_select(void *ctx) { return sk_take(static_cast<stream_keys_ctx_t *>(ctx), SK_SELECT); }
static bool sk_cancel(void *ctx) { return sk_take(static_cast<stream_keys_ctx_t *>(ctx), SK_CANCEL); }
static bool sk_left(void *ctx)   { return sk_take(static_cast<stream_keys_ctx_t *>(ctx), SK_LEFT); }
static bool sk_right(void *ctx)  { return sk_take(static_cast<stream_keys_ctx_t *>(ctx), SK_RIGHT); }

static input_ops_t const STREAM_KEYS_OPS = {
    &stream_keys_capture, &sk_up, &sk_down, &sk_select, &sk_cancel, &sk_left, &sk_right, 0, 0
};

static void serial_keys_capture(void *ctx) {
    if (!ctx) { return; }
    stream_keys_ctx_t &c = *static_cast<stream_keys_ctx_t *>(ctx);
    if (!c.stream) { c.stream = &Serial; }
    stream_keys_capture(ctx);
}

static inline input_source_t make_stream_keys_input(stream_keys_ctx_t &ctx, Stream &stream, stream_keymap_t const &keymap) {
    ctx.stream = &stream;
    ctx.keymap = keymap;
    ctx.pending_bits = 0;
    return make_input_source(&ctx, &STREAM_KEYS_OPS);
}

static inline input_source_t make_stream_keys_input(stream_keys_ctx_t &ctx, Stream &stream) {
    return make_stream_keys_input(ctx, stream, STREAM_KEYS_DEFAULT_MAP);
}

static input_ops_t const SERIAL_KEYS_OPS = {
    &serial_keys_capture, &sk_up, &sk_down, &sk_select, &sk_cancel, &sk_left, &sk_right, 0, 0
};

static inline input_source_t make_serial_keys_input(serial_keys_ctx_t &ctx, stream_keymap_t const &keymap) {
    ctx.stream = &Serial;
    ctx.keymap = keymap;
    ctx.pending_bits = 0;
    return make_input_source(&ctx, &SERIAL_KEYS_OPS);
}

static inline input_source_t make_serial_keys_input(serial_keys_ctx_t &ctx) {
    return make_serial_keys_input(ctx, STREAM_KEYS_DEFAULT_MAP);
}

/* Returns a provider backed by the global Serial. Single instance ok. */
static inline input_source_t make_serial_keys_input(void) {
    static serial_keys_ctx_t ctx;
    return make_serial_keys_input(ctx);
}

static inline input_source_t make_serial_keys_input(stream_keymap_t const &keymap) {
    static serial_keys_ctx_t ctx;
    return make_serial_keys_input(ctx, keymap);
}
#endif

/* ========================== Built-in Input: Buttons ====================== */
#ifdef ARDUINO
#ifndef MENU_BUTTON_UNUSED
#define MENU_BUTTON_UNUSED 255
#endif

struct digital_io_ops_t {
    void    (*pin_mode)(void *ctx, uint8_t pin, uint8_t mode);
    uint8_t (*digital_read)(void *ctx, uint8_t pin);
};

static void arduino_pin_mode(void *, uint8_t pin, uint8_t mode) { pinMode(pin, mode); }
static uint8_t arduino_digital_read(void *, uint8_t pin) { return static_cast<uint8_t>(digitalRead(pin)); }

static digital_io_ops_t const ARDUINO_DIGITAL_IO_OPS = {
    &arduino_pin_mode, &arduino_digital_read
};

struct buttons_ctx_t {
    void     *io_ctx;
    digital_io_ops_t const *io_ops;
    uint8_t  pins[6];
    uint8_t  active_low;     /* 1 if LOW = pressed */
    uint16_t debounce_ms;
    uint8_t  debounced[6];   /* raw debounced level: HIGH/LOW */
    uint8_t  last_raw[6];
    uint32_t last_change[6];
    uint8_t  edge_pressed[6];/* 1 on press edge since last capture() */
};

static bool buttons_pin_is_used(uint8_t pin) {
    return pin != static_cast<uint8_t>(MENU_BUTTON_UNUSED);
}

static void buttons_pin_mode(buttons_ctx_t &b, uint8_t pin, uint8_t mode) {
    if (!buttons_pin_is_used(pin)) { return; }
    if (b.io_ops && b.io_ops->pin_mode) { b.io_ops->pin_mode(b.io_ctx, pin, mode); }
}

static uint8_t buttons_digital_read(buttons_ctx_t &b, uint8_t pin) {
    if (!buttons_pin_is_used(pin)) { return b.active_low ? HIGH : LOW; }
    if (b.io_ops && b.io_ops->digital_read) { return b.io_ops->digital_read(b.io_ctx, pin); }
    return b.active_low ? HIGH : LOW;
}

static void buttons_capture(void *ctx) {
    if (!ctx) { return; }
    buttons_ctx_t &b = *static_cast<buttons_ctx_t *>(ctx);
    uint32_t now = millis();
    for (uint8_t i = 0; i < 6; ++i) {
        uint8_t raw = buttons_digital_read(b, b.pins[i]);
        if (raw != b.last_raw[i]) {
            b.last_change[i] = now;
            b.last_raw[i] = raw;
        }
        if (static_cast<uint32_t>(now - b.last_change[i]) >= b.debounce_ms) {
            if (raw != b.debounced[i]) {
                /* state changed after stable period */
                b.debounced[i] = raw;
                /* compute press edge */
                bool pressed = b.active_low ? (raw == LOW) : (raw == HIGH);
                if (pressed) { b.edge_pressed[i] = 1; }
            }
        }
    }
}
static bool btn_take(buttons_ctx_t *b, uint8_t idx) {
    if (!b) { return false; }
    if (b->edge_pressed[idx]) { b->edge_pressed[idx] = 0; return true; }
    return false;
}
static bool b_up(void *ctx)     { return btn_take(static_cast<buttons_ctx_t *>(ctx), 0); }
static bool b_down(void *ctx)   { return btn_take(static_cast<buttons_ctx_t *>(ctx), 1); }
static bool b_select(void *ctx) { return btn_take(static_cast<buttons_ctx_t *>(ctx), 2); }
static bool b_cancel(void *ctx) { return btn_take(static_cast<buttons_ctx_t *>(ctx), 3); }
static bool b_left(void *ctx)   { return btn_take(static_cast<buttons_ctx_t *>(ctx), 4); }
static bool b_right(void *ctx)  { return btn_take(static_cast<buttons_ctx_t *>(ctx), 5); }

static input_ops_t const BUTTONS_OPS = {
    &buttons_capture, &b_up, &b_down, &b_select, &b_cancel, &b_left, &b_right, 0, 0
};

static inline input_source_t make_buttons_input(buttons_ctx_t &ctx,
                                                uint8_t up, uint8_t down, uint8_t select, uint8_t cancel, uint8_t left, uint8_t right,
                                                bool active_low, uint16_t debounce_ms,
                                                void *io_ctx, digital_io_ops_t const *io_ops) {
    ctx.io_ctx = io_ctx;
    ctx.io_ops = io_ops ? io_ops : &ARDUINO_DIGITAL_IO_OPS;
    ctx.pins[0]=up; ctx.pins[1]=down; ctx.pins[2]=select; ctx.pins[3]=cancel; ctx.pins[4]=left; ctx.pins[5]=right;
    ctx.active_low = active_low ? 1 : 0;
    ctx.debounce_ms = debounce_ms;
    for (uint8_t i=0;i<6;++i) {
        buttons_pin_mode(ctx, ctx.pins[i], active_low ? INPUT_PULLUP : INPUT);
        ctx.debounced[i] = buttons_digital_read(ctx, ctx.pins[i]);
        ctx.last_raw[i]  = ctx.debounced[i];
        ctx.last_change[i] = millis();
        ctx.edge_pressed[i] = 0;
    }
    return make_input_source(&ctx, &BUTTONS_OPS);
}

static inline input_source_t make_buttons_input(buttons_ctx_t &ctx,
                                                uint8_t up, uint8_t down, uint8_t select, uint8_t cancel,
                                                bool active_low, uint16_t debounce_ms,
                                                void *io_ctx, digital_io_ops_t const *io_ops) {
    return make_buttons_input(ctx,
                              up, down, select, cancel, MENU_BUTTON_UNUSED, MENU_BUTTON_UNUSED,
                              active_low, debounce_ms, io_ctx, io_ops);
}

/* Create a GPIO buttons provider. Order: up, down, select, cancel, left, right. */
static inline input_source_t make_buttons_input(buttons_ctx_t &ctx,
                                                uint8_t up, uint8_t down, uint8_t select, uint8_t cancel, uint8_t left, uint8_t right,
                                                bool active_low, uint16_t debounce_ms) {
    return make_buttons_input(ctx, up, down, select, cancel, left, right, active_low, debounce_ms, 0, &ARDUINO_DIGITAL_IO_OPS);
}

/* Four-button layout: up, down, select, cancel. Left/right remain inactive. */
static inline input_source_t make_buttons_input(buttons_ctx_t &ctx,
                                                uint8_t up, uint8_t down, uint8_t select, uint8_t cancel,
                                                bool active_low, uint16_t debounce_ms) {
    return make_buttons_input(ctx, up, down, select, cancel, active_low, debounce_ms, 0, &ARDUINO_DIGITAL_IO_OPS);
}

static inline input_source_t make_buttons_input(uint8_t up, uint8_t down, uint8_t select, uint8_t cancel, uint8_t left, uint8_t right,
                                                bool active_low, uint16_t debounce_ms) {
    static buttons_ctx_t ctx;
    return make_buttons_input(ctx, up, down, select, cancel, left, right, active_low, debounce_ms);
}

static inline input_source_t make_buttons_input(uint8_t up, uint8_t down, uint8_t select, uint8_t cancel,
                                                bool active_low, uint16_t debounce_ms) {
    static buttons_ctx_t ctx;
    return make_buttons_input(ctx, up, down, select, cancel, active_low, debounce_ms);
}
#endif

#endif /* BETTER_MENU_H */
