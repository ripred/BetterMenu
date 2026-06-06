#include "../BetterMenu.h"

#include <assert.h>
#include <limits.h>
#include <stdio.h>
#include <string.h>

template<typename T, unsigned N>
static unsigned array_count(T const (&)[N]) {
    return N;
}

static unsigned g_action_count;

struct test_display_ctx_t {
    char lines[8][128];
    menu_render_line_t render_lines[8];
    unsigned clear_count;
    unsigned write_count;
    unsigned render_count;
};

static test_display_ctx_t g_display_ctx;

static void test_clear(void *ctx) {
    test_display_ctx_t &d = *static_cast<test_display_ctx_t *>(ctx);
    ++d.clear_count;
    for (unsigned row = 0; row < 8; ++row) {
        d.lines[row][0] = '\0';
    }
}

static void test_write_line(void *ctx, uint8_t row, char const *text) {
    test_display_ctx_t &d = *static_cast<test_display_ctx_t *>(ctx);
    ++d.write_count;
    if (row >= 8) {
        return;
    }
    strncpy(d.lines[row], text ? text : "", sizeof(d.lines[row]) - 1);
    d.lines[row][sizeof(d.lines[row]) - 1] = '\0';
}

static void test_render_line(void *ctx, menu_render_line_t const *line) {
    test_display_ctx_t &d = *static_cast<test_display_ctx_t *>(ctx);
    ++d.render_count;
    if (!line || line->row >= 8) {
        return;
    }
    d.render_lines[line->row] = *line;
    test_write_line(ctx, line->row, line->text);
}

static void test_flush(void *) {
}

static display_ops_t const TEST_DISPLAY_OPS = {
    &test_clear, &test_write_line, &test_flush, 0
};

static display_ops_t const RICH_TEST_DISPLAY_OPS = {
    &test_clear, &test_write_line, &test_flush, &test_render_line
};

static display_ops_t const NO_CLEAR_DISPLAY_OPS = {
    0, &test_write_line, &test_flush, 0
};

static display_t test_display(uint8_t width, uint8_t height) {
    g_display_ctx.clear_count = 0;
    g_display_ctx.write_count = 0;
    g_display_ctx.render_count = 0;
    for (unsigned row = 0; row < 8; ++row) {
        g_display_ctx.lines[row][0] = '\0';
        g_display_ctx.render_lines[row] = menu_render_line_t();
    }
    return make_display(width, height, &g_display_ctx, &TEST_DISPLAY_OPS);
}

static display_t rich_test_display(uint8_t width, uint8_t height) {
    g_display_ctx.clear_count = 0;
    g_display_ctx.write_count = 0;
    g_display_ctx.render_count = 0;
    for (unsigned row = 0; row < 8; ++row) {
        g_display_ctx.lines[row][0] = '\0';
        g_display_ctx.render_lines[row] = menu_render_line_t();
    }
    return make_display(width, height, &g_display_ctx, &RICH_TEST_DISPLAY_OPS);
}

static display_t no_clear_test_display(uint8_t width, uint8_t height) {
    g_display_ctx.clear_count = 0;
    g_display_ctx.write_count = 0;
    g_display_ctx.render_count = 0;
    for (unsigned row = 0; row < 8; ++row) {
        g_display_ctx.lines[row][0] = '\0';
        g_display_ctx.render_lines[row] = menu_render_line_t();
    }
    return make_display(width, height, &g_display_ctx, &NO_CLEAR_DISPLAY_OPS);
}

struct script_ctx_t {
    choice_t const *choices;
    unsigned count;
    unsigned pos;
    choice_t current;
};

struct event_script_ctx_t {
    menu_event_t const *events;
    unsigned count;
    unsigned pos;
};

static void script_capture(void *ctx) {
    script_ctx_t &s = *static_cast<script_ctx_t *>(ctx);
    s.current = (s.pos < s.count) ? s.choices[s.pos++] : Choice_Invalid;
}

static bool script_take(script_ctx_t &s, choice_t choice) {
    if (s.current == choice) {
        s.current = Choice_Invalid;
        return true;
    }
    return false;
}

static bool script_up(void *ctx) { return script_take(*static_cast<script_ctx_t *>(ctx), Choice_Up); }
static bool script_down(void *ctx) { return script_take(*static_cast<script_ctx_t *>(ctx), Choice_Down); }
static bool script_select(void *ctx) { return script_take(*static_cast<script_ctx_t *>(ctx), Choice_Select); }
static bool script_cancel(void *ctx) { return script_take(*static_cast<script_ctx_t *>(ctx), Choice_Cancel); }
static bool script_left(void *ctx) { return script_take(*static_cast<script_ctx_t *>(ctx), Choice_Left); }
static bool script_right(void *ctx) { return script_take(*static_cast<script_ctx_t *>(ctx), Choice_Right); }

static input_ops_t const SCRIPT_OPS = {
    &script_capture,
    &script_up,
    &script_down,
    &script_select,
    &script_cancel,
    &script_left,
    &script_right,
    0,
    0
};

static input_source_t script_input(script_ctx_t &ctx) {
    input_source_t src;
    src.ctx = &ctx;
    src.ops = &SCRIPT_OPS;
    return src;
}

static menu_event_t read_event_script(void *ctx) {
    event_script_ctx_t &s = *static_cast<event_script_ctx_t *>(ctx);
    return (s.pos < s.count) ? s.events[s.pos++] : menu_event(Choice_Invalid);
}

static void run_until_idle(menu_runtime_t &runtime, script_ctx_t const &script) {
    unsigned guard = 0;
    while (script.pos < script.count || runtime.dirty) {
        runtime.service();
        ++guard;
        assert(guard < 64);
    }
}

static void test_action() {
    ++g_action_count;
}

struct action_ctx_t {
    int *value;
    unsigned called;
};

static void test_action_with_context(void *ctx) {
    action_ctx_t *action = static_cast<action_ctx_t *>(ctx);
    if (!action) {
        return;
    }
    ++action->called;
    if (action->value) {
        ++(*action->value);
    }
}

static choice_t read_script_event(void *ctx) {
    script_ctx_t &s = *static_cast<script_ctx_t *>(ctx);
    return (s.pos < s.count) ? s.choices[s.pos++] : Choice_Invalid;
}

static char g_legacy_lines[4][128];
static unsigned g_legacy_write_count;
static unsigned g_legacy_prompt_count;
static choice_t const *g_legacy_choices;
static unsigned g_legacy_choice_count;
static unsigned g_legacy_choice_pos;

static void legacy_clear() {
    for (unsigned row = 0; row < 4; ++row) {
        g_legacy_lines[row][0] = '\0';
    }
}

static void legacy_write_line(uint8_t row, char const *text) {
    ++g_legacy_write_count;
    if (row >= 4) {
        return;
    }
    strncpy(g_legacy_lines[row], text ? text : "", sizeof(g_legacy_lines[row]) - 1);
    g_legacy_lines[row][sizeof(g_legacy_lines[row]) - 1] = '\0';
}

static void legacy_flush() {
}

static choice_t legacy_input(char const *prompt) {
    if (prompt && prompt[0]) {
        ++g_legacy_prompt_count;
    }
    return (g_legacy_choice_pos < g_legacy_choice_count) ? g_legacy_choices[g_legacy_choice_pos++] : Choice_Invalid;
}

static void reset_legacy_io(choice_t const *choices, unsigned count) {
    g_legacy_write_count = 0;
    g_legacy_prompt_count = 0;
    g_legacy_choices = choices;
    g_legacy_choice_count = count;
    g_legacy_choice_pos = 0;
    legacy_clear();
}

static void run_legacy_until_idle(menu_runtime_t &runtime) {
    unsigned guard = 0;
    while (g_legacy_choice_pos < g_legacy_choice_count || runtime.dirty) {
        runtime.service();
        ++guard;
        assert(guard < 64);
    }
}

