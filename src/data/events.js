import { STATE_DATA } from "./states.js";

const CITIES = ["Las Vegas, NV","Orlando, FL","Dallas, TX","Chicago, IL","Denver, CO","Nashville, TN","Phoenix, AZ","Atlanta, GA","Seattle, WA","Houston, TX","Portland, OR","Miami, FL","Charlotte, NC","Minneapolis, MN","San Antonio, TX","Detroit, MI","Pittsburgh, PA","St. Louis, MO","Baltimore, MD","Sacramento, CA"];

const WEST_STATES         = ["CA","OR","WA","ID","MT","WY","CO","NV","AZ","NM","UT"];
const GULF_EAST_STATES    = ["LA","MS","AL","FL","TX","GA","SC","NC","VA"];
const OVERDOSE_STATES     = ["WV","OH","KY","PA","TN","VA","MD","IN","MI","MO","NC"];
const BRIDGE_STATES       = ["PA","OH","WV","MO","WI","MN","LA","TX","NY","MI","KY","IN"];
const WINTER_STORM_STATES = ["NY","PA","OH","MI","WI","MN","IA","NE","KS","MO","IN","IL","NJ","MA","VT","NH","ME"];
const SOUTHWEST_STATES    = ["TX","AZ","NV","CA","NM","UT","CO"];
const TORNADO_STATES      = ["KS","MO","NE","IA","IL","IN","OK","AR","TN","MS"];

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

// ─── Event chain definitions ───────────────────────────────────────────────
export const LIBERAL_STATES_COURT_WIN = {
  id: "liberal_states_court_win",
  name: "Federal Court Rules in Your Favor on Immigration Enforcement",
  desc: "A federal appeals court has sided with the administration, ordering sanctuary jurisdictions to comply with the Immigration Enforcement Directive or face federal funding penalties. Governors vow to appeal.",
  isChainEvent: true,
  chainOf: "Sanctuary States Defy Immigration Enforcement Directive",
  unique: true,
  effects: { approvalRating: 2 },
  choices: [
    { text: "Aggressively enforce the court ruling", effects: { approvalRating: 1 }, factionEffects: { freedom: 0.4, trad_con: 0.3, prog: -0.4, mod_dem: -0.2 }, result: "Compliance slowly increases. Major protests erupt in sanctuary cities." },
    { text: "Enforce with measured, cooperative pressure", effects: { approvalRating: 0 }, stateBoost: 0.02, result: "Gradual compliance. Legal scholars call it a landmark precedent." },
  ],
};

export const LIBERAL_STATES_COURT_LOSS = {
  id: "liberal_states_court_loss",
  name: "Federal Court Blocks Immigration Enforcement Directive",
  desc: "An appeals court has ruled the administration's coercive measures against sanctuary jurisdictions unconstitutional, in a major legal setback. The ruling temporarily halts federal funding threats.",
  isChainEvent: true,
  chainOf: "Sanctuary States Defy Immigration Enforcement Directive",
  unique: true,
  effects: { approvalRating: -2, immigrationRate: 0.03 },
  choices: [
    { text: "Appeal to the Supreme Court", effects: { approvalRating: 0 }, factionEffects: { freedom: 0.2, trad_con: 0.2, prog: -0.1 }, result: "The legal battle continues. Could take years to resolve." },
    { text: "Accept the ruling and adjust enforcement policy", effects: { approvalRating: -1 }, factionEffects: { freedom: -0.3, trad_con: -0.2, prog: 0.3, mod_dem: 0.2 }, result: "Pragmatic retreat. Your base feels the administration caved." },
  ],
};

// ──────────────────────────────────────────────────────────────────────────

export function getSeason(week) {
  const wiy = ((week - 1) % 52) + 1;
  if (wiy >= 9  && wiy <= 21) return "spring";
  if (wiy >= 22 && wiy <= 35) return "summer";
  if (wiy >= 36 && wiy <= 47) return "autumn";
  return "winter";
}

