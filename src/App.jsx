import { useState, useEffect } from "react";

// ── G1 BUS ────────────────────────────────────────────────────────────────────
const BUS_TIMES = [
  "05:23","05:54","06:25","06:56","07:16","07:35","07:54",
  "08:14","08:34","08:54","09:09","09:23","09:38","09:53",
  "10:08","10:23","10:38","10:53","11:08","11:21","11:36",
  "11:52","12:07","12:22","12:37","12:52","13:07","13:22",
  "13:37","13:52","14:07","14:21","14:36","14:51","15:06",
  "15:24","15:39","15:54","16:09","16:23","16:38","16:53",
  "17:08","17:24","17:39","17:53","18:08","18:25","18:40",
  "18:56","19:16","19:36","19:56","20:16","20:38","20:56",
  "21:16","21:36","21:56","22:16","22:36","22:56","23:26",
  "00:31","01:30","02:30","03:30","04:31"
];
const BUS_STOPS = [
  { name: "Parkwest Cherry Orchard Ave", offset: 0 },
  { name: "Inchicore Village", offset: 8 },
  { name: "Thomas Street", offset: 16 },
  { name: "Temple Bar / Wellington Quay", offset: 22 },
  { name: "Eden Quay (City Centre)", offset: 25 },
  { name: "Spencer Dock", offset: 35 },
];

// ── TRAIN → GRAND CANAL DOCK (Phoenix Park Tunnel, weekday only) ──────────────
const GCD_TIMES = ["06:43","07:31","07:50","09:42","18:36"];
const GCD_STOPS = [
  { name: "Park West & Cherry Orchard", offset: 0 },
  { name: "Drumcondra", offset: 17 },
  { name: "Dublin Connolly", offset: 27 },
  { name: "Tara Street", offset: 30 },
  { name: "Dublin Pearse", offset: 33 },
  { name: "Grand Canal Dock", offset: 37 },
];

