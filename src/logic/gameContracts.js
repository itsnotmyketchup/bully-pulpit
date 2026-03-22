/**
 * @typedef {{ week: number, text: string }} LogEntry
 */

/**
 * @typedef {{ id?: number|string, addedWeek?: number, type: string, message: string, tab?: string }} Notification
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   party?: string,
 *   relationship: number,
 *   trust: number,
 *   unity: number,
 *   senateSeats?: number,
 *   houseSeats?: number,
 *   leader?: { name: string, charisma: number, authority: number, sincerity: number },
 * }} FactionState
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   status: string,
 *   relationship: number,
 *   trust: number,
 *   region?: string,
 * }} CountryState
 */

/**
 * @typedef {{
 *   act: object,
 *   stage: string,
 *   fails: number,
 *   turnsInStage: number,
 *   consecutiveFails: number,
 *   negotiated?: boolean,
 *   isBudget?: boolean,
 *   budgetDraft?: object,
 * }} PendingBill
 */

/**
 * @typedef {{
 *   officeId: string,
 *   officeLabel: string,
 *   nomineeName: string,
 *   personality?: string | null,
 *   stage: string,
 *   stages: Array<object>,
 *   startedWeek: number,
 *   factionReactions: Record<string, number>,
 *   factionVotes?: Array<object>,
 *   passLikelihood?: number,
 *   nomineeFactionId?: string | null,
 *   nomineeFactionName?: string | null,
 *   isHighPriority?: boolean,
 * }} PendingAppointment
 */

/**
 * @typedef {{
 *   stats: object,
 *   prev: object,
 *   macroState: object,
 *   cg: { pp?: string, factions: Record<string, FactionState> },
 *   countries: Array<CountryState>,
 *   stBon: Record<string, number>,
 *   stateHist: Record<string, Array<number>>,
 *   pFx: Array<object>,
 *   usedEv: Set<string>,
 *   usedPol: Set<string>,
 *   activeBill: PendingBill | null,
 *   pendingAppointment: PendingAppointment | null,
 *   pendingSignature: object | null,
 *   pendingNegotiation: object | null,
 *   pendingCongressUpdate: object | null,
 *   promises: Array<object>,
 *   billCooldowns: Record<string, number>,
 *   visitedCountries: Record<string, number>,
 *   activeOrders: Array<object>,
 *   eoIssuedCount: Record<string, number>,
 *   passedLegislation: Record<string, number>,
 *   executiveOverreach: number,
 *   engagement: number,
 *   powerProjection: number,
 *   globalTension: number,
 *   lastForeignTripWeek: number,
 *   lastMilitarySpending: number,
 *   countryStatusSnapshot: Record<string, string>,
 *   diplomacyThresholds: { tensionHigh: boolean, engagementLow: boolean, projectionWeak: boolean },
 *   overreachLastIncreasedWeek: number,
 *   overreachLowSinceWeek: number,
 *   pendingChainEvents: Array<object>,
 *   nextExecutiveOrderCourtCheckWeek: number | null,
 *   pendingJudicialEvent: object | null,
 *   lastSpecialEventWeek: number,
 *   visitTypeCounts: Record<string, number[]>,
 *   billLikelihood: number | null,
 *   billFactionVotes: Array<object> | null,
 *   billRecord: Array<object>,
 *   factionHist: Record<string, { trust: number[], rel: number[], unity: number[] }>,
 *   cabinet: object,
 *   confirmationHistory: Array<object>,
 *   congressHistory: Array<object>,
 *   scotusJustices: Array<object>,
 *   scotusRulings: Array<object>,
 *   midtermResults: object | null,
 *   showMidtermModal: boolean,
 *   showInaugurationModal: boolean,
 *   campaignSeasonStarted: boolean,
 *   campaignActivity: number,
 *   pollingNoise: number,
 *   isPresidentialElection: boolean,
 *   notifications: Array<Notification>,
 *   brokenPromises: Array<object>,
 *   recentDisasters: Record<string, number>,
 *   curEv: object | null,
 *   act: number,
 *   maxActions: number,
 *   week: number,
 *   log: Array<LogEntry>,
 * }} GameSnapshot
 */

/**
 * @typedef {{
 *   stateChanges: Partial<GameSnapshot>,
 *   logs?: Array<LogEntry>,
 *   notifications?: Array<Notification>,
 *   modal?: object | null,
 *   queuedEffects?: Array<object>,
 *   queuedEvents?: Array<object>,
 * }} PhaseResult
 */

export {};
