export const SPEECH_TOPICS = [
  {id:"immigration",name:"Immigration",positions:[
    {label:"Open borders advocacy",intensity:"strong-left",factionEffects:{prog:0.5,mod_dem:0.1,blue_dog:-0.4,freedom:-0.8,mod_rep:-0.4,trad_con:-0.5},approvalSwing:-1},
    {label:"Compassionate reform",intensity:"moderate-left",factionEffects:{prog:0.3,mod_dem:0.3,blue_dog:0.0,freedom:-0.4,mod_rep:0.0,trad_con:-0.2},approvalSwing:1},
    {label:"Enforce existing laws",intensity:"moderate-right",factionEffects:{prog:-0.3,mod_dem:0.0,blue_dog:0.3,freedom:0.3,mod_rep:0.3,trad_con:0.3},approvalSwing:0},
    {label:"Strict enforcement, reduce immigration",intensity:"strong-right",factionEffects:{prog:-0.6,mod_dem:-0.2,blue_dog:0.2,freedom:0.6,mod_rep:0.2,trad_con:0.4},approvalSwing:-1},
  ]},
  {id:"guns",name:"Gun policy",positions:[
    {label:"Comprehensive gun control",intensity:"strong-left",factionEffects:{prog:0.5,mod_dem:0.2,blue_dog:-0.3,freedom:-0.8,mod_rep:-0.3,trad_con:-0.5},approvalSwing:0},
    {label:"Universal background checks",intensity:"moderate-left",factionEffects:{prog:0.2,mod_dem:0.3,blue_dog:0.1,freedom:-0.4,mod_rep:0.0,trad_con:-0.2},approvalSwing:1},
    {label:"Enforce current laws, protect rights",intensity:"moderate-right",factionEffects:{prog:-0.3,mod_dem:0.0,blue_dog:0.2,freedom:0.3,mod_rep:0.3,trad_con:0.3},approvalSwing:0},
    {label:"Expand gun rights",intensity:"strong-right",factionEffects:{prog:-0.6,mod_dem:-0.2,blue_dog:0.1,freedom:0.5,mod_rep:0.1,trad_con:0.4},approvalSwing:-1},
  ]},
  {id:"climate",name:"Climate and energy",positions:[
    {label:"Green New Deal",intensity:"strong-left",factionEffects:{prog:0.6,mod_dem:0.1,blue_dog:-0.4,freedom:-0.8,mod_rep:-0.3,trad_con:-0.4},approvalSwing:-1},
    {label:"Clean energy transition",intensity:"moderate-left",factionEffects:{prog:0.3,mod_dem:0.3,blue_dog:0.0,freedom:-0.4,mod_rep:0.0,trad_con:-0.1},approvalSwing:1},
    {label:"All-of-the-above energy",intensity:"moderate-right",factionEffects:{prog:-0.2,mod_dem:0.1,blue_dog:0.3,freedom:0.2,mod_rep:0.3,trad_con:0.2},approvalSwing:1},
    {label:"Maximize fossil fuel production",intensity:"strong-right",factionEffects:{prog:-0.7,mod_dem:-0.2,blue_dog:0.2,freedom:0.5,mod_rep:0.1,trad_con:0.3},approvalSwing:-1},
  ]},
  {id:"economy",name:"Economic policy",positions:[
    {label:"Wealth redistribution",intensity:"strong-left",factionEffects:{prog:0.6,mod_dem:0.0,blue_dog:-0.5,freedom:-0.8,mod_rep:-0.4,trad_con:-0.4},approvalSwing:-1},
    {label:"Targeted investment in workers",intensity:"moderate-left",factionEffects:{prog:0.3,mod_dem:0.4,blue_dog:0.2,freedom:-0.3,mod_rep:0.1,trad_con:0.0},approvalSwing:2},
    {label:"Pro-business tax reform",intensity:"moderate-right",factionEffects:{prog:-0.3,mod_dem:0.1,blue_dog:0.3,freedom:0.3,mod_rep:0.4,trad_con:0.3},approvalSwing:1},
    {label:"Slash taxes and regulations",intensity:"strong-right",factionEffects:{prog:-0.7,mod_dem:-0.2,blue_dog:0.2,freedom:0.7,mod_rep:0.2,trad_con:0.3},approvalSwing:-1},
  ]},
  {id:"healthcare",name:"Healthcare",positions:[
    {label:"Single-payer universal healthcare",intensity:"strong-left",factionEffects:{prog:0.7,mod_dem:0.1,blue_dog:-0.4,freedom:-0.9,mod_rep:-0.4,trad_con:-0.5},approvalSwing:0},
    {label:"Expand public option",intensity:"moderate-left",factionEffects:{prog:0.3,mod_dem:0.4,blue_dog:0.1,freedom:-0.5,mod_rep:-0.1,trad_con:-0.2},approvalSwing:1},
    {label:"Market-based reforms",intensity:"moderate-right",factionEffects:{prog:-0.3,mod_dem:0.0,blue_dog:0.2,freedom:0.3,mod_rep:0.4,trad_con:0.2},approvalSwing:0},
    {label:"Repeal government healthcare programs",intensity:"strong-right",factionEffects:{prog:-0.8,mod_dem:-0.3,blue_dog:-0.1,freedom:0.6,mod_rep:0.0,trad_con:0.2},approvalSwing:-2},
  ]},
  {id:"military_fp",name:"Foreign policy and defense",positions:[
    {label:"Reduce military, diplomacy first",intensity:"strong-left",factionEffects:{prog:0.5,mod_dem:0.1,blue_dog:-0.2,freedom:-0.4,mod_rep:-0.3,trad_con:-0.5},approvalSwing:-1},
    {label:"Balanced engagement",intensity:"moderate-left",factionEffects:{prog:0.1,mod_dem:0.3,blue_dog:0.2,freedom:-0.1,mod_rep:0.2,trad_con:0.1},approvalSwing:1},
    {label:"Peace through strength",intensity:"moderate-right",factionEffects:{prog:-0.3,mod_dem:0.0,blue_dog:0.2,freedom:0.3,mod_rep:0.4,trad_con:0.4},approvalSwing:1},
    {label:"Aggressive military projection",intensity:"strong-right",factionEffects:{prog:-0.6,mod_dem:-0.2,blue_dog:0.1,freedom:0.4,mod_rep:0.2,trad_con:0.5},approvalSwing:-1},
  ]},
  {id:"crime_justice",name:"Crime and justice",positions:[
    {label:"Defund police, invest in communities",intensity:"strong-left",factionEffects:{prog:0.5,mod_dem:-0.1,blue_dog:-0.5,freedom:-0.6,mod_rep:-0.4,trad_con:-0.5},approvalSwing:-2},
    {label:"Reform and accountability",intensity:"moderate-left",factionEffects:{prog:0.2,mod_dem:0.3,blue_dog:0.1,freedom:-0.2,mod_rep:0.1,trad_con:0.0},approvalSwing:1},
    {label:"Back the blue, fund police",intensity:"moderate-right",factionEffects:{prog:-0.4,mod_dem:0.0,blue_dog:0.3,freedom:0.3,mod_rep:0.3,trad_con:0.4},approvalSwing:1},
    {label:"Maximum sentencing, zero tolerance",intensity:"strong-right",factionEffects:{prog:-0.6,mod_dem:-0.2,blue_dog:0.2,freedom:0.4,mod_rep:0.1,trad_con:0.3},approvalSwing:-1},
  ]},
  {id:"education_speech",name:"Education",positions:[
    {label:"Universal free college",intensity:"strong-left",factionEffects:{prog:0.6,mod_dem:0.2,blue_dog:-0.2,freedom:-0.7,mod_rep:-0.3,trad_con:-0.3},approvalSwing:0},
    {label:"Increase public school funding",intensity:"moderate-left",factionEffects:{prog:0.3,mod_dem:0.4,blue_dog:0.2,freedom:-0.3,mod_rep:0.1,trad_con:0.1},approvalSwing:1},
    {label:"School choice and competition",intensity:"moderate-right",factionEffects:{prog:-0.3,mod_dem:0.0,blue_dog:0.1,freedom:0.3,mod_rep:0.3,trad_con:0.4},approvalSwing:0},
    {label:"Abolish Department of Education",intensity:"strong-right",factionEffects:{prog:-0.7,mod_dem:-0.3,blue_dog:-0.1,freedom:0.6,mod_rep:0.0,trad_con:0.2},approvalSwing:-2},
  ]},
];
