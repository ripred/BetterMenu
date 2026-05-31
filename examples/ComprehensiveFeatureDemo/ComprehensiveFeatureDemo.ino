#include <BetterMenu.h>
#include <stdio.h>

// This example intentionally uses Serial for both input and output so it can be
// pasted into a sketch and tried without extra hardware. It still demonstrates
// the richer adapter APIs that LCD, OLED, touch, encoder, and button projects use.
//
// It consumes most of the SRAM on small boards such as the Uno and Nano because
// it shows everything at once. Treat it as a copy/paste feature reference rather
// than as the structure for a practical finished project.

struct editable_value_ctx_t {
    int value;
};

struct action_ctx_t {
    char const *name;
    int calls;
};

struct snapshot_t {
    int plainInt;
    int stepInt;
    int aliasStepInt;
    int getterSetterValue;
    int getterSetterStepValue;
    bool boolDefault;
    bool boolCustom;
    int selectChoice;
};

struct demo_display_ctx_t {
    Print *out;
};

struct demo_input_ctx_t {
    Stream *stream;
};

static int plainInt = 5;
static int stepInt = 50;
static int aliasStepInt = 0;
static int getterSetterValueStorage = 25;
static int getterSetterStepStorage = 40;
static int pwmValue = 128;
static int onChangeInt = 3;
static int selectChoice = 1;
static int actionCounter = 0;
static int onChangeCount = 0;
static int loadCount = 0;
static int saveCount = 0;
static int inputEventCount = 0;
static int rowEventCount = 0;
static int deltaEventCount = 0;
static int longEventCount = 0;
static int repeatEventCount = 0;

static bool boolDefault = false;
static bool boolCustom = true;
static bool onChangeBool = false;
static bool showHiddenEntry = true;
static bool enableDisabledEntry = false;
static bool showTitleRow = true;
static bool showBreadcrumbs = true;
static bool showAffordances = true;
static bool showRenderMetadata = false;

static char lastInputEvent[24] = "none";

static editable_value_ctx_t getterSetterValue = { getterSetterValueStorage };
static editable_value_ctx_t getterSetterStepValue = { getterSetterStepStorage };
static action_ctx_t contextAction = { "context action", 0 };
static snapshot_t savedSnapshot = {
    plainInt,
    stepInt,
    aliasStepInt,
    getterSetterValueStorage,
    getterSetterStepStorage,
    boolDefault,
    boolCustom,
    selectChoice
};

static menu_runtime_t menuRuntime;
static demo_display_ctx_t demoDisplay = { &Serial };
static demo_input_ctx_t demoInput = { &Serial };
static input_rich_event_ctx_t richInputStorage;

static void copyText(char *out, uint8_t cap, char const *text) {
    if (!out || cap == 0) {
        return;
    }
    uint8_t pos = 0;
    while (text && *text && pos < cap - 1) {
        out[pos++] = *text++;
    }
    out[pos] = '\0';
}

static void rememberInput(char const *text) {
    copyText(lastInputEvent, sizeof(lastInputEvent), text);
    ++inputEventCount;
}

static int getEditableValue(void *ctx) {
    editable_value_ctx_t *value = static_cast<editable_value_ctx_t *>(ctx);
    return value ? value->value : 0;
}

static void setEditableValue(void *ctx, int value) {
    editable_value_ctx_t *editable = static_cast<editable_value_ctx_t *>(ctx);
    if (editable) {
        editable->value = value;
    }
}

static int getUptimeSeconds(void *) {
    return static_cast<int>(millis() / 1000UL);
}

static int getPlainInt(void *) {
    return plainInt;
}

static int getSavedPlainInt(void *) {
    return savedSnapshot.plainInt;
}

static int getLoadCount(void *) {
    return loadCount;
}

static int getSaveCount(void *) {
    return saveCount;
}

static int getOnChangeCount(void *) {
    return onChangeCount;
}

static int getInputEventCount(void *) {
    return inputEventCount;
}

static int getRowEventCount(void *) {
    return rowEventCount;
}

static int getDeltaEventCount(void *) {
    return deltaEventCount;
}

static int getLongEventCount(void *) {
    return longEventCount;
}

