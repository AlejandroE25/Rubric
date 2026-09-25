"""Generate the Rubric canvas screen as Power Apps YAML (paste into Studio).

The code-app version of Rubric can't be published to the UIUC tenant, so this builds the
same one screen for the canvas builder: HTML text controls draw everything that is only
looked at, native controls handle input, and every colour comes from the named formulas in
app-formulas.fx. Run `python3 canvas/build.py` after editing; it rewrites screen.pa.yaml.
"""

from pathlib import Path

import yaml

OUT = Path(__file__).with_name("screen.pa.yaml")

# Control versions. Classic/Button is taken from a real paste out of Studio; the others are
# best guesses. If Studio rejects one, insert that control, right-click it → Copy code, and
# replace the version here.
V = {
    "container": "GroupContainer@1.3.0",
    "html": "HtmlViewer@2.1.0",
    "button": "Classic/Button@2.2.0",
    "text": "Classic/TextInput@2.3.2",
    "dropdown": "Classic/DropDown@2.3.1",
    "date": "Classic/DatePicker@2.6.0",
    "gallery": "Gallery@2.15.0",
}

# Check-in sites: CheckIns column → label. Must match CHECK_SITES in src/config.ts.
SITES = [("PL", "PrairieLearn"), ("CS", "CS173.tech"), ("CV", "Canvas"), ("SP", "SmartPhysics")]

# Width of the centred column, like the web app's max-width.
COL_W = "=Min(760, Parent.Width - 24)"
FONT = "=Font.Arial"


def f(expr: str) -> str:
    """A Power Fx formula as the YAML value Studio expects."""
    return "=" + expr.strip()


def ctrl(name, control, props, children=None, variant=None):
    body = {"Control": control}
    if variant:
        body["Variant"] = variant
    body["Properties"] = props
    if children:
        body["Children"] = children
    return {name: body}


def square(props):
    for corner in ("RadiusTopLeft", "RadiusTopRight", "RadiusBottomLeft", "RadiusBottomRight"):
        props[corner] = "=0"
    return props


def in_column(props, height):
    """Child of the root column: centred, fixed width, fixed height."""
    props.update({
        "AlignInContainer": "=AlignInContainer.Center",
        "FillPortions": "=0",
        "Width": COL_W,
        "Height": f"={height}" if isinstance(height, int) else height,
    })
    return props


def html(name, text, height, extra=None):
    props = {
        "HtmlText": f(text),
        "AutoHeight": "=false",
        "Font": FONT,
        "Size": "=10",
        "Color": "=ikbText",
        "PaddingTop": "=0",
        "PaddingBottom": "=0",
        "PaddingLeft": "=0",
        "PaddingRight": "=0",
    }
    props.update(extra or {})
    return ctrl(name, V["html"], in_column(props, height))


def ghost_button(name, text, on_select, extra=None):
    """iKB .btn-submit: flat grey, lighter on hover."""
    props = square({
        "Text": f(text),
        "OnSelect": f(on_select),
        "Font": FONT,
        "Size": "=10",
        "FontWeight": "=FontWeight.Normal",
        "Fill": "=ikbBtn",
        "Color": "=ikbText",
        "BorderColor": "=ikbRule",
        "BorderStyle": "=BorderStyle.Solid",
        "BorderThickness": "=1",
        "HoverFill": "=ikbBtnHover",
        "HoverColor": "=ikbText",
        "HoverBorderColor": "=ikbAccent",
        "PressedFill": "=ikbInput",
        "PressedColor": "=ikbText",
        "PressedBorderColor": "=ikbAccent",
    })
    props.update(extra or {})
    return ctrl(name, V["button"], props)


def field_style(props, hover=True):
    """Dark input: #1e1e1e fill, #555 border, blue border on hover."""
    props.update({
        "Font": FONT,
        "Size": "=10",
        "Fill": "=ikbInput",
        "Color": "=ikbText",
        "BorderColor": "=ikbRule",
        "BorderStyle": "=BorderStyle.Solid",
        "BorderThickness": "=1",
    })
    if hover:
        props.update({"HoverFill": "=ikbInput", "HoverBorderColor": "=ikbAccent"})
    return props


def panel_head(name, text):
    # Blue panel-header bar, the iKB signature.
    return html(name, f'''
"<div style='background:#3c5070;color:#ffffff;font-family:Arial;font-weight:bold;font-size:12px;padding:5px 10px;'>" & {text} & "</div>"
''', 26)


# ── Header ──────────────────────────────────────────────────────────────────

