import { useState, useEffect, useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SUPABASE_URL      = "https://pjopnhgbidmpzssghy oo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_PnzexoDk29yf2mxCjoKplw_NWlP28a6";

const SFRL_URL = "https://sfrlinc.com/web/market-reports/";

async function supabaseQuery(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

const COLOR_MAP = {
  BLK:{bg:"#111",text:"#bbb"}, "BLK/RED":{bg:"#2a1210",text:"#c87060"},
  "BLK/BWF":{bg:"#1a1a2a",text:"#8090c0"}, BWF:{bg:"#1a1a20",text:"#9090b0"},
  RED:{bg:"#2a1008",text:"#d07050"}, RWF:{bg:"#1a1818",text:"#a08880"},
  "RED/RWF":{bg:"#2a1510",text:"#c07860"}, MIXED:{bg:"#1a2030",text:"#7090b0"},
  CHAR:{bg:"#201808",text:"#c0a040"}, "BLK-CHAR":{bg:"#181810",text:"#a0a060"},
  "BLK-X":{bg:"#101010",text:"#909090"}, HOL:{bg:"#0a1020",text:"#6080b0"},
};
function CB({ color }) {
  const c = COLOR_MAP[color] || { bg:"#181818", text:"#888" };
  return <span style={{ background:c.bg, color:c.text, border:`1px solid ${c.text}44`, borderRadius:4, padding:"2px 7px", fontSize:10, fontFamily:"monospace", whiteSpace:"nowrap" }}>{color}</span>;
}

const ACCENT = "#e8c87a";
const SALE_COLORS = { "Feeder Cattle":"#c2763a", "Slaughter":"#c26070", "Bred Cows":"#7aab6e", "Fed Cattle":"#7b9fbf", "Sheep & Goats":"#a07bc2" };
const SALE_TYPES  = ["All", "Feeder Cattle", "Slaughter", "Bred Cows", "Fed Cattle", "Sheep & Goats"];

export default function App() {
  const [lots, setLots]       = useState([]);
  const [meta, setMeta]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab]     = useState("lots");
  const [saleFilter, setSaleFilter]   = useState("All");
  const [classFilter, setClassFilter] = useState("All");
  const [sortCol, setSortCol] = useState({ key:"sale_date", dir:-1 });
  const [search, setSearch]   = useState("");

  async function loadData() {
    setLoading(true); setError(null);
    try {
      const [lotsData, metaData] = await Promise.all([
        supabaseQuery("livestock_lots", "order=sale_date.desc,weight.asc&limit=2000"),
        supabaseQuery("scraper_meta",   "id=eq.sfrl"),
      ]);
      setLots(lotsData);
      setMeta(metaData?.[0] || null);
    } catch(e) { setError(e.message); }
    setLoading(false);
  }
  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    let d = [...lots];
    if (saleFilter !== "All") d = d.filter(l => l.sale_type === saleFilter);
    if (classFilter !== "All") d = d.filter(l => l.class === classFilter);
    if (search) { const q = search.toLowerCase(); d = d.filter(l => l.class.toLowerCase().includes(q) || l.color.toLowerCase().includes(q) || l.sale_type.toLowerCase().includes(q)); }
    d.sort((a,b) => { let av = a[sortCol.key], bv = b[sortCol.key]; return typeof av === "string" ? av.localeCompare(bv)*sortCol.dir : (av-bv)*sortCol.dir; });
    return d;
  }, [lots, saleFilter, classFilter, search, sortCol]);

  const stats = useMemo(() => {
    const totalHead = filtered.reduce((s,l)=>s+l.head,0);
    const cwtLots   = filtered.filter(l=>!l.per_head);
    const avgCwt    = cwtLots.length ? cwtLots.reduce((s,l)=>s+(+l.price),0)/cwtLots.length : 0;
    const highCwt   = cwtLots.length ? Math.max(...cwtLots.map(l=>+l.price)) : 0;
    const lowCwt    = cwtLots.length ? Math.min(...cwtLots.map(l=>+l.price)) : 0;
    return { totalHead, avgCwt, highCwt, lowCwt };
  }, [filtered]);

  const bands = useMemo(() => {
    const b = {};
    filtered.filter(l=>!l.per_head).forEach(l => {
      const band = Math.floor(l.weight/100)*100; const key = `${band}`;
      if (!b[key]) b[key] = { bandLow:band, label:`${band}–${band+99} lbs`, lots:[], head:0, priceSum:0 };
      b[key].lots.push(l); b[key].head += l.head; b[key].priceSum += +l.price;
    });
    return Object.values(b).sort((a,b)=>a.bandLow-b.bandLow)
      .map(b => ({ ...b, avgPrice: +(b.priceSum/b.lots.length).toFixed(2), high: Math.max(...b.lots.map(l=>+l.price)), low: Math.min(...b.lots.map(l=>+l.price)) }));
  }, [filtered]);

  const classes   = useMemo(() => ["All", ...Array.from(new Set(lots.map(l=>l.class))).sort()], [lots]);
  const saleDates = useMemo(() => [...new Set(lots.map(l=>l.sale_date))].sort().reverse(), [lots]);

  function sortBy(key) { setSortCol(p => ({ key, dir: p.key===key?-p.dir:1 })); }
  function si(key) { return sortCol.key!==key ? <span style={{color:"#4a3018"}}> ⇅</span> : <span style={{color:ACCENT}}>{sortCol.dir===1?" ↑":" ↓"}</span>; }

  const TAB = t => ({ background:activeTab===t?"#3d2510":"transparent", border:activeTab===t?"1px solid #6b4a1e":"1px solid transparent", color:activeTab===t?ACCENT:"#a08060", padding:"7px 20px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13 });
  const PILL = (val, cur) => ({ background:cur===val?(SALE_COLORS[val]||"#6b4a1e")+"33":"transparent", border:`1px solid ${cur===val?(SALE_COLORS[val]||"#c2763a"):"#4a3018"}`, color:cur===val?(SALE_COLORS[val]||ACCENT):"#a08060", padding:"5px 13px", borderRadius:16, cursor:"pointer", fontFamily:"inherit", fontSize:12, whiteSpace:"nowrap" });

  return (
    <div style={{ fontFamily:"'Georgia','Times New Roman',serif", background:"#1a1208", minHeight:"100vh", color:"#e8dcc8" }}>
      <div style={{ background:"linear-gradient(135deg,#2c1a08,#3d2510,#2c1a08)", borderBottom:"2px solid #6b4a1e", padding:"0 28px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:70 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <span style={{ fontSize:26 }}>🐄</span>
            <div>
              <div style={{ fontSize:18, fontWeight:"bold", color:ACCENT }}>Sioux Falls Regional Livestock</div>
              <div style={{ fontSize:11, color:"#a08060", letterSpacing:"0.1em", textTransform:"uppercase" }}>
                Market Report Tracker &nbsp;·&nbsp; <a href={SFRL_URL} target="_blank" rel="noreferrer" style={{ color:"#7a6040" }}>sfrlinc.com</a>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ textAlign:"right", fontSize:11, color:"#a08060" }}>
              <div>Last scraped</div>
              <div style={{ color:"#e8dcc8", fontSize:12 }}>{meta ? new Date(meta.last_scraped).toLocaleString() : "—"}</div>
            </div>
            <button onClick={loadData} disabled={loading} style={{ background:loading?"#4a3018":"#7a4a1a", border:"1px solid #c2763a", color:ACCENT, padding:"8px 18px", borderRadius:6, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit", fontSize:13, opacity:loading?0.7:1 }}>
              {loading?"Loading…":"↻ Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"24px 28px" }}>
        {error && <div style={{ background:"#2a1010", border:"1px solid #8a3030", borderRadius:8, padding:"10px 16px", marginBottom:16, fontSize:12, color:"#d09090" }}>⚠ {error}</div>}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:22 }}>
          {[
            { label:"Sale Dates",  value: saleDates.length ? `${saleDates[saleDates.length-1]} → ${saleDates[0]}` : "—" },
            { label:"Total Head",  value: loading?"…":stats.totalHead.toLocaleString() },
            { label:"Avg $/cwt",   value: loading?"…":(stats.avgCwt?`$${stats.avgCwt.toFixed(2)}`:"—") },
            { label:"High / Low",  value: loading?"…":(stats.highCwt?`$${stats.highCwt.toFixed(2)} / $${stats.lowCwt.toFixed(2)}`:"—") },
          ].map(s => (
            <div key={s.label} style={{ background:"#241508", border:"1px solid #4a3018", borderRadius:10, padding:"14px 18px" }}>
              <div style={{ fontSize:11, color:"#a08060", marginBottom:5 }}>{s.label}</div>
              <div style={{ fontSize:15, fontWeight:"bold", color:ACCENT }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom:18, display:"flex", gap:14, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:11, color:"#6a5030", marginRight:2 }}>TYPE</span>
            {SALE_TYPES.map(t => <button key={t} style={PILL(t,saleFilter)} onClick={()=>setSaleFilter(t)}>{t}</button>)}
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:11, color:"#6a5030", marginRight:2 }}>CLASS</span>
            {classes.slice(0,9).map(c => <button key={c} style={PILL(c,classFilter)} onClick={()=>setClassFilter(c)}>{c}</button>)}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
            style={{ background:"#241508", border:"1px solid #4a3018", color:"#e8dcc8", padding:"6px 12px", borderRadius:8, fontFamily:"inherit", fontSize:12, width:150 }} />
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:22 }}>
          <button style={TAB("lots")}    onClick={()=>setActiveTab("lots")}>Sale Lots</button>
          <button style={TAB("scatter")} onClick={()=>setActiveTab("scatter")}>Price vs Weight</button>
          <button style={TAB("bands")}   onClick={()=>setActiveTab("bands")}>Weight Band Summary</button>
        </div>

        {loading && <div style={{ background:"#241508", border:"1px solid #4a3018", borderRadius:12, padding:48, textAlign:"center", color:"#a08060" }}>Loading data from Supabase…</div>}

        {!loading && activeTab==="lots" && (
          <div style={{ background:"#241508", border:"1px solid #4a3018", borderRadius:12, padding:20 }}>
            <div style={{ fontSize:12, color:"#a08060", marginBottom:12 }}>{filtered.length} lots · click headers to sort</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:"2px solid #3a2510" }}>
                    {[{k:"sale_date",l:"Date"},{k:"sale_type",l:"Sale Type"},{k:"class",l:"Class"},{k:"color",l:"Color"},{k:"head",l:"Head",r:true},{k:"weight",l:"Wt (lbs)",r:true},{k:"price",l:"Price",r:true},{k:"est_value",l:"Est. Value",r:true}]
                      .map(({k,l,r}) => <th key={l} onClick={()=>sortBy(k)} style={{ textAlign:r?"right":"left", padding:"8px 12px", color:"#a08060", fontWeight:"normal", cursor:"pointer", userSelect:"none", whiteSpace:"nowrap" }}>{l}{si(k)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lot,i) => (
                    <tr key={lot.id} style={{ background:i%2===0?"transparent":"#1e1006", borderBottom:"1px solid #2a1808" }}>
                      <td style={{ padding:"8px 12px", color:"#a08060", fontFamily:"monospace", fontSize:11 }}>{lot.sale_date}</td>
                      <td style={{ padding:"8px 12px" }}><span style={{ color:SALE_COLORS[lot.sale_type]||"#a08060", fontSize:11 }}>{lot.sale_type}</span></td>
                      <td style={{ padding:"8px 12px", color:"#e8dcc8" }}>{lot.class}</td>
                      <td style={{ padding:"8px 12px" }}><CB color={lot.color} /></td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#e8dcc8", fontWeight:"bold" }}>{lot.head}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#a08060" }}>{(+lot.weight).toLocaleString()}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:ACCENT, fontWeight:"bold" }}>${(+lot.price).toFixed(2)}{lot.per_head?"/hd":"/cwt"}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", color:"#7aab6e", fontWeight:"bold" }}>{lot.est_value?`$${(+lot.est_value).toLocaleString()}`:"—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop:"2px solid #3a2510" }}>
                    <td colSpan={4} style={{ padding:"10px 12px", color:"#a08060", fontSize:11 }}>Totals</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", color:ACCENT, fontWeight:"bold" }}>{stats.totalHead.toLocaleString()}</td>
                    <td/>
                    <td style={{ padding:"10px 12px", textAlign:"right", color:ACCENT, fontWeight:"bold" }}>{stats.avgCwt?`avg $${stats.avgCwt.toFixed(2)}/cwt`:"—"}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", color:"#7aab6e", fontWeight:"bold" }}>${filtered.reduce((s,l)=>s+(+l.est_value||0),0).toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab==="scatter" && (
          <div style={{ background:"#241508", border:"1px solid #4a3018", borderRadius:12, padding:24 }}>
            <div style={{ fontSize:13, color:ACCENT, fontWeight:"bold", marginBottom:4 }}>Price vs. Weight</div>
            <div style={{ fontSize:11, color:"#a08060", marginBottom:18 }}>$/cwt (Y) vs weight lbs (X) · dot size ≈ head count</div>
            <ResponsiveContainer width="100%" height={420}>
              <ScatterChart margin={{ top:8, right:16, left:0, bottom:8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a2510" />
                <XAxis dataKey="weight" type="number" name="Weight" unit=" lbs" tick={{ fill:"#a08060", fontSize:10 }} domain={["auto","auto"]} />
                <YAxis dataKey="price"  type="number" name="$/cwt"  tick={{ fill:"#a08060", fontSize:10 }} domain={["auto","auto"]} />
                <Tooltip cursor={{ stroke:"#6b4a1e" }} content={({ active, payload }) => {
                  if (!active||!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ background:"#2c1a08", border:"1px solid #6b4a1e", padding:"10px 14px", fontSize:12, color:"#e8dcc8", borderRadius:8 }}>
                      <div style={{ color:SALE_COLORS[d.sale_type]||ACCENT, fontWeight:"bold", marginBottom:4 }}>{d.sale_type}</div>
                      <div>{d.class} · <CB color={d.color} /></div>
                      <div style={{ marginTop:4 }}>Weight: <b>{(+d.weight).toLocaleString()} lbs</b></div>
                      <div>Price: <b style={{ color:ACCENT }}>${(+d.price).toFixed(2)}/cwt</b></div>
                      <div>Head: <b>{d.head}</b> · Date: {d.sale_date}</div>
                    </div>
                  );
                }} />
                {Object.entries(SALE_COLORS).map(([type,color]) => {
                  const pts = filtered.filter(l=>l.sale_type===type&&!l.per_head);
                  return pts.length ? (
                    <Scatter key={type} name={type} data={pts} fill={color} fillOpacity={0.75}
                      shape={({ cx, cy, payload }) => { const r = Math.max(4,Math.min(18,Math.sqrt(payload.head)*2)); return <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.65} stroke={color} strokeWidth={1} />; }}
                    />
                  ) : null;
                })}
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", gap:16, marginTop:12, flexWrap:"wrap" }}>
              {Object.entries(SALE_COLORS).map(([t,c]) => <span key={t} style={{ fontSize:11, color:c }}>● {t}</span>)}
            </div>
          </div>
        )}

        {!loading && activeTab==="bands" && (
          <div style={{ background:"#241508", border:"1px solid #4a3018", borderRadius:12, padding:24 }}>
            <div style={{ fontSize:13, color:ACCENT, fontWeight:"bold", marginBottom:18 }}>Average Price by Weight Band</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid #3a2510" }}>
                  {["Weight Band","Lots","Total Head","Avg $/cwt","High","Low"].map((h,i) => (
                    <th key={h} style={{ textAlign:i===0?"left":"right", padding:"8px 14px", color:"#a08060", fontWeight:"normal" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bands.map((b,i) => (
                  <tr key={b.bandLow} style={{ background:i%2===0?"transparent":"#1e1006", borderBottom:"1px solid #2a1808" }}>
                    <td style={{ padding:"9px 14px", color:"#e8dcc8" }}>{b.label}</td>
                    <td style={{ padding:"9px 14px", textAlign:"right", color:"#a08060" }}>{b.lots.length}</td>
                    <td style={{ padding:"9px 14px", textAlign:"right", color:"#e8dcc8" }}>{b.head.toLocaleString()}</td>
                    <td style={{ padding:"9px 14px", textAlign:"right" }}>
                      <span style={{ color:ACCENT, fontWeight:"bold" }}>${b.avgPrice.toFixed(2)}</span>
                      <div style={{ height:3, background:"#3a2510", borderRadius:2, marginTop:3 }}>
                        <div style={{ height:3, background:"#c2763a", borderRadius:2, width:`${Math.min(100,(b.avgPrice/650)*100)}%` }} />
                      </div>
                    </td>
                    <td style={{ padding:"9px 14px", textAlign:"right", color:"#7aab6e" }}>${b.high.toFixed(2)}</td>
                    <td style={{ padding:"9px 14px", textAlign:"right", color:"#c2503a" }}>${b.low.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop:14, fontSize:11, color:"#6a5030", textAlign:"center" }}>
          Data auto-scraped weekly from{" "}
          <a href={SFRL_URL} target="_blank" rel="noreferrer" style={{ color:"#8a6040" }}>sfrlinc.com/web/market-reports/</a>
          {meta && ` · Last scraped ${new Date(meta.last_scraped).toLocaleString()} · ${meta.lots_count} lots`}
        </div>
      </div>
    </div>
  );
}
