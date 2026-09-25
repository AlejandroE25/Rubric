# Rubric in the canvas builder

The code-app version can't be published to the UIUC tenant (`CodeAppOperationNotAllowedInEnvironment`:
code apps are off in the Default environment). This folder builds the same one screen for the
**canvas** builder instead, pasted in as YAML rather than dragged together.

- **HTML text controls** draw everything you only look at: the header and `Last tick` heartbeat,
  the blue panel headers, the check-in status line, and each ticket row (`HW-n` tag, bold title,
  due time in red inside 24 hours, platform).
- **Native controls** handle input: the four check-in buttons, the form fields, **Add ticket**,
  **Open ↗** and **Done**, all styled flat from the iKB palette.
- **Colours** come from named formulas (`ikbBg`, `ikbAccent`, …), so the palette is one place.

It reads and writes the same `Assignments`, `CheckIns` and `Runtime` lists; the flows and inbox
rule don't change. The check-in covers PL, CS, CV and SP, so `CheckIns` needs the `CS` and `CV`
Yes/No columns (see the main README).

## Files

| File | Where it goes |
|---|---|
| [`app-formulas.fx`](app-formulas.fx) | **App → Formulas** |
| [`screen-onvisible.fx`](screen-onvisible.fx) | the screen's **OnVisible** |
| [`screen.pa.yaml`](screen.pa.yaml) | pasted onto the screen as code |
| [`build.py`](build.py) | generates `screen.pa.yaml`; edit this, then `python3 canvas/build.py` |

## Pasting it in

1. **Formulas.** Select **App** in the Tree view, pick the **Formulas** property, and paste the
   contents of `app-formulas.fx`.
2. **A clean screen.** Add a new blank screen and delete the old one. The pasted controls reuse
   the old names (`btnAdd`, `txtName`, `dpDueAt`, …); if the old controls still exist, Studio
   renames the new ones and the formulas that refer to them break.
3. **Screen properties.** On the new screen set `Fill` to `ikbBg` and paste `screen-onvisible.fx`
   into `OnVisible`.
4. **The controls.** Copy the whole of `screen.pa.yaml`, right-click the screen in the Tree view
   and choose **Paste code** (or select the screen and press Ctrl+V).
5. **Try it.** Run the app (or re-trigger OnVisible) so `gCheckIn` and `gTick` are set.

## If the paste is rejected

Only `Classic/Button@2.2.0` is confirmed from your Studio; the other control versions in
`build.py` are best guesses. If Studio names a control or version it doesn't accept, insert one
of that control on any screen, right-click it → **Copy code**, and put its `Control:` line
(and `Variant:`, for the gallery and containers) into the `V` table at the top of `build.py`.
The ones most likely to need it:

| Key in `build.py` | Control | Guessed as |
|---|---|---|
| `container` | Vertical/horizontal container | `GroupContainer@1.3.0`, `Variant: AutoLayout` |
| `html` | HTML text | `HtmlViewer@2.1.0` |
| `gallery` | Blank vertical gallery | `Gallery@2.15.0`, `Variant: Vertical` |
| `text` | Text input (classic) | `Classic/TextInput@2.3.2` |
| `dropdown` | Drop down (classic) | `Classic/DropDown@2.3.1` |
| `date` | Date picker (classic) | `Classic/DatePicker@2.6.0` |

An unknown *property* on a control is the other likely rejection; delete that line and paste again.

## Limits of the HTML text control

No JavaScript, no `<style>` blocks (inline `style=""` only), no hover effects, and clicks inside it
can only follow links — which is why every button is a native control.