static int test_single_declaration_navigation() {
    int volume = 5;
    int brightness = 50;
    int speed = 3;
    g_action_count = 0;

    auto root_menu =
        MENU("Main",
            ITEM_INT("Volume", &volume, 0, 10),
            ITEM_MENU("Settings",
                MENU("Settings",
                    ITEM_INT("Brightness", &brightness, 0, 100),
                    ITEM_MENU("Advanced",
                        MENU("Advanced",
                            ITEM_INT("Speed", &speed, 1, 5),
                            ITEM_FUNC("Run Action", test_action)
                        )
                    )
                )
            )
        );

    choice_t const choices[] = {
        Choice_Down,
        Choice_Right,
        Choice_Down,
        Choice_Right,
        Choice_Select,
        Choice_Right,
        Choice_Select,
        Choice_Down,
        Choice_Select,
        Choice_Left,
        Choice_Left
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(40, 4), script_input(script), true);

    run_until_idle(runtime, script);

#if MENU_MAX_STACK > 2
    assert(speed == 4);
    assert(g_action_count == 1);
#else
    assert(speed == 3);
    assert(g_action_count == 0);
#endif
    assert(runtime.depth == 0);
    return 0;
}

static int test_legacy_callbacks_still_work() {
    int value = 1;
    auto root_menu =
        MENU("Legacy",
            ITEM_INT("Value", &value, 0, 5)
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Up,
        Choice_Select
    };
    reset_legacy_io(choices, array_count(choices));

    display_t display = make_callback_display(32, 2, &legacy_clear, &legacy_write_line, &legacy_flush);
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, display, &legacy_input, false);

    run_legacy_until_idle(runtime);

    assert(value == 2);
    assert(g_legacy_write_count > 0);
    assert(g_legacy_prompt_count > 0);
    assert(strcmp(g_legacy_lines[0], ">Value: 2") == 0);
    return 0;
}

static int test_manual_legacy_display_initialization_is_safe() {
    int value = 1;
    auto root_menu =
        MENU("ManualLegacy",
            ITEM_INT("Value", &value, 0, 5)
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Up,
        Choice_Select
    };
    reset_legacy_io(choices, array_count(choices));

    display_t display;
    display.width = 32;
    display.height = 2;
    display.clear = &legacy_clear;
    display.write_line = &legacy_write_line;
    display.flush = &legacy_flush;
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, display, &legacy_input, false);

    run_legacy_until_idle(runtime);

    assert(value == 2);
    assert(g_legacy_write_count > 0);
    assert(strcmp(g_legacy_lines[0], ">Value: 2") == 0);

    display_t braced_display = { 32, 2, &legacy_clear, &legacy_write_line, &legacy_flush };
    assert(braced_display.ops == 0);
    assert(braced_display.clear == &legacy_clear);
    return 0;
}