static int getRepeatEventCount(void *) {
    return repeatEventCount;
}

static int getZero(void *) {
    return 0;
}

static bool hiddenEntryIsHidden(void *) {
    return !showHiddenEntry;
}

static bool disabledEntryIsDisabled(void *) {
    return !enableDisabledEntry;
}

static void formatPwm(void *, char *out, uint8_t cap) {
    int percent = static_cast<int>((static_cast<long>(pwmValue) * 100L) / 255L);
    snprintf(out, cap, "%d/255 (%d%%)", pwmValue, percent);
}

static void formatLastInput(void *, char *out, uint8_t cap) {
    copyText(out, cap, lastInputEvent);
}

static void formatRenderMetadataState(void *, char *out, uint8_t cap) {
    copyText(out, cap, showRenderMetadata ? "shown" : "hidden");
}

static void onAnyValueChanged(void *) {
    ++onChangeCount;
    Serial.print(F("[on-change] count = "));
    Serial.println(onChangeCount);
}

static void applyRuntimeDisplayOptions(void *) {
    menuRuntime.set_show_title(showTitleRow);
    menuRuntime.set_show_breadcrumbs(showBreadcrumbs);
    menuRuntime.set_show_affordances(showAffordances);
    onAnyValueChanged(0);
    menuRuntime.request_redraw();
}

static void saveSnapshot(void *) {
    savedSnapshot.plainInt = plainInt;
    savedSnapshot.stepInt = stepInt;
    savedSnapshot.aliasStepInt = aliasStepInt;
    savedSnapshot.getterSetterValue = getterSetterValue.value;
    savedSnapshot.getterSetterStepValue = getterSetterStepValue.value;
    savedSnapshot.boolDefault = boolDefault;
    savedSnapshot.boolCustom = boolCustom;
    savedSnapshot.selectChoice = selectChoice;
    ++saveCount;
    Serial.print(F("[persistence] saved snapshot #"));
    Serial.println(saveCount);
}

static void loadSnapshot(void *) {
    plainInt = savedSnapshot.plainInt;
    stepInt = savedSnapshot.stepInt;
    aliasStepInt = savedSnapshot.aliasStepInt;
    getterSetterValue.value = savedSnapshot.getterSetterValue;
    getterSetterStepValue.value = savedSnapshot.getterSetterStepValue;
    boolDefault = savedSnapshot.boolDefault;
    boolCustom = savedSnapshot.boolCustom;
    selectChoice = savedSnapshot.selectChoice;
    ++loadCount;
    Serial.print(F("[persistence] loaded snapshot #"));
    Serial.println(loadCount);
}

static void loadSnapshotAction() {
    menuRuntime.load_persistence();
}

static void saveSnapshotAction() {
    menuRuntime.save_persistence();
}

static void plainAction() {
    ++actionCounter;
    Serial.print(F("[action] plain function call #"));
    Serial.println(actionCounter);
}

static void contextActionCallback(void *ctx) {
    action_ctx_t *action = static_cast<action_ctx_t *>(ctx);
    if (!action) {
        return;
    }
    ++action->calls;
    Serial.print(F("[action] "));
    Serial.print(action->name);
    Serial.print(F(" call #"));
    Serial.println(action->calls);
}

static void hiddenAction() {
    Serial.println(F("[action] hidden item is currently visible"));
}

static void disabledAction() {
    Serial.println(F("[action] disabled item is currently enabled"));
}

static void requestRedrawAction() {
    Serial.println(F("[runtime] redraw requested"));
    menuRuntime.request_redraw();
}

static void resetNavigationAction() {
    Serial.println(F("[runtime] navigation reset to root"));
    menuRuntime.reset_navigation();
}

static void resetValuesAction() {
    plainInt = 5;
    stepInt = 50;
    aliasStepInt = 0;
    getterSetterValue.value = 25;
    getterSetterStepValue.value = 40;
    pwmValue = 128;
    onChangeInt = 3;
    selectChoice = 1;
    boolDefault = false;
    boolCustom = true;
    onChangeBool = false;
    showHiddenEntry = true;
    enableDisabledEntry = false;
    onAnyValueChanged(0);
    menuRuntime.request_redraw();
}

