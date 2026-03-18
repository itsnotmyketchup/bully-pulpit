# Architecture

This is a compact map of how Bully Pulpit actually runs.

## High-Level Model

The app is a single-player political simulation built as one React app with one dominant orchestrator: `src/App.jsx`.

Runtime responsibilities split like this:

- `App.jsx`: owns state, weekly turn progression, action handlers, event resolution, modal flow
- `data/`: authored game content and static lookup tables
- `logic/`: reusable calculators and simulation helpers
- `systems/`: larger subsystem helpers that do not fit simple utility logic
- `components/`: rendering and interaction surfaces

There is no backend and no persistence layer in the repo. Game state is entirely in-memory React state.

## File Ownership

### State owner

`src/App.jsx` is the source of truth for:

- simulation time
- stats and macro state
- Congress and faction relationships/trust/unity
- bills, executive orders, promises, surrogates
- diplomacy and international metrics
- elections and inauguration staging
- cabinet appointments
- notifications, logs, event/modals

### Content authoring

`src/data/` contains the authored knobs:

- `policies.js`: bills, categories, amendment definitions, lock rules
- `executiveOrders.js`: EO catalog and choice/outcome builders
- `events.js`: dynamic event pool generation plus chain definitions
- `visits.js`: domestic visit definitions
- `speeches.js`: speech topics and positions
- `factions.js`, `countries.js`, `states.js`, `stats.js`: base world model

### Pure-ish simulation helpers

`src/logic/` holds the main reusable logic:

- `macroEconomy.js`: hidden macro model, Fed decisions, visible-stat derivation
- `billProgression.js`: bill-stage support/vote resolution
- `approvalCalc.js`: weekly approval drift
- `calcStateApproval.js`: per-state approval
- `electionCalc.js`: enthusiasm, seat swings, election payloads
- `appointmentProgression.js`: Senate confirmation pipelines
- `cabinetAppointments.js`: candidate generation
- `generateCongress.js`: initial Congress/faction seat generation

## Turn Loop

The game is weekly, but content events mainly resolve on a 4-week rhythm.

### Player-facing rhythm

- Each week has 4 actions.
- Bills and executive orders cost 2 actions.
- Speeches, domestic visits, and most surrogate actions cost 1.
- Presidential foreign visits cost 2-3.

### Engine rhythm

`advance()` performs one weekly simulation step and then optionally fires an event.

Important cadence:

- Weekly:
  - macro advance
  - population/stat drift
  - bill progression
  - appointment progression
  - overreach decay/penalties
  - promise checks
  - surrogate completion
  - diplomacy metric drift
- Every 4 weeks:
  - normal/special event roll
- Every even-numbered year:
  - campaign season opens at week 28
  - election results computed at week 44
  - new Congress applied next year week 1

## Data Flow

The usual data flow is:

1. authored content object is selected in UI
2. `App.jsx` handler applies immediate effects
3. helper modules compute derived consequences
4. state updates are pushed into history/log/notifications
5. tabs re-render from the new top-level state

Examples:

- Bill selected in `PolicyTab` -> `propose()` in `App.jsx` -> `calcStageAdvance()` during future `advance()` ticks
- EO selected in `ActionsTab` -> `issueEO()` in `App.jsx` -> `buildExecutiveOrderOutcome()` from `data/executiveOrders.js`
- Event choice clicked -> `handleEventChoice()` -> direct stat/faction/country updates plus possible chain scheduling

## Why `macroState` Exists Separately

The code now distinguishes between:

- visible stats shown to the player in `stats`
- deeper macro variables in `macroState`

`deriveVisibleStats()` is the reconciliation layer between them. This matters because older content still targets visible stat names while newer systems increasingly operate through macro impulses.

When adding economy-related content:

- use `macroEffects` for systemic or delayed economic behavior
- use `effects` for direct player-facing stat changes
- expect many changes to pass through `syncDerivedStats()`

## UI Boundaries

Tabs are intentionally thin:

- they often hold local UI state like selected filters or map mode
- they do not own the authoritative simulation state
- they should not silently fork business logic from `App.jsx`

If a rule affects more than one tab or survives across turns, it probably belongs in `App.jsx` or `logic/`.

## Cross-Couplings To Respect

These systems interact more than they first appear:

- Executive orders affect faction relationships, overreach, diplomacy, and delayed macro effects.
- Bills affect faction trust/unity, overreach, diplomacy, state bonuses, and election enthusiasm.
- Cabinet appointments affect diplomacy through the Secretary of State vacancy penalty.
- Elections are influenced by approval, promises kept, overreach, legislation, and campaign activity.
- Global tension depends partly on changes in country status, not just explicit foreign-policy actions.

## Hotspots Worth Reading Before Editing

- `src/App.jsx`
  The order of operations matters.
- `src/logic/macroEconomy.js`
  Many visible numbers are derived, not primary.
- `src/data/events.js`
  Event generation has gating, timing, and multiple pools.
- `src/data/executiveOrders.js`
  Some orders are parameterized and built dynamically.

## Good Refactor Targets

If this codebase gets another structural pass, the best extraction seams are:

- weekly turn pipeline from `advance()`
- faction relationship/trust/unity mutation helpers
- diplomacy metric update block
- promise resolution block
- shared status recalculation for countries

Those are the places with the most repeated invariants.