HEADER = html("htmHeader", '''
With(
    { t: IfError(DateTimeValue(gTick), Blank()) },
    With(
        { mins: If(IsBlank(t), -1, DateDiff(t, Now(), TimeUnit.Minutes)) },
        "<div style='font-family:Arial;padding:9px 2px 8px;border-bottom:2px solid #555;'>" &
        "<span style='color:#7aaee8;font-size:17px;font-weight:bold;font-style:italic;'>Rubric</span>" &
        "<span style='float:right;padding-top:4px;font-size:11px;" &
            If(mins < 0 || mins > 45, "color:#e0a060;font-weight:bold;'>", "color:#777777;'>") &
            "Last tick: " &
            If(mins < 0, "never, flow may be off",
               mins < 1, "just now",
               mins < 60, mins & "m ago",
               Text(t, "ddd m/d h:mm AM/PM")) &
            If(mins > 45, ", flow may be off", "") &
        "</span></div>"
    )
)
''', 44)

# ── Check-in ────────────────────────────────────────────────────────────────

ALL_TICKED = " && ".join(f"gCheckIn.{k}" for k, _ in SITES)


def site_button(key, label):
    on = f"gCheckIn.{key}"
    props = square({
        "Text": f'If({on}, "✓  {label}", "{label}")',
        "OnSelect": f(f'''
Set(gCheckIn, Patch(CheckIns, gCheckIn, {{ {key}: !{on} }}));
If({ALL_TICKED} && IsBlank(gCheckIn.CompletedAt),
    Set(gCheckIn, Patch(CheckIns, gCheckIn, {{ CompletedAt: Now() }}));
    Notify("Check-in done: nags off until tomorrow", NotificationType.Success)
)'''),
        "Font": FONT,
        "Size": "=11",
        "FontWeight": "=FontWeight.Normal",
        "Fill": f"=If({on}, ikbGreenFill, ikbInput)",
        "Color": f"=If({on}, ikbGreen, ikbText)",
        "BorderColor": f"=If({on}, ikbGreenLine, ikbBorder)",
        "BorderStyle": "=BorderStyle.Solid",
        "BorderThickness": "=1",
        "HoverFill": f"=If({on}, ikbGreenFill, ikbSurface)",
        "HoverColor": f"=If({on}, ikbGreen, ikbText)",
        "HoverBorderColor": "=ikbAccent",
        "PressedFill": "=ikbGreenFill",
        "PressedColor": "=ikbGreen",
        "PressedBorderColor": "=ikbAccent",
        "FillPortions": "=1",
        "LayoutMinWidth": "=150",
        "Height": "=40",
    })
    return ctrl(f"btn{key}", V["button"], props)


SITES_ROW = ctrl(
    "conSites",
    V["container"],
    in_column({
        "LayoutDirection": "=LayoutDirection.Horizontal",
        "LayoutWrap": "=true",
        "LayoutGap": "=8",
        "LayoutAlignItems": "=LayoutAlignItems.Stretch",
        "Fill": "=RGBA(0, 0, 0, 0)",
        "BorderThickness": "=0",
        "DropShadow": "=DropShadow.None",
    }, "=If(Self.Width < 640, 88, 40)"),
    [site_button(k, label) for k, label in SITES],
    variant="AutoLayout",
)

CHECKIN_STATUS = html("htmCheckInStatus", f'''
If(
    !IsBlank(gCheckIn.CompletedAt),
    "<div style='font-family:Arial;font-size:13px;color:#6ec86e;'>● Checked in at " & Text(gCheckIn.CompletedAt, "h:mm AM/PM") & "</div>",
    With(
        {{ left: {len(SITES)} - CountIf([{", ".join(f"gCheckIn.{k}" for k, _ in SITES)}], Value = true) }},
        "<div style='font-family:Arial;font-size:13px;color:#e08080;'>● " & left & If(left = 1, " site left", " sites left") &
        If(Weekday(Today(), StartOfWeek.Monday) > 5, " <span style='color:#777777;'>· weekend, no nags</span>", "") & "</div>"
    )
)
''', 22)

# ── Log an assignment ───────────────────────────────────────────────────────

TXT_NAME = ctrl("txtName", V["text"], in_column(square(field_style({
    "Default": '=""',
    "HintText": '="Assignment name, e.g. MATH 241 HW 8"',
})), 32))