static int test_null_int_item_is_safe() {
    int ok = 1;
    auto root_menu =
        MENU("Null",
            ITEM_INT("Unset", static_cast<int *>(0), 0, 10),
            ITEM_INT("OK", &ok, 0, 10)
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Down,
        Choice_Select,
        Choice_Up,
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(ok == 2);
    return 0;
}

static int test_empty_menu_is_valid() {
    auto root_menu = MENU("Empty");
    choice_t const choices[] = {
        Choice_Select,
        Choice_Cancel
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(runtime.depth == 0);
    assert(g_display_ctx.write_count == 2);
    assert(strcmp(g_display_ctx.lines[0], "") == 0);
    assert(strcmp(g_display_ctx.lines[1], "") == 0);
    return 0;
}

static int test_inverted_int_range_is_normalized_for_editing() {
    int value = 5;
    auto root_menu =
        MENU("Range",
            ITEM_INT("Value", &value, 10, 0)
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Up,
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(value == 6);
    return 0;
}

static int test_editing_clamps_out_of_range_value_on_save() {
    int value = 42;
    auto root_menu =
        MENU("Clamp",
            ITEM_INT("Value", &value, 0, 10)
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Up,
        Choice_Select,
        Choice_Down,
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(value == 10);
    return 0;
}

static int test_cancel_restores_out_of_range_original() {
    int value = 42;
    auto root_menu =
        MENU("Clamp",
            ITEM_INT("Value", &value, 0, 10)
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Cancel
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(value == 42);
    return 0;
}

static int test_display_width_is_capped_to_line_buffer() {
    int value = 7;
    auto root_menu =
        MENU("Wide",
            ITEM_INT("This label is intentionally long enough to exercise render buffer bounds", &value, 0, 10)
        );

    choice_t const choices[] = { Choice_Invalid };
    script_ctx_t script = { choices, 0, 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(120, 1), script_input(script), true);
    runtime.service();

    assert(g_display_ctx.clear_count > 0);
    assert(strlen(g_display_ctx.lines[0]) < MENU_MAX_LINE);
    return 0;
}

static int test_request_redraw_updates_external_value_change() {
    int value = 1;
    auto root_menu =
        MENU("External",
            ITEM_INT("Value", &value, 0, 10)
        );

    choice_t const choices[] = { Choice_Invalid };
    script_ctx_t script = { choices, 0, 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    runtime.service();

    assert(runtime.dirty == 0);
    assert(strcmp(g_display_ctx.lines[0], ">Value: 1") == 0);

    value = 7;
    runtime.request_redraw();

    assert(runtime.dirty == 1);

    runtime.service();

    assert(runtime.dirty == 0);
    assert(strcmp(g_display_ctx.lines[0], ">Value: 7") == 0);
    return 0;
}

static int test_fixed_height_render_blanks_unused_rows_without_clear() {
    auto full_menu =
        MENU("Full",
            ITEM_FUNC("One", test_action),
            ITEM_FUNC("Two", test_action)
        );
    auto empty_menu = MENU("Empty");

    choice_t const choices[] = { Choice_Invalid };
    script_ctx_t script = { choices, 0, 0, Choice_Invalid };
    display_t display = no_clear_test_display(32, 2);
    menu_runtime_t full_runtime = menu_runtime_t::make(full_menu, display, script_input(script), false);

    full_runtime.service();

    assert(g_display_ctx.clear_count == 0);
    assert(g_display_ctx.write_count == 2);
    assert(strcmp(g_display_ctx.lines[0], ">One") == 0);
    assert(strcmp(g_display_ctx.lines[1], " Two") == 0);

    menu_runtime_t empty_runtime = menu_runtime_t::make(empty_menu, display, script_input(script), false);
    empty_runtime.service();

    assert(g_display_ctx.clear_count == 0);
    assert(g_display_ctx.write_count == 4);
    assert(strcmp(g_display_ctx.lines[0], "") == 0);
    assert(strcmp(g_display_ctx.lines[1], "") == 0);
    return 0;
}

static int test_int_min_formats_safely() {
    char buf[16];
    menu_runtime_t::int_to_str(INT_MIN, buf, sizeof(buf));
    assert(buf[0] == '-');
    assert(strlen(buf) > 1);
    return 0;
}

static int test_clamp_view_uses_non_wrapping_window_math() {
    menu_cursor_t cursor = { 0, 0, 249, 240 };
    menu_runtime_t::clamp_view(cursor, 250, 20);
    assert(cursor.selected == 249);
    assert(cursor.top == 230);

    cursor.selected = 8;
    cursor.top = 7;
    menu_runtime_t::clamp_view(cursor, 10, 4);
    assert(cursor.selected == 8);
    assert(cursor.top == 6);

    cursor.selected = 3;
    cursor.top = 3;
    menu_runtime_t::clamp_view(cursor, 10, 20);
    assert(cursor.selected == 3);
    assert(cursor.top == 0);
    return 0;
}

static uint8_t fake_count(void const *) { return 250; }
static menu_text_t fake_label_at(void const *, uint8_t) { return menu_text("Item"); }
static entry_t fake_type_at(void const *, uint8_t) { return ENTRY_FUNC; }
static bool fake_int_has(void const *, uint8_t) { return false; }
static bool fake_scalar_has(void const *, uint8_t) { return false; }
static int fake_int_get(void const *, uint8_t) { return 0; }
static void fake_int_set(void const *, uint8_t, int) { }
static int fake_int_min(void const *, uint8_t) { return 0; }
static int fake_int_max(void const *, uint8_t) { return 0; }
static int fake_int_step(void const *, uint8_t) { return 1; }
static bool fake_child_at(void const *, uint8_t, void const **, menu_ops_t const **) { return false; }
static void fake_call_func(void const *, uint8_t) { }
static menu_text_t fake_title(void const *) { return menu_text("Fake"); }

static menu_ops_t const FAKE_LARGE_MENU_OPS = {
    &fake_count,
    &fake_label_at,
    &fake_type_at,
    &fake_int_has,
    &fake_scalar_has,
    &fake_int_get,
    &fake_int_set,
    &fake_int_min,
    &fake_int_max,
    &fake_int_step,
    &fake_child_at,
    &fake_call_func,
    &fake_title,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
};

static int test_render_stops_before_item_index_wraparound() {
    int fake_menu = 0;
    menu_runtime_t runtime = menu_runtime_t::base_init(&fake_menu, &FAKE_LARGE_MENU_OPS, test_display(32, 20), true);
    runtime.stack[0].selected = 249;
    runtime.stack[0].top = 240;

    runtime.render(runtime.stack[0]);

    assert(g_display_ctx.write_count == 20);
    return 0;
}

static int test_navigation_clamps_by_default() {
    auto root_menu =
        MENU("Navigation",
            ITEM_FUNC("One", test_action),
            ITEM_FUNC("Two", test_action),
            ITEM_FUNC("Three", test_action)
        );

    choice_t const choices[] = {
        Choice_Up,
        Choice_Down,
        Choice_Down,
        Choice_Down
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 3), script_input(script), false);

    run_until_idle(runtime, script);

    assert(runtime.navigation_wrap == 0);
    assert(runtime.stack[0].selected == 2);
    assert(strcmp(g_display_ctx.lines[2], ">Three") == 0);
    return 0;
}

static int test_navigation_wraps_when_enabled() {
    auto root_menu =
        MENU("Navigation",
            ITEM_FUNC("One", test_action),
            ITEM_FUNC("Two", test_action),
            ITEM_FUNC("Three", test_action)
        );

    choice_t const choices[] = {
        Choice_Up
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 3), script_input(script), false);
    runtime.set_navigation_mode(MENU_NAV_WRAP);

    run_until_idle(runtime, script);

    assert(runtime.navigation_wrap == 1);
    assert(runtime.stack[0].selected == 2);
    assert(strcmp(g_display_ctx.lines[2], ">Three") == 0);
    return 0;
}

static int test_service_clamps_large_menu_to_full_window() {
    int fake_menu = 0;
    menu_runtime_t runtime = menu_runtime_t::base_init(&fake_menu, &FAKE_LARGE_MENU_OPS, test_display(32, 20), true);
    runtime.stack[0].selected = 249;
    runtime.stack[0].top = 240;

    runtime.service();

    assert(runtime.stack[0].top == 230);
    assert(g_display_ctx.write_count == 20);
    return 0;
}

static uint8_t max_count(void const *) { return 255; }

static menu_ops_t const FAKE_MAX_MENU_OPS = {
    &max_count,
    &fake_label_at,
    &fake_type_at,
    &fake_int_has,
    &fake_scalar_has,
    &fake_int_get,
    &fake_int_set,
    &fake_int_min,
    &fake_int_max,
    &fake_int_step,
    &fake_child_at,
    &fake_call_func,
    &fake_title,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
};

static int test_render_handles_maximum_menu_count() {
    int fake_menu = 0;
    menu_runtime_t runtime = menu_runtime_t::base_init(&fake_menu, &FAKE_MAX_MENU_OPS, test_display(32, 0), true);
    runtime.stack[0].selected = 254;
    runtime.stack[0].top = 0;

    runtime.render(runtime.stack[0]);

    assert(g_display_ctx.write_count == 255);
    return 0;
}

static int g_fake_selected_value;
static uint8_t max_value_count(void const *) { return 1; }
static menu_text_t max_value_label_at(void const *, uint8_t) { return menu_text("Max Select"); }
static entry_t max_value_type_at(void const *, uint8_t) { return ENTRY_SELECT; }
static uint8_t max_value_value_count(void const *, uint8_t) { return 255; }
static menu_text_t max_value_value_label_at(void const *, uint8_t, uint8_t value_idx) {
    return value_idx == 254 ? menu_text("Last") : menu_text("Choice");
}
static uint8_t max_value_selected(void const *, uint8_t) { return static_cast<uint8_t>(g_fake_selected_value); }
static void max_value_select(void const *, uint8_t, uint8_t value_idx) { g_fake_selected_value = value_idx; }

static menu_ops_t const FAKE_MAX_VALUE_MENU_OPS = {
    &max_value_count,
    &max_value_label_at,
    &max_value_type_at,
    &fake_int_has,
    &fake_scalar_has,
    &fake_int_get,
    &fake_int_set,
    &fake_int_min,
    &fake_int_max,
    &fake_int_step,
    &fake_child_at,
    &fake_call_func,
    &fake_title,
    &max_value_value_count,
    &max_value_value_label_at,
    &max_value_selected,
    &max_value_select,
    0,
    0,
    0,
    0
};

static int test_select_wraps_at_maximum_value_count() {
    int fake_menu = 0;
    g_fake_selected_value = 254;
    choice_t const choices[] = {
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::base_init(&fake_menu, &FAKE_MAX_VALUE_MENU_OPS, test_display(32, 2), false);
    runtime.input_src = script_input(script);
    runtime.has_src = 1;

    run_until_idle(runtime, script);

    assert(g_fake_selected_value == 0);
    assert(strcmp(g_display_ctx.lines[0], ">Max Select: Choice") == 0);
    return 0;
}

static uint8_t partial_count(void const *) { return 1; }

static menu_ops_t const PARTIAL_MENU_OPS = {
    &partial_count,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0
};

static unsigned g_trap_count_calls;
static uint8_t trap_count(void const *) {
    ++g_trap_count_calls;
    return 1;
}

static menu_ops_t const TRAP_MENU_OPS = {
    &trap_count,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0
};

static uint8_t null_child_count(void const *) { return 1; }
static menu_text_t null_child_label_at(void const *, uint8_t) { return menu_text("Broken Child"); }
static entry_t null_child_type_at(void const *, uint8_t) { return ENTRY_MENU; }
static bool null_child_at(void const *, uint8_t, void const **out_child, menu_ops_t const **out_ops) {
    *out_child = 0;
    *out_ops = &TRAP_MENU_OPS;
    return true;
}

static menu_ops_t const NULL_CHILD_MENU_OPS = {
    &null_child_count,
    &null_child_label_at,
    &null_child_type_at,
    0, 0, 0, 0, 0, 0, 0,
    &null_child_at,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0
};

static int test_null_and_partial_menu_ops_are_safe() {
    menu_runtime_t null_runtime = menu_runtime_t::base_init(static_cast<void const *>(0), static_cast<menu_ops_t const *>(0), test_display(32, 2), true);
    null_runtime.service();
    assert(g_display_ctx.clear_count == 1);
    assert(g_display_ctx.write_count == 2);
    assert(strcmp(g_display_ctx.lines[0], "") == 0);
    assert(strcmp(g_display_ctx.lines[1], "") == 0);

    int fake_menu = 0;
    menu_runtime_t partial_runtime = menu_runtime_t::base_init(&fake_menu, &PARTIAL_MENU_OPS, test_display(32, 2), true);
    partial_runtime.service();
    partial_runtime.service();
    assert(g_display_ctx.clear_count == 1);
    assert(g_display_ctx.write_count == 2);
    assert(strcmp(g_display_ctx.lines[0], ">1 ") == 0);
    assert(strcmp(g_display_ctx.lines[1], "") == 0);
    return 0;
}

static int test_null_menu_pointer_with_ops_is_inert() {
    g_trap_count_calls = 0;
    menu_runtime_t runtime = menu_runtime_t::base_init(static_cast<void const *>(0), &TRAP_MENU_OPS, test_display(32, 2), true);

    runtime.service();

    assert(g_trap_count_calls == 0);
    assert(g_display_ctx.clear_count == 1);
    assert(g_display_ctx.write_count == 2);
    assert(strcmp(g_display_ctx.lines[0], "") == 0);
    assert(strcmp(g_display_ctx.lines[1], "") == 0);
    return 0;
}

static int test_null_child_pointer_does_not_push() {
    int fake_menu = 0;
    g_trap_count_calls = 0;
    choice_t const choices[] = {
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::base_init(&fake_menu, &NULL_CHILD_MENU_OPS, test_display(32, 2), false);
    runtime.input_src = script_input(script);
    runtime.has_src = 1;

    run_until_idle(runtime, script);

    assert(runtime.depth == 0);
    assert(g_trap_count_calls == 0);
    assert(strcmp(g_display_ctx.lines[0], ">Broken Child") == 0);
    return 0;
}

static int test_context_event_input_provider() {
    int value = 2;
    auto root_menu =
        MENU("Event",
            ITEM_INT("Value", &value, 0, 5)
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Right,
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    input_event_ctx_t event_input;
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), make_event_input(event_input, &script, read_script_event), false);

    run_until_idle(runtime, script);

    assert(value == 3);
    return 0;
}

static input_ops_t const EMPTY_INPUT_OPS = {
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
};

static int test_empty_and_null_input_sources_are_inert() {
    int value = 2;
    auto root_menu =
        MENU("Input",
            ITEM_INT("Value", &value, 0, 5)
        );

    input_event_ctx_t event_input;
    menu_runtime_t event_runtime = menu_runtime_t::make(root_menu, test_display(32, 2), make_event_input(event_input, 0, 0), false);
    event_runtime.service();
    event_runtime.service();
    assert(value == 2);
    assert(strcmp(g_display_ctx.lines[0], ">Value: 2") == 0);

    menu_runtime_t empty_ops_runtime = menu_runtime_t::make(root_menu, test_display(32, 2), make_input_source(0, &EMPTY_INPUT_OPS), false);
    empty_ops_runtime.service();
    empty_ops_runtime.service();
    assert(value == 2);
    assert(strcmp(g_display_ctx.lines[0], ">Value: 2") == 0);

    menu_runtime_t null_ops_runtime = menu_runtime_t::make(root_menu, test_display(32, 2), make_input_source(0, 0), false);
    null_ops_runtime.service();
    null_ops_runtime.service();
    assert(value == 2);
    assert(strcmp(g_display_ctx.lines[0], ">Value: 2") == 0);
    return 0;
}

static int test_public_adapter_construction_is_stable() {
    script_ctx_t script = { 0, 0, 0, Choice_Invalid };

    input_source_t default_input;
    assert(default_input.ctx == 0);
    assert(default_input.ops == 0);

    input_source_t constructed_input(&script, &SCRIPT_OPS);
    assert(constructed_input.ctx == &script);
    assert(constructed_input.ops == &SCRIPT_OPS);

    input_source_t braced_input = { &script, &SCRIPT_OPS };
    assert(braced_input.ctx == &script);
    assert(braced_input.ops == &SCRIPT_OPS);

    input_source_t helper_input = make_input_source(&script, &SCRIPT_OPS);
    assert(helper_input.ctx == &script);
    assert(helper_input.ops == &SCRIPT_OPS);

    display_t default_display;
    assert(default_display.width == 0);
    assert(default_display.height == 0);
    assert(default_display.clear == 0);
    assert(default_display.write_line == 0);
    assert(default_display.flush == 0);
    assert(default_display.ctx == 0);
    assert(default_display.ops == 0);

    display_t callback_display = { 16, 2, &legacy_clear, &legacy_write_line, &legacy_flush };
    assert(callback_display.width == 16);
    assert(callback_display.height == 2);
    assert(callback_display.clear == &legacy_clear);
    assert(callback_display.write_line == &legacy_write_line);
    assert(callback_display.flush == &legacy_flush);
    assert(callback_display.ctx == 0);
    assert(callback_display.ops == 0);

    display_t context_display = { 16, 2, &g_display_ctx, &TEST_DISPLAY_OPS };
    assert(context_display.width == 16);
    assert(context_display.height == 2);
    assert(context_display.clear == 0);
    assert(context_display.write_line == 0);
    assert(context_display.flush == 0);
    assert(context_display.ctx == &g_display_ctx);
    assert(context_display.ops == &TEST_DISPLAY_OPS);

    display_t full_display = { 16, 2, &legacy_clear, &legacy_write_line, &legacy_flush, &g_display_ctx, &TEST_DISPLAY_OPS };
    assert(full_display.width == 16);
    assert(full_display.height == 2);
    assert(full_display.clear == &legacy_clear);
    assert(full_display.write_line == &legacy_write_line);
    assert(full_display.flush == &legacy_flush);
    assert(full_display.ctx == &g_display_ctx);
    assert(full_display.ops == &TEST_DISPLAY_OPS);

    display_t helper_display = make_display(20, 4, &g_display_ctx, &TEST_DISPLAY_OPS);
    assert(helper_display.width == 20);
    assert(helper_display.height == 4);
    assert(helper_display.ctx == &g_display_ctx);
    assert(helper_display.ops == &TEST_DISPLAY_OPS);

    display_t helper_callback_display = make_callback_display(20, 4, &legacy_clear, &legacy_write_line, &legacy_flush);
    assert(helper_callback_display.width == 20);
    assert(helper_callback_display.height == 4);
    assert(helper_callback_display.clear == &legacy_clear);
    assert(helper_callback_display.write_line == &legacy_write_line);
    assert(helper_callback_display.flush == &legacy_flush);
    assert(helper_callback_display.ctx == 0);
    assert(helper_callback_display.ops == 0);
    return 0;
}

static display_ops_t const PARTIAL_DISPLAY_OPS = {
    &test_clear,
    0,
    0,
    0
};

static int test_partial_display_ops_fall_back_to_legacy_callbacks() {
    int value = 3;
    auto root_menu =
        MENU("Display",
            ITEM_INT("Value", &value, 0, 5)
        );

    choice_t const no_choices[] = { Choice_Invalid };
    script_ctx_t script = { no_choices, 0, 0, Choice_Invalid };

    reset_legacy_io(no_choices, 0);
    g_display_ctx.clear_count = 0;
    g_display_ctx.write_count = 0;
    for (unsigned row = 0; row < 8; ++row) {
        g_display_ctx.lines[row][0] = '\0';
    }

    display_t display = { 32, 2, &legacy_clear, &legacy_write_line, &legacy_flush, &g_display_ctx, &PARTIAL_DISPLAY_OPS };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, display, script_input(script), false);

    runtime.service();

    assert(g_display_ctx.clear_count == 1);
    assert(g_display_ctx.write_count == 0);
    assert(g_legacy_write_count == 2);
    assert(strcmp(g_legacy_lines[0], ">Value: 3") == 0);
    assert(strcmp(g_legacy_lines[1], "") == 0);
    return 0;
}

static uint8_t self_child_count(void const *) { return 1; }
static menu_text_t self_child_label_at(void const *, uint8_t) { return menu_text("Loop"); }
static entry_t self_child_type_at(void const *, uint8_t) { return ENTRY_MENU; }
static bool self_child_at(void const *menu_ptr, uint8_t, void const **out_child, menu_ops_t const **out_ops);

static menu_ops_t const SELF_CHILD_MENU_OPS = {
    &self_child_count,
    &self_child_label_at,
    &self_child_type_at,
    0, 0, 0, 0, 0, 0, 0,
    &self_child_at,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0
};

static bool self_child_at(void const *menu_ptr, uint8_t, void const **out_child, menu_ops_t const **out_ops) {
    *out_child = menu_ptr;
    *out_ops = &SELF_CHILD_MENU_OPS;
    return true;
}

static int test_stack_limit_prevents_overflow() {
    int fake_menu = 0;
    choice_t const choices[] = {
        Choice_Select,
        Choice_Select,
        Choice_Select,
        Choice_Select,
        Choice_Select,
        Choice_Select,
        Choice_Select,
        Choice_Select,
        Choice_Select,
        Choice_Select,
        Choice_Select,
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::base_init(&fake_menu, &SELF_CHILD_MENU_OPS, test_display(32, 2), false);
    runtime.input_src = script_input(script);
    runtime.has_src = 1;

    run_until_idle(runtime, script);

    uint8_t expected_depth = static_cast<uint8_t>(MENU_MAX_STACK - 1);
    if (expected_depth > array_count(choices)) {
        expected_depth = static_cast<uint8_t>(array_count(choices));
    }
    assert(runtime.depth == expected_depth);
    assert(runtime.stack[runtime.depth].menu_ptr == &fake_menu);
    return 0;
}

static int test_public_push_pop_clear_edit_state() {
    int fake_menu = 0;
    menu_runtime_t runtime = menu_runtime_t::base_init(&fake_menu, &SELF_CHILD_MENU_OPS, test_display(32, 2), false);

    runtime.editing = 1;
    runtime.edit_original = 42;
    bool pushed = runtime.push(&fake_menu, &SELF_CHILD_MENU_OPS);

#if MENU_MAX_STACK > 1
    assert(pushed == true);
    assert(runtime.depth == 1);
    assert(runtime.editing == 0);
    assert(runtime.edit_original == 0);

    runtime.editing = 1;
    runtime.edit_original = 17;
    bool popped = runtime.pop();

    assert(popped == true);
    assert(runtime.depth == 0);
    assert(runtime.editing == 0);
    assert(runtime.edit_original == 0);
#else
    assert(pushed == false);
    assert(runtime.depth == 0);
    assert(runtime.editing == 1);
    assert(runtime.edit_original == 42);

    runtime.editing = 1;
    runtime.edit_original = 17;
    bool popped = runtime.pop();

    assert(popped == false);
    assert(runtime.depth == 0);
    assert(runtime.editing == 1);
    assert(runtime.edit_original == 17);
#endif
    return 0;
}

static int test_bool_item_toggles_inline_value() {
    bool enabled = false;
    bool armed = false;
    auto root_menu =
        MENU("Bool",
            ITEM_BOOL("Enabled", &enabled),
            ITEM_BOOL("Armed", &armed, "No", "Yes")
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Down,
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(enabled == true);
    assert(armed == true);
    assert(strcmp(g_display_ctx.lines[0], " Enabled: On") == 0);
    assert(strcmp(g_display_ctx.lines[1], ">Armed: Yes") == 0);
    return 0;
}

static int test_select_item_cycles_inline_choices() {
    int mode = 0;
    auto root_menu =
        MENU("Select",
            ITEM_SELECT("Mode", &mode,
                MENU_CHOICE("Off", 0),
                MENU_CHOICE("Auto", 2),
                MENU_CHOICE("Manual", 7)
            )
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(mode == 7);
    assert(strcmp(g_display_ctx.lines[0], ">Mode: Manual") == 0);
    return 0;
}

static int test_select_item_normalizes_unknown_value_on_activate() {
    int mode = 99;
    auto root_menu =
        MENU("Select",
            ITEM_SELECT("Mode", &mode,
                MENU_CHOICE("Off", 0),
                MENU_CHOICE("Auto", 2)
            )
        );

    choice_t const no_choices[] = { Choice_Invalid };
    script_ctx_t initial_script = { no_choices, 0, 0, Choice_Invalid };
    menu_runtime_t initial_runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(initial_script), false);

    initial_runtime.service();

    assert(mode == 99);
    assert(strcmp(g_display_ctx.lines[0], ">Mode: ?") == 0);

    choice_t const choices[] = {
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(mode == 0);
    assert(strcmp(g_display_ctx.lines[0], ">Mode: Off") == 0);
    return 0;
}

static int test_empty_select_item_is_safe() {
    int mode = 99;
    auto root_menu =
        MENU("Select",
            ITEM_SELECT("Mode", &mode)
        );

    choice_t const choices[] = {
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(mode == 99);
    assert(strcmp(g_display_ctx.lines[0], ">Mode") == 0);
    return 0;
}

static int test_null_value_items_are_safe() {
    auto root_menu =
        MENU("Null",
            ITEM_BOOL("Flag", static_cast<bool *>(0)),
            ITEM_SELECT("Mode", static_cast<int *>(0),
                MENU_CHOICE("A", 1),
                MENU_CHOICE("B", 2)
            )
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Down,
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(strcmp(g_display_ctx.lines[1], ">Mode") == 0);
    return 0;
}

static int test_factory_helpers_define_menu_without_macros() {
    int value = 1;
    bool enabled = false;
    int mode = 0;
    g_action_count = 0;
    auto root_menu =
        menu_make("Root",
            make_item_menu("Child",
                menu_make("Child",
                    make_item_int("Value", &value, 0, 5),
                    make_item_bool("Enabled", &enabled, "No", "Yes"),
                    make_item_select("Mode", &mode,
                        menu_choice("Off", 0),
                        menu_choice("Auto", 10)
                    ),
                    make_item_func("Run", test_action)
                )
            )
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Select,
        Choice_Right,
        Choice_Select,
        Choice_Down,
        Choice_Select,
        Choice_Down,
        Choice_Select,
        Choice_Down,
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

#if MENU_MAX_STACK > 1
    assert(value == 2);
    assert(enabled == true);
    assert(mode == 10);
    assert(g_action_count == 1);
#else
    assert(value == 1);
    assert(enabled == false);
    assert(mode == 0);
    assert(g_action_count == 0);
#endif
    return 0;
}

static int test_static_const_menu_declaration_is_supported() {
    static int value = 1;
    value = 1;
    static const auto root_menu =
        MENU("Const",
            ITEM_INT("Value", &value, 0, 5)
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Up,
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(value == 2);
    assert(strcmp(g_display_ctx.lines[0], ">Value: 2") == 0);
    return 0;
}

struct generic_value_ctx_t {
    int value;
    unsigned set_count;
    unsigned format_count;
    unsigned change_count;
    unsigned save_count;
    unsigned load_count;
};

static int generic_get(void *ctx) {
    return static_cast<generic_value_ctx_t *>(ctx)->value;
}

static void generic_set(void *ctx, int value) {
    generic_value_ctx_t *v = static_cast<generic_value_ctx_t *>(ctx);
    v->value = value;
    ++v->set_count;
}

static void generic_format(void *ctx, char *out, uint8_t cap) {
    generic_value_ctx_t *v = static_cast<generic_value_ctx_t *>(ctx);
    ++v->format_count;
    if (!out || cap == 0) {
        return;
    }
    char nb[12];
    menu_runtime_t::int_to_str(v->value, nb, sizeof(nb));
    out[0] = '\0';
    menu_runtime_t::append_capped(out, cap, nb);
    menu_runtime_t::append_capped(out, cap, " rpm");
}

static void generic_changed(void *ctx) {
    ++static_cast<generic_value_ctx_t *>(ctx)->change_count;
}

static void generic_save(void *ctx) {
    ++static_cast<generic_value_ctx_t *>(ctx)->save_count;
}

static void generic_load(void *ctx) {
    generic_value_ctx_t *v = static_cast<generic_value_ctx_t *>(ctx);
    ++v->load_count;
    v->value = 4;
}

static bool predicate_true(void *) { return true; }

static bool bool_predicate(void *ctx) {
    return ctx ? *static_cast<bool *>(ctx) : false;
}

static int test_step_generic_value_format_change_and_persistence_hooks() {
    int stepped = 0;
    generic_value_ctx_t generic = { 10, 0, 0, 0, 0, 0 };
    generic_value_ctx_t readonly = { 42, 0, 0, 0, 0, 0 };
    static const auto root_menu =
        MENU("Values",
            ITEM_ON_CHANGE(ITEM_INT("Step", &stepped, 0, 20, 5), generic_changed, &generic),
            ITEM_FORMAT(ITEM_ON_CHANGE(ITEM_VALUE("Speed", generic_get, generic_set, &generic, 0, 20, 2), generic_changed, &generic), generic_format, &generic),
            ITEM_VALUE("Read", generic_get, &readonly)
        );

    choice_t const choices[] = {
        Choice_Select,
        Choice_Up,
        Choice_Select,
        Choice_Down,
        Choice_Select,
        Choice_Up,
        Choice_Up,
        Choice_Select,
        Choice_Down
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 3), script_input(script), false);
    runtime.set_persistence(&generic_load, &generic_save, &generic);
    runtime.load_persistence();

    run_until_idle(runtime, script);

    assert(stepped == 5);
    assert(generic.value == 8);
    assert(generic.set_count >= 2);
    assert(generic.change_count == 2);
    assert(generic.save_count == 2);
    assert(generic.load_count == 1);
    assert(readonly.value == 42);
    assert(strcmp(g_display_ctx.lines[1], " Speed: 8 rpm") == 0);
    assert(strcmp(g_display_ctx.lines[2], ">Read: 42") == 0);
    return 0;
}

static int test_custom_formatters_render_without_backing_value_or_choices() {
    generic_value_ctx_t generic = { 77, 0, 0, 0, 0, 0 };
    int mode = 3;
    auto root_menu =
        MENU("Formatted",
            ITEM_FORMAT(ITEM_BOOL("Flag", static_cast<bool *>(0)), generic_format, &generic),
            ITEM_FORMAT(ITEM_SELECT("Mode", &mode), generic_format, &generic)
        );

    choice_t const choices[] = { Choice_Invalid };
    script_ctx_t script = { choices, 0, 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    runtime.service();

    assert(strcmp(g_display_ctx.lines[0], ">Flag: 77 rpm") == 0);
    assert(strcmp(g_display_ctx.lines[1], " Mode: 77 rpm") == 0);
    return 0;
}

static int test_hidden_disabled_items_and_rich_render_flags() {
    int value = 1;
    auto root_menu =
        MENU("Visibility",
            ITEM_HIDDEN(ITEM_FUNC("Hidden", test_action), predicate_true, 0),
            ITEM_DISABLED(ITEM_FUNC("Disabled", test_action), predicate_true, 0),
            ITEM_INT("Value", &value, 0, 5),
            ITEM_FUNC("Run", test_action)
        );

    choice_t const no_choices[] = { Choice_Invalid };
    script_ctx_t initial_script = { no_choices, 0, 0, Choice_Invalid };
    menu_runtime_t initial_runtime = menu_runtime_t::make(root_menu, rich_test_display(32, 2), script_input(initial_script), false);
    initial_runtime.service();

    assert(strcmp(g_display_ctx.lines[0], " Disabled") == 0);
    assert(strcmp(g_display_ctx.lines[1], ">Value: 1") == 0);
    assert((g_display_ctx.render_lines[0].flags & MENU_RENDER_DISABLED) != 0);
    assert((g_display_ctx.render_lines[1].flags & MENU_RENDER_SELECTED) != 0);

    choice_t const choices[] = {
        Choice_Select,
        Choice_Up,
        Choice_Select,
        Choice_Down,
        Choice_Select
    };
    g_action_count = 0;
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, rich_test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(value == 2);
    assert(g_action_count == 1);
    assert(strcmp(g_display_ctx.lines[0], " Value: 2") == 0);
    assert(strcmp(g_display_ctx.lines[1], ">Run") == 0);
    assert(g_display_ctx.render_count > 0);
    assert((g_display_ctx.render_lines[0].flags & MENU_RENDER_SCROLL_UP) != 0);
    assert((g_display_ctx.render_lines[1].flags & MENU_RENDER_SELECTED) != 0);
    assert((g_display_ctx.render_lines[1].flags & MENU_RENDER_SCROLL_DOWN) == 0);
    return 0;
}

static int test_hidden_items_do_not_leave_numbering_gaps() {
    int value = 1;
    auto root_menu =
        MENU("Numbering",
            ITEM_HIDDEN(ITEM_FUNC("Hidden", test_action), predicate_true, 0),
            ITEM_INT("Value", &value, 0, 5),
            ITEM_FUNC("Run", test_action)
        );

    choice_t const choices[] = { Choice_Invalid };
    script_ctx_t script = { choices, 0, 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), true);

    runtime.service();

    assert(strcmp(g_display_ctx.lines[0], ">1 Value: 1") == 0);
    assert(strcmp(g_display_ctx.lines[1], " 2 Run") == 0);
    return 0;
}

static int test_editing_is_cleared_when_selected_item_becomes_hidden() {
    int first = 1;
    int second = 2;
    bool hide_first = false;
    auto root_menu =
        MENU("Dynamic",
            ITEM_HIDDEN(ITEM_INT("First", &first, 0, 5), bool_predicate, &hide_first),
            ITEM_INT("Second", &second, 0, 5)
        );

    choice_t const enter_choices[] = { Choice_Select };
    script_ctx_t enter_script = { enter_choices, array_count(enter_choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(enter_script), false);

    run_until_idle(runtime, enter_script);

    assert(runtime.editing == 1);
    assert(runtime.stack[0].selected == 0);

    hide_first = true;
    runtime.service();

    assert(runtime.editing == 0);
    assert(runtime.stack[0].selected == 1);
    assert(first == 1);
    assert(second == 2);
    assert(strcmp(g_display_ctx.lines[0], ">Second: 2") == 0);

    choice_t const move_choices[] = { Choice_Up };
    script_ctx_t move_script = { move_choices, array_count(move_choices), 0, Choice_Invalid };
    runtime.input_src = script_input(move_script);
    runtime.has_src = 1;
    run_until_idle(runtime, move_script);

    assert(first == 1);
    assert(second == 2);
    assert(runtime.editing == 0);
    return 0;
}

static int test_dynamic_visibility_redraws_when_selection_is_clamped() {
    int first = 1;
    int second = 2;
    bool hide_first = false;
    auto root_menu =
        MENU("Dynamic",
            ITEM_HIDDEN(ITEM_INT("First", &first, 0, 5), bool_predicate, &hide_first),
            ITEM_INT("Second", &second, 0, 5)
        );

    choice_t const choices[] = { Choice_Invalid };
    script_ctx_t script = { choices, 0, 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    runtime.service();

    assert(runtime.dirty == 0);
    assert(runtime.stack[0].selected == 0);
    assert(strcmp(g_display_ctx.lines[0], ">First: 1") == 0);
    assert(strcmp(g_display_ctx.lines[1], " Second: 2") == 0);

    hide_first = true;
    runtime.service();

    assert(runtime.dirty == 0);
    assert(runtime.stack[0].selected == 1);
    assert(strcmp(g_display_ctx.lines[0], ">Second: 2") == 0);
    assert(strcmp(g_display_ctx.lines[1], "") == 0);
    return 0;
}

static int test_request_redraw_updates_predicate_driven_rows() {
    int first = 1;
    int second = 2;
    bool hide_second = true;
    auto root_menu =
        MENU("Dynamic",
            ITEM_INT("First", &first, 0, 5),
            ITEM_HIDDEN(ITEM_INT("Second", &second, 0, 5), bool_predicate, &hide_second)
        );

    choice_t const choices[] = { Choice_Invalid };
    script_ctx_t script = { choices, 0, 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    runtime.service();

    assert(runtime.dirty == 0);
    assert(runtime.stack[0].selected == 0);
    assert(strcmp(g_display_ctx.lines[0], ">First: 1") == 0);
    assert(strcmp(g_display_ctx.lines[1], "") == 0);

    hide_second = false;
    runtime.request_redraw();
    runtime.service();

    assert(runtime.dirty == 0);
    assert(runtime.stack[0].selected == 0);
    assert(strcmp(g_display_ctx.lines[0], ">First: 1") == 0);
    assert(strcmp(g_display_ctx.lines[1], " Second: 2") == 0);
    return 0;
}

static int test_interrupted_edit_restores_original_value() {
    int first = 1;
    int second = 2;
    bool hide_first = false;
    auto root_menu =
        MENU("Dynamic",
            ITEM_HIDDEN(ITEM_INT("First", &first, 0, 5), bool_predicate, &hide_first),
            ITEM_INT("Second", &second, 0, 5)
        );

    choice_t const edit_choices[] = {
        Choice_Select,
        Choice_Up
    };
    script_ctx_t edit_script = { edit_choices, array_count(edit_choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(edit_script), false);

    run_until_idle(runtime, edit_script);

    assert(runtime.editing == 1);
    assert(runtime.stack[0].selected == 0);
    assert(first == 2);

    hide_first = true;
    runtime.service();

    assert(runtime.editing == 0);
    assert(runtime.stack[0].selected == 1);
    assert(first == 1);
    assert(second == 2);
    assert(strcmp(g_display_ctx.lines[0], ">Second: 2") == 0);
    return 0;
}

static int test_interrupted_edit_on_disabled_item_restores_original_value() {
    int value = 1;
    bool disable_value = false;
    auto root_menu =
        MENU("Dynamic",
            ITEM_DISABLED(ITEM_INT("Value", &value, 0, 5), bool_predicate, &disable_value)
        );

    choice_t const edit_choices[] = {
        Choice_Select,
        Choice_Up
    };
    script_ctx_t edit_script = { edit_choices, array_count(edit_choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 1), script_input(edit_script), false);

    run_until_idle(runtime, edit_script);

    assert(runtime.editing == 1);
    assert(value == 2);

    disable_value = true;
    runtime.service();

    assert(runtime.editing == 0);
    assert(runtime.stack[0].selected == 0);
    assert(value == 1);
    assert(strcmp(g_display_ctx.lines[0], " Value: 1") == 0);
    return 0;
}

static int test_row_and_encoder_events_drive_menu_without_button_polling() {
    int first = 0;
    int second = 0;
    auto root_menu =
        MENU("Events",
            ITEM_INT("First", &first, 0, 5),
            ITEM_INT("Second", &second, 0, 5),
            ITEM_FUNC("Run", test_action)
        );

    menu_event_t const events[] = {
        menu_row_event(1, true),
        menu_delta_event(1),
        menu_event(Choice_Select),
        menu_delta_event(1),
        menu_event(Choice_Select)
    };
    event_script_ctx_t script = { events, array_count(events), 0 };
    input_rich_event_ctx_t input_storage;
    g_action_count = 0;
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), make_event_input(input_storage, &script, read_event_script), false);

    unsigned guard = 0;
    while (script.pos < script.count || runtime.dirty) {
        runtime.service();
        ++guard;
        assert(guard < 64);
    }

    assert(first == 0);
    assert(second == 1);
    assert(runtime.editing == 0);
    assert(g_action_count == 1);
    return 0;
}

static int test_breadcrumb_title_and_affordance_rendering() {
    auto root_menu =
        MENU("Root",
            ITEM_MENU("Child",
                MENU("Child",
                    ITEM_FUNC("Run", test_action)
                )
            )
        );

    choice_t const choices[] = { Choice_Select };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, rich_test_display(32, 2), script_input(script), false);
    runtime.set_show_title(true);
    runtime.set_show_breadcrumbs(true);
    runtime.set_show_affordances(true);

    run_until_idle(runtime, script);

#if MENU_MAX_STACK > 1
    assert(strcmp(g_display_ctx.lines[0], "Root/Child <") == 0);
    assert((g_display_ctx.render_lines[0].flags & MENU_RENDER_BACK_AVAILABLE) != 0);
    assert(strcmp(g_display_ctx.lines[1], ">Run") == 0);
#else
    assert(strcmp(g_display_ctx.lines[0], "Root") == 0);
    assert((g_display_ctx.render_lines[0].flags & MENU_RENDER_BACK_AVAILABLE) == 0);
    assert(strcmp(g_display_ctx.lines[1], ">Child >") == 0);
#endif
    return 0;
}

static int test_context_function_item_keeps_action_state_inline() {
    int value = 3;
    action_ctx_t action = { &value, 0 };
    auto root_menu =
        MENU("Action",
            ITEM_FUNC_CTX("Bump", test_action_with_context, &action)
        );

    choice_t const choices[] = {
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

    assert(value == 4);
    assert(action.called == 1);
    assert(strcmp(g_display_ctx.lines[0], ">Bump") == 0);
    return 0;
}

static int test_title_rendering_is_optional_and_tracks_current_menu() {
    g_action_count = 0;
    auto root_menu =
        MENU("Root",
            ITEM_MENU("Child",
                MENU("Child",
                    ITEM_FUNC("Run", test_action)
                )
            )
        );

    choice_t const choices[] = {
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);
    runtime.set_show_title(true);

    run_until_idle(runtime, script);

#if MENU_MAX_STACK > 1
    assert(runtime.depth == 1);
    assert(strcmp(g_display_ctx.lines[0], "Child") == 0);
    assert(strcmp(g_display_ctx.lines[1], ">Run") == 0);
#else
    assert(runtime.depth == 0);
    assert(strcmp(g_display_ctx.lines[0], "Root") == 0);
    assert(strcmp(g_display_ctx.lines[1], ">Child") == 0);
#endif
    return 0;
}

static int test_title_does_not_hide_only_row_display() {
    auto root_menu =
        MENU("Root",
            ITEM_FUNC("Run", test_action)
        );
    choice_t const choices[] = { Choice_Invalid };
    script_ctx_t script = { choices, 0, 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 1), script_input(script), false);
    runtime.set_show_title(true);

    runtime.service();

    assert(strcmp(g_display_ctx.lines[0], ">Run") == 0);
    return 0;
}

static int test_empty_menu_title_can_use_only_row() {
    auto root_menu = MENU("Empty");
    choice_t const choices[] = { Choice_Invalid };
    script_ctx_t script = { choices, 0, 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 1), script_input(script), false);
    runtime.set_show_title(true);

    runtime.service();

    assert(strcmp(g_display_ctx.lines[0], "Empty") == 0);
    assert(g_display_ctx.write_count == 1);
    return 0;
}

static int test_title_is_width_capped() {
    auto root_menu =
        MENU("VeryLongTitle",
            ITEM_FUNC("Run", test_action)
        );
    choice_t const choices[] = { Choice_Invalid };
    script_ctx_t script = { choices, 0, 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(8, 2), script_input(script), false);
    runtime.set_show_title(true);

    runtime.service();

    assert(strcmp(g_display_ctx.lines[0], "VeryLong") == 0);
    assert(strlen(g_display_ctx.lines[0]) == 8);
    return 0;
}

static int test_title_reduces_item_window_for_scrolling() {
    auto root_menu =
        MENU("Root",
            ITEM_FUNC("One", test_action),
            ITEM_FUNC("Two", test_action),
            ITEM_FUNC("Three", test_action)
        );
    choice_t const choices[] = {
        Choice_Down,
        Choice_Down
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);
    runtime.set_show_title(true);

    run_until_idle(runtime, script);

    assert(runtime.stack[0].selected == 2);
    assert(runtime.stack[0].top == 2);
    assert(strcmp(g_display_ctx.lines[0], "Root") == 0);
    assert(strcmp(g_display_ctx.lines[1], ">Three") == 0);
    return 0;
}

static int test_reset_navigation_returns_to_root_and_clears_editing() {
    int value = 2;
    auto root_menu =
        MENU("Root",
            ITEM_FUNC("Home", test_action),
            ITEM_MENU("Child",
                MENU("Child",
                    ITEM_INT("Value", &value, 0, 5)
                )
            )
        );

    choice_t const choices[] = {
        Choice_Down,
        Choice_Select,
        Choice_Select
    };
    script_ctx_t script = { choices, array_count(choices), 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    run_until_idle(runtime, script);

#if MENU_MAX_STACK > 1
    assert(runtime.depth == 1);
    assert(runtime.editing == 1);
#else
    assert(runtime.depth == 0);
    assert(runtime.editing == 0);
    runtime.editing = 1;
    runtime.edit_original = 12;
#endif

    runtime.reset_navigation();

    assert(runtime.depth == 0);
    assert(runtime.editing == 0);
    assert(runtime.stack[0].selected == 0);
    assert(runtime.stack[0].top == 0);
    assert(runtime.dirty == 1);

    runtime.service();

    assert(strcmp(g_display_ctx.lines[0], ">Home") == 0);
    return 0;
}

static int test_service_recovers_invalid_navigation_depth() {
    auto root_menu =
        MENU("Root",
            ITEM_FUNC("Run", test_action)
        );
    choice_t const choices[] = { Choice_Invalid };
    script_ctx_t script = { choices, 0, 0, Choice_Invalid };
    menu_runtime_t runtime = menu_runtime_t::make(root_menu, test_display(32, 2), script_input(script), false);

    runtime.depth = static_cast<uint8_t>(MENU_MAX_STACK);
    runtime.editing = 1;
    runtime.edit_original = 11;

    runtime.service();

    assert(runtime.depth == 0);
    assert(runtime.editing == 0);
    assert(runtime.edit_original == 0);
    assert(strcmp(g_display_ctx.lines[0], ">Run") == 0);

#if MENU_MAX_STACK > 1
    runtime.depth = 1;
    runtime.editing = 1;
    runtime.edit_original = 12;
    runtime.dirty = 1;

    runtime.service();

    assert(runtime.depth == 0);
    assert(runtime.editing == 0);
    assert(runtime.edit_original == 0);
    assert(strcmp(g_display_ctx.lines[0], ">Run") == 0);
#endif
    return 0;
}

static int test_default_runtime_is_inert() {
    menu_runtime_t runtime;
    runtime.service();

    assert(runtime.initialized == 1);
    assert(runtime.depth == 0);
    assert(runtime.dirty == 0);
    return 0;
}

int main(int argc, char **argv) {
    if (argc == 2) {
        if (strcmp(argv[1], "single") == 0) { return test_single_declaration_navigation(); }
        if (strcmp(argv[1], "legacy") == 0) { return test_legacy_callbacks_still_work(); }
        if (strcmp(argv[1], "manual-display") == 0) { return test_manual_legacy_display_initialization_is_safe(); }
        if (strcmp(argv[1], "null-int") == 0) { return test_null_int_item_is_safe(); }
        if (strcmp(argv[1], "empty") == 0) { return test_empty_menu_is_valid(); }
        if (strcmp(argv[1], "inverted-range") == 0) { return test_inverted_int_range_is_normalized_for_editing(); }
        if (strcmp(argv[1], "clamp-save") == 0) { return test_editing_clamps_out_of_range_value_on_save(); }
        if (strcmp(argv[1], "clamp-cancel") == 0) { return test_cancel_restores_out_of_range_original(); }
        if (strcmp(argv[1], "width") == 0) { return test_display_width_is_capped_to_line_buffer(); }
        if (strcmp(argv[1], "request-redraw") == 0) { return test_request_redraw_updates_external_value_change(); }
        if (strcmp(argv[1], "blank-unused") == 0) { return test_fixed_height_render_blanks_unused_rows_without_clear(); }
        if (strcmp(argv[1], "int-min") == 0) { return test_int_min_formats_safely(); }
        if (strcmp(argv[1], "clamp") == 0) { return test_clamp_view_uses_non_wrapping_window_math(); }
        if (strcmp(argv[1], "render-wrap") == 0) { return test_render_stops_before_item_index_wraparound(); }
        if (strcmp(argv[1], "nav-clamp") == 0) { return test_navigation_clamps_by_default(); }
        if (strcmp(argv[1], "nav-wrap") == 0) { return test_navigation_wraps_when_enabled(); }
        if (strcmp(argv[1], "service-window") == 0) { return test_service_clamps_large_menu_to_full_window(); }
        if (strcmp(argv[1], "max-count") == 0) { return test_render_handles_maximum_menu_count(); }
        if (strcmp(argv[1], "max-select") == 0) { return test_select_wraps_at_maximum_value_count(); }
        if (strcmp(argv[1], "safe-ops") == 0) { return test_null_and_partial_menu_ops_are_safe(); }
        if (strcmp(argv[1], "null-menu-ptr") == 0) { return test_null_menu_pointer_with_ops_is_inert(); }
        if (strcmp(argv[1], "null-child") == 0) { return test_null_child_pointer_does_not_push(); }
        if (strcmp(argv[1], "event-input") == 0) { return test_context_event_input_provider(); }
        if (strcmp(argv[1], "empty-input") == 0) { return test_empty_and_null_input_sources_are_inert(); }
        if (strcmp(argv[1], "adapter-construction") == 0) { return test_public_adapter_construction_is_stable(); }
        if (strcmp(argv[1], "display-fallback") == 0) { return test_partial_display_ops_fall_back_to_legacy_callbacks(); }
        if (strcmp(argv[1], "stack-limit") == 0) { return test_stack_limit_prevents_overflow(); }
        if (strcmp(argv[1], "push-pop-edit") == 0) { return test_public_push_pop_clear_edit_state(); }
        if (strcmp(argv[1], "bool") == 0) { return test_bool_item_toggles_inline_value(); }
        if (strcmp(argv[1], "select") == 0) { return test_select_item_cycles_inline_choices(); }
        if (strcmp(argv[1], "select-unknown") == 0) { return test_select_item_normalizes_unknown_value_on_activate(); }
        if (strcmp(argv[1], "select-empty") == 0) { return test_empty_select_item_is_safe(); }
        if (strcmp(argv[1], "null-value") == 0) { return test_null_value_items_are_safe(); }
        if (strcmp(argv[1], "helpers") == 0) { return test_factory_helpers_define_menu_without_macros(); }
        if (strcmp(argv[1], "const-menu") == 0) { return test_static_const_menu_declaration_is_supported(); }
        if (strcmp(argv[1], "value-hooks") == 0) { return test_step_generic_value_format_change_and_persistence_hooks(); }
        if (strcmp(argv[1], "formatter-empty-value") == 0) { return test_custom_formatters_render_without_backing_value_or_choices(); }
        if (strcmp(argv[1], "visibility") == 0) { return test_hidden_disabled_items_and_rich_render_flags(); }
        if (strcmp(argv[1], "hidden-numbering") == 0) { return test_hidden_items_do_not_leave_numbering_gaps(); }
        if (strcmp(argv[1], "dynamic-hidden-edit") == 0) { return test_editing_is_cleared_when_selected_item_becomes_hidden(); }
        if (strcmp(argv[1], "dynamic-visibility-redraw") == 0) { return test_dynamic_visibility_redraws_when_selection_is_clamped(); }
        if (strcmp(argv[1], "predicate-redraw") == 0) { return test_request_redraw_updates_predicate_driven_rows(); }
        if (strcmp(argv[1], "interrupted-edit") == 0) { return test_interrupted_edit_restores_original_value(); }
        if (strcmp(argv[1], "interrupted-disabled-edit") == 0) { return test_interrupted_edit_on_disabled_item_restores_original_value(); }
        if (strcmp(argv[1], "row-encoder") == 0) { return test_row_and_encoder_events_drive_menu_without_button_polling(); }
        if (strcmp(argv[1], "breadcrumbs") == 0) { return test_breadcrumb_title_and_affordance_rendering(); }
        if (strcmp(argv[1], "context-func") == 0) { return test_context_function_item_keeps_action_state_inline(); }
        if (strcmp(argv[1], "title") == 0) { return test_title_rendering_is_optional_and_tracks_current_menu(); }
        if (strcmp(argv[1], "one-row-title") == 0) { return test_title_does_not_hide_only_row_display(); }
        if (strcmp(argv[1], "empty-title") == 0) { return test_empty_menu_title_can_use_only_row(); }
        if (strcmp(argv[1], "title-width") == 0) { return test_title_is_width_capped(); }
        if (strcmp(argv[1], "title-scroll") == 0) { return test_title_reduces_item_window_for_scrolling(); }
        if (strcmp(argv[1], "reset-nav") == 0) { return test_reset_navigation_returns_to_root_and_clears_editing(); }
        if (strcmp(argv[1], "bad-depth") == 0) { return test_service_recovers_invalid_navigation_depth(); }
        if (strcmp(argv[1], "default-runtime") == 0) { return test_default_runtime_is_inert(); }
        fprintf(stderr, "unknown test: %s\n", argv[1]);
        return 2;
    }

    test_single_declaration_navigation();
    test_legacy_callbacks_still_work();
    test_manual_legacy_display_initialization_is_safe();
    test_null_int_item_is_safe();
    test_empty_menu_is_valid();
    test_inverted_int_range_is_normalized_for_editing();
    test_editing_clamps_out_of_range_value_on_save();
    test_cancel_restores_out_of_range_original();
    test_display_width_is_capped_to_line_buffer();
    test_request_redraw_updates_external_value_change();
    test_fixed_height_render_blanks_unused_rows_without_clear();
    test_int_min_formats_safely();
    test_clamp_view_uses_non_wrapping_window_math();
    test_render_stops_before_item_index_wraparound();
    test_navigation_clamps_by_default();
    test_navigation_wraps_when_enabled();
    test_service_clamps_large_menu_to_full_window();
    test_render_handles_maximum_menu_count();
    test_select_wraps_at_maximum_value_count();
    test_null_and_partial_menu_ops_are_safe();
    test_null_menu_pointer_with_ops_is_inert();
    test_null_child_pointer_does_not_push();
    test_context_event_input_provider();
    test_empty_and_null_input_sources_are_inert();
    test_public_adapter_construction_is_stable();
    test_partial_display_ops_fall_back_to_legacy_callbacks();
    test_stack_limit_prevents_overflow();
    test_public_push_pop_clear_edit_state();
    test_bool_item_toggles_inline_value();
    test_select_item_cycles_inline_choices();
    test_select_item_normalizes_unknown_value_on_activate();
    test_empty_select_item_is_safe();
    test_null_value_items_are_safe();
    test_factory_helpers_define_menu_without_macros();
    test_static_const_menu_declaration_is_supported();
    test_step_generic_value_format_change_and_persistence_hooks();
    test_custom_formatters_render_without_backing_value_or_choices();
    test_hidden_disabled_items_and_rich_render_flags();
    test_hidden_items_do_not_leave_numbering_gaps();
    test_editing_is_cleared_when_selected_item_becomes_hidden();
    test_dynamic_visibility_redraws_when_selection_is_clamped();
    test_request_redraw_updates_predicate_driven_rows();
    test_interrupted_edit_restores_original_value();
    test_interrupted_edit_on_disabled_item_restores_original_value();
    test_row_and_encoder_events_drive_menu_without_button_polling();
    test_breadcrumb_title_and_affordance_rendering();
    test_context_function_item_keeps_action_state_inline();
    test_title_rendering_is_optional_and_tracks_current_menu();
    test_title_does_not_hide_only_row_display();
    test_empty_menu_title_can_use_only_row();
    test_title_is_width_capped();
    test_title_reduces_item_window_for_scrolling();
    test_reset_navigation_returns_to_root_and_clears_editing();
    test_service_recovers_invalid_navigation_depth();
    test_default_runtime_is_inert();
    return 0;
}
