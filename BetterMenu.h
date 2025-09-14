/*\
|*| BetterMenu.h
|*|
|*| Declarative, non-STL, inline-nested menu system for Arduino-class targets.
|*| Three entry kinds: INT (editable), FUNC (callback), MENU (submenu).
|*| Pluggable output adapters (Serial, LCD/OLED via thin wrappers).
|*|
|*| Non-blocking: call menu_runtime_t::service() each loop().
|*| DRY input: generic input providers (6 controls). Built-ins: Serial keys, GPIO buttons.
|*|
|*| (c) 2022-2025 Trent M. Wyatt.
\*/

#ifndef BETTER_MENU_H
#define BETTER_MENU_H

#include <stdint.h>
#include <string.h>

#ifdef ARDUINO
#include <Arduino.h>
#endif

/* ============================= Configuration ============================= */

#ifndef MENU_MAX_STACK
#define MENU_MAX_STACK 8
#endif

#ifndef MENU_MAX_LINE
#define MENU_MAX_LINE 64
#endif

/* =============================== Input API =============================== */
/* Two ways to feed input (both non-blocking):
   1) Legacy callback: choice_t (*input_fptr_t)(char const *prompt) — return Choice_Invalid if no event
   2) New DRY provider: 6 tiny boolean checks via input_source_t (see below)
*/

enum choice_t {
    Choice_Invalid = 0,
    Choice_Left,
    Choice_Right,
    Choice_Up,
    Choice_Down,
    Choice_Select,
    Choice_Cancel
};

/* Legacy non-blocking callback; prompt is non-empty only right after a render. */
typedef choice_t (*input_fptr_t)(char const *prompt);

/* DRY provider vtable: optional capture() once per tick, then six edge-trigger checks. */
struct input_ops_t {
    void (*capture)(void *ctx);              /* optional; may be 0 */
    bool (*up)(void *ctx);
    bool (*down)(void *ctx);
    bool (*select)(void *ctx);
    bool (*cancel)(void *ctx);
    bool (*left)(void *ctx);
    bool (*right)(void *ctx);
};

struct input_source_t {
    void *ctx;
    input_ops_t const *ops;
};

/* ============================== Display API ============================== */
/* width or height of 0 means "unlimited" in that direction (e.g., Serial) */

typedef void (*display_clear_fptr_t)(void);
typedef void (*display_write_line_fptr_t)(uint8_t row, char const *text);
typedef void (*display_flush_fptr_t)(void);

struct display_t {
    uint8_t                     width;   /* 0 => unlimited */
    uint8_t                     height;  /* 0 => unlimited */
    display_clear_fptr_t        clear;
    display_write_line_fptr_t   write_line;
    display_flush_fptr_t        flush;
};

/* ------------------------ Built-in Serial adapter ------------------------ */
#ifdef ARDUINO
static inline void serial_display_clear(void) {
    Serial.println();
    Serial.println(F("────────────────────────────────"));
}
static inline void serial_display_write_line(uint8_t row, char const *text) {
    (void)row;
    Serial.println(text);
}
static inline void serial_display_flush(void) { }
static inline display_t make_serial_display(uint8_t width, uint8_t height) {
    display_t d;
    d.width      = width;   /* 0 => unlimited */
    d.height     = height;  /* 0 => unlimited */
    d.clear      = serial_display_clear;
    d.write_line = serial_display_write_line;
    d.flush      = serial_display_flush;
    return d;
}
#endif

/* ============================== Menu Entities ============================ */

enum entry_t : uint8_t { ENTRY_FUNC = 0, ENTRY_MENU = 1, ENTRY_INT = 2 };

/* INT item: edited in place, value pointer lives in RAM */
struct item_int_t { char const *label; int *ptr; int minv; int maxv; };

/* FUNC item: plain callback */
struct item_func_t { char const *label; void (*fn)(); };

/* Forward: inline menu type below */
template<typename... Items> struct menu_t;

/* MENU item: contains a child menu by value (inline) */
template<typename ChildMenu>
struct item_menu_t { char const *label; ChildMenu child; };

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

/* ================================= menu_t ================================= */

