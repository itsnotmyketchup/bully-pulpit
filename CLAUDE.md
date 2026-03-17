# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (port 5173, HMR enabled)
npm run build     # Production build → /dist
npm run preview   # Serve production build (port 4173)
npm run lint      # Run ESLint
```

No test suite exists. Verify changes visually via the dev server.

## Tech Stack

- **React 19** (functional components + hooks) with **Vite 8**, plain JavaScript (no TypeScript)
- `react-simple-maps` + `topojson-client` for interactive state/world maps
- `prop-types` for runtime prop validation
- `@vercel/analytics` + `@vercel/speed-insights` for production telemetry
- All state in `App.jsx` via `useState` — no Redux or Context API

## Architecture

### State Management

All game state lives in `App.jsx` (~1,350 lines). Props flow down; callbacks flow up. Key state variables:

| Variable | Purpose |
|---|---|
| `week` | Game time (1–∞, 52 weeks/year) |
| `stats` / `prev` / `hist` | Game metrics (GDP, unemployment, etc.) + history |
| `cg` | Congress object: factions, seats, leaders |
| `passedLegislation` | `{ [billId]: weekPassed }` dict |
| `executiveOverreach` | Overreach meter (0–100, starts at 20) |
| `activeOrders` | `[{ id, issuedWeek, active, choiceData }]` issued EOs |
| `activeBill` | `{ act, stage, fails, turnsInStage, consecutiveFails }` |
| `pendingChainEvents` | `[{ triggerAtWeek, event }]` for follow-up events |
| `usedEv` | Set of event IDs to prevent re-triggers |
| `countries` | Array of country objects with `relationship`, `trust`, `status` |
| `surrogates` | Two surrogate aides with task assignments and cooldowns |
| `promises` | `[{ billId, factionId, madeWeek, deadline }]` faction promises |
| `pendingNegotiation` | Active amendment negotiation state |
| `reconciliationCooldown` | Week when budget reconciliation is available again |

Key functions in `App.jsx`:
- `advance()` — 4-week tick: decays overreach, checks promises, applies faction penalties, processes chains, generates event
- `propose(action)` — Introduces a bill into committee stage
- `issueEO(eo, extraData)` — Issues EO, increases overreach by `3 + 5×controversy`
- `signBill()` — Signs pending bill, decreases overreach by 3, tracks in `passedLegislation`
- `vetoBill()` — Vetoes pending bill
- `acceptAmendment(amendment)` — Accepts amendment during negotiation, decreases overreach by 2
- `walkAwayNegotiation()` — Abandons amendment negotiation
- `rescindEO(orderId)` — Rescinds an active executive order
- `makePromise(factionId, billId, relBoost)` — Promises a faction to pass a bill
- `confirmPromise()` — Confirms the pending promise
- `assignSurrogate(surrogateId, task)` — Assigns surrogate to a task (campaign, lobby, coach)
- `doVisit()` — Presidential state visit
- `doForeignVisit(countryId, isSurrogate, surrogateId)` — Foreign country visit
- `doSpeech(pos)` — Presidential speech on a topic/position
- `submitBudget()` — Submits the budget draft as a reconciliation bill
- `handleEventChoice(choice)` — Applies effects, schedules chain events

### Directory Layout

```
src/
├── App.jsx                  # Root component, all state orchestration (~1,350 lines)
├── components/
│   ├── tabs/                # 7 main tabs (Overview, Congress, Party, Policy, Actions, Diplomacy, Log)
│   ├── screens/             # Full-screen states (Landing, Setup, Crisis)
│   ├── modals/              # Dialog overlays (Budget, SignBill, EoResult, ForeignVisit, Promise, etc.)
│   └── *.jsx                # Shared sub-components (TileMap, VisitMap, CongressBar, Hemicycle, etc.)
├── data/
│   ├── constants.js         # Tab names, faction alliances, surrogate names, country faction effects
│   ├── countries.js         # 17 country definitions with initial relationship/trust/status
│   ├── events.js            # generateDynamicEvents() + all event definitions
│   ├── executiveOrders.js   # EO definitions (controversy, effects, choices, delayedEffects)
│   ├── factions.js          # 6 faction definitions (name, color, goals, policy priorities)
│   ├── policies.js          # Bills, BILL_STAGES, BILL_LOCKS, BILL_AMENDMENTS
│   ├── speeches.js          # 7 speech topics × 4 intensity positions
│   ├── states.js            # 50 state data with demographics and regional tags
│   ├── stats.js             # 15 game metrics (GDP, unemployment, etc.) + metadata
│   ├── usMapPaths.js        # SVG path data for US tile map
│   └── visits.js            # 12 visit types with effects and restrictions
├── logic/
│   ├── billProgression.js   # calcStageAdvance(): vote calculation, filibuster rules, faction logic
│   ├── calcStateApproval.js # Per-state approval from stats and demographics
│   ├── generateCongress.js  # Generate Congress factions, seats, leaders
│   └── willPassCongress.js  # Simple pass likelihood prediction
├── systems/
│   └── budgetCalc.js        # computeBudgetReactions(): faction reactions to budget changes
└── utils/
    ├── clamp.js             # clamp(val, min, max)
    ├── countryStatus.js     # Derive diplomatic status string from relationship score
    └── makeSurrogates.js    # Generate two named surrogate aides