static void printCurrentValues() {
    Serial.println(F("[values]"));
    Serial.print(F("  plainInt = "));
    Serial.println(plainInt);
    Serial.print(F("  stepInt = "));
    Serial.println(stepInt);
    Serial.print(F("  aliasStepInt = "));
    Serial.println(aliasStepInt);
    Serial.print(F("  getterSetterValue = "));
    Serial.println(getterSetterValue.value);
    Serial.print(F("  getterSetterStepValue = "));
    Serial.println(getterSetterStepValue.value);
    Serial.print(F("  boolDefault = "));
    Serial.println(boolDefault ? F("true") : F("false"));
    Serial.print(F("  boolCustom = "));
    Serial.println(boolCustom ? F("true") : F("false"));
    Serial.print(F("  selectChoice = "));
    Serial.println(selectChoice);
}

static void printInputHelp() {
    Serial.println();
    Serial.println(F("Input controls:"));
    Serial.println(F("  w/s       move up/down"));
    Serial.println(F("  e or d    select, enter, toggle, cycle, or save edit"));
    Serial.println(F("  q or a    cancel, back, or decrement while editing"));
    Serial.println(F("  +/-       encoder-style delta events"));
    Serial.println(F("  1-7       row/touch select visible display row"));
    Serial.println(F("  !@#$%^&   row/touch activate visible display row"));
    Serial.println(F("  L         long-select event flag"));
    Serial.println(F("  R         repeat-down event flag"));
    Serial.println(F("  ?         print this help"));
    Serial.println();
}

static void demoDisplayClear(void *ctx) {
    demo_display_ctx_t *display = static_cast<demo_display_ctx_t *>(ctx);
    if (!display || !display->out) {
        return;
    }
    display->out->println();
    display->out->println(F("--------------------------------"));
}

static void demoDisplayFlush(void *) {
}

static void printRenderFlags(Print &out, uint8_t flags) {
    bool wrote = false;
    if (flags & MENU_RENDER_SELECTED) {
        out.print(F("selected"));
        wrote = true;
    }
    if (flags & MENU_RENDER_EDITING) {
        out.print(wrote ? F(",edit") : F("edit"));
        wrote = true;
    }
    if (flags & MENU_RENDER_DISABLED) {
        out.print(wrote ? F(",disabled") : F("disabled"));
        wrote = true;
    }
    if (flags & MENU_RENDER_HAS_CHILD) {
        out.print(wrote ? F(",child") : F("child"));
        wrote = true;
    }
    if (flags & MENU_RENDER_BACK_AVAILABLE) {
        out.print(wrote ? F(",back") : F("back"));
        wrote = true;
    }
    if (flags & MENU_RENDER_SCROLL_UP) {
        out.print(wrote ? F(",scroll-up") : F("scroll-up"));
        wrote = true;
    }
    if (flags & MENU_RENDER_SCROLL_DOWN) {
        out.print(wrote ? F(",scroll-down") : F("scroll-down"));
        wrote = true;
    }
    if (!wrote) {
        out.print(F("none"));
    }
}

static void demoDisplayRenderLine(void *ctx, menu_render_line_t const *line) {
    demo_display_ctx_t *display = static_cast<demo_display_ctx_t *>(ctx);
    if (!display || !display->out || !line) {
        return;
    }

    if (line->kind == MENU_RENDER_BLANK) {
        display->out->println();
        return;
    }

    display->out->print(line->text ? line->text : "");
    if (showRenderMetadata) {
        display->out->print(F("  {row="));
        display->out->print(line->row);
        display->out->print(F(", item="));
        if (line->item_index == 255) {
            display->out->print(F("-"));
        } else {
            display->out->print(line->item_index);
        }
        display->out->print(F(", type="));
        display->out->print(line->entry_type);
        display->out->print(F(", flags="));
        printRenderFlags(*display->out, line->flags);
        display->out->print(F("}"));
    }
    display->out->println();
}

static display_ops_t const DEMO_DISPLAY_OPS = {
    &demoDisplayClear,
    0,
    &demoDisplayFlush,
    &demoDisplayRenderLine
};

