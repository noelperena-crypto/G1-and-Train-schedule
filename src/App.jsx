import { useState, useEffect, useCallback } from "react";

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

function weatherIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 75) return "🌨️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}
function weatherDesc(code) {
  if (code === 0) return "Clear";
  if (code <= 2) return "Mainly clear";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 55) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 75) return "Snow";
  if (code <= 82) return "Showers";
  return "Thunderstorm";
}

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
      trainType:    t.querySelector("Traintype")?.textContent || "",
    }));
  } catch { return []; }
}

// ── WEATHER WIDGET ─────────────────────────────────────────────────────────────
function WeatherWidget() {
  const [wx, setWx] = useState(null);
  const [rainNext, setRainNext] = useState(0);

  const fetch_wx = useCallback(async () => {
    try {
      const url = "https://api.open-meteo.com/v1/forecast" +
        "?latitude=53.335&longitude=-6.365" +
        "&current=temperature_2m,weathercode,windspeed_10m,precipitation" +
        "&hourly=precipitation_probability" +
        "&forecast_days=1&timezone=Europe%2FDublin";
      const res = await fetch(url);
      const data = await res.json();
      const hour = new Date().getHours();
      const maxRain = Math.max(
        ...(data.hourly?.precipitation_probability?.slice(hour, hour+4) || [0])
      );
      setWx(data.current);
      setRainNext(maxRain);
    } catch {}
  }, []);

  useEffect(() => {
    fetch_wx();
    const i = setInterval(fetch_wx, 600000);
    return () => clearInterval(i);
  }, [fetch_wx]);

  if (!wx) return (
    <div style={{textAlign:"right",fontSize:11,color:"#444"}}>
      🌡️ Loading...
    </div>
  );

  const temp = Math.round(wx.temperature_2m);
  const code = wx.weathercode;
  const wind = Math.round(wx.windspeed_10m);
  const raining = wx.precipitation > 0;

  return (
    <div style={{textAlign:"right"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
        <span style={{fontSize:22}}>{weatherIcon(code)}</span>
        <span style={{fontSize:24,fontWeight:700,color:"#fff"}}>{temp}°</span>
      </div>
      <div style={{fontSize:10,color:"#888",marginTop:2}}>{weatherDesc(code)}</div>
      <div style={{fontSize:10,color:"#666",marginTop:1}}>💨 {wind} km/h</div>
      {rainNext >= 50 && (
        <div style={{fontSize:10,color:"#7ab8f5",marginTop:2}}>☔ {rainNext}% rain soon</div>
      )}
      {raining && (
        <div style={{fontSize:10,color:"#4a90d9",marginTop:2}}>🌧️ Raining now</div>
      )}
    </div>
  );
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function ClockPanel({ next, label, live }) {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const i=setInterval(()=>setNow(new Date()),10000); return()=>clearInterval(i); },[]);
  const clock = now.toLocaleTimeString("en-IE",{hour:"2-digit",minute:"2-digit",hour12:false});
  return (
    <div style={{background:"#111118",border:"1px solid #222",borderTop:"3px solid #FFB800",padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontSize:10,color:"#666",letterSpacing:3,textTransform:"uppercase"}}>Current Time</div>
        <div style={{fontSize:32,fontWeight:700,color:"#FFB800",letterSpacing:2}}>{clock}</div>
        {live && <div style={{fontSize:9,color:"#4caf50",letterSpacing:2,marginTop:1}}>● LIVE DATA</div>}
      </div>
      {next ? (
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:"#666",letterSpacing:3,textTransform:"uppercase"}}>Next {label}</div>
          <div style={{fontSize:26,fontWeight:700,color:"#fff"}}>{next.time}</div>
          <div style={{fontSize:12,fontWeight:700,color:next.minsAway<=5?"#ff4444":next.minsAway<=15?"#FFB800":"#4caf50"}}>
            {next.minsAway===0?"DUE NOW":`in ${next.minsAway} min`}
          </div>
        </div>
      ) : (
        <div style={{textAlign:"right",fontSize:11,color:"#555"}}>No service<br/>right now</div>
      )}
    </div>
  );
}

