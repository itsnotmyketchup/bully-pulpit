export const VISIT_TYPES = [
  {
    id:"factory",name:"Tour manufacturing plant",icon:"Factory",effects:{industry:0.04},demo:"blue-collar",
    urbanEffect:{nationwide:0.00008,local:0.0006},
  },
  {
    id:"farm",name:"Visit agricultural community",icon:"Farm",effects:{farm:0.06},demo:"rural",
    ruralEffect:{nationwide:0.0001,local:0.0015},
  },
  {
    id:"tech",name:"Tour tech campus",icon:"Tech",effects:{tech:0.03},demo:"tech workers",
    educationEffect:{nationwide:0.00008,local:0.0008},
    urbanEffect:{nationwide:0.00006,local:0.0005},
  },
  {
    id:"military",name:"Visit military base",icon:"Military",effects:{},
    factionEffects:{trad_con:0.3,mod_rep:0.2,freedom:0.2,prog:-0.1},
  },
  {
    id:"university",name:"Speak at university",icon:"University",effects:{tech:0.02},demo:"college-educated",
    educationEffect:{nationwide:0.0001,local:0.0015},
  },
  {
    id:"hospital",name:"Visit hospital / healthcare facility",icon:"Hospital",effects:{},approvalBoost:1,
    urbanEffect:{nationwide:0.00006,local:0.0005},
  },
  {
    id:"border",name:"Tour border facilities",icon:"Border",effects:{},
    stateRestriction:"border",
    factionEffects:{prog:-0.2,freedom:0.4,mod_rep:0.2,blue_dog:0.2},
  },
  {
    id:"disaster",name:"Visit disaster relief zone",icon:"Relief",effects:{},approvalBoost:2,
    stateRestriction:"disaster",
  },
  {
    id:"wallstreet",name:"Ring stock exchange bell",icon:"Finance",effects:{},
    stateRestriction:"wallstreet",
    factionEffects:{prog:-0.3,mod_dem:0.2,mod_rep:0.3,blue_dog:0.2},
    educationEffect:{nationwide:0.00006,local:0.0004},
    urbanEffect:{nationwide:0.00008,local:0.0006},
  },
  {
    id:"tribal",name:"Meet with tribal leaders",icon:"Tribal",effects:{},approvalBoost:1,
    stateRestriction:"tribal",
    ruralEffect:{nationwide:0.00005,local:0.0003},
  },
  {
    id:"church",name:"Attend community worship service",icon:"Faith",effects:{},
    factionEffects:{trad_con:0.3,blue_dog:0.2,prog:-0.1},
    religiosityEffect:{nationwide:0.0001,local:0.002,antiNationwide:-0.00005,antiLocal:-0.0006},
  },
  {
    id:"rally",name:"Hold public rally",icon:"Rally",effects:{},approvalBoost:1,partyUnityBoost:5,
  },
];