// ── TRAIN → HEUSTON (South Western Commuter, 7 days) ─────────────────────────
// Source: trainoclock.com / Irish Rail (May 2026 timetable)
const HEUSTON_TIMES = {
  weekday: ["07:07","08:06","08:17","08:43","09:13"],
  saturday: ["07:10","08:21","09:16","10:27","11:29","12:29","13:34","14:29","15:32","16:28","17:29","18:29","19:33","20:29","22:35","23:34"],
  sunday:   ["08:40","11:31","12:30","13:28","15:27","17:27","19:31","21:31"],
};
const HEUSTON_STOPS = [
  { name: "Park West & Cherry Orchard", offset: 0 },
  { name: "Dublin Heuston", offset: 11 },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function parseTime(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function addMinutes(timeStr, mins) {
  let total = parseTime(timeStr) + mins;
  if (total >= 1440) total -= 1440;
  return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}
function nowMins() {
  const n = new Date(); return n.getHours()*60 + n.getMinutes();
}
function minutesUntil(t) {
  let diff = parseTime(t) - nowMins();
  if (diff < -60) diff += 1440;
  return diff;
}
function getDayType() {
  const d = new Date().getDay();
  if (d === 0) return "sunday";
  if (d === 6) return "saturday";
  return "weekday";
}
function isWeekday() { return getDayType() === "weekday"; }

function nextBusDep() {
  return BUS_TIMES.map(t=>({time:t,minsAway:minutesUntil(t)}))
    .filter(b=>b.minsAway>=0).sort((a,b)=>a.minsAway-b.minsAway)[0]||null;
}
function nextTrainDep(times) {
  const now = nowMins();
  return times.map(t=>({time:t,minsAway:parseTime(t)-now}))
    .filter(b=>b.minsAway>=0).sort((a,b)=>a.minsAway-b.minsAway)[0]||null;
}
function getHeustonTimes() {
  return HEUSTON_TIMES[getDayType()];
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function ClockPanel({ next, label }) {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const i=setInterval(()=>setNow(new Date()),10000); return()=>clearInterval(i); },[]);
  const clock = now.toLocaleTimeString("en-IE",{hour:"2-digit",minute:"2-digit",hour12:false});
  return (
    <div style={{background:"#111118",border:"1px solid #222",borderTop:"3px solid #FFB800",padding:"14px 18px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontSize:11,color:"#666",letterSpacing:3,textTransform:"uppercase"}}>Current Time</div>
        <div style={{fontSize:36,fontWeight:700,color:"#FFB800",letterSpacing:2}}>{clock}</div>
      </div>
      {next ? (
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:"#666",letterSpacing:3,textTransform:"uppercase"}}>Next {label}</div>
          <div style={{fontSize:28,fontWeight:700,color:"#fff"}}>{next.time}</div>
          <div style={{fontSize:12,fontWeight:700,color:next.minsAway<=5?"#ff4444":next.minsAway<=15?"#FFB800":"#4caf50"}}>
            {next.minsAway===0?"DUE NOW":`in ${next.minsAway} min`}
          </div>
        </div>
      ) : (
        <div style={{textAlign:"right",fontSize:12,color:"#555"}}>No service<br/>right now</div>
      )}
    </div>
  );
}

function UpcomingStrip({ times, selected, onSelect, noWrap }) {
  const upcoming = times
    .map(t=>({time:t,minsAway:noWrap ? parseTime(t)-nowMins() : minutesUntil(t)}))
    .filter(b=>b.minsAway>=0&&b.minsAway<=120);
  if (!upcoming.length) return <div style={{fontSize:12,color:"#555",marginBottom:24,padding:"10px 0"}}>No departures in the next 2 hours.</div>;
  return (
    <div style={{marginBottom:24}}>
      <div style={{fontSize:10,letterSpacing:4,color:"#555",textTransform:"uppercase",marginBottom:10}}>Next 2 Hours</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {upcoming.slice(0,8).map((dep,i)=>(
          <button key={dep.time} onClick={()=>onSelect(selected===dep.time?null:dep.time)} style={{
            background:selected===dep.time?"#FFB800":i===0?"#1a1a0a":"#111118",
            border:i===0?"2px solid #FFB800":"1px solid #333",
            color:selected===dep.time?"#0a0a0f":i===0?"#FFB800":"#ccc",
            padding:"10px 14px",cursor:"pointer",borderRadius:2,fontFamily:"inherit",fontSize:15,fontWeight:700,minWidth:72
          }}>
            <div>{dep.time}</div>
            <div style={{fontSize:10,fontWeight:400,marginTop:3,color:selected===dep.time?"#0a0a0f":dep.minsAway<=5?"#ff4444":dep.minsAway<=15?"#FFB800":"#666"}}>
              {dep.minsAway===0?"DUE":`${dep.minsAway}m`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function JourneyPanel({ selectedTime, stops }) {
  if (!selectedTime) return null;
  return (
    <div style={{background:"#111118",border:"1px solid #FFB800",padding:"16px 18px",marginBottom:24,animation:"fadeIn 0.2s ease"}}>
      <div style={{fontSize:10,letterSpacing:4,color:"#FFB800",textTransform:"uppercase",marginBottom:12}}>Journey from {selectedTime}</div>
      {stops.map((stop,i)=>{
        const isFirst=i===0,isLast=i===stops.length-1;
        return (
          <div key={stop.name} style={{display:"flex",alignItems:"center",gap:14,marginBottom:isLast?0:4}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:16}}>
              <div style={{width:isFirst||isLast?12:8,height:isFirst||isLast?12:8,borderRadius:"50%",background:isFirst?"#FFB800":isLast?"#fff":"#444",border:isFirst||isLast?"none":"1px solid #555",flexShrink:0}}/>
              {!isLast&&<div style={{width:2,height:22,background:"#2a2a2a"}}/>}
            </div>
            <div style={{flex:1,display:"flex",justifyContent:"space-between",paddingBottom:isLast?0:6}}>
              <span style={{fontSize:13,color:isFirst||isLast?"#fff":"#888",fontWeight:isFirst||isLast?600:400}}>{stop.name}</span>
              <span style={{fontSize:13,fontWeight:700,color:isFirst?"#FFB800":isLast?"#fff":"#666"}}>{addMinutes(selectedTime,stop.offset)}</span>
            </div>
          </div>
        );
      })}
      <div style={{marginTop:12,fontSize:10,color:"#444"}}>* Journey times are approximate</div>
    </div>
  );
}

function TrainList({ times, next, noWrap, selected, onSelect, arrOffset, arrLabel }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:2}}>
      {times.map((t,i)=>{
        const mins = noWrap ? parseTime(t)-nowMins() : minutesUntil(t);
        const isPast = mins < 0;
        const isNext = t === next?.time;
        return (
          <div key={t} onClick={()=>onSelect(selected===t?null:t)} style={{
            background:isNext?"#1a1a0a":"#111118",
            border:isNext?"1px solid #FFB800":"1px solid #1a1a1a",
            padding:"12px 16px",cursor:"pointer",
            display:"flex",justifyContent:"space-between",alignItems:"center",
            opacity:isPast?0.3:1,transition:"opacity 0.2s"
          }}>
            <div style={{fontSize:22,fontWeight:700,color:isNext?"#FFB800":"#ccc"}}>{t}</div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:"#555"}}>arr {arrLabel} {addMinutes(t,arrOffset)}</div>
              {!isPast&&(
                <div style={{fontSize:11,fontWeight:700,marginTop:2,color:mins<=5?"#ff4444":mins<=20?"#FFB800":"#555"}}>
                  {mins===0?"DUE":mins>0?`${mins}m away`:""}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function TransitSchedule() {
  const [tab, setTab] = useState("bus");
  const [selected, setSelected] = useState(null);
  const [, setTick] = useState(0);

  useEffect(()=>{
    const i = setInterval(()=>setTick(t=>t+1),10000);
    return()=>clearInterval(i);
  },[]);

  const busNext = nextBusDep();
  const gcdNext = isWeekday() ? nextTrainDep(GCD_TIMES) : null;
  const heustonTimes = getHeustonTimes();
  const heustonNext = nextTrainDep(heustonTimes);
  const dayType = getDayType();
  const dayLabel = dayType==="saturday"?"Saturday":dayType==="sunday"?"Sunday":"Weekday";

  const TABS = [
    { key:"bus",   emoji:"🚌", title:"G1 Bus",     sub:"→ Spencer Dock · 24hr" },
    { key:"gcd",   emoji:"🚂", title:"→ GCD",       sub:"Phoenix Park Tunnel · Weekdays" },
    { key:"heuston",emoji:"🚂",title:"→ Heuston",   sub:"South Western · 7 days" },
  ];

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#f0ede6",fontFamily:"'Courier New','Lucida Console',monospace",position:"relative",overflow:"hidden"}}>
      <div style={{position:"fixed",inset:0,zIndex:0,backgroundImage:"linear-gradient(rgba(255,184,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,184,0,0.03) 1px,transparent 1px)",backgroundSize:"32px 32px"}}/>

      <div style={{position:"relative",zIndex:1,maxWidth:600,margin:"0 auto",padding:"20px 16px 40px"}}>

        <div style={{borderLeft:"4px solid #FFB800",paddingLeft:16,marginBottom:24}}>
          <div style={{fontSize:11,letterSpacing:4,color:"#FFB800",textTransform:"uppercase",marginBottom:4}}>Park West · Cherry Orchard</div>
          <div style={{fontSize:14,color:"#888"}}>City Centre Departures</div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",marginBottom:24,borderBottom:"1px solid #222"}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>{setTab(t.key);setSelected(null);}} style={{
              flex:1,background:"none",border:"none",
              borderBottom:tab===t.key?"3px solid #FFB800":"3px solid transparent",
              color:tab===t.key?"#FFB800":"#555",padding:"10px 4px 8px",cursor:"pointer",fontFamily:"inherit",textAlign:"center"
            }}>
              <div style={{fontSize:12,fontWeight:700}}>{t.emoji} {t.title}</div>
              <div style={{fontSize:9,marginTop:2,color:tab===t.key?"#888":"#333",lineHeight:1.3}}>{t.sub}</div>
            </button>
          ))}
        </div>

        {/* ── BUS TAB ── */}
        {tab==="bus" && (
          <div>
            <div style={{borderLeft:"4px solid #FFB800",paddingLeft:12,marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{background:"#FFB800",color:"#0a0a0f",fontSize:22,fontWeight:900,padding:"2px 12px"}}>G1</span>
                <span style={{fontSize:16,fontWeight:700}}>→ Spencer Dock</span>
              </div>
              <div style={{fontSize:11,color:"#666",marginTop:4}}>24hr service · Every 15–20 mins (peak)</div>
            </div>
            <ClockPanel next={busNext} label="Bus"/>
            <UpcomingStrip times={BUS_TIMES} selected={selected} onSelect={setSelected} noWrap={false}/>
            <JourneyPanel selectedTime={selected} stops={BUS_STOPS}/>
            <div style={{fontSize:10,letterSpacing:4,color:"#555",textTransform:"uppercase",marginBottom:12}}>Full Daily Timetable · 24hr Service</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:"#1a1a1a"}}>
              {["05–07","07–12","12–18","18+"].map(l=>(
                <div key={l} style={{background:"#0f0f14",padding:"6px 10px",fontSize:9,color:"#444",letterSpacing:2,textTransform:"uppercase",textAlign:"center"}}>{l}</div>
              ))}
              {[
                BUS_TIMES.filter(t=>parseTime(t)>=300&&parseTime(t)<420),
                BUS_TIMES.filter(t=>parseTime(t)>=420&&parseTime(t)<720),
                BUS_TIMES.filter(t=>parseTime(t)>=720&&parseTime(t)<1080),
                BUS_TIMES.filter(t=>parseTime(t)>=1080||parseTime(t)<300),
              ].map((group,gi)=>(
                <div key={gi} style={{background:"#0a0a0f",padding:"8px 10px"}}>
                  {group.map(t=>{
                    const mins=minutesUntil(t);
                    const isPast=mins<-2,isNext=t===busNext?.time,isSoon=mins>=0&&mins<=30;
                    return (
                      <div key={t} style={{padding:"3px 0",fontSize:13,fontWeight:isNext?700:400,color:isNext?"#FFB800":isPast?"#2a2a2a":isSoon?"#ccc":"#555",display:"flex",alignItems:"center",gap:4}}>
                        {isNext&&<span style={{width:5,height:5,borderRadius:"50%",background:"#FFB800",display:"inline-block",flexShrink:0}}/>}
                        <span style={{marginLeft:isNext?0:9}}>{t}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div style={{marginTop:20,fontSize:10,color:"#333",textAlign:"center"}}>Stop 8220DB006021 · Data: bustimes.org / Dublin Bus</div>
          </div>
        )}

        {/* ── GCD TAB ── */}
        {tab==="gcd" && (
          <div>
            <div style={{borderLeft:"4px solid #e85d04",paddingLeft:12,marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <span style={{background:"#e85d04",color:"#fff",fontSize:12,fontWeight:900,padding:"3px 10px",letterSpacing:1}}>IRISH RAIL</span>
                <span style={{fontSize:15,fontWeight:700}}>→ Grand Canal Dock</span>
              </div>
              <div style={{fontSize:11,color:"#666"}}>
                Phoenix Park Tunnel ·{" "}
                <span style={{color:isWeekday()?"#4caf50":"#ff4444",fontWeight:700}}>
                  {isWeekday()?"✓ Service active today":"✗ No service today (weekdays only)"}
                </span>
              </div>
            </div>
            {!isWeekday()&&(
              <div style={{background:"#1a0a0a",border:"1px solid #cc3300",padding:"14px 16px",marginBottom:20,fontSize:13,color:"#ff6b35",lineHeight:1.7}}>
                ⚠️ The Phoenix Park Tunnel service does not run on weekends.
                <div style={{color:"#666",fontSize:11,marginTop:6}}>Service resumes Monday from 06:43.</div>
              </div>
            )}
            <ClockPanel next={gcdNext} label="Train"/>
            {isWeekday()&&(
              <>
                <UpcomingStrip times={GCD_TIMES} selected={selected} onSelect={setSelected} noWrap={true}/>
                <JourneyPanel selectedTime={selected} stops={GCD_STOPS}/>
              </>
            )}
            <div style={{fontSize:10,letterSpacing:4,color:"#555",textTransform:"uppercase",marginBottom:12}}>Weekday Departures</div>
            <TrainList times={GCD_TIMES} next={gcdNext} noWrap={true} selected={selected} onSelect={setSelected} arrOffset={37} arrLabel="GCD"/>
            <div style={{marginTop:16,background:"#0f0f14",border:"1px solid #1a1a1a",padding:"12px 14px",fontSize:11,color:"#555",lineHeight:1.9}}>
              Park West → Drumcondra → Connolly → Tara St → Pearse → Grand Canal Dock
              <div style={{marginTop:8,color:"#444",fontSize:10}}>⚠️ Partial schedule. Full timetable: <span style={{color:"#e85d04"}}>irishrail.ie</span></div>
            </div>
          </div>
        )}

        {/* ── HEUSTON TAB ── */}
        {tab==="heuston" && (
          <div>
            <div style={{borderLeft:"4px solid #e85d04",paddingLeft:12,marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <span style={{background:"#e85d04",color:"#fff",fontSize:12,fontWeight:900,padding:"3px 10px",letterSpacing:1}}>IRISH RAIL</span>
                <span style={{fontSize:15,fontWeight:700}}>→ Dublin Heuston</span>
              </div>
              <div style={{fontSize:11,color:"#666"}}>
                South Western Commuter · <span style={{color:"#4caf50",fontWeight:700}}>✓ Runs 7 days</span>
              </div>
            </div>

            <div style={{background:"#0f0f14",border:"1px solid #222",padding:"8px 14px",marginBottom:16,fontSize:11,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#888"}}>Today's schedule:</span>
              <span style={{color:"#FFB800",fontWeight:700,letterSpacing:2}}>{dayLabel.toUpperCase()}</span>
            </div>

            <ClockPanel next={heustonNext} label="Train"/>
            <UpcomingStrip times={heustonTimes} selected={selected} onSelect={setSelected} noWrap={true}/>
            <JourneyPanel selectedTime={selected} stops={HEUSTON_STOPS}/>

            <div style={{fontSize:10,letterSpacing:4,color:"#555",textTransform:"uppercase",marginBottom:12}}>Today's Departures · {dayLabel}</div>
            <TrainList times={heustonTimes} next={heustonNext} noWrap={true} selected={selected} onSelect={setSelected} arrOffset={11} arrLabel="Heuston"/>

            {dayType==="weekday"&&(
              <div style={{marginTop:16,background:"#0f0f14",border:"1px solid #1a1a1a",padding:"12px 14px",fontSize:10,color:"#444",lineHeight:1.8}}>
                ⚠️ Weekday schedule shows morning peak only (5 confirmed services).<br/>
                Additional services run throughout the day. Full timetable: <span style={{color:"#e85d04"}}>irishrail.ie</span>
              </div>
            )}

            <div style={{marginTop:16,fontSize:10,color:"#333",textAlign:"center"}}>
              Direct service · ~11 min journey · Data: trainoclock.com / Irish Rail (May 2026)
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:none;} }
        button:hover{filter:brightness(1.15);}
        *{box-sizing:border-box;}
      `}</style>
    </div>
  );
}
