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
- All state in `App.jsx` via `useState` — no Redux or Context API

## Architecture

### State Management

All game state lives in `App.jsx` (~2500 lines). Props flow down; callbacks flow up. Key state variables:

| Variable | Purpose |
|---|---|
| `week`, `year`, `season` | Game time |
| `approvalRating`, `stateApprovals` | Global + per-state approval (0–100) |
| `currentGameState` | Faction relationship scores (5–100) |
| `passedLegislation` | `{ [billId]: weekPassed }` dict |
| `executiveOverreach` | Overreach meter (0–100, starts at 20) |
| `pendingChainEvents` | `[{ triggerAtWeek, event }]` for follow-up events |
| `usedEvents` | Set of event IDs to prevent re-triggers |

Key functions in `App.jsx`:
- `advance()` — 4-week tick: decays overreach, applies faction penalties, processes chains, generates event
- `issueEO(eo)` — Issues EO, increases overreach by `3 + 5×controversy`
- `signBill(bill)` — Signs bill, decreases overreach by 3, tracks in `passedLegislation`
- `handleEventChoice(choice)` — Applies effects, schedules chain events

### Directory Layout

```
src/
├── App.jsx                  # Root component, all state orchestration
├── components/
│   ├── tabs/                # 7 main tabs (Overview, Congress, Party, Policy, Actions, Diplomacy, Log)
│   ├── screens/             # Full-screen states (Landing, Setup, Crisis)
│   ├── modals/              # Dialog overlays (Budget, SignBill, EoResult, etc.)
│   └── *.jsx                # Shared sub-components (TileMap, VisitMap, CongressBar, etc.)
├── data/                    # Static game config (events, policies, factions, states, EOs, etc.)
├── logic/                   # Pure calculation modules (congress gen, approval calc, bill voting)
├── systems/                 # Complex systems (budgetCalc.js)
└── utils/                   # Small helpers (clamp, surrogates, country status)
```

### Game Systems

**Factions** — 3 Democratic (Progressive Caucus, Moderate Democrats, Blue Dog Coalition) + 3 Republican (Freedom Caucus, Moderate Republicans, Traditional Conservatives). Relationships 5–100. Event `factionEffects` values are multiplied by **8×** during application.

**Executive Overreach** — Increases per EO (`3 + 5×controversy`), decreases per bill signed (−3), per amendment accepted (−2). Decays −3/week (low/medium range) or −5/week (high range). Every 8 weeks applies faction penalties scaled by overreach level.

**Events** — `generateDynamicEvents()` in `data/events.js` builds the event pool each 4-week tick. Events can be gated by season, triggered 4–52 weeks after a bill passes (`triggeredBy`), fired if a bill was never passed (`triggeredByAbsence`), or chained via `schedulesChain` (follow-up event after min/max delay).

**Season Calculation**: `wiy = ((week - 1) % 52) + 1`; seasons: Winter 1–8 & 48–52, Spring 9–21, Summer 22–35, Autumn 36–47.

**Bills** — Flow: Introduce → Vote → Pass/Fail → Sign. Tracked in `passedLegislation`. Amendments reduce overreach by 2.

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
