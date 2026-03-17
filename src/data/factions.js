export const PARTIES = { DEM: "Democratic", REP: "Republican" };

export const FACTION_DATA = {
  DEM: [
    { id:"prog",name:"Progressive Caucus",color:"#7F77DD",goals:["Universal healthcare","Green energy","Student debt relief","Wealth tax"],priorities:{healthcare:0.9,education:0.8,environment:0.9,taxes:0.7,military:0.2,immigration:0.5,infrastructure:0.7}},
    { id:"mod_dem",name:"New Democrats",color:"#378ADD",goals:["Bipartisan infrastructure","Tax reform","Immigration compromise","Deficit reduction"],priorities:{healthcare:0.5,education:0.6,environment:0.5,taxes:0.5,military:0.5,immigration:0.6,infrastructure:0.7}},
    { id:"blue_dog",name:"Blue Dog Coalition",color:"#1D9E75",goals:["Balanced budget","Rural investment","Energy independence","Law enforcement"],priorities:{healthcare:0.3,education:0.4,environment:0.3,taxes:0.6,military:0.6,immigration:0.4,infrastructure:0.6}},
  ],
  REP: [
    { id:"freedom",name:"Freedom Caucus",color:"#E24B4A",goals:["Tax cuts","Deregulation","Border wall","Slash spending"],priorities:{healthcare:0.2,education:0.2,environment:0.1,taxes:0.9,military:0.7,immigration:0.9,infrastructure:0.3}},
    { id:"mod_rep",name:"Main Street Republicans",color:"#EF9F27",goals:["Corporate tax reform","Defense modernization","Trade agreements","Immigration reform"],priorities:{healthcare:0.4,education:0.5,environment:0.3,taxes:0.7,military:0.7,immigration:0.6,infrastructure:0.5}},
    { id:"trad_con",name:"Traditional Conservatives",color:"#D85A30",goals:["Family values","Military spending","School choice","Religious liberty"],priorities:{healthcare:0.3,education:0.6,environment:0.2,taxes:0.6,military:0.8,immigration:0.5,infrastructure:0.4}},
  ],
};
