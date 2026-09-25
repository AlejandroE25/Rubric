// Paste into the screen's OnVisible. Today's CheckIns row is created the first time the app
// is opened that day; a day it's never opened has no row, which the Tick flow reads as
// "not done".
Set(gToday, Today());
Set(gCheckIn, LookUp(CheckIns, Title = Text(gToday, "yyyy-mm-dd")));
If(IsBlank(gCheckIn),
    Set(gCheckIn,
        Patch(CheckIns, Defaults(CheckIns),
            { Title: Text(gToday, "yyyy-mm-dd"),
              CheckDate: gToday,
              PL: false, CS: false, CV: false, SP: false }))
);
Set(gTick, LookUp(Runtime, Title = "LastTick").Value)