template<typename... Items>
struct menu_t {
    char const *title;
    typename pack<Items...>::type items;
    menu_t(char const *t, Items const &... its) : title(t), items(pack<Items...>::make(its...)) { }
    static inline uint8_t count() { return (uint8_t)sizeof...(Items); }
};

/* Factory + sugar */
template<typename... Items> static inline menu_t<Items...> menu_make(char const *title, Items const &... items) { return menu_t<Items...>(title, items...); }
#define MENU(title, /*items...*/...) (menu_make((title), __VA_ARGS__))
#define ITEM_INT(label, ptr, minv, maxv) item_int_t{ (label), (ptr), (minv), (maxv) }
#define ITEM_FUNC(label, fn)             item_func_t{ (label), (fn) }
#define ITEM_MENU(label, submenu_expr)   item_menu_t<decltype(submenu_expr)>{ (label), (submenu_expr) }

/* =========================== Runtime type erasure ======================== */

struct menu_ops_t {
    uint8_t      (*count)(void const *);
    char const * (*label_at)(void const *, uint8_t idx);
    entry_t      (*type_at)(void const *, uint8_t idx);
    bool         (*int_has)(void const *, uint8_t idx);
    int          (*int_get)(void const *, uint8_t idx);
    void         (*int_set)(void *,       uint8_t idx, int v);
    int          (*int_min)(void const *, uint8_t idx);
    int          (*int_max)(void const *, uint8_t idx);
    bool         (*child_at)(void *, uint8_t idx, void **out_child, menu_ops_t const **out_ops);
    void         (*call_func)(void *, uint8_t idx);
};

/* Item trait helpers */
static inline char const * item_label(item_int_t const &i)  { return i.label; }
static inline char const * item_label(item_func_t const &f) { return f.label; }
template<typename CM> static inline char const * item_label(item_menu_t<CM> const &m) { return m.label; }

static inline entry_t item_type(item_int_t const &)  { return ENTRY_INT; }
static inline entry_t item_type(item_func_t const &) { return ENTRY_FUNC; }
template<typename CM> static inline entry_t item_type(item_menu_t<CM> const &) { return ENTRY_MENU; }

static inline bool item_int_has(item_int_t const &)  { return true; }
static inline bool item_int_has(item_func_t const &) { return false; }
template<typename CM> static inline bool item_int_has(item_menu_t<CM> const &) { return false; }

static inline int  item_int_get(item_int_t const &i) { return *(i.ptr); }
static inline void item_int_set(item_int_t &i, int v) { *(i.ptr) = v; }
static inline int  item_int_min(item_int_t const &i) { return i.minv; }
static inline int  item_int_max(item_int_t const &i) { return i.maxv; }

static inline int  item_int_get(item_func_t const &) { return 0; }
static inline void item_int_set(item_func_t &, int) { }
static inline int  item_int_min(item_func_t const &) { return 0; }
static inline int  item_int_max(item_func_t const &) { return 0; }

template<typename CM> static inline int  item_int_get(item_menu_t<CM> const &) { return 0; }
template<typename CM> static inline void item_int_set(item_menu_t<CM> &, int)  { }
template<typename CM> static inline int  item_int_min(item_menu_t<CM> const &) { return 0; }
template<typename CM> static inline int  item_int_max(item_menu_t<CM> const &) { return 0; }

static inline void item_call(item_func_t &f) { if (f.fn) { f.fn(); } }
static inline void item_call(item_int_t &)   { }
template<typename CM> static inline void item_call(item_menu_t<CM> &) { }

/* Child discovery */
template<typename CM> static inline bool item_child(item_menu_t<CM> &m, void **out_child, menu_ops_t const **out_ops);
static inline bool item_child(item_int_t &,  void **, menu_ops_t const **) { return false; }
static inline bool item_child(item_func_t &, void **, menu_ops_t const **) { return false; }

/* pack walkers */
static inline char const * label_at_pack(pack_nil const &, uint8_t) { return ""; }
template<typename Head, typename Tail>
static inline char const * label_at_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_label(p.head) : label_at_pack(p.tail, (uint8_t)(idx-1)); }

static inline entry_t type_at_pack(pack_nil const &, uint8_t) { return ENTRY_FUNC; }
template<typename Head, typename Tail>
static inline entry_t type_at_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_type(p.head) : type_at_pack(p.tail, (uint8_t)(idx-1)); }

