/*
    BetterMenu CYD Rover Console
    ----------------------------
    A graphical BetterMenu example for ESP32-2432S028R-style "Cheap Yellow
    Display" boards with a 320x240 ILI9341 TFT.

    This variant demonstrates a denser console layout with a proportional
    scrollbar, semantic row icons, a breadcrumb header, inline edit controls,
    disabled-row lock rendering, and value colors that distinguish editable,
    read-only, choice, and alert rows.

    The whole menu is still declared once. Everything CYD-specific is the
    TFT_eSPI adapter that draws BetterMenu's menu_render_line_t metadata.

    Input is Serial keys (w/s = up/down, e or d = select/enter/edit/save,
    q or a = back/cancel) so the display stays independent of any touch wiring.
    A touch adapter can be added later by emitting menu_row_event().

    Configure TFT_eSPI for your CYD board before compiling.
*/

#define MENU_MAX_LINE 64

#include <TFT_eSPI.h>
#include <BetterMenu.h>
#include <string.h>
#include <stdlib.h>
#include <math.h>

TFT_eSPI tft;
menu_runtime_t menuRuntime;
serial_keys_ctx_t serialInput;

// viewport rows (1 title + this many item rows). Keep in sync with make_display.
static const int VIEW_ROWS = 5;

// ----------------------------- backing state -----------------------------
static int  driveMode      = 1;     // 0 Idle 1 Manual 2 Auto 3 Follow
static int  maxSpeedPct    = 65;
static bool headlights     = false;
static int  pitchTrimTenth = -15;   // -1.5 deg
static int  kpMilli        = 1200;  // 1.20
static int  kiMilli        = 80;    // 0.08
static int  kdMilli        = 450;   // 0.45
static int  loopRateHz     = 200;
static int  pitchTenth     = 23;    // +2.3 deg (live IMU)
static int  headingDeg     = 247;
static int  battCentiV     = 1187;  // 11.87 V
static int  rangeMm        = 412;
static int  cellTempC      = 34;
static bool telemetryStream = false;
static int  telemetryHz    = 5;
static bool armed          = false;
static int  brightnessPct  = 80;
static int  themeSel       = 0;     // 0 Aurora 1 Slate 2 Mono
static bool screenFlip     = false;
static int  uptimeMin      = 154;   // 2h 34m

// ----------------------------- getters / setters -----------------------------
static int  gi(void *c) { return *static_cast<int *>(c); }
static void se(void *c, int v) { *static_cast<int *>(c) = v; }

static void fmtPct(void *c, char *o, uint8_t n)     { snprintf(o, n, "%d%%", *(int *)c); }
static void fmtMilli2(void *c, char *o, uint8_t n)  { int v = *(int *)c; snprintf(o, n, "%d.%02d", v / 1000, (v % 1000) / 10); }
static void fmtSignedTenths(int v, char *o, uint8_t n) {
    char sign = v < 0 ? '-' : '+';
    int av = abs(v);
    snprintf(o, n, "%c%d.%d deg", sign, av / 10, av % 10);
}

static void fmtTrim(void *c, char *o, uint8_t n)    { fmtSignedTenths(*(int *)c, o, n); }
static void fmtPitch(void *c, char *o, uint8_t n)   { fmtSignedTenths(*(int *)c, o, n); }
static void fmtHeading(void *c, char *o, uint8_t n) { snprintf(o, n, "%d deg", *(int *)c); }
static void fmtVolts(void *c, char *o, uint8_t n)   { int v = *(int *)c; snprintf(o, n, "%d.%02d V", v / 100, v % 100); }
static void fmtMm(void *c, char *o, uint8_t n)      { snprintf(o, n, "%d mm", *(int *)c); }
static void fmtTempC(void *c, char *o, uint8_t n)   { snprintf(o, n, "%d C", *(int *)c); }
static void fmtHz(void *c, char *o, uint8_t n)      { snprintf(o, n, "%d Hz", *(int *)c); }
static void fmtFirmware(void *, char *o, uint8_t n) { snprintf(o, n, "v0.5.3"); }
static void fmtUptime(void *c, char *o, uint8_t n)  { int m = *(int *)c; snprintf(o, n, "%dh %02dm", m / 60, m % 60); }

