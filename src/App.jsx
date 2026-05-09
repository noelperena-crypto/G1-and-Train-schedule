import { useState, useEffect, useCallback } from "react";

// ── G1 BUS (static — Dublin Bus) ──────────────────────────────────────────────
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
  const n = new Date(); return n.getHours()*60+n.getMinutes();
}
function minutesUntil(t) {
  let diff = parseTime(t) - nowMins();
  if (diff < -60) diff += 1440;
  return diff;
}
function nextBusDep() {
  return BUS_TIMES.map(t=>({time:t,minsAway:minutesUntil(t)}))
    .filter(b=>b.minsAway>=0).sort((a,b)=>a.minsAway-b.minsAway)[0]||null;
}

// Parse Irish Rail XML response
function parseTrainXML(xml) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    return Array.from(doc.querySelectorAll("objStationData")).map(t => ({
      trainCode:    t.querySelector("Traincode")?.textContent || "",
      destination:  t.querySelector("Destination")?.textContent || "",
      origin:       t.querySelector("Origin")?.textContent || "",
      dueIn:        parseInt(t.querySelector("Duein")?.textContent || "999"),
      late:         parseInt(t.querySelector("Late")?.textContent || "0"),
      schDepart:    t.querySelector("Schdepart")?.textContent || "",
      expDepart:    t.querySelector("Expdepart")?.textContent || "",
      status:       t.querySelector("Status")?.textContent || "",
      lastLocation: t.querySelector("Lastlocation")?.textContent || "",
      direction:    t.querySelector("Direction")?.textContent || "",
      trainType:    t.querySelector("Traintype")?.textContent || "",
    }));
  } catch {
    return [];
  }
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function ClockPanel({ next, label, live }) {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const i=setInterval(()=>setNow(new Date()),10000); return()=>clearInterval(i); },[]);
  const clock = now.toLocaleTimeString("en-IE",{hour:"2-digit",minute:"2-digit",hour12:false});
  return (
    <div style={{background:"#111118",border:"1px solid #222",borderTop:"3px solid #FFB800",padding:"14px 18px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontSize:11,color:"#666",letterSpacing:3,textTransform:"uppercase"}}>Current Time</div>
        <div style={{fontSize:36,fontWeight:700,color:"#FFB800",letterSpacing:2}}>{clock}</div>
        {live && <div style={{fontSize:9,color:"#4caf50",letterSpacing:2,marginTop:2}}>● LIVE DATA</div>}
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

function UpcomingStrip({ times, selected, onSelect }) {
  const upcoming = times
    .map(t=>({time:t,minsAway:minutesUntil(t)}))
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

// Live train departure card
function LiveTrainCard({ train, isFirst }) {
  const late = train.late;
  const onTime = late <= 1;
  return (
    <div style={{
      background: isFirst ? "#1a1a0a" : "#111118",
      border: isFirst ? "1px solid #FFB800" : "1px solid #1a1a1a",
      padding: "14px 16px", marginBottom: 2,
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          {/* Due in badge */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <span style={{
              fontSize:26,fontWeight:700,
              color: train.dueIn<=5?"#ff4444":train.dueIn<=15?"#FFB800":"#ccc"
            }}>
              {train.dueIn===0?"DUE":`${train.dueIn} min`}
            </span>
            {!onTime && (
              <span style={{fontSize:11,color:"#ff6b35",fontWeight:700,background:"#1a0a0a",padding:"2px 8px",border:"1px solid #cc3300"}}>
                +{late} min late
              </span>
            )}
            {onTime && train.status==="En Route" && (
              <span style={{fontSize:11,color:"#4caf50",fontWeight:700}}>On time</span>
            )}
          </div>
          {/* Destination */}
          <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:3}}>
            → {train.destination}
          </div>
          {/* Origin */}
          <div style={{fontSize:11,color:"#555"}}>
            From {train.origin}
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          {/* Scheduled time */}
          <div style={{fontSize:20,fontWeight:700,color:onTime?"#888":"#555",textDecoration:onTime?"none":"line-through"}}>
            {train.schDepart}
          </div>
          {!onTime && (
            <div style={{fontSize:18,fontWeight:700,color:"#ff6b35"}}>{train.expDepart}</div>
          )}
          <div style={{fontSize:10,color:"#444",marginTop:4,letterSpacing:1}}>{train.trainType?.toUpperCase()}</div>
        </div>
      </div>
      {/* Last known location */}
      {train.lastLocation && (
        <div style={{marginTop:8,fontSize:10,color:"#444",borderTop:"1px solid #1a1a1a",paddingTop:6}}>
          📍 {train.lastLocation}
        </div>
      )}
    </div>
  );
}

function LiveTrainSection({ trains, loading, error, lastUpdated, onRefresh, emptyMsg }) {
  if (loading) return (
    <div style={{padding:"30px 0",textAlign:"center",color:"#555",fontSize:13}}>
      <div style={{fontSize:24,marginBottom:8}}>⏳</div>
      Fetching live data from Irish Rail...
    </div>
  );
  if (error) return (
    <div style={{background:"#1a0a0a",border:"1px solid #cc3300",padding:"14px 16px",marginBottom:16,fontSize:13,color:"#ff6b35",lineHeight:1.7}}>
      ⚠️ Could not connect to Irish Rail live data.<br/>
      <span style={{fontSize:11,color:"#666"}}>Check your connection or try refreshing.</span>
      <div style={{marginTop:10}}>
        <button onClick={onRefresh} style={{background:"#cc3300",color:"#fff",border:"none",padding:"6px 16px",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>
          Try Again
        </button>
      </div>
    </div>
  );
  if (!trains.length) return (
    <div style={{padding:"20px 0",textAlign:"center",color:"#555",fontSize:12}}>
      {emptyMsg}
    </div>
  );
  return (
    <div>
      {lastUpdated && (
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:9,color:"#444",letterSpacing:2,textTransform:"uppercase"}}>
            Live departures · Updated {lastUpdated}
          </div>
          <button onClick={onRefresh} style={{background:"none",border:"1px solid #333",color:"#666",padding:"3px 10px",cursor:"pointer",fontFamily:"inherit",fontSize:10}}>
            ↻ Refresh
          </button>
        </div>
      )}
      {trains.map((train, i) => (
        <LiveTrainCard key={train.trainCode+train.schDepart} train={train} isFirst={i===0}/>
      ))}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function TransitSchedule() {
  const [tab, setTab] = useState("bus");
  const [selectedBus, setSelectedBus] = useState(null);
  const [, setTick] = useState(0);

  // Live train data
  const [allTrains, setAllTrains] = useState([]);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainError, setTrainError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchTrains = useCallback(async () => {
    setTrainLoading(true);
    setTrainError(false);
    try {
      const res = await fetch("/api/trains");
      if (!res.ok) throw new Error("Bad response");
      const xml = await res.text();
      const trains = parseTrainXML(xml);
      setAllTrains(trains);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString("en-IE",{hour:"2-digit",minute:"2-digit",hour12:false}));
    } catch {
      setTrainError(true);
    } finally {
      setTrainLoading(false);
    }
  }, []);

  // Fetch trains on mount and every 60 seconds
  useEffect(() => {
    fetchTrains();
    const i = setInterval(fetchTrains, 60000);
    return () => clearInterval(i);
  }, [fetchTrains]);

  // Re-render bus countdown every 10s
  useEffect(() => {
    const i = setInterval(() => setTick(t => t+1), 10000);
    return () => clearInterval(i);
  }, []);

  const busNext = nextBusDep();

  // Filter live trains by destination
  const heustonTrains = allTrains
    .filter(t => t.destination.toLowerCase().includes("heuston"))
    .sort((a,b) => a.dueIn - b.dueIn);

  const gcdTrains = allTrains
    .filter(t => t.destination.toLowerCase().includes("grand canal"))
    .sort((a,b) => a.dueIn - b.dueIn);

  const heustonNext = heustonTrains[0]
    ? { time: heustonTrains[0].expDepart||heustonTrains[0].schDepart, minsAway: heustonTrains[0].dueIn }
    : null;

  const gcdNext = gcdTrains[0]
    ? { time: gcdTrains[0].expDepart||gcdTrains[0].schDepart, minsAway: gcdTrains[0].dueIn }
    : null;

  const TABS = [
    { key:"bus",     emoji:"🚌", title:"G1 Bus",    sub:"→ Spencer Dock" },
    { key:"gcd",     emoji:"🚂", title:"→ GCD",      sub:"Live · Weekdays" },
    { key:"heuston", emoji:"🚂", title:"→ Heuston",  sub:"Live · 7 days" },
  ];

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#f0ede6",fontFamily:"'Courier New','Lucida Console',monospace",position:"relative",overflow:"hidden"}}>
      <div style={{position:"fixed",inset:0,zIndex:0,backgroundImage:"linear-gradient(rgba(255,184,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,184,0,0.03) 1px,transparent 1px)",backgroundSize:"32px 32px"}}/>
      <div style={{position:"relative",zIndex:1,maxWidth:600,margin:"0 auto",padding:"20px 16px 40px"}}>

        <div style={{borderLeft:"4px solid #FFB800",paddingLeft:16,marginBottom:24}}>
          <div style={{fontSize:11,letterSpacing:4,color:"#FFB800",textTransform:"uppercase",marginBottom:4}}>Park West · Cherry Orchard</div>
          <div style={{fontSize:14,color:"#888"}}>City Centre Departures</div>
        </div>

        <div style={{display:"flex",marginBottom:24,borderBottom:"1px solid #222"}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{
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
            <ClockPanel next={busNext} label="Bus" live={false}/>
            <UpcomingStrip times={BUS_TIMES} selected={selectedBus} onSelect={setSelectedBus}/>
            <JourneyPanel selectedTime={selectedBus} stops={BUS_STOPS}/>
            <div style={{fontSize:10,letterSpacing:4,color:"#555",textTransform:"uppercase",marginBottom:12}}>Full Daily Timetable</div>
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
              <div style={{fontSize:11,color:"#666"}}>Phoenix Park Tunnel · Weekdays only</div>
            </div>
            <ClockPanel next={gcdNext} label="Train" live={!trainLoading&&!trainError}/>
            <LiveTrainSection
              trains={gcdTrains}
              loading={trainLoading}
              error={trainError}
              lastUpdated={lastUpdated}
              onRefresh={fetchTrains}
              emptyMsg="No Grand Canal Dock services currently showing. The Phoenix Park Tunnel service runs weekdays only."
            />
            <div style={{marginTop:16,background:"#0f0f14",border:"1px solid #1a1a1a",padding:"10px 14px",fontSize:10,color:"#444",lineHeight:1.8}}>
              Park West → Drumcondra → Connolly → Tara St → Pearse → Grand Canal Dock<br/>
              Data refreshes automatically every 60 seconds from Irish Rail.
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
              <div style={{fontSize:11,color:"#666"}}>South Western Commuter · 7 days a week</div>
            </div>
            <ClockPanel next={heustonNext} label="Train" live={!trainLoading&&!trainError}/>
            <LiveTrainSection
              trains={heustonTrains}
              loading={trainLoading}
              error={trainError}
              lastUpdated={lastUpdated}
              onRefresh={fetchTrains}
              emptyMsg="No Heuston services currently showing. Check irishrail.ie for the full timetable."
            />
            <div style={{marginTop:16,background:"#0f0f14",border:"1px solid #1a1a1a",padding:"10px 14px",fontSize:10,color:"#444",lineHeight:1.8}}>
              Park West → Dublin Heuston (~11 min direct)<br/>
              Data refreshes automatically every 60 seconds from Irish Rail.
            </div>
          </div>
        )}

      </div>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:none;}}
        button:hover{filter:brightness(1.15);}
        *{box-sizing:border-box;}
      `}</style>
    </div>
  );
}