function UpcomingStrip({ times, selected, onSelect }) {
  const upcoming = times.map(t=>({time:t,minsAway:minutesUntil(t)})).filter(b=>b.minsAway>=0&&b.minsAway<=120);
  if (!upcoming.length) return <div style={{fontSize:12,color:"#555",marginBottom:16,padding:"8px 0"}}>No departures in the next 2 hours.</div>;
  return (
    <div style={{marginBottom:16}}>
      <div style={{fontSize:10,letterSpacing:4,color:"#555",textTransform:"uppercase",marginBottom:8}}>Next 2 Hours</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {upcoming.slice(0,8).map((dep,i)=>(
          <button key={dep.time} onClick={()=>onSelect(selected===dep.time?null:dep.time)} style={{
            background:selected===dep.time?"#FFB800":i===0?"#1a1a0a":"#111118",
            border:i===0?"2px solid #FFB800":"1px solid #333",
            color:selected===dep.time?"#0a0a0f":i===0?"#FFB800":"#ccc",
            padding:"8px 12px",cursor:"pointer",borderRadius:2,fontFamily:"inherit",fontSize:14,fontWeight:700,minWidth:68
          }}>
            <div>{dep.time}</div>
            <div style={{fontSize:10,fontWeight:400,marginTop:2,color:selected===dep.time?"#0a0a0f":dep.minsAway<=5?"#ff4444":dep.minsAway<=15?"#FFB800":"#666"}}>
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
    <div style={{background:"#111118",border:"1px solid #FFB800",padding:"14px 16px",marginBottom:16,animation:"fadeIn 0.2s ease"}}>
      <div style={{fontSize:10,letterSpacing:4,color:"#FFB800",textTransform:"uppercase",marginBottom:10}}>Journey from {selectedTime}</div>
      {stops.map((stop,i)=>{
        const isFirst=i===0,isLast=i===stops.length-1;
        return (
          <div key={stop.name} style={{display:"flex",alignItems:"center",gap:12,marginBottom:isLast?0:2}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:14}}>
              <div style={{width:isFirst||isLast?11:7,height:isFirst||isLast?11:7,borderRadius:"50%",background:isFirst?"#FFB800":isLast?"#fff":"#444",flexShrink:0}}/>
              {!isLast&&<div style={{width:2,height:20,background:"#2a2a2a"}}/>}
            </div>
            <div style={{flex:1,display:"flex",justifyContent:"space-between",paddingBottom:isLast?0:4}}>
              <span style={{fontSize:12,color:isFirst||isLast?"#fff":"#888",fontWeight:isFirst||isLast?600:400}}>{stop.name}</span>
              <span style={{fontSize:12,fontWeight:700,color:isFirst?"#FFB800":isLast?"#fff":"#666"}}>{addMinutes(selectedTime,stop.offset)}</span>
            </div>
          </div>
        );
      })}
      <div style={{marginTop:10,fontSize:10,color:"#444"}}>* Approximate times</div>
    </div>
  );
}

function LiveTrainCard({ train, isFirst }) {
  const onTime = train.late <= 1;
  return (
    <div style={{background:isFirst?"#1a1a0a":"#111118",border:isFirst?"1px solid #FFB800":"1px solid #1a1a1a",padding:"12px 14px",marginBottom:2}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <span style={{fontSize:24,fontWeight:700,color:train.dueIn<=5?"#ff4444":train.dueIn<=15?"#FFB800":"#ccc"}}>
              {train.dueIn===0?"DUE":`${train.dueIn} min`}
            </span>
            {!onTime && <span style={{fontSize:10,color:"#ff6b35",fontWeight:700,background:"#1a0a0a",padding:"2px 6px",border:"1px solid #cc3300"}}>+{train.late}m late</span>}
            {onTime && train.status==="En Route" && <span style={{fontSize:10,color:"#4caf50",fontWeight:700}}>On time</span>}
          </div>
          <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:2}}>→ {train.destination}</div>
          <div style={{fontSize:10,color:"#555"}}>From {train.origin}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:18,fontWeight:700,color:onTime?"#888":"#555",textDecoration:onTime?"none":"line-through"}}>{train.schDepart}</div>
          {!onTime && <div style={{fontSize:16,fontWeight:700,color:"#ff6b35"}}>{train.expDepart}</div>}
          <div style={{fontSize:9,color:"#444",marginTop:3,letterSpacing:1}}>{train.trainType?.toUpperCase()}</div>
        </div>
      </div>
      {train.lastLocation && (
        <div style={{marginTop:6,fontSize:10,color:"#444",borderTop:"1px solid #1a1a1a",paddingTop:5}}>📍 {train.lastLocation}</div>
      )}
    </div>
  );
}