export function getSeasonLabel(week) {
  const s = getSeason(week);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function generateDynamicEvents(
  stats, stAppr, usedEvents,
  playerParty = "DEM", week = 1,
  passedLegislation = {},
  executiveOverreach = 20
) {
  const pool = [];
  const season = getSeason(week);
  const pick = () => CITIES[Math.floor(Math.random() * CITIES.length)];
  const pickState = (city) => { const m = city.match(/,\s*(\w+)$/); return m ? m[1] : null; };

  const allyIds = playerParty === "DEM" ? ["prog","mod_dem","blue_dog"] : ["freedom","mod_rep","trad_con"];
  const oppIds  = playerParty === "DEM" ? ["freedom","mod_rep","trad_con"] : ["prog","mod_dem","blue_dog"];

  // Dynamic SCOTUS "strong ally" effects based on player party
  const scotusStrongAllyFx = Object.fromEntries([
    ...allyIds.map((id, i) => [id,  [0.4, 0.2, -0.1][i]]),
    ...oppIds.map((id, i)  => [id, [-0.6, -0.3, -0.4][i]]),
  ]);
  const scotusStrongAllyResult = playerParty === "DEM"
    ? "Liberal base energized. Conservative opposition mobilizes."
    : "Conservative base energized. Progressive opposition mobilizes.";

  // ── Stat-triggered events ──────────────────────────────────────────────
  if (stats.inflation > 3.5) pool.push({
    id:"infl_"+Math.random(),
    name:"Grocery prices spark protests",
    desc:`With inflation at ${stats.inflation.toFixed(1)}%, families struggle with food costs.`,
    effects:{approvalRating:-2},
    choices:[
      {text:"Announce price-gouging investigation",effects:{approvalRating:2},result:"The public appreciates action."},
      {text:"Propose targeted food subsidies",effects:{approvalRating:1,nationalDebt:0.05},result:"Relief reaches families."},
      {text:"Blame supply chains, urge patience",effects:{approvalRating:-2},result:"'Let them eat patience' trends online."},
    ]
  });

  if (stats.unemployment > 5.5) pool.push({
    id:"unemp_"+Math.random(),
    name:"Major employer announces 40,000 layoffs",
    desc:`Unemployment at ${stats.unemployment.toFixed(1)}%. A Fortune 100 company cuts thousands.`,
    effects:{unemployment:0.15,approvalRating:-2},
    choices:[
      {text:"Propose emergency jobs program",effects:{approvalRating:2,nationalDebt:0.08},result:"Workers appreciate swift response."},
      {text:"Offer corporate tax incentives to retain workers",effects:{approvalRating:0,nationalDebt:0.03},result:"Some jobs saved. Critics call it a handout."},
      {text:"Call it a market correction",effects:{approvalRating:-3},result:"Laid-off workers feel abandoned."},
    ]
  });

  if (stats.gasPrice > 4.5) pool.push({
    id:"gas_"+Math.random(),
    name:"Gas station lines stretch for blocks",
    desc:`At $${stats.gasPrice.toFixed(2)}/gallon, commuters face crushing fuel costs.`,
    effects:{approvalRating:-2},
    choices:[
      {text:"Suspend federal gas tax temporarily",effects:{gasPrice:-0.25,nationalDebt:0.04,approvalRating:2},result:"Modest relief at the pump."},
      {text:"Push electric vehicle subsidies",effects:{approvalRating:-1},factionEffects:{prog:0.3,freedom:-0.4},result:"'I can't afford an EV either' trends."},
      {text:"Release strategic petroleum reserves",effects:{gasPrice:-0.3,approvalRating:1},result:"Prices ease. Reserves thin."},
    ]
  });

  if (stats.crimeRate > 5.5) pool.push({
    id:"crime_"+Math.random(),
    name:"Violent crime surge alarms cities",
    desc:`Homicide rate at ${stats.crimeRate.toFixed(1)}/100k. Mayors demand federal help.`,
    effects:{approvalRating:-2},
    choices:[
      {text:"Deploy federal law enforcement",effects:{approvalRating:1,crimeRate:-0.15},factionEffects:{prog:-0.3,trad_con:0.3},result:"Crime dips. Civil liberties concerns arise."},
      {text:"Fund community prevention grants",effects:{approvalRating:1,nationalDebt:0.02},result:"Long-term play. Not immediate."},
      {text:"Blame local leadership",effects:{approvalRating:-2},result:"Mayors fire back."},
    ]
  });

  const worst = Object.entries(stAppr).sort((a,b) => a[1] - b[1]);
  if (worst[0] && worst[0][1] < 30) {
    const ws = STATE_DATA.find(s => s.abbr === worst[0][0]);
    if (ws) pool.push({
      id:"prot_"+ws.abbr,
      name:`Large protests in ${ws.name}`,
      desc:`Approval at ${Math.round(worst[0][1])}% in ${ws.name}. Thousands march.`,
      affectedStates:[ws.abbr],
      effects:{approvalRating:-1},
      choices:[
        {text:`Visit ${ws.name} and address concerns`,effects:{approvalRating:1},stateBoost:0.04,result:"Facing critics earns grudging respect."},
        {text:"Acknowledge frustration from Washington",effects:{approvalRating:0},stateBoost:0.01,result:"Words from afar ring hollow."},
        {text:"Dismiss as politically motivated",effects:{approvalRating:-2},stateBoost:-0.03,result:"Protesters feel validated in anger."},
      ]
    });
  }

  const city = pick(), st = pickState(city);
  pool.push({
    id:"shoot_"+Math.random(),
    name:`Mass shooting in ${city}`,
    desc:`A gunman killed multiple people at a public venue in ${city}. The nation mourns.`,
    affectedStates:st?[st]:[],
    effects:{crimeRate:0.05,approvalRating:-1},
    choices:[
      {text:"Push for gun reform legislation",effects:{approvalRating:1},factionEffects:{prog:0.4,mod_dem:0.2,blue_dog:-0.2,freedom:-0.7,mod_rep:-0.2,trad_con:-0.4},stateBoost:0.02,result:"A fierce debate reignites."},
      {text:"Focus on mental health funding",effects:{approvalRating:1,healthcareSpending:5},stateBoost:0.02,result:"Both sides find common ground."},
      {text:"Thoughts and prayers, no policy",effects:{approvalRating:-2},stateBoost:-0.02,result:"Critics say it's not enough."},
    ]
  });

  // ── Randomised state picks for disaster events ─────────────────────────
  const hurricaneState  = pickOne(GULF_EAST_STATES);
  const wildfireState   = pickOne(WEST_STATES);
  const powerGridState  = pickOne(SOUTHWEST_STATES);
  const overdoseStates  = pickN(OVERDOSE_STATES, 4);
  const bridgeState     = pickOne(BRIDGE_STATES);
  const winterStorm     = pickN(WINTER_STORM_STATES, 3);
  const tornadoState    = pickOne(TORNADO_STATES);

  // ── Base event pool ────────────────────────────────────────────────────
  const base = [
    {id:"hurricane",season:"summer",
      name:`Category 4 hurricane strikes ${hurricaneState}`,
      desc:`A devastating hurricane makes landfall near the Gulf/Atlantic coast. Catastrophic flooding reported in ${hurricaneState}.`,
      unique:true,isDisaster:true,affectedStates:[hurricaneState],effects:{gdpGrowth:-0.2,nationalDebt:0.05},choices:[
        {text:"Declare emergency, full federal resources",effects:{approvalRating:4,nationalDebt:0.1},stateBoost:0.05,result:"Swift response praised."},
        {text:"Measured federal assistance",effects:{approvalRating:0},stateBoost:0.01,result:"Some say insufficient."},
        {text:"Delegate to states",effects:{approvalRating:-5},stateBoost:-0.04,result:"Accused of abandoning the coast."},
    ]},
    {id:"terror_foiled",name:"FBI foils major terror plot",desc:"Federal agents disrupted a plot targeting a metropolitan area.",unique:true,effects:{approvalRating:2},choices:[
      {text:"Press conference: emphasize security",effects:{approvalRating:3},result:"Confidence rises."},
      {text:"Quietly brief Congress",effects:{approvalRating:1},result:"Restrained approach noted."},
      {text:"Push expanded surveillance",effects:{approvalRating:-1,crimeRate:-0.2},factionEffects:{prog:-0.4,freedom:0.3},result:"Privacy debate erupts."},
    ]},
    {id:"oil_spike",name:"Global oil price surge",desc:"Mideast conflict spikes crude prices 30%.",unique:true,effects:{gasPrice:0.85,inflation:0.4,approvalRating:-2},choices:[
      {text:"Release petroleum reserves",effects:{gasPrice:-0.4,approvalRating:1},result:"Prices ease slightly."},
      {text:"Negotiate with oil producers",effects:{gasPrice:-0.2},countryEffects:{saudi:{relationship:5}},result:"Slow relief through diplomacy."},
      {text:"Accelerate domestic production",effects:{gasPrice:-0.1},factionEffects:{prog:-0.5,freedom:0.3},result:"Environmentalists protest."},
    ]},
    {id:"pandemic",name:"New virus variant emerges",desc:"WHO flags a concerning respiratory virus variant.",unique:true,effects:{gdpGrowth:-0.1,approvalRating:-1},choices:[
      {text:"Aggressive public health response",effects:{healthcareSpending:20,approvalRating:2,nationalDebt:0.05},result:"Health experts praise proactivity."},
      {text:"Monitor and prepare",effects:{approvalRating:0},result:"Measured. Critics divided."},
      {text:"Downplay the threat",effects:{approvalRating:-3,gdpGrowth:0.1},result:"Risky bet."},
    ]},
    {id:"tech_boom",name:"AI industry creates 500K jobs",desc:"Tech sector booming in CA, WA, TX, NY.",unique:true,affectedStates:["CA","WA","TX","NY"],effects:{gdpGrowth:0.3,unemployment:-0.2,approvalRating:2},choices:[
      {text:"Claim credit, tech-friendly policies",effects:{approvalRating:2},result:"Silicon Valley applauds."},
      {text:"Push AI regulation",effects:{approvalRating:0,gdpGrowth:-0.05},result:"Balanced. Lobbies grumble."},
      {text:"Retrain displaced workers",effects:{educationSpending:10,approvalRating:1},result:"Forward-thinking support."},
    ]},
    {id:"cyber",name:"Major cyberattack hits federal agencies",desc:"State-sponsored attack compromises federal databases.",unique:true,effects:{approvalRating:-3},choices:[
      {text:"Publicly attribute and sanction",effects:{approvalRating:2},countryEffects:{russia:{relationship:-5,trust:-3}},result:"Strong response. Tensions rise."},
      {text:"Covert cyber response",effects:{approvalRating:1},result:"Quiet action debated."},
      {text:"Focus on defense upgrades",effects:{approvalRating:0,nationalDebt:0.03},result:"Cautious approach."},
    ]},
    {id:"scotus",name:"Supreme Court Justice retires",desc:"A pivotal Justice steps down. Nomination opportunity.",unique:true,effects:{approvalRating:1},choices:[
      {text:"Nominate strong ideological ally",effects:{approvalRating:1},factionEffects:scotusStrongAllyFx,result:scotusStrongAllyResult},
      {text:"Nominate moderate consensus builder",effects:{approvalRating:2},factionEffects:{mod_dem:0.3,mod_rep:0.2,prog:-0.2,freedom:-0.2},result:"Bipartisan nod."},
      {text:"Nominate young rising star",effects:{approvalRating:0},result:"Strategic long-term play."},
    ]},
    {id:"shutdown",name:"Government shutdown looms",desc:"Congress failed to pass spending. Shutdown at midnight.",unique:true,effects:{approvalRating:-3},choices:[
      {text:"Negotiate bipartisan compromise",effects:{approvalRating:3},factionEffects:{mod_dem:0.3,mod_rep:0.3,prog:-0.2,freedom:-0.3},result:"Crisis averted."},
      {text:"Hold firm on your priorities",effects:{approvalRating:-2,gdpGrowth:-0.1},result:"Shutdown begins."},
      {text:"Accept opposition demands",effects:{approvalRating:-1},factionEffects:{prog:-0.4,freedom:0.2},result:"Open, but base feels betrayed."},
    ]},
    {id:"bridge",name:"Major bridge collapse",
      desc:`Interstate bridge collapses during rush hour in ${bridgeState}. Dozens killed.`,
      unique:true,isDisaster:true,affectedStates:[bridgeState],effects:{approvalRating:-2,infrastructureSpending:5},choices:[
        {text:"Push emergency infrastructure bill",effects:{approvalRating:3,nationalDebt:0.1,infrastructureSpending:30},stateBoost:0.04,result:"Galvanizing moment."},
        {text:"Order nationwide inspections",effects:{approvalRating:1},result:"Methodical. Public wants faster."},
        {text:"Blame predecessors' underfunding",effects:{approvalRating:-1},result:"Blame game doesn't help victims."},
    ]},
    {id:"eu_trade",name:"EU imposes retaliatory tariffs",desc:"EU tariffs hit $50B of American exports.",unique:true,effects:{tradeBalance:-5,gdpGrowth:-0.1,approvalRating:-1},choices:[
      {text:"Negotiate a trade deal",effects:{tradeBalance:3,approvalRating:1},countryEffects:{france:{relationship:5},germany:{relationship:5}},result:"Talks begin."},
      {text:"Impose counter-tariffs",effects:{tradeBalance:-3,approvalRating:-1},countryEffects:{france:{relationship:-8},germany:{relationship:-8}},result:"Trade war deepens."},
      {text:"Appeal to WTO",effects:{approvalRating:0},result:"Slow but avoids escalation."},
    ]},
    {id:"midwest_tornado",
      name:`Tornado outbreak tears through ${tornadoState}`,
      desc:`A series of EF-4 tornadoes devastates rural communities in ${tornadoState}.`,
      unique:true,isDisaster:true,affectedStates:[tornadoState],effects:{approvalRating:-1,infrastructureSpending:5},choices:[
        {text:"Deploy FEMA and National Guard immediately",effects:{approvalRating:3,nationalDebt:0.06},stateBoost:0.05,result:"Swift federal response wins praise in the region."},
        {text:"Approve disaster declaration, coordinate with governor",effects:{approvalRating:1},stateBoost:0.02,result:"Measured response. Locals appreciate the coordination."},
        {text:"Urge states to handle recovery independently",effects:{approvalRating:-2},stateBoost:-0.02,result:"Farmers and mayors feel abandoned."},
    ]},
    {id:"student_loan",name:"Student loan default rate hits record high",desc:"Over 8 million borrowers are in default as interest accumulates. College graduates protest.",unique:true,effects:{approvalRating:-2},choices:[
      {text:"Expand income-based repayment options",effects:{approvalRating:2,nationalDebt:0.04},factionEffects:{prog:0.3,mod_dem:0.2,freedom:-0.3},result:"Young voters energized. Fiscal hawks grumble."},
      {text:"Push for targeted forgiveness for low-income borrowers",effects:{approvalRating:1,nationalDebt:0.08},factionEffects:{prog:0.5,mod_dem:0.1,freedom:-0.5,trad_con:-0.3},result:"Divisive but popular with graduates."},
      {text:"Call for universities to reduce tuition",effects:{approvalRating:0},result:"Deflects responsibility. Borrowers unimpressed."},
    ]},
    {id:"market_crash",name:"Stock market drops 14% in a week",desc:"A credit rating downgrade and weak jobs data trigger a sharp sell-off on Wall Street.",unique:true,effects:{gdpGrowth:-0.4,approvalRating:-3,tradeBalance:-5},choices:[
      {text:"Emergency economic stabilization package",effects:{approvalRating:2,nationalDebt:0.12},factionEffects:{mod_dem:0.2,mod_rep:0.2,freedom:-0.2},result:"Markets stabilize. Deficit hawks push back."},
      {text:"Convene economic advisers, signal calm",effects:{approvalRating:1},result:"Steady-hand messaging helps sentiment slightly."},
      {text:"Blame the Federal Reserve",effects:{approvalRating:-2},result:"Finger-pointing deepens investor anxiety."},
    ]},
    {id:"border_surge",name:"Record border crossings strain resources",desc:"Migrant arrivals hit an all-time monthly high. Facilities in TX and AZ are overwhelmed.",unique:true,affectedStates:["TX","AZ","NM","CA"],effects:{immigrationRate:0.2,approvalRating:-2},choices:[
      {text:"Request emergency supplemental border funding",effects:{approvalRating:1,nationalDebt:0.04},factionEffects:{blue_dog:0.3,mod_rep:0.2,freedom:0.3,prog:-0.2},result:"Congress moves quickly. Tensions ease."},
      {text:"Announce expanded asylum processing",effects:{approvalRating:0},factionEffects:{prog:0.3,freedom:-0.4},result:"Humanitarian groups approve. Border-state officials frustrated."},
      {text:"Tighten entry restrictions via executive order",effects:{approvalRating:1},factionEffects:{freedom:0.5,mod_rep:0.3,prog:-0.5},stateBoost:0.03,result:"Crossings slow. Legal challenges follow."},
    ]},
    {id:"teacher_strike",name:"National teachers union calls for general strike",desc:"Teachers in 18 states walk out demanding higher pay and smaller class sizes.",unique:true,affectedStates:["OH","PA","IL","TX","GA"],effects:{approvalRating:-1,educationSpending:5},choices:[
      {text:"Announce $15B federal education funding increase",effects:{approvalRating:2,educationSpending:20,nationalDebt:0.05},factionEffects:{prog:0.4,mod_dem:0.2,freedom:-0.4},result:"Strikes end. Teachers call it a victory."},
      {text:"Urge states to negotiate directly with unions",effects:{approvalRating:-1},result:"Strikes continue. You're seen as indifferent."},
      {text:"Express sympathy, propose federal pay commission",effects:{approvalRating:1},result:"Slow but avoids a fiscal fight."},
    ]},
    {id:"overdose_crisis",
      name:"Fentanyl overdose deaths spike",
      desc:`Overdose deaths hit 120,000 in the past year, highest on record. ${overdoseStates.join(", ")} among the hardest hit.`,
      unique:true,affectedStates:overdoseStates,effects:{crimeRate:0.2,approvalRating:-2},choices:[
        {text:"Declare national public health emergency",effects:{approvalRating:2,healthcareSpending:10,nationalDebt:0.03},stateBoost:0.04,result:"Affected communities feel heard."},
        {text:"Crack down on cartel supply chains",effects:{approvalRating:1,crimeRate:-0.1},factionEffects:{trad_con:0.3,freedom:0.2,prog:-0.1},result:"Law enforcement focus wins rural support."},
        {text:"Expand naloxone access and safe use sites",effects:{approvalRating:0},factionEffects:{prog:0.4,mod_dem:0.2,trad_con:-0.4},result:"Public health advocates cheer. Social conservatives push back."},
    ]},
    {id:"power_grid",season:"summer",
      name:`Summer heatwave triggers rolling blackouts in ${powerGridState}`,
      desc:`A record heat dome causes cascading grid failures in ${powerGridState}. Millions lose power.`,
      unique:true,isDisaster:true,affectedStates:[powerGridState],effects:{approvalRating:-2,infrastructureSpending:5},choices:[
        {text:"Emergency grid modernization funding",effects:{approvalRating:2,infrastructureSpending:25,nationalDebt:0.07},stateBoost:0.04,result:"Governor thanks you. Long-term fix in motion."},
        {text:"Press utilities to implement demand-response programs",effects:{approvalRating:0},result:"Modest improvement. Critics say it's not enough."},
        {text:"Authorize emergency energy imports from Canada and Mexico",effects:{approvalRating:1},countryEffects:{canada:{relationship:4},mexico:{relationship:3}},result:"Immediate relief. Relations with neighbors improve."},
    ]},
    {id:"inequality_report",name:"Census: income inequality at 50-year high",desc:"New data shows the top 1% now holds 38% of national wealth. Viral charts dominate the news cycle.",unique:true,effects:{approvalRating:-1},choices:[
      {text:"Propose modest wealth surtax on ultra-high earners",effects:{approvalRating:2},factionEffects:{prog:0.5,mod_dem:0.2,freedom:-0.6,mod_rep:-0.3},result:"Progressive base energized. Donor class alarmed."},
      {text:"Emphasize job creation and opportunity programs",effects:{approvalRating:1,nationalDebt:0.03},result:"Bipartisan optics. Doesn't satisfy critics."},
      {text:"Dispute the methodology of the report",effects:{approvalRating:-2},result:"Looks tone-deaf. Goes viral for wrong reasons."},
    ]},
    {id:"wildfire_west",season:"summer",
      name:`Wildfire tears across ${wildfireState}`,
      desc:`Over 2 million acres ablaze in ${wildfireState}. Air quality alerts issued statewide.`,
      unique:true,isDisaster:true,affectedStates:[wildfireState],effects:{approvalRating:-1,gdpGrowth:-0.05},choices:[
        {text:"Deploy federal firefighting resources and declare emergency",effects:{approvalRating:3,nationalDebt:0.05},stateBoost:0.04,result:"Rapid federal response praised."},
        {text:"Partner with states on long-term forest management",effects:{approvalRating:1},factionEffects:{mod_rep:0.2,blue_dog:0.2,prog:0.1},result:"Bipartisan approach. Slower to show results."},
        {text:"Link to climate change, push green energy agenda",effects:{approvalRating:0},factionEffects:{prog:0.4,freedom:-0.5},result:"Base energized. Rural communities skeptical."},
    ]},
    {id:"winter_storm",season:"winter",
      name:`Severe winter storm paralyzes ${winterStorm[0]} and neighbors`,
      desc:`A historic blizzard brings record snowfall and ice to ${winterStorm.join(", ")}, knocking out power to millions and closing highways.`,
      unique:true,isDisaster:true,affectedStates:winterStorm,effects:{approvalRating:-1,gdpGrowth:-0.05,infrastructureSpending:3},choices:[
        {text:"Issue emergency declaration, mobilize National Guard",effects:{approvalRating:3,nationalDebt:0.04},stateBoost:0.04,result:"Rapid federal response praised by governors."},
        {text:"Coordinate with state emergency managers",effects:{approvalRating:1},stateBoost:0.02,result:"Steady, methodical response."},
        {text:"Urge residents to shelter in place, minimal federal role",effects:{approvalRating:-2},stateBoost:-0.03,result:"Critics say the federal government was missing in action."},
    ]},
    {id:"trade_deal",name:"Historic trade deal with Pacific partners",desc:"A new multilateral trade agreement with 10 Pacific nations is ready for congressional approval.",unique:true,effects:{tradeBalance:8,gdpGrowth:0.15,approvalRating:1},choices:[
      {text:"Sign and push Congress hard for ratification",effects:{approvalRating:2,tradeBalance:5},factionEffects:{mod_dem:0.3,mod_rep:0.4,prog:-0.3,blue_dog:0.2},result:"Business community celebrates."},
      {text:"Sign with stronger labor protections",effects:{approvalRating:1},factionEffects:{prog:0.2,blue_dog:0.3,mod_rep:0.1,freedom:-0.2},result:"Labor unions back it. Some partners grumble."},
      {text:"Renegotiate key terms before signing",effects:{approvalRating:-1,tradeBalance:-2},result:"Caution noted but partners grow impatient."},
    ]},
  ];

  base.forEach(e => {
    if (usedEvents.has(e.id)) return;
    if (e.season && e.season !== season) return;
    pool.push(e);
  });

  // ── Post-legislation triggered events ─────────────────────────────────

  // liberal_states_refuse: base 60%, +10% at medium overreach, +30% at high overreach
  if (passedLegislation.immigration_enforcement) {
    const elapsed = week - passedLegislation.immigration_enforcement;
    let refuseChance = 0.60;
    if (executiveOverreach > 60) refuseChance = 0.90;
    else if (executiveOverreach > 30) refuseChance = 0.70;

    if (elapsed >= 4 && elapsed <= 52 && !usedEvents.has("liberal_states_refuse") && Math.random() < refuseChance) {
      const sanctuaryStates = ["CA","NY","IL","MA","WA","CO","OR","NJ"];
      pool.push({
        id: "liberal_states_refuse",
        name: "Sanctuary States Defy Immigration Enforcement Directive",
        desc: "In the wake of the Immigration Enforcement Directive, governors of several sanctuary states announce their states will not cooperate with federal deportation operations, filing injunctions in federal court.",
        triggeredBy: "Immigration Enforcement Directive",
        unique: true,
        affectedStates: sanctuaryStates,
        effects: { approvalRating: -1, immigrationRate: 0.04 },
        choices: [
          {
            text: "Sue non-compliant states in federal court",
            effects: { approvalRating: 1 },
            factionEffects: { freedom: 0.3, trad_con: 0.3, prog: -0.3, mod_dem: -0.2 },
            stateBoost: -0.03,
            result: "Legal battle begins. Governors double down.",
            schedulesChain: {
              minDelay: 4, maxDelay: 8,
              outcomes: [
                { probability: 0.5, event: LIBERAL_STATES_COURT_WIN },
                { probability: 0.5, event: LIBERAL_STATES_COURT_LOSS },
              ],
            },
          },
          { text: "Cut federal funding to sanctuary jurisdictions", effects: { approvalRating: 0, nationalDebt: -0.02 }, factionEffects: { freedom: 0.5, trad_con: 0.4, prog: -0.5, mod_dem: -0.3 }, stateBoost: -0.05, result: "Governors call it extortion. Courts will decide." },
          { text: "Negotiate limited cooperation agreements", effects: { approvalRating: 1 }, stateBoost: 0.02, result: "Partial compliance achieved. Base frustrated by the compromise." },
        ],
      });
    }
  }

  // Pentagon audit failure: 30% chance, 4-52 weeks after Defense Modernization Act passes
  if (passedLegislation.defense_mod) {
    const elapsed = week - passedLegislation.defense_mod;
    if (elapsed >= 4 && elapsed <= 52 && !usedEvents.has("pentagon_audit_fail") && Math.random() < 0.30) {
      pool.push({
        id: "pentagon_audit_fail",
        name: "Pentagon Fails Audit Despite Defense Modernization Act",
        desc: "Auditors report the Department of Defense has failed its sixth consecutive audit, unable to account for over $4 trillion in assets — even after the recently passed Defense Modernization Act poured in new funding. Critics demand accountability before more money flows.",
        triggeredBy: "Defense Modernization Act",
        unique: true,
        effects: { approvalRating: -2, militarySpending: -5 },
        choices: [
          { text: "Demand the Pentagon clean up its books before new funds flow", effects: { approvalRating: 1 }, factionEffects: { mod_rep: 0.2, freedom: 0.3, trad_con: -0.1 }, result: "Watchdog groups applaud. Defense establishment grumbles." },
          { text: "Appoint an independent inspector general", effects: { approvalRating: 2, nationalDebt: 0.01 }, result: "Bipartisan praise for oversight. The process will take years." },
          { text: "Defend the Pentagon and blame outdated accounting systems", effects: { approvalRating: -2 }, factionEffects: { trad_con: 0.2, mod_rep: -0.2, freedom: -0.3 }, result: "Looks like a cover-up. Media has a field day." },
        ],
      });
    }
  }

  // ── Absence-triggered events ───────────────────────────────────────────

  // Amtrak cuts if Infrastructure Investment Package never passed (20% chance per check)
  if (!passedLegislation.infra_boost && !usedEvents.has("amtrak_cuts") && Math.random() < 0.90) {
    pool.push({
      id: "amtrak_cuts",
      name: "Amtrak Announces Major Route Cuts and Service Reductions",
      desc: "Facing a shrinking federal budget and no new infrastructure investment, Amtrak has announced the elimination of several long-distance routes and a 30% reduction in service frequency, leaving rural and mid-sized communities without passenger rail access.",
      triggeredByAbsence: "Infrastructure Investment Package",
      unique: true,
      effects: { approvalRating: -1, infrastructureSpending: -3 },
      choices: [
        { text: "Emergency stopgap funding to preserve core routes", effects: { approvalRating: 1, nationalDebt: 0.02 }, result: "Routes temporarily preserved. The underlying funding gap remains." },
        { text: "Use this moment to push the Infrastructure Investment Package", effects: { approvalRating: 0 }, result: "Public pressure builds. Congressional support begins to shift." },
        { text: "Accept the cuts as necessary given fiscal constraints", effects: { approvalRating: -2 }, factionEffects: { freedom: 0.2, prog: -0.4, mod_dem: -0.2, blue_dog: -0.1 }, result: "Rural communities feel abandoned. Bipartisan condemnation follows." },
      ],
    });
  }

  return pool;
}