static uint8_t activatedRowForShiftedNumber(int ch) {
    switch (ch) {
        case '!': return 1;
        case '@': return 2;
        case '#': return 3;
        case '$': return 4;
        case '%': return 5;
        case '^': return 6;
        case '&': return 7;
        default:  return 255;
    }
}

static menu_event_t readDemoInput(void *ctx) {
    demo_input_ctx_t *input = static_cast<demo_input_ctx_t *>(ctx);
    if (!input || !input->stream || input->stream->available() <= 0) {
        return menu_event(Choice_Invalid);
    }

    int ch = input->stream->read();
    switch (ch) {
        case 'w':
        case 'W':
            rememberInput("up");
            return menu_event(Choice_Up);
        case 's':
        case 'S':
            rememberInput("down");
            return menu_event(Choice_Down);
        case 'e':
        case 'E':
            rememberInput("select");
            return menu_event(Choice_Select);
        case 'q':
        case 'Q':
            rememberInput("cancel");
            return menu_event(Choice_Cancel);
        case 'a':
        case 'A':
            rememberInput("left");
            return menu_event(Choice_Left);
        case 'd':
        case 'D':
            rememberInput("right");
            return menu_event(Choice_Right);
        case '+':
            rememberInput("delta +1");
            ++deltaEventCount;
            return menu_delta_event(1);
        case '-':
            rememberInput("delta -1");
            ++deltaEventCount;
            return menu_delta_event(-1);
        case 'L':
            rememberInput("long select");
            ++longEventCount;
            return menu_long_event(Choice_Select);
        case 'R':
            rememberInput("repeat down");
            ++repeatEventCount;
            return menu_repeat_event(Choice_Down);
        case '?':
            rememberInput("help");
            printInputHelp();
            return menu_event(Choice_Invalid);
        default:
            break;
    }

    if (ch >= '0' && ch <= '7') {
        char label[] = "row select 0";
        label[11] = static_cast<char>(ch);
        rememberInput(label);
        ++rowEventCount;
        return menu_row_event(static_cast<uint8_t>(ch - '0'), false);
    }

    uint8_t row = activatedRowForShiftedNumber(ch);
    if (row != 255) {
        char label[] = "row activate 0";
        label[13] = static_cast<char>('0' + row);
        rememberInput(label);
        ++rowEventCount;
        return menu_row_event(row, true);
    }

    return menu_event(Choice_Invalid);
}