function LiveTrainSection({ trains, loading, error, lastUpdated, onRefresh, emptyMsg }) {
  if (loading) return <div style={{padding:"24px 0",textAlign:"center",color:"#555",fontSize:12}}>⏳ Fetching live data from Irish Rail...</div>;
  if (error) return (
    <div style={{background:"#1a0a0a",border:"1px solid #cc3300",padding:"12px 14px",marginBottom:14,fontSize:12,color:"#ff6b35",lineHeight:1.7}}>
      ⚠️ Could not connect to Irish Rail.
      <div style={{marginTop:8}}><button onClick={onRefresh} style={{background:"#cc3300",color:"#fff",border:"none",padding:"5px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:11}}>Try Again</button></div>
    </div>
  );
  if (!trains.length) return <div style={{padding:"16px 0",textAlign:"center",color:"#555",fontSize:11}}>{emptyMsg}</div>;
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:9,color:"#444",letterSpacing:2,textTransform:"uppercase"}}>Live · Updated {lastUpdated}</div>
        <button onClick={onRefresh} style={{background:"none",border:"1px solid #333",color:"#666",padding:"2px 8px",cursor:"pointer",fontFamily:"inherit",fontSize:9}}>↻ Refresh</button>
      </div>
      {trains.map((train,i) => <LiveTrainCard key={train.trainCode+train.schDepart} train={train} isFirst={i===0}/>)}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function TransitSchedule() {
  const [tab, setTab] = useState("bus");
  const [selectedBus, setSelectedBus] = useState(null);
  const [, setTick] = useState(0);
  const [allTrains, setAllTrains] = useState([]);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainError, setTrainError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);

  useEffect(() => {
    const handler = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const fetchTrains = useCallback(async () => {
    setTrainLoading(true); setTrainError(false);
    try {
      const res = await fetch("/api/trains");
      if (!res.ok) throw new Error();
      const xml = await res.text();
      setAllTrains(parseTrainXML(xml));
      setLastUpdated(new Date().toLocaleTimeString("en-IE",{hour:"2-digit",minute:"2-digit",hour12:false}));
    } catch { setTrainError(true); }
    finally { setTrainLoading(false); }
  }, []);

  useEffect(() => { fetchTrains(); const i=setInterval(fetchTrains,60000); return()=>clearInterval(i); }, [fetchTrains]);
  useEffect(() => { const i=setInterval(()=>setTick(t=>t+1),10000); return()=>clearInterval(i); }, []);

  const busNext = nextBusDep();
  const heustonTrains = allTrains.filter(t=>t.destination.toLowerCase().includes("heuston")).sort((a,b)=>a.dueIn-b.dueIn);
  const gcdTrains = allTrains.filter(t=>t.destination.toLowerCase().includes("grand canal")).sort((a,b)=>a.dueIn-b.dueIn);
  const heustonNext = heustonTrains[0]?{time:heustonTrains[0].expDepart||heustonTrains[0].schDepart,minsAway:heustonTrains[0].dueIn}:null;
  const gcdNext = gcdTrains[0]?{time:gcdTrains[0].expDepart||gcdTrains[0].schDepart,minsAway:gcdTrains[0].dueIn}:null;

  const TABS = [
    { key:"bus",     emoji:"🚌", title:"G1 Bus",   sub:"→ Spencer Dock" },
    { key:"gcd",     emoji:"🚂", title:"→ GCD",     sub:"Live · Weekdays" },
    { key:"heuston", emoji:"🚂", title:"→ Heuston", sub:"Live · 7 days" },
  ];

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#f0ede6",fontFamily:"'Courier New','Lucida Console',monospace"}}>
      <div style={{position:"fixed",inset:0,zIndex:0,backgroundImage:"linear-gradient(rgba(255,184,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,184,0,0.03) 1px,transparent 1px)",backgroundSize:"32px 32px"}}/>
      <div style={{position:"relative",zIndex:1,maxWidth:800,margin:"0 auto",padding: isLandscape ? "12px 16px 24px" : "16px 16px 32px"}}>

        {/* HEADER with weather widget */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom: isLandscape ? 12 : 20,borderLeft:"4px solid #FFB800",paddingLeft:14}}>
          <div>
            <div style={{fontSize: isLandscape ? 10 : 11,letterSpacing:4,color:"#FFB800",textTransform:"uppercase",marginBottom:4}}>Park West · Cherry Orchard</div>
            <div style={{fontSize: isLandscape ? 12 : 14,color:"#888"}}>City Centre Departures</div>
          </div>
          <WeatherWidget/>
        </div>

        {/* TABS */}
        <div style={{display:"flex",marginBottom: isLandscape ? 12 : 20,borderBottom:"1px solid #222"}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{
              flex:1,background:"none",border:"none",
              borderBottom:tab===t.key?"3px solid #FFB800":"3px solid transparent",
              color:tab===t.key?"#FFB800":"#555",
              padding: isLandscape ? "6px 4px 5px" : "10px 4px 8px",
              cursor:"pointer",fontFamily:"inherit",textAlign:"center"
            }}>
              <div style={{fontSize: isLandscape ? 11 : 12,fontWeight:700}}>{t.emoji} {t.title}</div>
              <div style={{fontSize:9,marginTop:2,color:tab===t.key?"#888":"#333",lineHeight:1.3}}>{t.sub}</div>
            </button>
          ))}
        </div>

        {/* BUS TAB */}
        {tab==="bus" && (
          <div>
            <div style={{borderLeft:"4px solid #FFB800",paddingLeft:12,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{background:"#FFB800",color:"#0a0a0f",fontSize: isLandscape ? 18 : 22,fontWeight:900,padding:"2px 10px"}}>G1</span>
                <span style={{fontSize: isLandscape ? 14 : 16,fontWeight:700}}>→ Spencer Dock</span>
              </div>
              <div style={{fontSize:11,color:"#666",marginTop:3}}>24hr service · Every 15–20 mins (peak)</div>
            </div>
            <ClockPanel next={busNext} label="Bus" live={false}/>
            <UpcomingStrip times={BUS_TIMES} selected={selectedBus} onSelect={setSelectedBus}/>
            <JourneyPanel selectedTime={selectedBus} stops={BUS_STOPS}/>
            <div style={{fontSize:10,letterSpacing:4,color:"#555",textTransform:"uppercase",marginBottom:10}}>Full Daily Timetable</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:"#1a1a1a"}}>
              {["05–07","07–12","12–18","18+"].map(l=>(
                <div key={l} style={{background:"#0f0f14",padding:"5px 8px",fontSize:9,color:"#444",letterSpacing:2,textTransform:"uppercase",textAlign:"center"}}>{l}</div>
              ))}
              {[
                BUS_TIMES.filter(t=>parseTime(t)>=300&&parseTime(t)<420),
                BUS_TIMES.filter(t=>parseTime(t)>=420&&parseTime(t)<720),
                BUS_TIMES.filter(t=>parseTime(t)>=720&&parseTime(t)<1080),
                BUS_TIMES.filter(t=>parseTime(t)>=1080||parseTime(t)<300),
              ].map((group,gi)=>(
                <div key={gi} style={{background:"#0a0a0f",padding:"6px 8px"}}>
                  {group.map(t=>{
                    const mins=minutesUntil(t);
                    const isPast=mins<-2,isNext=t===busNext?.time,isSoon=mins>=0&&mins<=30;
                    return (
                      <div key={t} style={{padding:"2px 0",fontSize:12,fontWeight:isNext?700:400,color:isNext?"#FFB800":isPast?"#2a2a2a":isSoon?"#ccc":"#555",display:"flex",alignItems:"center",gap:4}}>
                        {isNext&&<span style={{width:4,height:4,borderRadius:"50%",background:"#FFB800",display:"inline-block",flexShrink:0}}/>}
                        <span style={{marginLeft:isNext?0:8}}>{t}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div style={{marginTop:16,fontSize:10,color:"#333",textAlign:"center"}}>Stop 8220DB006021 · bustimes.org / Dublin Bus</div>
          </div>
        )}

        {/* GCD TAB */}
        {tab==="gcd" && (
          <div>
            <div style={{borderLeft:"4px solid #e85d04",paddingLeft:12,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <span style={{background:"#e85d04",color:"#fff",fontSize:11,fontWeight:900,padding:"3px 10px",letterSpacing:1}}>IRISH RAIL</span>
                <span style={{fontSize:14,fontWeight:700}}>→ Grand Canal Dock</span>
              </div>
              <div style={{fontSize:11,color:"#666"}}>Phoenix Park Tunnel · Weekdays only</div>
            </div>
            <ClockPanel next={gcdNext} label="Train" live={!trainLoading&&!trainError}/>
            <LiveTrainSection trains={gcdTrains} loading={trainLoading} error={trainError} lastUpdated={lastUpdated} onRefresh={fetchTrains} emptyMsg="No Grand Canal Dock services showing. This service runs weekdays only."/>
            <div style={{marginTop:14,background:"#0f0f14",border:"1px solid #1a1a1a",padding:"10px 12px",fontSize:10,color:"#444",lineHeight:1.8}}>
              Park West → Drumcondra → Connolly → Tara St → Pearse → Grand Canal Dock
            </div>
          </div>
        )}

        {/* HEUSTON TAB */}
        {tab==="heuston" && (
          <div>
            <div style={{borderLeft:"4px solid #e85d04",paddingLeft:12,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <span style={{background:"#e85d04",color:"#fff",fontSize:11,fontWeight:900,padding:"3px 10px",letterSpacing:1}}>IRISH RAIL</span>
                <span style={{fontSize:14,fontWeight:700}}>→ Dublin Heuston</span>
              </div>
              <div style={{fontSize:11,color:"#666"}}>South Western Commuter · 7 days a week</div>
            </div>
            <ClockPanel next={heustonNext} label="Train" live={!trainLoading&&!trainError}/>
            <LiveTrainSection trains={heustonTrains} loading={trainLoading} error={trainError} lastUpdated={lastUpdated} onRefresh={fetchTrains} emptyMsg="No Heuston services showing. Check irishrail.ie for the full timetable."/>
            <div style={{marginTop:14,background:"#0f0f14",border:"1px solid #1a1a1a",padding:"10px 12px",fontSize:10,color:"#444",lineHeight:1.8}}>
              Park West → Dublin Heuston (~11 min direct)
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(-5px);}to{opacity:1;transform:none;}}
        button:hover{filter:brightness(1.2);}
        *{box-sizing:border-box;}
        html,body{margin:0;padding:0;overflow-x:hidden;}
      `}</style>
    </div>
  );
}
