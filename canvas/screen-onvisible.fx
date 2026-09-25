// Paste into the screen's OnVisible. Today's CheckIns row is created the first time the app
// is opened that day; a day it's never opened has no row, which the Tick flow reads as
// "not done". The check-in buttons repeat this if it hasn't run, so it's a head start rather
// than a requirement.
Set(gToday, Today());
Set(gCheckIn, LookUp(CheckIns, Title = Text(gToday, "yyyy-mm-dd")));
If(IsBlank(gCheckIn),
    Set(gCheckIn,
        Patch(CheckIns, Defaults(CheckIns),
            { Title: Text(gToday, "yyyy-mm-dd"),
              CheckDate: gToday,
              PL: false, CS: false, CV: false, SP: false }))
)