static bool telemetryRateDisabled(void *) { return !telemetryStream; }
static bool devToolsHidden(void *)        { return themeSel != 2; }   // shows only in Mono theme
static void onChanged(void *) {}
static void act() {}

// ----------------------------- color helpers -----------------------------
static uint16_t rgb(uint8_t r, uint8_t g, uint8_t b) { return tft.color565(r, g, b); }
static uint16_t mix(uint8_t r0,uint8_t g0,uint8_t b0, uint8_t r1,uint8_t g1,uint8_t b1, float t){
    return rgb((uint8_t)(r0+(r1-r0)*t), (uint8_t)(g0+(g1-g0)*t), (uint8_t)(b0+(b1-b0)*t));
}

// vertical-gradient fill clipped to a rounded rect (corners stay rounded)
static void fillCardGrad(int x,int y,int w,int h,int r,
                         uint8_t tr,uint8_t tg,uint8_t tb, uint8_t br_,uint8_t bg,uint8_t bb){
    tft.fillRoundRect(x, y, w, h, r, rgb(br_, bg, bb));
    for (int i = r; i < h - r; ++i) {
        float t = (float)i / (float)(h - 1);
        tft.drawFastHLine(x, y + i, w, mix(tr,tg,tb, br_,bg,bb, t));
    }
}