```

### Game Systems

**Factions** — 3 Democratic (Progressive Caucus, Moderate Democrats, Blue Dog Coalition) + 3 Republican (Freedom Caucus, Moderate Republicans, Traditional Conservatives). Relationships 5–100. Event `factionEffects` values are multiplied by **8×** during application.

**Executive Overreach** — Increases per EO (`3 + 5×controversy`), decreases per bill signed (−3), per amendment accepted (−2). Decays −3/week (low/medium range) or −5/week (high range). Every 8 weeks applies faction penalties scaled by overreach level.

**Bills** — Flow: Introduce → Committee → Chamber 1 → Chamber 2 → Reconciliation → Sign/Veto. Tracked in `passedLegislation`. Failed bills enter a cooldown before retry. `BILL_LOCKS` prevent certain bills while others are active.

**Amendments** — After a vote fails, `pendingNegotiation` opens with available amendments. Accepting costs −2 overreach and boosts the relevant faction; walking away abandons the bill stage.

**Promises** — `makePromise()` boosts a faction's relationship immediately in exchange for a deadline to pass a specified bill. Breaking a promise triggers `brokenPromises` notifications and relationship penalties.

**Surrogates** — Two named aides (Senior Advisor, Campaign Director) assignable to tasks: `campaign` (state approval boost), `lobby` (faction relationship boost), `coach` (coaching cooldown reset). Each has an independent cooldown.

**Speeches** — 7 topics (immigration, economy, healthcare, etc.) × 4 intensity positions. Each position has approval and faction effects. Delivered via `doSpeech(pos)`.

**Visits** — 12 domestic visit types with regional/state restrictions and faction reactions. Presidential state visits via `doVisit()`.

**Diplomacy** — 17 countries with `relationship` (0–100), `trust`, and `status` (ally/neutral/rival/hostile). Visits boost relationship; some EOs affect bilateral relations. `COUNTRY_FACTION_EFFECTS` maps country interactions to domestic faction reactions.

**Budget** — `budgetDraft` holds tax rate and spending allocations. `computeBudgetReactions()` previews faction responses. `submitBudget()` converts draft into a reconciliation bill (one per `reconciliationCooldown` period).

**Events** — `generateDynamicEvents()` in `data/events.js` builds the event pool each 4-week tick. Events can be gated by season, triggered 4–52 weeks after a bill passes (`triggeredBy`), fired if a bill was never passed (`triggeredByAbsence`), or chained via `schedulesChain` (follow-up event after min/max delay).

**Season Calculation**: `wiy = ((week - 1) % 52) + 1`; seasons: Winter 1–8 & 48–52, Spring 9–21, Summer 22–35, Autumn 36–47.

### Event Definition Pattern

```js
{
  id: "event_name",
  name: "Event Title",
  season: "summer",              // optional gate
  triggeredBy: "bill_id",        // optional: fires 4–52 weeks after bill passes
  triggeredByAbsence: "bill_id", // optional: fires if bill never passed
  effects: { approvalRating: ±n },
  choices: [{
    text: "Choice A",
    effects: { approvalRating: ±n },
    factionEffects: { faction_id: ±n }, // multiplied by 8× on application
    schedulesChain: {
      minDelay: 4, maxDelay: 8,
      outcomes: [{ probability: 0.5, event: FOLLOW_UP_EVENT_OBJECT }]
    }
  }]
}
```
