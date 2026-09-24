# Rubric

The homework tracker's front end, rebuilt as a **Power Apps code app**: plain React + TypeScript
instead of the drag-and-drop canvas builder, styled in the iKB design language.

It replaces only the canvas app from the
[Homework Ticketing & Nag System spec](https://github.com/AlejandroE25/Portfolio/tree/main/docs/homework-ticketing).
The three SharePoint lists (`Assignments`, `CheckIns`, `Runtime`), the `Intake` and `Tick` flows, the
`[HW-n]` ticket emails and the inbox rule are unchanged — Rubric reads and writes the same rows the
canvas app did.

## What's on the screen

One screen, same as the spec: **check-in → log an assignment → open tickets**.

- **Check-in.** PrairieLearn, Gradescope, SmartPhysics. Today's `CheckIns` row is created the first
  time you open the app that day. Ticking the third box writes `CompletedAt`, which is what stops the
  nags on the next tick; un-ticking afterwards leaves it set, on purpose.
- **Log an assignment.** Name, due date, time (defaults to 11:59 PM), link, platform. The platform is
  guessed from the link. Creating the row fires the `Intake` flow, which sends the `[HW-n]` email.
- **Open tickets.** Grouped into Overdue / Due today / Upcoming, each showing its `HW-n` number, due
  time (red inside 24 hours) and platform, with **Open ↗** and **Done**. Done sets `Status = Done` and
  `CompletedAt`, the second door next to flagging the email complete.
- **Heartbeat.** The header shows `Runtime.LastTick` and turns amber when it's more than 45 minutes
  old — the Tick flow runs every 15, so that means it's off.

The list re-reads when you come back to the tab and every five minutes, so a ticket closed by
flagging its email disappears on its own.

## Run it locally

Needs Node.js 22+.

```bash
npm install
npm run dev
```

Until SharePoint is connected the app runs on **mock data** (sample tickets, saved in the browser's
localStorage) and shows a `mock data` badge. The dev server prints
`Error loading power.config.json` until you run `pa app init` below — that's expected.

## Connect it to Power Platform

These steps sign in with your Microsoft account, so run them on your own machine. `pa` is the Power
Apps CLI; it's installed with the project, so prefix it with `npx`.

**Before you start**

- **Licence.** Code apps need a **Power Apps Premium** licence for whoever *uses* the app (the free
  Developer Plan is enough to build and test). Check what your UIUC account includes.
- **Environment.** Code apps must be enabled for the environment. If `init` or `push` fails with a
  permissions or feature error, that setting is the likely cause.
- **Environment ID.** The GUID in `https://make.powerapps.com/environments/<env-id>/home`.

**1. Initialise the app** (creates `power.config.json`; a browser window opens to sign in):

```bash
npx pa app init --environment-id <env-id> --display-name "Rubric"
```

**2. Get a SharePoint connection.** Reuse the one your flows use, or create one at
`https://make.powerapps.com/environments/<env-id>/connections` → **+ New connection** → SharePoint.
Then find its ID:

```bash
npx pa connection list
```

**3. Find the site URL** and put it in `src/config.ts` as `SITE_URL`:

```bash
npx pa connection list-datasets --connector shared_sharepointonline -c <connection-id>
```

**4. Add the three lists** (names are case-sensitive):

```bash
npx pa app add data-source --connector shared_sharepointonline -c <connection-id> -d '<site-url>' --table 'Assignments'
npx pa app add data-source --connector shared_sharepointonline -c <connection-id> -d '<site-url>' --table 'CheckIns'
npx pa app add data-source --connector shared_sharepointonline -c <connection-id> -d '<site-url>' --table 'Runtime'
```

This generates services into `src/generated/`. Rubric detects them automatically and switches from
mock data to SharePoint — the `mock data` badge disappears. (`npx pa app run` serves the app against
live data locally; append `?mock` to any URL to force the mock.)

**5. Build and publish:**

```bash
npm run build
npx pa app push
```

`push` prints the app's URL (`https://apps.powerapps.com/play/e/<env>/app/<app>`). Open it on your
phone and **Add to Home Screen**, as with the canvas app — the whole point is that logging an
assignment is one tap away.

## If something doesn't line up

The SharePoint side couldn't be exercised against a real tenant while this was written, so these are
the likely first-run snags, all confined to [`src/data/sharepoint.ts`](src/data/sharepoint.ts):

- **"Value does not fall within the expected range"** when adding a ticket or pressing Done: the
  connector wants Choice columns as `{ Value: "..." }` rather than plain strings. Set
  `CHOICE_WRITE` to `'object'` at the top of the file.
- **"No generated service found for the … list"**: the adapter looks for either one service per list
  (`AssignmentsService.getAll/create/update`) or a single `SharePointOnlineService.GetItems/PostItem/
  PatchItem`. If the CLI generated something named differently, `grep "async " src/generated/services/*.ts`
  shows what exists, and the lookup in `buildClients()` is the one place to adjust.
- **Column errors** mean an internal column name differs from the spec (`DueAt`, `Link`, `Platform`,
  `Status`, `CompletedAt`, `CheckDate`, `PL`, `GS`, `SP`, `Value`). The generated model files in
  `src/generated/models/` list the real names.

## Layout

```
src/
  config.ts              site URL, list names, platforms, check-in sites
  data/
    types.ts             Assignment, CheckIn, and the DataStore interface
    sharepoint.ts        adapter over the generated connector services
    mock.ts              localStorage stand-in for local development
    index.ts             picks SharePoint when generated services exist, else mock
  lib/dates.ts           local-time formatting; due labels
  components/            Header, CheckInPanel, LogForm, TicketList, Toast
  App.tsx                the one screen
  index.css              iKB design tokens and styles
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (mock data until SharePoint is connected) |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | ESLint |
| `npx pa app run` | Run locally against live connectors |
| `npx pa app push` | Publish `dist/` to Power Apps |