// ----------------------------- icon primitives -----------------------------
static void degPt(int cx,int cy,float r,float deg,int &ox,int &oy){ // 0=up, clockwise
    float a = deg * 3.14159265f / 180.0f; ox = cx + (int)lroundf(r*sinf(a)); oy = cy - (int)lroundf(r*cosf(a));
}
static void arcSeg(int cx,int cy,float r,float d0,float d1,uint16_t c){
    int px,py,x,y; degPt(cx,cy,r,d0,px,py);
    float step = (d1>d0)?6.0f:-6.0f;
    for (float d=d0+step; (step>0)?(d<=d1):(d>=d1); d+=step){ degPt(cx,cy,r,d,x,y); tft.drawLine(px,py,x,y,c); px=x; py=y; }
}
static void icCompass(int cx,int cy,uint16_t c){ tft.drawCircle(cx,cy,9,c); tft.fillTriangle(cx,cy-7,cx-3,cy+1,cx+3,cy+1,c); tft.drawLine(cx,cy+1,cx,cy+7,c); tft.fillCircle(cx,cy,1,c); }
static void icSpeedo(int cx,int cy,uint16_t c){ arcSeg(cx,cy+2,9,270,450,c); int ex,ey; degPt(cx,cy+2,8,45,ex,ey); tft.drawLine(cx,cy+2,ex,ey,c); tft.fillCircle(cx,cy+2,2,c); }
static void icHeadlight(int cx,int cy,uint16_t c){ arcSeg(cx-2,cy,9,180,360,c); tft.drawLine(cx-2,cy-9,cx-2,cy+9,c); for(int dy=-5;dy<=5;dy+=5) tft.drawLine(cx+5,cy+dy,cx+11,cy+dy,c); }
static void icLevel(int cx,int cy,uint16_t c){ tft.drawCircle(cx,cy,9,c); tft.drawLine(cx-8,cy+3,cx+8,cy-3,c); tft.drawCircle(cx+1,cy-1,2,c); }
static void icSliders(int cx,int cy,uint16_t c){ int ys[3]={cy-5,cy,cy+5}; int kx[3]={cx+3,cx-3,cx+5}; for(int i=0;i<3;i++){ tft.drawFastHLine(cx-8,ys[i],16,c); tft.fillCircle(kx[i],ys[i],2,c);} }
static void icSlider1(int cx,int cy,uint16_t c){ tft.drawFastHLine(cx-8,cy,16,c); tft.drawFastVLine(cx-8,cy-3,7,c); tft.drawFastVLine(cx+8,cy-3,7,c); tft.fillCircle(cx+3,cy,3,c); }
static void icRadar(int cx,int cy,uint16_t c){ tft.drawCircle(cx,cy,4,c); tft.drawCircle(cx,cy,8,c); int ex,ey; degPt(cx,cy,8,45,ex,ey); tft.drawLine(cx,cy,ex,ey,c); int bx,by; degPt(cx,cy,6,45,bx,by); tft.fillCircle(bx,by,1,c); }
static void icBroadcast(int cx,int cy,uint16_t c){ tft.fillCircle(cx,cy,2,c); arcSeg(cx,cy,6,20,160,c); arcSeg(cx,cy,9,30,150,c); arcSeg(cx,cy,6,200,340,c); arcSeg(cx,cy,9,210,330,c); }
static void icClock(int cx,int cy,uint16_t c){ tft.drawCircle(cx,cy,9,c); tft.drawLine(cx,cy,cx,cy-5,c); tft.drawLine(cx,cy,cx+5,cy+1,c); tft.fillCircle(cx,cy,1,c); }
static void icCrosshair(int cx,int cy,uint16_t c){ tft.drawCircle(cx,cy,6,c); int x0,y0,x1,y1; for(int d=0;d<360;d+=90){ degPt(cx,cy,6,d,x0,y0); degPt(cx,cy,10,d,x1,y1); tft.drawLine(x0,y0,x1,y1,c);} tft.fillCircle(cx,cy,1,c); }
static void icShield(int cx,int cy,uint16_t c){ int xs[6]={cx,cx+7,cx+7,cx,cx-7,cx-7}; int ys[6]={cy-9,cy-5,cy+2,cy+9,cy+2,cy-5}; for(int i=0;i<6;i++) tft.drawLine(xs[i],ys[i],xs[(i+1)%6],ys[(i+1)%6],c); tft.drawLine(cx-3,cy,cx-1,cy+3,c); tft.drawLine(cx-1,cy+3,cx+4,cy-3,c); }
static void icStop(int cx,int cy,uint16_t c){ tft.drawCircle(cx,cy,9,c); tft.fillCircle(cx,cy,4,c); }
static void icGear(int cx,int cy,uint16_t c){ int x0,y0,x1,y1; for(int d=0;d<360;d+=45){ degPt(cx,cy,5,d,x0,y0); degPt(cx,cy,9,d,x1,y1); tft.drawLine(x0,y0,x1,y1,c); tft.drawLine(x0+1,y0,x1+1,y1,c);} tft.drawCircle(cx,cy,5,c); tft.fillCircle(cx,cy,2,c); }
static void icSave(int cx,int cy,uint16_t c){ tft.drawRoundRect(cx-8,cy-8,17,17,2,c); tft.drawRect(cx-4,cy+1,9,7,c); tft.fillRect(cx+1,cy-7,5,5,c); }
static void icDot(int cx,int cy,uint16_t c){ tft.drawCircle(cx,cy,3,c); }

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
static void drawItemIcon(const char *label, uint8_t etype, int cx, int cy, uint16_t c){
    if      (eqi(label,"Drive mode"))    icCompass(cx,cy,c);
    else if (eqi(label,"Max speed"))     icSpeedo(cx,cy,c);
    else if (eqi(label,"Headlights"))    icHeadlight(cx,cy,c);
    else if (eqi(label,"Pitch trim") || eqi(label,"Pitch")) icLevel(cx,cy,c);
    else if (eqi(label,"PID tuning"))    icSliders(cx,cy,c);
    else if (eqi(label,"Sensors") || eqi(label,"Range")) icRadar(cx,cy,c);
    else if (eqi(label,"Telemetry"))     icBroadcast(cx,cy,c);
    else if (eqi(label,"Telemetry rate")|| eqi(label,"Loop rate") || eqi(label,"Cell temp") || eqi(label,"Uptime")) icClock(cx,cy,c);
    else if (eqi(label,"Calibrate IMU")) icCrosshair(cx,cy,c);
    else if (eqi(label,"Arm motors"))    icShield(cx,cy,c);
    else if (eqi(label,"E-STOP"))        icStop(cx,cy,c);
    else if (eqi(label,"System"))        icGear(cx,cy,c);
    else if (eqi(label,"Save tune"))     icSave(cx,cy,c);
    else if (eqi(label,"Kp")||eqi(label,"Ki")||eqi(label,"Kd")) icSlider1(cx,cy,c);
    else if (eqi(label,"Heading"))       icCompass(cx,cy,c);
    else if (etype==ENTRY_MENU)          icSliders(cx,cy,c);
    else                                 icDot(cx,cy,c);
}