static inline bool int_has_pack(pack_nil const &, uint8_t) { return false; }
template<typename Head, typename Tail>
static inline bool int_has_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_int_has(p.head) : int_has_pack(p.tail, (uint8_t)(idx-1)); }

static inline int int_get_pack(pack_nil const &, uint8_t) { return 0; }
template<typename Head, typename Tail>
static inline int int_get_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_int_get(p.head) : int_get_pack(p.tail, (uint8_t)(idx-1)); }

static inline void int_set_pack(pack_nil &, uint8_t, int) { }
template<typename Head, typename Tail>
static inline void int_set_pack(pack_node<Head, Tail> &p, uint8_t idx, int v) { if (idx==0) { item_int_set(p.head, v); } else { int_set_pack(p.tail, (uint8_t)(idx-1), v); } }

static inline int int_min_pack(pack_nil const &, uint8_t) { return 0; }
template<typename Head, typename Tail>
static inline int int_min_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_int_min(p.head) : int_min_pack(p.tail, (uint8_t)(idx-1)); }

static inline int int_max_pack(pack_nil const &, uint8_t) { return 0; }
template<typename Head, typename Tail>
static inline int int_max_pack(pack_node<Head, Tail> const &p, uint8_t idx) { return (idx==0) ? item_int_max(p.head) : int_max_pack(p.tail, (uint8_t)(idx-1)); }

static inline void call_func_pack(pack_nil &, uint8_t) { }
template<typename Head, typename Tail>
static inline void call_func_pack(pack_node<Head, Tail> &p, uint8_t idx) { if (idx==0) { item_call(p.head); } else { call_func_pack(p.tail, (uint8_t)(idx-1)); } }

static inline bool child_at_pack(pack_nil &, uint8_t, void **, menu_ops_t const **) { return false; }
template<typename Head, typename Tail>
static inline bool child_at_pack(pack_node<Head, Tail> &p, uint8_t idx, void **out_child, menu_ops_t const **out_ops) { return (idx==0) ? item_child(p.head, out_child, out_ops) : child_at_pack(p.tail, (uint8_t)(idx-1), out_child, out_ops); }

/* ops_for<menu_t<...>> */
template<typename MenuConcrete> struct ops_for;
template<typename... Items>
struct ops_for<menu_t<Items...>> {
    typedef menu_t<Items...> M;
    static uint8_t    _count(void const *) { return (uint8_t)sizeof...(Items); }
    static char const * _label_at(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return label_at_pack(m.items, idx); }
    static entry_t    _type_at(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return type_at_pack(m.items, idx); }
    static bool       _int_has(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return int_has_pack(m.items, idx); }
    static int        _int_get(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return int_get_pack(m.items, idx); }
    static void       _int_set(void *mptr, uint8_t idx, int v){ M &m = *static_cast<M *>(mptr); return int_set_pack(m.items, idx, v); }
    static int        _int_min(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return int_min_pack(m.items, idx); }
    static int        _int_max(void const *mptr, uint8_t idx) { M const &m = *static_cast<M const *>(mptr); return int_max_pack(m.items, idx); }
    static bool       _child_at(void *mptr, uint8_t idx, void **out_child, menu_ops_t const **out_ops) { M &m = *static_cast<M *>(mptr); return child_at_pack(m.items, idx, out_child, out_ops); }
    static void       _call_func(void *mptr, uint8_t idx) { M &m = *static_cast<M *>(mptr); call_func_pack(m.items, idx); }
    static menu_ops_t const ops;
};
template<typename... Items>
menu_ops_t const ops_for<menu_t<Items...>>::ops = {
    &ops_for<menu_t<Items...>>::_count,
    &ops_for<menu_t<Items...>>::_label_at,
    &ops_for<menu_t<Items...>>::_type_at,
    &ops_for<menu_t<Items...>>::_int_has,
    &ops_for<menu_t<Items...>>::_int_get,
    &ops_for<menu_t<Items...>>::_int_set,
    &ops_for<menu_t<Items...>>::_int_min,
    &ops_for<menu_t<Items...>>::_int_max,
    &ops_for<menu_t<Items...>>::_child_at,
    &ops_for<menu_t<Items...>>::_call_func
};

