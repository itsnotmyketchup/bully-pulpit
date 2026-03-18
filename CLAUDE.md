# CLAUDE.md

This file gives future agents a compact, code-accurate map of the repository.

## Commands

```bash
npm run dev        # Vite dev server on 5173
npm run build      # Production build into dist/
npm run preview    # Preview build on 4173
npm run lint       # ESLint
npm test           # Vitest once
npm run test:watch # Vitest watch mode
```

Current test suite exists and passes: 8 files, 38 tests.

## Stack

- React 19 + Vite 8
- Plain JavaScript, no TypeScript
- Vitest for unit tests
- `react-simple-maps` for the world map
- Vercel Analytics + Speed Insights in `src/main.jsx`

## Repo Shape

```text
src/
  App.jsx                # Main game orchestrator and state owner
  components/
    screens/             # Landing/setup/full-screen overlays
    tabs/                # Main gameplay tabs
    modals/              # Result / choice / confirmation overlays
  data/                  # Mostly static content definitions
  logic/                 # Pure-ish simulation helpers
  systems/               # Cross-cutting systems (currently budget)
  utils/                 # Small helpers
```

## Architecture Summary

`src/App.jsx` is the application shell and simulation engine. Almost all durable game state lives here and is pushed down through props. There is no global store, reducer, or context layer.

The repo has four practical layers:

1. `data/`
   Static authored content: bills, executive orders, events, speeches, visits, factions, countries, states, base stats.
2. `logic/` and `systems/`
   Calculation modules used by `App.jsx` for economy, elections, bill progression, state approval, appointments, and budgets.
3. `App.jsx`
   Orchestrates turn flow, mutates state, wires content definitions into simulation rules, and decides when tabs/modals/events appear.
4. `components/`
   Mostly presentation. Tabs render slices of state and call back into `App.jsx`.

## Control Flow

### Startup

- `src/main.jsx` renders `App` plus Vercel telemetry.
- `App.jsx` begins on `screen === 0` (landing), then `screen === 1` (setup), then game screen.
- `start()` in `App.jsx` resets all state, generates Congress, initializes macro state, seeds logs/history, and creates surrogates.

### Core loop

The player spends up to 4 actions per week. Major actions cost:

- Bills: 2
- Executive orders: 2
- Domestic visits / speeches / surrogate assignments: 1
- Presidential foreign visits: 2 in the Americas, otherwise 3

`advance()` in `App.jsx` is the weekly tick and the most important function in the codebase. It performs, in rough order:

1. Apply inauguration/pending post-election Congress updates at new-year week 1.
2. Advance macroeconomy via `logic/macroEconomy.js`.
3. Update births/deaths/population and drift stats.
4. Apply queued delayed effects from prior laws/orders/events.
5. Start campaign season at year-even week 28.
6. Advance any active bill through Congress using `calcStageAdvance()`.
7. Apply unity/trust/relationship drift, leader replacement, negotiation penalties, and executive-overreach penalties.
8. Progress appointment pipelines.
9. Recompute stats/history/state approval.
10. Resolve promises and surrogate task completion.
11. Trigger elections at year-even week 44, but apply seat updates next year week 1.
12. Decay executive overreach.
13. Update diplomacy metrics: engagement, power projection, global tension.
14. Possibly create a Fed vacancy event.
15. Generate and fire events:
    - chain events first
    - immediate events next
    - normal/special events only on 4-week cadence

### Event cadence

- The simulation advances weekly.
- Event generation only runs on `nw % 4 === 0` for normal/special events, except immediate and chain events.
- Campaign season begins 16 weeks before elections.
- Elections happen in even-numbered years at week 44.
- New Congress is sworn in at week 1 of the following year.

## State Domains

Useful buckets inside `App.jsx`:

- Session/UI state: `screen`, active tab, hover state, modal visibility, preview state.
- Core simulation state: `week`, `act`, `stats`, `macroState`, `prev`, `hist`, `log`.
- Congress/political state: `cg`, `factionHist`, `activeBill`, `pendingNegotiation`, `pendingSignature`, `billRecord`, `billLikelihood`, `billFactionVotes`.
- Promise/surrogate state: `promises`, `promiseOffers`, `pendingPromise`, `surrogates`, `surrogateUI`, `coachCooldown`.
- Executive power state: `activeOrders`, `eoIssuedCount`, `executiveOverreach`, `overreachLastIncreasedWeek`, `overreachLowSinceWeek`.
- Diplomacy state: `countries`, `visitedCountries`, `engagement`, `powerProjection`, `globalTension`, `countryStatusSnapshot`, `diplomacyThresholds`.
- Election state: `campaignSeasonStarted`, `campaignActivity`, `pollingNoise`, `pendingCongressUpdate`, `midtermResults`, `congressHistory`.
- Appointment state: `cabinet`, `pendingAppointment`, `confirmationHistory`.

## Key Modules

### `src/logic/macroEconomy.js`

- Owns the deeper macro model and Fed behavior.
- `deriveVisibleStats()` is the bridge from hidden macro state to UI-visible stats.
- `advanceMacroEconomy()` is called every week from `advance()`.
- `applyMacroEffects()` and `adaptLegacyEffectsToMacroImpulses()` let older content definitions still influence the new macro model.

### `src/logic/billProgression.js`

- Resolves support for the current bill stage.
- Uses faction reaction, relationship, trust, and unity.
- Chamber votes require a 60-vote Senate threshold unless the bill is reconciliation.

### `src/logic/electionCalc.js`

- Computes enthusiasm, seat swings, history snapshots, and modal payloads.
- Election results are staged, not applied immediately.

### `src/data/events.js`

- Builds event pools dynamically from current stats, approvals, legislation, week, and countries.
- Supports `normal`, `special`, `immediate`, and chain events.
- Many events are generated with random IDs, so event uniqueness is sometimes runtime-generated rather than entirely static.

## Component Boundaries

Tabs are mostly renderers, not business-logic owners:

- `OverviewTab`: dashboards, map, macro/fiscal display
- `CongressTab`: faction panels, history, legislation record, confirmations
- `PartyTab`: party management and promises
- `CabinetTab`: president/VP/cabinet/Fed and appointment workflow UI
- `PolicyTab`: bill selection, reconciliation entry point, amendment negotiation UI
- `ActionsTab`: executive orders, speeches, domestic visits
- `DiplomacyTab`: world map, international metrics, foreign visit UI
- `LogTab`: chronological text log

Most gameplay rules still live in `App.jsx`, even when the initiating UI sits in a tab.

## Content Authoring Rules

When changing content, prefer editing data files over hard-coding more branches in `App.jsx`.

- Bills live in `src/data/policies.js`
- Executive orders live in `src/data/executiveOrders.js`
- Events live in `src/data/events.js`
- Speeches live in `src/data/speeches.js`
- Visits live in `src/data/visits.js`

Content definitions often support:

- `effects`: direct visible-stat changes
- `macroEffects`: hidden macro impulses / macro state shifts
- `factionReactions` or `factionEffects`
- `stateEffects`
- `countryEffects`
- delayed effects

Important scaling rule: many faction deltas authored in content are fractional and later multiplied in `App.jsx`:

- event choice `factionEffects`: multiplied by 8
- EO `factionReactions`: multiplied by 8, then sometimes scaled by repeat-use multiplier
- speeches/visits use different multipliers, usually 6 or 3 depending on action

Do not assume a content value is already the final relationship delta.

## Known Hotspots

- `src/App.jsx` is large and stateful. Read the nearby section before editing; many systems are cross-coupled.
- Election logic sometimes reads `cg` while other parts stage `nf` mutated copies in the same tick. Be careful when changing weekly-order semantics.
- There is intentional staging between:
  - bill passage and presidential signature
  - election results and inauguration
  - event selection and event choice resolution
- The world map in `DiplomacyTab` fetches topojson from a CDN at runtime.

## Recommended Working Style

- For simulation changes, inspect `App.jsx` callsites first, then the helper module.
- For balance/content changes, prefer `data/` edits plus tests if logic behavior changes.
- For architecture work, keep new logic out of tabs when possible; tabs are mostly view components.
- If a repeated pattern in `App.jsx` becomes painful, extract a helper only after confirming it does not need direct setter coordination.

## Extra Docs

- `docs/architecture.md`
- `docs/content-authoring.md`