// ----------------------------- text helpers -----------------------------
static void stripLabel(char *t){
    while (*t=='>' || *t==' ') memmove(t, t+1, strlen(t));
    char *e = strstr(t, "  (edit)"); if (e) *e='\0';
}
static char *splitValue(char *t){
    char *c = strchr(t, ':');
    if (!c) return 0;
    *c='\0'; ++c; while (*c==' ') ++c; return c;
}

// ----------------------------- layout / palette -----------------------------
static const int ROW_X0=8, ROW_X1=302, ROW_W=ROW_X1-ROW_X0, ROW_Y0=44, ROW_PITCH=36, ROW_H=32;

static void cydClear(void *){
    for (int y=0;y<240;y++) tft.drawFastHLine(0,y,320, mix(16,21,28, 11,15,21, (float)y/239.0f));
}
static void cydFlush(void *){}

static void cydRenderLine(void *ctx, menu_render_line_t const *line){
    if (!line) return;
    menu_runtime_t *rt = static_cast<menu_runtime_t *>(ctx);
    menu_cursor_t const *cur = (rt && rt->depth < MENU_MAX_STACK) ? &rt->stack[rt->depth] : 0;

    const uint16_t ACCENT=rgb(47,211,190), STEEL=rgb(150,166,182);
    const uint16_t TEXT=rgb(234,240,246), TEXT_SEL=rgb(248,253,253), MUTED=rgb(126,138,153);
    const uint16_t DIS=rgb(74,86,98), DIS_DIM=rgb(54,63,74);
    const uint16_t VAL_EDIT=rgb(95,224,196), VAL_RO=rgb(111,182,232), VAL_SEL=rgb(232,197,122), VAL_ALERT=rgb(240,122,110);
    const uint16_t ROW_BORDER=rgb(38,48,62), SEL_BORDER=rgb(47,211,190), SEL_GLOW=rgb(26,96,90);

    // ----- title / header -----
    if (line->kind == MENU_RENDER_TITLE){
        fillCardGrad(8,6,304,32,8, 28,38,52, 18,25,35);
        tft.drawRoundRect(8,6,304,32,8, rgb(46,58,74));
        char title[MENU_MAX_LINE]; strncpy(title, line->text?line->text:"", sizeof(title)); title[sizeof(title)-1]='\0';
        int tx=24;
        if (line->flags & MENU_RENDER_BACK_AVAILABLE){
            tft.drawRoundRect(11,12,16,20,4, ACCENT);
            tft.drawLine(22,16,17,22,ACCENT); tft.drawLine(17,22,22,28,ACCENT);
            tx=36;
        } else {
            tft.fillRoundRect(11,13,5,18,2, ACCENT);
        }
        tft.setTextDatum(TL_DATUM);
        char *slash = strchr(title,'/');
        if (slash){
            *slash='\0'; char *leaf=slash+1;
            tft.setTextColor(MUTED, rgb(23,31,43)); int w=tft.drawString(title, tx, 13, 2);
            tft.drawString(">", tx+w+5, 13, 2); int w2=tft.textWidth(">",2);
            tft.setTextColor(TEXT, rgb(23,31,43)); tft.drawString(leaf, tx+w+5+w2+5, 12, 2);
        } else {
            tft.setTextColor(TEXT, rgb(23,31,43)); tft.drawString(title, tx, 12, 2);
        }
        // ----- status chip + battery (right cluster) -----
        int pct = (int)lroundf((battCentiV/100.0f - 9.0f)/(12.6f-9.0f)*100.0f);
        if (pct<0) pct=0; if (pct>100) pct=100;
        uint16_t bcol = pct>50 ? rgb(86,216,168) : (pct>20 ? rgb(232,182,92) : rgb(240,122,110));
        int bx1=304, bw=22, bx0=bx1-bw, by0=16, by1=28;
        tft.drawRoundRect(bx0,by0,bw,by1-by0,2, MUTED);
        tft.fillRect(bx1+1,by0+3,2,by1-by0-6, MUTED);
        tft.fillRect(bx0+2,by0+2,(bw-4)*pct/100,(by1-by0)-4, bcol);
        char pbuf[8]; snprintf(pbuf,sizeof(pbuf),"%d%%",pct);
        tft.setTextDatum(TR_DATUM); tft.setTextColor(MUTED, rgb(23,31,43));
        int wp=tft.textWidth(pbuf,1); tft.drawString(pbuf, bx0-6, 18, 1);
        const char *ctxt = armed ? "ARMED" : "READY";
        uint16_t cfg = armed ? rgb(232,182,92) : rgb(86,216,168);
        uint16_t cbg = armed ? rgb(58,42,18)  : rgb(18,52,43);
        int wc=tft.textWidth(ctxt,1), cw=wc+18, cx1=bx0-6-wp-10, cx0=cx1-cw;
        tft.fillRoundRect(cx0,15,cw,14,7, cbg);
        tft.fillCircle(cx0+8,22,2, cfg);
        tft.setTextDatum(TL_DATUM); tft.setTextColor(cfg, cbg); tft.drawString(ctxt, cx0+13, 17, 1);
        return;
    }
    if (line->kind != MENU_RENDER_ITEM) return;

    // ----- scrollbar (drawn once, on the first item row) -----
    if (line->row == 1){
        uint8_t cnt = cur ? menu_runtime_t::menu_count(*cur) : 0;
        int total = cur ? menu_runtime_t::visible_count(*cur, cnt) : 0;
        int vtop = cur ? menu_runtime_t::raw_to_visible(*cur, cnt, line->item_index) : 0;
        int tbY0=ROW_Y0, tbY1=ROW_Y0+ROW_PITCH*4+ROW_H, span=tbY1-tbY0;
        if (total > VIEW_ROWS){
            tft.fillRoundRect(307,tbY0,4,span,2, rgb(34,43,56));
            int th = span*VIEW_ROWS/total; if (th<20) th=20;
            int denom = total-VIEW_ROWS; if (denom<1) denom=1;
            int ty = tbY0 + (span-th)*vtop/denom;
            tft.fillRoundRect(307,ty,4,th,2, rgb(58,150,140));
        }
    }

    uint8_t f = line->flags;
    bool sel=f&MENU_RENDER_SELECTED, edit=f&MENU_RENDER_EDITING, dis=f&MENU_RENDER_DISABLED, child=f&MENU_RENDER_HAS_CHILD;
    bool editable = cur ? menu_runtime_t::menu_int_has(*cur, line->item_index) : false;

    int y = ROW_Y0 + (line->row-1)*ROW_PITCH, y1=y+ROW_H, cy=y+ROW_H/2;
    uint16_t cardBg;
    if (sel){
        tft.fillRoundRect(ROW_X0-1,y-1,ROW_W+2,ROW_H+2,8, SEL_GLOW);
        fillCardGrad(ROW_X0,y,ROW_W,ROW_H,7, 17,55,60, 12,35,41);
        tft.drawRoundRect(ROW_X0,y,ROW_W,ROW_H,7, SEL_BORDER);
        tft.drawRoundRect(ROW_X0+1,y+1,ROW_W-2,ROW_H-2,6, SEL_BORDER);
        tft.fillRoundRect(ROW_X0+3,y+4,4,ROW_H-8,1, ACCENT);
        cardBg = rgb(15,45,50);
    } else {
        fillCardGrad(ROW_X0,y,ROW_W,ROW_H,7, 23,30,40, 16,22,31);
        tft.drawRoundRect(ROW_X0,y,ROW_W,ROW_H,7, ROW_BORDER);
        cardBg = rgb(20,26,35);
    }

    char buf[MENU_MAX_LINE]; strncpy(buf, line->text?line->text:"", sizeof(buf)); buf[sizeof(buf)-1]='\0';
    stripLabel(buf);
    char *val = splitValue(buf);
    bool estop = eqi(buf,"E-STOP");

    uint16_t icol = dis ? DIS : (estop ? VAL_ALERT : (sel ? ACCENT : STEEL));
    drawItemIcon(buf, line->entry_type, ROW_X0+22, cy, icol);

    uint16_t lcol = dis ? DIS : (sel ? TEXT_SEL : (estop ? VAL_ALERT : TEXT));
    tft.setTextDatum(TL_DATUM); tft.setTextColor(lcol, cardBg);
    tft.drawString(buf, ROW_X0+44, y+9, 2);

    if (edit && val){
        int minusX = 196, plusX = 284;
        tft.setTextDatum(MC_DATUM); tft.setTextColor(VAL_EDIT, cardBg); tft.drawString(val, 251, cy, 2);
        tft.fillRoundRect(minusX,y+7,18,ROW_H-14,4, cardBg); tft.drawRoundRect(minusX,y+7,18,ROW_H-14,4, ACCENT); tft.drawLine(minusX+5,cy,minusX+13,cy, ACCENT);
        tft.fillRoundRect(plusX,y+7,18,ROW_H-14,4, cardBg); tft.drawRoundRect(plusX,y+7,18,ROW_H-14,4, ACCENT); tft.drawLine(plusX+5,cy,plusX+13,cy, ACCENT); tft.drawLine(plusX+9,cy-4,plusX+9,cy+4, ACCENT);
    } else if (child){
        uint16_t cc = sel?ACCENT:MUTED; tft.drawLine(292,y+11,297,y+16,cc); tft.drawLine(297,y+16,292,y+21,cc);
    } else if (val){
        uint16_t vcol = dis ? DIS_DIM
                      : (line->entry_type==ENTRY_BOOL || line->entry_type==ENTRY_SELECT) ? VAL_SEL
                      : (editable ? VAL_EDIT : VAL_RO);
        int vr = dis ? 286 : 295;
        tft.setTextDatum(TR_DATUM); tft.setTextColor(vcol, cardBg); tft.drawString(val, vr, y+9, 2);
        if (dis){ tft.drawRoundRect(294,y+16,8,7,1, DIS); arcSeg(298,y+16,3,180,360, DIS); }
    }
}