template<typename CM>
static inline bool item_child(item_menu_t<CM> &m, void **out_child, menu_ops_t const **out_ops) {
    if (!out_child || !out_ops) { return false; }
    *out_child = static_cast<void *>(&m.child);
    *out_ops   = &ops_for<CM>::ops;
    return true;
}

/* ============================= Engine Runtime ============================ */

struct menu_cursor_t { void *menu_ptr; menu_ops_t const *ops; uint8_t selected; uint8_t top; };

struct menu_runtime_t {
    display_t         display;
    input_fptr_t      input_cb;        /* legacy optional */
    input_source_t    input_src;       /* provider optional */
    uint8_t           use_numbers : 1,
                      initialized : 1,
                      editing     : 1,
                      dirty       : 1,
                      has_src     : 1,
                      _pad        : 3;

    menu_cursor_t     stack[MENU_MAX_STACK];
    uint8_t           depth;
    int               edit_original;

    /* construct with legacy callback */
    template<typename RootMenu>
    static inline menu_runtime_t make(RootMenu &root, display_t const &disp, input_fptr_t inp, bool use_nums) {
        menu_runtime_t r = base_init(root, disp, use_nums);
        r.input_cb = inp;
        r.has_src  = 0;
        return r;
    }

    /* construct with provider */
    template<typename RootMenu>
    static inline menu_runtime_t make(RootMenu &root, display_t const &disp, input_source_t src, bool use_nums) {
        menu_runtime_t r = base_init(root, disp, use_nums);
        r.input_cb = 0;
        r.input_src = src;
        r.has_src  = 1;
        return r;
    }

    inline void begin(void) { initialized = 1; dirty = 1; }

    /* ---------- helpers ---------- */
    static inline menu_runtime_t base_init(void *root_ptr, menu_ops_t const *root_ops, display_t const &disp, bool use_nums) {
        menu_runtime_t r;
        r.display      = disp;
        r.input_cb     = 0;
        r.use_numbers  = use_nums ? 1 : 0;
        r.initialized  = 0;
        r.editing      = 0;
        r.dirty        = 1;
        r.has_src      = 0;
        r.depth        = 0;
        r.edit_original= 0;
        r.stack[0].menu_ptr = root_ptr;
        r.stack[0].ops      = root_ops;
        r.stack[0].selected = 0;
        r.stack[0].top      = 0;
        return r;
    }
    template<typename RootMenu>
    static inline menu_runtime_t base_init(RootMenu &root, display_t const &disp, bool use_nums) {
        return base_init(static_cast<void *>(&root), &ops_for<RootMenu>::ops, disp, use_nums);
    }

    static inline uint8_t min_u8(uint8_t a, uint8_t b) { return a < b ? a : b; }
    static inline uint8_t effective_height(display_t const &d, uint8_t count) { return (d.height == 0 ? count : d.height); }
    static inline uint8_t effective_width(display_t const &d) { return (d.width == 0 ? (uint8_t)MENU_MAX_LINE : d.width); }

    static inline char *int_to_str(int v, char *buf, uint8_t cap) {
        if (cap == 0) { return buf; }
        char tmp[12]; uint8_t i = 0; bool neg = v < 0; unsigned int uv = neg ? (unsigned int)(-v) : (unsigned int)v;
        do { tmp[i++] = (char)('0' + (uv % 10U)); uv /= 10U; } while (uv && i < sizeof(tmp));
        uint8_t pos = 0; if (neg && pos < cap - 1) { buf[pos++] = '-'; }
        while (i && pos < cap - 1) { buf[pos++] = tmp[--i]; } buf[pos] = '\0'; return buf;
    }
    static inline void append_capped(char *dst, uint8_t cap, char const *src) {
        uint8_t len = (uint8_t)strlen(dst); if (len >= cap) { if (cap) dst[cap - 1] = '\0'; return; }
        while (*src && len < cap - 1) { dst[len++] = *src++; } dst[len] = '\0';
    }