DUE_ROW = ctrl(
    "conDueRow",
    V["container"],
    in_column({
        "LayoutDirection": "=LayoutDirection.Horizontal",
        "LayoutGap": "=8",
        "LayoutAlignItems": "=LayoutAlignItems.Stretch",
        "Fill": "=RGBA(0, 0, 0, 0)",
        "BorderThickness": "=0",
        "DropShadow": "=DropShadow.None",
    }, 32),
    [
        ctrl("dpDueAt", V["date"], field_style({
            "DefaultDate": "=Today()",
            "IconBackground": "=ikbBtn",
            "IconFill": "=ikbText",
            "FillPortions": "=2",
            "LayoutMinWidth": "=120",
        }, hover=False)),
        # Hours 0–23 as text so the existing Patch's Value(drpHour.Selected.Value) still works.
        ctrl("drpHour", V["dropdown"], square(field_style({
            "Items": '=ForAll(Sequence(24, 0), Text(Value))',
            "Default": '="23"',
            "ChevronBackground": "=ikbBtn",
            "ChevronFill": "=ikbText",
            "SelectionFill": "=ikbFill",
            "SelectionColor": "=RGBA(255, 255, 255, 1)",
            "FillPortions": "=1",
            "LayoutMinWidth": "=64",
        }))),
        ctrl("drpMin", V["dropdown"], square(field_style({
            "Items": '=["00", "15", "30", "45", "59"]',
            "Default": '="59"',
            "ChevronBackground": "=ikbBtn",
            "ChevronFill": "=ikbText",
            "SelectionFill": "=ikbFill",
            "SelectionColor": "=RGBA(255, 255, 255, 1)",
            "FillPortions": "=1",
            "LayoutMinWidth": "=64",
        }))),
    ],
    variant="AutoLayout",
)

TXT_LINK = ctrl("txtLink", V["text"], in_column(square(field_style({
    "Default": '=""',
    "HintText": '="Link (https://…)"',
})), 32))

ADD_ON_SELECT = '''
If( IsBlank(txtName.Text),
    Notify("Name required", NotificationType.Error),
    Patch(Assignments, Defaults(Assignments),
        { Title: txtName.Text,
          DueAt: DateAdd(
                   DateAdd(dpDueAt.SelectedDate, Value(drpHour.Selected.Value), TimeUnit.Hours),
                   Value(drpMin.Selected.Value), TimeUnit.Minutes),
          Link: txtLink.Text,
          Platform: { Value: drpPlatform.Selected.Value },
          Status: { Value: "To Do" } });
    Reset(txtName); Reset(txtLink); Reset(drpPlatform);
    Notify("Ticket created: email on its way", NotificationType.Success)
)
'''

PLATFORM_ROW = ctrl(
    "conPlatformRow",
    V["container"],
    in_column({
        "LayoutDirection": "=LayoutDirection.Horizontal",
        "LayoutGap": "=8",
        "LayoutAlignItems": "=LayoutAlignItems.Stretch",
        "Fill": "=RGBA(0, 0, 0, 0)",
        "BorderThickness": "=0",
        "DropShadow": "=DropShadow.None",
    }, 32),
    [
        # Guesses the platform from the link, so most entries need no dropdown change.
        ctrl("drpPlatform", V["dropdown"], square(field_style({
            "Items": "=Choices(Assignments.Platform)",
            "Default": f('''
With({ l: Lower(txtLink.Text) },
    If("prairielearn" in l, "PrairieLearn",
       "cs173" in l, "CS173.tech",
       "canvas" in l, "Canvas",
       "smartphysics" in l, "SmartPhysics",
       "Other"))'''),
            "ChevronBackground": "=ikbBtn",
            "ChevronFill": "=ikbText",
            "SelectionFill": "=ikbFill",
            "SelectionColor": "=RGBA(255, 255, 255, 1)",
            "FillPortions": "=1",
        }))),
        ctrl("btnAdd", V["button"], square({
            "Text": '="Add ticket"',
            "OnSelect": f(ADD_ON_SELECT),
            "Font": FONT,
            "Size": "=10",
            "FontWeight": "=FontWeight.Normal",
            "Fill": "=ikbFill",
            "Color": "=RGBA(255, 255, 255, 1)",
            "BorderColor": "=ikbAccent",
            "BorderStyle": "=BorderStyle.Solid",
            "BorderThickness": "=1",
            "HoverFill": "=ColorValue(\"#46608a\")",
            "HoverColor": "=RGBA(255, 255, 255, 1)",
            "HoverBorderColor": "=ikbAccent2",
            "PressedFill": "=ikbFill",
            "PressedColor": "=RGBA(255, 255, 255, 1)",
            "PressedBorderColor": "=ikbAccent2",
            "FillPortions": "=0",
            "Width": "=130",
        })),
    ],
    variant="AutoLayout",
)

# ── Open tickets ────────────────────────────────────────────────────────────