void setup() {
    Serial.begin(115200);
    while (!Serial) {
    }

    printInputHelp();

    static const auto featureMenu =
        MENU(F("Feature Demo"),
            ITEM_MENU(F("Value entries"),
                MENU(F("Value entries"),
                    ITEM_INT(F("ITEM_INT"), &plainInt, 0, 10),
                    ITEM_INT(F("ITEM_INT step 5"), &stepInt, 0, 100, 5),
                    ITEM_INT_STEP(F("ITEM_INT_STEP"), &aliasStepInt, -20, 20, 2),
                    ITEM_BOOL(F("ITEM_BOOL default"), &boolDefault),
                    ITEM_BOOL(F("ITEM_BOOL custom"), &boolCustom, F("Stopped"), F("Running")),
                    ITEM_SELECT(F("ITEM_SELECT"), &selectChoice,
                        MENU_CHOICE(F("Off"), 0),
                        MENU_CHOICE(F("Auto"), 1),
                        MENU_CHOICE(F("Manual"), 2)
                    ),
                    ITEM_VALUE(F("ITEM_VALUE read-only"), getUptimeSeconds, 0),
                    ITEM_VALUE(F("ITEM_VALUE get/set"), getEditableValue, setEditableValue, &getterSetterValue, 0, 100),
                    ITEM_VALUE(F("ITEM_VALUE step 10"), getEditableValue, setEditableValue, &getterSetterStepValue, 0, 200, 10)
                )
            ),
            ITEM_MENU(F("Decorators"),
                MENU(F("Decorators"),
                    ITEM_FORMAT(ITEM_INT(F("ITEM_FORMAT PWM"), &pwmValue, 0, 255), formatPwm, 0),
                    ITEM_ON_CHANGE(ITEM_INT(F("ITEM_ON_CHANGE int"), &onChangeInt, 0, 10), onAnyValueChanged, 0),
                    ITEM_ON_CHANGE(ITEM_BOOL(F("ITEM_ON_CHANGE bool"), &onChangeBool), onAnyValueChanged, 0),
                    ITEM_BOOL(F("Show hidden item"), &showHiddenEntry, F("No"), F("Yes")),
                    ITEM_HIDDEN(ITEM_FUNC(F("ITEM_HIDDEN action"), hiddenAction), hiddenEntryIsHidden, 0),
                    ITEM_BOOL(F("Enable disabled item"), &enableDisabledEntry, F("No"), F("Yes")),
                    ITEM_DISABLED(ITEM_FUNC(F("ITEM_DISABLED action"), disabledAction), disabledEntryIsDisabled, 0),
                    ITEM_VALUE(F("Change callback count"), getOnChangeCount, 0)
                )
            ),
            ITEM_MENU(F("Runtime display"),
                MENU(F("Runtime display"),
                    ITEM_ON_CHANGE(ITEM_BOOL(F("Show title row"), &showTitleRow), applyRuntimeDisplayOptions, 0),
                    ITEM_ON_CHANGE(ITEM_BOOL(F("Show breadcrumbs"), &showBreadcrumbs), applyRuntimeDisplayOptions, 0),
                    ITEM_ON_CHANGE(ITEM_BOOL(F("Show affordances"), &showAffordances), applyRuntimeDisplayOptions, 0),
                    ITEM_ON_CHANGE(ITEM_BOOL(F("Show render flags"), &showRenderMetadata), applyRuntimeDisplayOptions, 0),
                    ITEM_FORMAT(ITEM_VALUE(F("Render flags state"), getZero, 0), formatRenderMetadataState, 0),
                    ITEM_FUNC(F("request_redraw()"), requestRedrawAction),
                    ITEM_FUNC(F("reset_navigation()"), resetNavigationAction)
                )
            ),
            ITEM_MENU(F("Input events"),
                MENU(F("Input events"),
                    ITEM_FORMAT(ITEM_VALUE(F("Last input event"), getZero, 0), formatLastInput, 0),
                    ITEM_VALUE(F("All input events"), getInputEventCount, 0),
                    ITEM_VALUE(F("Row/touch events"), getRowEventCount, 0),
                    ITEM_VALUE(F("Encoder deltas"), getDeltaEventCount, 0),
                    ITEM_VALUE(F("Long events"), getLongEventCount, 0),
                    ITEM_VALUE(F("Repeat events"), getRepeatEventCount, 0),
                    ITEM_FUNC(F("Print input help"), printInputHelp)
                )
            ),
            ITEM_MENU(F("Persistence"),
                MENU(F("Persistence"),
                    ITEM_FUNC(F("load_persistence()"), loadSnapshotAction),
                    ITEM_FUNC(F("save_persistence()"), saveSnapshotAction),
                    ITEM_VALUE(F("Load count"), getLoadCount, 0),
                    ITEM_VALUE(F("Save count"), getSaveCount, 0),
                    ITEM_VALUE(F("Current plain int"), getPlainInt, 0),
                    ITEM_VALUE(F("Saved plain int"), getSavedPlainInt, 0)
                )
            ),
            ITEM_MENU(F("Actions"),
                MENU(F("Actions"),
                    ITEM_FUNC(F("ITEM_FUNC"), plainAction),
                    ITEM_FUNC_CTX(F("ITEM_FUNC_CTX"), contextActionCallback, &contextAction),
                    ITEM_FUNC(F("Print current values"), printCurrentValues),
                    ITEM_FUNC(F("Reset example values"), resetValuesAction)
                )
            )
        );

    display_t display = make_display(64, 8, &demoDisplay, &DEMO_DISPLAY_OPS);
    input_source_t input = make_event_input(richInputStorage, &demoInput, readDemoInput);

    menuRuntime = menu_runtime_t::make(featureMenu, display, input, true);
    menuRuntime.set_persistence(loadSnapshot, saveSnapshot, 0);
    menuRuntime.set_show_title(showTitleRow);
    menuRuntime.set_show_breadcrumbs(showBreadcrumbs);
    menuRuntime.set_show_affordances(showAffordances);
    menuRuntime.begin();
}

void loop() {
    menuRuntime.service();
}