static display_ops_t const CYD_DISPLAY_OPS = { &cydClear, 0, &cydFlush, &cydRenderLine };

void setup(){
    Serial.begin(115200);
    tft.init();
    tft.setRotation(1);
    tft.fillScreen(TFT_BLACK);

    auto sub_pid =
        MENU(F("PID tuning"),
            ITEM_FORMAT(ITEM_VALUE(F("Kp"), gi, se, &kpMilli, 0, 5000, 10), fmtMilli2, &kpMilli),
            ITEM_FORMAT(ITEM_VALUE(F("Ki"), gi, se, &kiMilli, 0, 5000, 10), fmtMilli2, &kiMilli),
            ITEM_FORMAT(ITEM_VALUE(F("Kd"), gi, se, &kdMilli, 0, 5000, 10), fmtMilli2, &kdMilli),
            ITEM_INT(F("Loop rate"), &loopRateHz, 50, 400, 10),
            ITEM_FUNC(F("Save tune"), act));
    auto sub_sensors =
        MENU(F("Sensors"),
            ITEM_FORMAT(ITEM_VALUE(F("Pitch"),     gi, &pitchTenth), fmtPitch,   &pitchTenth),
            ITEM_FORMAT(ITEM_VALUE(F("Heading"),   gi, &headingDeg), fmtHeading, &headingDeg),
            ITEM_FORMAT(ITEM_VALUE(F("Battery"),   gi, &battCentiV), fmtVolts,   &battCentiV),
            ITEM_FORMAT(ITEM_VALUE(F("Range"),     gi, &rangeMm),    fmtMm,      &rangeMm),
            ITEM_FORMAT(ITEM_VALUE(F("Cell temp"), gi, &cellTempC),  fmtTempC,   &cellTempC));
    auto sub_system =
        MENU(F("System"),
            ITEM_INT(F("Brightness"), &brightnessPct, 10, 100, 10),
            ITEM_SELECT(F("Theme"), &themeSel,
                MENU_CHOICE(F("Aurora"),0), MENU_CHOICE(F("Slate"),1), MENU_CHOICE(F("Mono"),2)),
            ITEM_BOOL(F("Screen flip"), &screenFlip, F("Off"), F("On")),
            ITEM_HIDDEN(ITEM_FUNC(F("Dev tools"), act), devToolsHidden, 0),
            ITEM_FORMAT(ITEM_VALUE(F("Firmware"), gi, &uptimeMin), fmtFirmware, 0),
            ITEM_FORMAT(ITEM_VALUE(F("Uptime"),   gi, &uptimeMin), fmtUptime, &uptimeMin));

    static const auto rootMenu =
        MENU(F("Rover"),
            ITEM_SELECT(F("Drive mode"), &driveMode,
                MENU_CHOICE(F("Idle"),0), MENU_CHOICE(F("Manual"),1),
                MENU_CHOICE(F("Auto"),2), MENU_CHOICE(F("Follow"),3)),
            ITEM_FORMAT(ITEM_INT(F("Max speed"), &maxSpeedPct, 0, 100, 5), fmtPct, &maxSpeedPct),
            ITEM_BOOL(F("Headlights"), &headlights, F("Off"), F("On")),
            ITEM_FORMAT(ITEM_VALUE(F("Pitch trim"), gi, se, &pitchTrimTenth, -50, 50, 1), fmtTrim, &pitchTrimTenth),
            ITEM_MENU(F("PID tuning"), sub_pid),
            ITEM_MENU(F("Sensors"), sub_sensors),
            ITEM_ON_CHANGE(ITEM_BOOL(F("Telemetry"), &telemetryStream, F("Quiet"), F("Stream")), onChanged, 0),
            ITEM_DISABLED(ITEM_FORMAT(ITEM_INT(F("Telemetry rate"), &telemetryHz, 1, 50, 1), fmtHz, &telemetryHz),
                          telemetryRateDisabled, 0),
            ITEM_FUNC(F("Calibrate IMU"), act),
            ITEM_ON_CHANGE(ITEM_BOOL(F("Arm motors"), &armed, F("Safe"), F("Armed")), onChanged, 0),
            ITEM_FUNC(F("E-STOP"), act),
            ITEM_MENU(F("System"), sub_system));

    // display ctx = &menuRuntime so the adapter can query true editability + scroll position
    display_t display = make_display(60, VIEW_ROWS + 1, &menuRuntime, &CYD_DISPLAY_OPS);
    input_source_t input = make_serial_keys_input(serialInput);

    menuRuntime = menu_runtime_t::make(rootMenu, display, input, false); // no row numbers
    menuRuntime.set_show_title(true);
    menuRuntime.set_show_breadcrumbs(true);
    menuRuntime.set_show_affordances(false); // affordances are drawn from flags, not text
    menuRuntime.begin();
}

void loop(){
    menuRuntime.service();
}