TICKET_HTML = '''
With(
    { h: DateDiff(Now(), ThisItem.DueAt, TimeUnit.Hours),
      title: Substitute(Substitute(ThisItem.Title, "&", "&amp;"), "<", "&lt;") },
    "<div style='font-family:Arial;background:#2a2a2a;border:1px solid #444444;border-left:3px solid " &
        If(h < 0, "#e08080", h < 24, "#e0a060", "#444444") & ";padding:6px 9px;height:40px;overflow:hidden;'>" &
    "<div style='white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>" &
        "<span style='color:#777777;font-size:11px;'>HW-" & ThisItem.ID & "</span>&nbsp; " &
        "<b style='color:#e0e0e0;font-size:13px;'>" & title & "</b></div>" &
    "<div style='font-size:12px;margin-top:2px;'>" &
        "<span style='color:" & If(h < 24, "#e08080", "#999999") & If(h < 0, ";font-weight:bold", "") & ";'>" &
        If(h < 0, "overdue · was " & Text(ThisItem.DueAt, "ddd m/d h:mm AM/PM"),
           h < 24, "due in " & h & "h · " & Text(ThisItem.DueAt, "h:mm AM/PM"),
           Text(ThisItem.DueAt, "ddd m/d · h:mm AM/PM")) &
        "</span>&nbsp; <span style='color:#777777;'>" & ThisItem.Platform.Value & "</span></div>" &
    "</div>"
)
'''

GALLERY = ctrl(
    "galOpen",
    V["gallery"],
    in_column({
        "Items": '=SortByColumns(Filter(Assignments, Status.Value = "To Do"), "DueAt", SortOrder.Ascending)',
        "TemplateSize": "=62",
        "TemplatePadding": "=0",
        "ShowScrollbar": "=false",
        "Fill": "=RGBA(0, 0, 0, 0)",
        "BorderThickness": "=0",
    }, "=Max(1, CountRows(Self.AllItems)) * 62"),
    [
        ctrl("htmTicket", V["html"], {
            "HtmlText": f(TICKET_HTML),
            "AutoHeight": "=false",
            "X": "=0",
            "Y": "=4",
            "Width": "=Parent.TemplateWidth - 148",
            "Height": "=56",
            "PaddingTop": "=0",
            "PaddingBottom": "=0",
            "PaddingLeft": "=0",
            "PaddingRight": "=0",
            "Font": FONT,
            "Color": "=ikbText",
        }),
        ghost_button("btnOpen", '"Open ↗"', "Launch(ThisItem.Link)", {
            "Visible": "=!IsBlank(ThisItem.Link)",
            "X": "=Parent.TemplateWidth - 142",
            "Y": "=16",
            "Width": "=68",
            "Height": "=32",
        }),
        ghost_button("btnDone", '"Done"', 'Patch(Assignments, ThisItem, { Status: { Value: "Done" }, CompletedAt: Now() })', {
            "X": "=Parent.TemplateWidth - 68",
            "Y": "=16",
            "Width": "=68",
            "Height": "=32",
            "HoverFill": "=ikbGreenFill",
            "HoverColor": "=ikbGreen",
        }),
    ],
    variant="Vertical",
)

EMPTY = html("htmEmpty", '''
"<div style='font-family:Arial;font-size:13px;color:#999999;padding:4px 2px;'>Nothing open. Enjoy it.</div>"
''', 26, {"Visible": "=CountRows(galOpen.AllItems) = 0"})

# ── Root ────────────────────────────────────────────────────────────────────

ROOT = ctrl(
    "conRubric",
    V["container"],
    {
        "X": "=0",
        "Y": "=0",
        "Width": "=Parent.Width",
        "Height": "=Parent.Height",
        "Fill": "=ikbBg",
        "BorderThickness": "=0",
        "DropShadow": "=DropShadow.None",
        "LayoutDirection": "=LayoutDirection.Vertical",
        "LayoutJustifyContent": "=LayoutJustifyContent.Start",
        "LayoutAlignItems": "=LayoutAlignItems.Center",
        "LayoutGap": "=8",
        "LayoutOverflowY": "=LayoutOverflow.Scroll",
        "PaddingBottom": "=24",
    },
    [
        HEADER,
        panel_head("htmCheckInHead", '"Check-in · " & Text(gToday, "dddd m/d")'),
        SITES_ROW,
        CHECKIN_STATUS,
        panel_head("htmLogHead", '"Log an assignment"'),
        TXT_NAME,
        DUE_ROW,
        TXT_LINK,
        PLATFORM_ROW,
        panel_head("htmOpenHead", '"Open tickets (" & CountRows(galOpen.AllItems) & ")"'),
        GALLERY,
        EMPTY,
    ],
    variant="AutoLayout",
)


class Literal(str):
    pass


def literal_multiline(dumper, s):
    style = "|" if "\n" in s else None
    return dumper.represent_scalar("tag:yaml.org,2002:str", s, style=style)


yaml.add_representer(str, literal_multiline)

# No leading comment: Studio's paste expects the text to start at the first control.
OUT.write_text(yaml.dump([ROOT], sort_keys=False, allow_unicode=True, width=1000))
print(f"wrote {OUT}")