    void format_line(menu_cursor_t const &cur, uint8_t idx, char *out_buf) {
        uint8_t const cap = effective_width(display); out_buf[0] = '\0';
        append_capped(out_buf, cap, (idx == cur.selected) ? ">" : " ");
        if (use_numbers) { char nb[6]; append_capped(out_buf, cap, int_to_str((int)idx + 1, nb, sizeof(nb))); append_capped(out_buf, cap, " "); }
        char const *label = cur.ops->label_at(cur.menu_ptr, idx); if (label) { append_capped(out_buf, cap, label); }
        entry_t tp = cur.ops->type_at(cur.menu_ptr, idx);
        if (tp == ENTRY_INT && cur.ops->int_has(cur.menu_ptr, idx)) {
            append_capped(out_buf, cap, ": "); char nb[12]; append_capped(out_buf, cap, int_to_str(cur.ops->int_get(cur.menu_ptr, idx), nb, sizeof(nb)));
            if (editing && idx == cur.selected) { append_capped(out_buf, cap, "  (edit)"); }
        }
    }

    static inline void clamp_view(menu_cursor_t &c, uint8_t total, uint8_t height) {
        if (total == 0) { c.selected = c.top = 0; return; }
        if (c.selected >= total) { c.selected = (uint8_t)(total - 1); }
        uint8_t win = (height == 0 ? total : height); if (win == 0) { win = 1; }
        if ((uint8_t)(c.top + win) <= c.selected) { c.top = (uint8_t)(c.selected - (win - 1)); }
        if (c.selected < c.top) { c.top = c.selected; }
        if (c.top >= total) { c.top = (uint8_t)(total - 1); }
    }

    inline bool push(void *child_ptr, menu_ops_t const *child_ops) {
        if (depth + 1 >= MENU_MAX_STACK) { return false; }
        depth++; stack[depth].menu_ptr = child_ptr; stack[depth].ops = child_ops; stack[depth].selected = 0; stack[depth].top = 0; dirty = 1; return true;
    }
    inline bool pop(void) {
        if (depth == 0) { return false; }
        depth--; dirty = 1; return true;
    }

    void render(menu_cursor_t const &cur) {
        uint8_t const total = cur.ops->count(cur.menu_ptr);
        if (display.clear) { display.clear(); }
        uint8_t row = 0;
        uint8_t const visible = (display.height == 0) ? total : min_u8(display.height, total);
        for (uint8_t i = 0; i < visible; ++i) {
            uint8_t item_idx = (uint8_t)(cur.top + i); if (item_idx >= total) { break; }
            char line[MENU_MAX_LINE]; format_line(cur, item_idx, line);
            if (display.write_line) { display.write_line((uint8_t)(row + i), line); }
        }
        if (display.flush) { display.flush(); }
    }

