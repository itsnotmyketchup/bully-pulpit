# Content Authoring

This file exists to avoid re-reading `App.jsx` every time you add a bill, EO, event, speech, or visit.

## First Principle

Prefer expressing new gameplay through authored content in `src/data/` before adding new branches to `App.jsx`.

The simulation already knows how to consume many standard fields.

## Bills

Bills live in `src/data/policies.js` as `POLICY_ACTIONS`.

Typical fields:

- `id`
- `name`
- `desc`
- `category`
- `effects`
- `macroEffects`
- `stateEffects`
- `factionReactions`
- optional diplomacy fields like `engagementEffect`, `powerProjectionEffect`, `countryEffects`

Related structures in the same file:

- `BILL_STAGES`
- `BILL_LOCKS`
- `BILL_AMENDMENTS`

Notes:

- Bills are introduced in `propose()` and advanced weekly in `advance()`.
- Signed bills can enqueue delayed effects.
- `BILL_LOCKS` is for mutually exclusive policy tracks.
- Amendments modify `factionReactions`, not a separate support table.

## Executive Orders

EOs live in `src/data/executiveOrders.js`.

Typical fields:

- `controversy`
- `repeatable`
- `reversible`
- optional `class` and `unlock` for hidden/gated orders
- `effects`
- `macroEffects`
- `delayedEffects`
- `delayedMacroEffects`
- `factionReactions`
- `stateEffects`
- optional `choiceType`
- optional `specialEffects` for UI-only previews of non-stat rewards

Supported dynamic choice patterns already in the code:

- `country`
- `declassify`
- `refugee_cap`
- `drilling_regions`

Important behavior:

- issuing an EO costs 2 actions
- overreach increase is `3 + 5 * controversy`, except `controversy: 0` orders add none
- opposition can take additional relationship penalties even if not explicitly listed in `factionReactions`
- repeatable EOs are scaled down with a multiplier on repeated use
- hidden EOs stay out of the UI until their authored unlock condition is met

If you need a parameterized EO, add the authoring surface in `EXECUTIVE_ORDERS` and the outcome builder logic in `buildExecutiveOrderOutcome()`.

## Events

Events are assembled in `src/data/events.js` by `generateDynamicEvents()`.

There are several event classes:

- `normal`
- `special`
- `immediate`
- chain events

Common fields:

- `id`
- `name`
- `desc`
- `effects`
- `macroEffects`
- `choices`
- `season`
- `repeatable`
- `unique`
- `triggeredBy`
- `triggeredByAbsence`
- `isDisaster`
- `affectedStates`

Choice-level fields can include:

- `effects`
- `macroEffects`
- `factionEffects`
- `countryEffects`
- `stateBoost`
- `tensionEffect`
- `schedulesChain`

Important scaling rule:

- event choice `factionEffects` values are usually small authored fractions and are multiplied by 8 when applied

## Speeches

Speeches live in `src/data/speeches.js`.

Model:

- topic
- several positions
- each position has `label`, `intensity`, `factionEffects`, `approvalSwing`

Behavior:

- speeches cost 1 action
- they can affect relationship, trust, and party unity
- ally faction net alignment influences unity drift

## Visits

Visits live in `src/data/visits.js`.

Supported fields already used by `doVisit()`:

- `approvalBoost`
- `effects`
- `factionEffects`
- `partyUnityBoost`
- `stateRestriction`
- `educationEffect`
- `urbanEffect`
- `ruralEffect`
- `religiosityEffect`

Known restrictions:

- `border`
- `wallstreet`
- `disaster`
- `tribal`

Visits get diminishing returns by repeated use within the same week.

## Country Status

Country objects are re-ranked from relationship score after many actions/events.

Status thresholds are:

- `ALLIED` >= 70
- `FRIENDLY` >= 50
- `NEUTRAL` >= 30
- `UNFRIENDLY` >= 15
- `HOSTILE` otherwise

If a feature changes country relationship/trust, make sure the status is recalculated in the same block.

## Faction Numbers

The most important thing to remember when authoring content:

- many faction values are not final deltas
- authored numbers are often semantic weights
- `App.jsx` applies different multipliers depending on action type

Rough guide:

- events and EOs often use `* 8`
- speeches often use `* 6` for relationship and `* 2` for trust
- some surrogate/visit effects use smaller custom multipliers

Check the callsite before “balancing” a content value.

## When To Change Logic Instead Of Content

Change logic if you need:

- a new action lifecycle
- a new event gating mechanism
- a new status metric or long-lived resource
- a new confirmation/election/promise rule
- a new interpretation of existing fields

Otherwise, stay in `src/data/`.