    /* ============================ Non-Blocking ============================ */
    void service(void) {
        if (!initialized) { begin(); }
        menu_cursor_t &cur = stack[depth];
        uint8_t const total = cur.ops->count(cur.menu_ptr);
        clamp_view(cur, total, effective_height(display, total));

        bool just_rendered = false;
        if (dirty) { render(cur); dirty = 0; just_rendered = true; }

        choice_t choice = Choice_Invalid;

        if (input_cb) {
            char const *prompt = editing ? "U/D=adj  S=save  C=cancel"
                                         : "U/D=move  S=select  C=back";
            choice = input_cb(just_rendered ? prompt : "");
        } else if (has_src && input_src.ops) {
            if (input_src.ops->capture) { input_src.ops->capture(input_src.ctx); }
            if      (input_src.ops->up     && input_src.ops->up(input_src.ctx))       { choice = Choice_Up; }
            else if (input_src.ops->down   && input_src.ops->down(input_src.ctx))     { choice = Choice_Down; }
            else if (input_src.ops->select && input_src.ops->select(input_src.ctx))   { choice = Choice_Select; }
            else if (input_src.ops->cancel && input_src.ops->cancel(input_src.ctx))   { choice = Choice_Cancel; }
            else if (input_src.ops->left   && input_src.ops->left(input_src.ctx))     { choice = Choice_Left; }
            else if (input_src.ops->right  && input_src.ops->right(input_src.ctx))    { choice = Choice_Right; }
        }

        if (choice == Choice_Invalid) { return; }

        if (editing) {
            if (!cur.ops->int_has(cur.menu_ptr, cur.selected)) { editing = 0; dirty = 1; return; }
            int v  = cur.ops->int_get(cur.menu_ptr, cur.selected);
            int mn = cur.ops->int_min(cur.menu_ptr, cur.selected);
            int mx = cur.ops->int_max(cur.menu_ptr, cur.selected);
            switch (choice) {
                case Choice_Up:    if (v < mx) { cur.ops->int_set(cur.menu_ptr, cur.selected, v + 1); dirty = 1; } break;
                case Choice_Down:  if (v > mn) { cur.ops->int_set(cur.menu_ptr, cur.selected, v - 1); dirty = 1; } break;
                case Choice_Select: editing = 0; dirty = 1; break;
                case Choice_Cancel: cur.ops->int_set(cur.menu_ptr, cur.selected, edit_original); editing = 0; dirty = 1; break;
                default: break;
            }
            return;
        }

        switch (choice) {
            case Choice_Up:
                if (total) { uint8_t old = cur.selected; cur.selected = (cur.selected == 0) ? (uint8_t)(total - 1) : (uint8_t)(cur.selected - 1); if (cur.selected != old) { dirty = 1; } }
                break;
            case Choice_Down:
                if (total) { uint8_t old = cur.selected; cur.selected = (uint8_t)((cur.selected + 1) % total); if (cur.selected != old) { dirty = 1; } }
                break;
            case Choice_Select:
                if (total) {
                    switch (cur.ops->type_at(cur.menu_ptr, cur.selected)) {
                        case ENTRY_INT:
                            if (cur.ops->int_has(cur.menu_ptr, cur.selected)) { edit_original = cur.ops->int_get(cur.menu_ptr, cur.selected); editing = 1; dirty = 1; }
                            break;
                        case ENTRY_FUNC: cur.ops->call_func(cur.menu_ptr, cur.selected); dirty = 1; break;
                        case ENTRY_MENU: {
                            void *child_ptr = 0; menu_ops_t const *child_ops = 0;
                            if (cur.ops->child_at(cur.menu_ptr, cur.selected, &child_ptr, &child_ops)) { push(child_ptr, child_ops); }
                        } break;
                    }
                }
                break;
            case Choice_Cancel:
                pop();
                break;
            case Choice_Left:
            case Choice_Right:
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
struct serial_keys_ctx_t { uint8_t pending_bits; };
enum { SK_UP=1<<0, SK_DOWN=1<<1, SK_SELECT=1<<2, SK_CANCEL=1<<3, SK_LEFT=1<<4, SK_RIGHT=1<<5 };

static void serial_keys_capture(void *ctx) {
    serial_keys_ctx_t &c = *static_cast<serial_keys_ctx_t *>(ctx);
    /* read at most one useful char per tick to throttle */
    if (Serial.available() <= 0) { return; }
    int ch = Serial.read();
    if (ch == '\r' || ch == '\n') { return; }
    if (ch >= 'A' && ch <= 'Z') { ch = ch - 'A' + 'a'; }
    switch (ch) {
        case 'w': c.pending_bits |= SK_UP;     break;
        case 's': c.pending_bits |= SK_DOWN;   break;
        case 'e': c.pending_bits |= SK_SELECT; break;
        case 'q': c.pending_bits |= SK_CANCEL; break;
        case 'a': c.pending_bits |= SK_LEFT;   break;
        case 'd': c.pending_bits |= SK_RIGHT;  break;
        default: break;
    }
}
static bool sk_take(serial_keys_ctx_t &c, uint8_t bit) { if (c.pending_bits & bit) { c.pending_bits &= (uint8_t)~bit; return true; } return false; }
static bool sk_up(void *ctx)     { return sk_take(*static_cast<serial_keys_ctx_t *>(ctx), SK_UP); }
static bool sk_down(void *ctx)   { return sk_take(*static_cast<serial_keys_ctx_t *>(ctx), SK_DOWN); }
static bool sk_select(void *ctx) { return sk_take(*static_cast<serial_keys_ctx_t *>(ctx), SK_SELECT); }
static bool sk_cancel(void *ctx) { return sk_take(*static_cast<serial_keys_ctx_t *>(ctx), SK_CANCEL); }
static bool sk_left(void *ctx)   { return sk_take(*static_cast<serial_keys_ctx_t *>(ctx), SK_LEFT); }
static bool sk_right(void *ctx)  { return sk_take(*static_cast<serial_keys_ctx_t *>(ctx), SK_RIGHT); }

static input_ops_t const SERIAL_KEYS_OPS = {
    &serial_keys_capture, &sk_up, &sk_down, &sk_select, &sk_cancel, &sk_left, &sk_right
};

/* Returns a provider backed by the global Serial. Single instance ok. */
static inline input_source_t make_serial_keys_input(void) {
    static serial_keys_ctx_t ctx; ctx.pending_bits = 0;
    input_source_t s; s.ctx = &ctx; s.ops = &SERIAL_KEYS_OPS; return s;
}
#endif

/* ========================== Built-in Input: Buttons ====================== */
#ifdef ARDUINO
struct buttons_ctx_t {
    uint8_t  pins[6];
    uint8_t  active_low;     /* 1 if LOW = pressed */
    uint16_t debounce_ms;
    uint8_t  debounced[6];   /* raw debounced level: HIGH/LOW */
    uint8_t  last_raw[6];
    uint32_t last_change[6];
    uint8_t  edge_pressed[6];/* 1 on press edge since last capture() */
};

static void buttons_capture(void *ctx) {
    buttons_ctx_t &b = *static_cast<buttons_ctx_t *>(ctx);
    uint32_t now = millis();
    for (uint8_t i = 0; i < 6; ++i) {
        uint8_t raw = (uint8_t)digitalRead(b.pins[i]);
        if (raw != b.last_raw[i]) {
            b.last_change[i] = now;
            b.last_raw[i] = raw;
        }
        if ((uint32_t)(now - b.last_change[i]) >= b.debounce_ms) {
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
static bool btn_take(buttons_ctx_t &b, uint8_t idx) { if (b.edge_pressed[idx]) { b.edge_pressed[idx] = 0; return true; } return false; }
static bool b_up(void *ctx)     { return btn_take(*static_cast<buttons_ctx_t *>(ctx), 0); }
static bool b_down(void *ctx)   { return btn_take(*static_cast<buttons_ctx_t *>(ctx), 1); }
static bool b_select(void *ctx) { return btn_take(*static_cast<buttons_ctx_t *>(ctx), 2); }
static bool b_cancel(void *ctx) { return btn_take(*static_cast<buttons_ctx_t *>(ctx), 3); }
static bool b_left(void *ctx)   { return btn_take(*static_cast<buttons_ctx_t *>(ctx), 4); }
static bool b_right(void *ctx)  { return btn_take(*static_cast<buttons_ctx_t *>(ctx), 5); }

static input_ops_t const BUTTONS_OPS = {
    &buttons_capture, &b_up, &b_down, &b_select, &b_cancel, &b_left, &b_right
};

/* Create a GPIO buttons provider. Order: up, down, select, cancel, left, right. */
static inline input_source_t make_buttons_input(uint8_t up, uint8_t down, uint8_t select, uint8_t cancel, uint8_t left, uint8_t right,
                                                bool active_low, uint16_t debounce_ms) {
    static buttons_ctx_t ctx;
    ctx.pins[0]=up; ctx.pins[1]=down; ctx.pins[2]=select; ctx.pins[3]=cancel; ctx.pins[4]=left; ctx.pins[5]=right;
    ctx.active_low = active_low ? 1 : 0;
    ctx.debounce_ms = debounce_ms;
    for (uint8_t i=0;i<6;++i) {
        pinMode(ctx.pins[i], active_low ? INPUT_PULLUP : INPUT);
        ctx.debounced[i] = (uint8_t)digitalRead(ctx.pins[i]);
        ctx.last_raw[i]  = ctx.debounced[i];
        ctx.last_change[i] = millis();
        ctx.edge_pressed[i] = 0;
    }
    input_source_t s; s.ctx = &ctx; s.ops = &BUTTONS_OPS; return s;
}
#endif

#endif /* BETTER_MENU_H */
