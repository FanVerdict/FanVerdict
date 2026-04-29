import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://egkrjclqwlkokqjcqdsa.supabase.co";
const SUPABASE_KEY = "sb_publishable_EVcJqH1aRCMzwVM7GkgUbw_hvsdKG9b";
const ADMIN_PASSWORD = "puck2026";

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

// ── Auth helpers ──
const auth = {
  async signUp(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST", headers: H,
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  },
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: H,
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  },
  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST", headers: { ...H, Authorization: `Bearer ${token}` },
    });
  },
  googleUrl() {
    return `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`;
  },
  async getSession() {
    // Check URL for token (OAuth callback)
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const token = params.get("access_token");
      const refresh = params.get("refresh_token");
      if (token) {
        localStorage.setItem("fv_token", token);
        if (refresh) localStorage.setItem("fv_refresh", refresh);
        window.history.replaceState(null, "", window.location.pathname);
        return token;
      }
    }
    return localStorage.getItem("fv_token");
  },
  async getUser(token) {
    if (!token) return null;
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { ...H, Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return null;
      return r.json();
    } catch { return null; }
  },
};

// ── DB helpers ──
const db = {
  async select(t) { try { const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?order=created_at.desc`, { headers: H }); return r.ok ? r.json() : []; } catch { return []; } },
  async insert(t, row) { try { await fetch(`${SUPABASE_URL}/rest/v1/${t}`, { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(row) }); } catch {} },
  async update(t, id, patch) { try { await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`, { method: "PATCH", headers: H, body: JSON.stringify(patch) }); } catch {} },
  async del(t, id) { try { await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`, { method: "DELETE", headers: H }); } catch {} },
  async upsertProfile(token, uid, data) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: "POST",
        headers: { ...H, Authorization: `Bearer ${token}`, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: uid, ...data }),
      });
    } catch {}
  },
  async getProfile(token, uid) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, {
        headers: { ...H, Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      return data?.[0] || null;
    } catch { return null; }
  },
  async updateProfile(token, uid, patch) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, {
        method: "PATCH",
        headers: { ...H, Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
    } catch {}
  },
};

const DEMO = [
  { id: 1, type: "GOAL REVIEW", game: "Oilers vs Canucks · Apr 18", title: "Skate in the crease or not?", description: "McDavid scores the apparent game-winner but replay shows his skate may have grazed the blue paint. Officials reviewed for 4 minutes.", option_a: "✅ GOOD GOAL", option_b: "❌ NO GOAL", official_call: "Goal stands", votes_a: 4821, votes_b: 3104, hot: true },
  { id: 2, type: "FIGHT VERDICT", game: "Bruins vs Rangers · Apr 20", title: "Who won the Tkachuk vs Kreider bout?", description: "A massive scrap after a dirty hit in the second period. Both fighters landed heavy shots. Refs gave both 5 minutes.", option_a: "🥊 TKACHUK", option_b: "🥊 KREIDER", official_call: "Double minor — both", votes_a: 6230, votes_b: 2890, hot: true },
  { id: 3, type: "PENALTY CALL", game: "Leafs vs Lightning · Apr 22", title: "Dive or legitimate penalty?", description: "With 90 seconds left and the score tied, a Leafs forward goes down after light contact. Ref immediately whistles tripping.", option_a: "🚨 REAL PENALTY", option_b: "🎭 TOTAL DIVE", official_call: "Tripping — 2 minutes", votes_a: 1980, votes_b: 7441, hot: false },
];

const COLORS = {
  "GOAL REVIEW":    ["#00d4ff18","#00d4ff","#00d4ff44"],
  "FIGHT VERDICT":  ["#ff4d4d18","#ff4d4d","#ff4d4d44"],
  "PENALTY CALL":   ["#ffd70018","#ffd700","#ffd70044"],
  "3 STARS":        ["#c084fc18","#c084fc","#c084fc44"],
  "OFFSIDE REVIEW": ["#4ade8018","#4ade80","#4ade8044"],
  "GENERAL":        ["#fb923c18","#fb923c","#fb923c44"],
};
const TYPES = Object.keys(COLORS);

const css = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#07090d;font-family:'Barlow Condensed',sans-serif}
  input::placeholder,textarea::placeholder{color:#2a3a4a}
  input:focus,textarea:focus,select:focus{border-color:#00d4ff55!important;outline:none}
  .cfade{animation:fadeUp .45s ease both}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  .hbtn:hover{filter:brightness(1.3);transform:scale(1.02)}
  .banim{transition:width .9s cubic-bezier(.4,0,.2,1)}
  .blink{animation:blink 1.4s ease infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
  .pulse{animation:pulse 1.6s ease infinite;display:inline-block}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  .modal-bg{position:fixed;inset:0;background:#000000cc;z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
`;

export default function App() {
  const [page, setPage]         = useState("feed");
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lv, setLv]             = useState({});
  const [uv, setUv]             = useState({});
  const [ai, setAi]             = useState({});
  const [aiLoad, setAiLoad]     = useState({});
  const [active, setActive]     = useState(null);
  const [adminOk, setAdminOk]   = useState(false);
  const [token, setToken]       = useState(null);
  const [user, setUser]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  // ── Session boot ──
  useEffect(() => {
    (async () => {
      const t = await auth.getSession();
      if (t) {
        const u = await auth.getUser(t);
        if (u && !u.error) {
          setToken(t);
          setUser(u);
          const p = await db.getProfile(t, u.id);
          if (p) {
            setProfile(p);
            setUv(Object.fromEntries((p.saved_ids || []).map(id => [id, -1])));
          } else {
            // First login — create profile
            const displayName = u.user_metadata?.full_name || u.email?.split("@")[0] || "Fan";
            const avatarUrl = u.user_metadata?.avatar_url || null;
            await db.upsertProfile(t, u.id, { email: u.email, display_name: displayName, avatar_url: avatarUrl, saved_ids: [] });
            setProfile({ display_name: displayName, avatar_url: avatarUrl, saved_ids: [] });
          }
        } else {
          localStorage.removeItem("fv_token");
        }
      }
    })();
  }, []);

  // ── Secret admin hash ──
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#admin2002") setPage("admin");
      else if (window.location.hash !== "#admin2002") setPage(p => p === "admin" ? "feed" : p);
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  const goFeed = () => { window.location.hash = ""; setPage("feed"); };

  const load = useCallback(async () => {
    setLoading(true);
    const data = await db.select("controversies");
    const list = Array.isArray(data) && data.length ? data : DEMO;
    setItems(list);
    setLv(list.reduce((a, c) => ({ ...a, [c.id]: [c.votes_a||0, c.votes_b||0] }), {}));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const handleLogin = async (t, u) => {
    setToken(t); setUser(u);
    const p = await db.getProfile(t, u.id);
    if (p) {
      setProfile(p);
      // Restore their votes
      const savedVotes = {};
      (p.saved_ids || []).forEach(id => { savedVotes[id] = -1; });
      setUv(savedVotes);
    } else {
      const displayName = u.user_metadata?.full_name || u.email?.split("@")[0] || "Fan";
      await db.upsertProfile(t, u.id, { email: u.email, display_name: displayName, avatar_url: u.user_metadata?.avatar_url || null, saved_ids: [] });
      setProfile({ display_name: displayName, avatar_url: null, saved_ids: [] });
    }
    setShowAuth(false);
  };

  const handleLogout = async () => {
    if (token) await auth.signOut(token);
    localStorage.removeItem("fv_token");
    localStorage.removeItem("fv_refresh");
    setToken(null); setUser(null); setProfile(null); setUv({});
  };

  const vote = async (id, oi) => {
    if (uv[id] !== undefined) return;
    setUv(p => ({ ...p, [id]: oi }));
    setLv(p => { const v = [...(p[id]||[0,0])]; v[oi]++; return { ...p, [id]: v }; });
    const item = items.find(c => c.id === id);
    if (item) await db.update("controversies", id, { [oi===0?"votes_a":"votes_b"]: (item[oi===0?"votes_a":"votes_b"]||0)+1 });
    // Save vote to profile
    if (token && user && profile) {
      const newSaved = [...(profile.saved_ids || []), id];
      setProfile(p => ({ ...p, saved_ids: newSaved }));
      await db.updateProfile(token, user.id, { saved_ids: newSaved });
    }
  };

  const toggleSave = async (id) => {
    if (!user) { setShowAuth(true); return; }
    const saved = profile?.saved_ids || [];
    const newSaved = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id];
    setProfile(p => ({ ...p, saved_ids: newSaved }));
    await db.updateProfile(token, user.id, { saved_ids: newSaved });
  };

  const getAI = async (item) => {
    if (ai[item.id] || aiLoad[item.id]) return;
    setAiLoad(p => ({ ...p, [item.id]: true }));
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: "You are a sharp veteran hockey analyst and referee. Give a decisive 2-3 sentence verdict. Be bold, take a clear stance. End with a one-line verdict in ALL CAPS.",
          messages: [{ role: "user", content: `${item.type}: "${item.title}"\n\n${item.description}\n\nOfficial call: ${item.official_call}\nOptions: "${item.option_a}" vs "${item.option_b}"\n\nGive your verdict.` }],
        }),
      });
      const d = await res.json();
      setAi(p => ({ ...p, [item.id]: d.content?.map(b => b.text||"").join("")||"Verdict unavailable." }));
    } catch { setAi(p => ({ ...p, [item.id]: "AI ref timed out — try again." })); }
    setAiLoad(p => ({ ...p, [item.id]: false }));
  };

  const openDetail = (item) => { setActive(item); setPage("detail"); getAI(item); };
  const total = (id) => Math.max((lv[id]?.[0]||0)+(lv[id]?.[1]||0), 1);
  const pct   = (id, i) => Math.round(((lv[id]?.[i]||0)/total(id))*100);

  const savedItems = items.filter(c => profile?.saved_ids?.includes(c.id));

  return (
    <div style={S.root}>
      <style>{css}</style>

      <header style={S.hdr}>
        <div style={S.hdrI}>
          <div style={S.logo} onClick={goFeed}>🏒 <span style={S.logoT}>FAN<span style={S.acc}>VERDICT</span></span></div>
          <nav style={S.nav}>
            <button style={{...S.nb,...(page==="feed"?S.na:{})}} onClick={goFeed}>FEED</button>
            {user && <button style={{...S.nb,...(page==="saved"?S.na:{})}} onClick={()=>setPage("saved")}>SAVED</button>}
            {user && <button style={{...S.nb,...(page==="profile"?S.na:{})}} onClick={()=>setPage("profile")}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} style={{width:22,height:22,borderRadius:"50%",verticalAlign:"middle"}} alt="avatar"/>
                : "👤"} {profile?.display_name?.split(" ")[0] || "ME"}
            </button>}
            {!user && <button style={{...S.nb,color:"#00d4ff",borderColor:"#00d4ff33",background:"#00d4ff11"}} onClick={()=>setShowAuth(true)}>LOG IN</button>}
          </nav>
          <div style={S.live}><span className="blink">●</span> LIVE</div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onLogin={handleLogin}/>}

      {page==="feed" && (
        <main style={S.main}>
          <div style={S.hero}>
            <h1 style={S.heroT}>YOU'RE THE REF.</h1>
            <p style={S.heroS}>Officials made their call. The fans have a say.</p>
          </div>
          {!user && (
            <div style={S.signupBanner}>
              <span>🏒 Sign up to save verdicts & track your votes</span>
              <button style={S.bannerBtn} onClick={()=>setShowAuth(true)}>JOIN FREE →</button>
            </div>
          )}
          {loading
            ? <div style={S.ldg}><span className="pulse">Loading controversies…</span></div>
            : <div style={S.grid}>{items.map((c,i) => (
                <FeedCard key={c.id} item={c} idx={i} uv={uv[c.id]} lv={lv[c.id]||[0,0]} pct={pct} total={total}
                  onVote={vote} onDetail={openDetail}
                  saved={profile?.saved_ids?.includes(c.id)}
                  onSave={()=>toggleSave(c.id)}
                  loggedIn={!!user}
                  onAuthPrompt={()=>setShowAuth(true)}
                />
              ))}</div>
          }
        </main>
      )}

      {page==="saved" && (
        <main style={S.main}>
          <h2 style={{fontSize:26,fontWeight:900,letterSpacing:3,marginBottom:28,color:"#dce6f0"}}>🔖 SAVED VERDICTS</h2>
          {savedItems.length === 0
            ? <p style={{color:"#3a5060",fontSize:16,letterSpacing:1}}>No saved verdicts yet — tap the bookmark on any card.</p>
            : <div style={S.grid}>{savedItems.map((c,i) => (
                <FeedCard key={c.id} item={c} idx={i} uv={uv[c.id]} lv={lv[c.id]||[0,0]} pct={pct} total={total}
                  onVote={vote} onDetail={openDetail}
                  saved={true} onSave={()=>toggleSave(c.id)}
                  loggedIn={!!user} onAuthPrompt={()=>setShowAuth(true)}
                />
              ))}
            </div>
          }
        </main>
      )}

      {page==="detail" && active && (
        <main style={S.main}>
          <button style={S.back} onClick={goFeed}>← Back</button>
          <div style={{...S.card,maxWidth:660,margin:"0 auto"}}>
            <CardBody item={active} uv={uv[active.id]} lv={lv[active.id]||[0,0]} pct={pct} total={total} onVote={vote}/>
            <div style={S.aiBox}>
              <div style={S.aiHdr}>🤖 <span style={S.aiLbl}>AI REF VERDICT</span></div>
              {aiLoad[active.id] ? <p style={S.aiWait} className="pulse">Reviewing the play…</p>
                : ai[active.id] ? <p style={S.aiTxt}>{ai[active.id]}</p>
                : <button style={S.fullBtn} className="hbtn" onClick={() => getAI(active)}>Ask the AI Ref</button>}
            </div>
          </div>
        </main>
      )}

      {page==="profile" && user && (
        <ProfilePage profile={profile} user={user} savedCount={profile?.saved_ids?.length||0} votedCount={Object.keys(uv).length} onLogout={handleLogout} onBack={goFeed}/>
      )}

      {page==="admin" && <AdminPanel authed={adminOk} onAuth={setAdminOk} items={items} lv={lv} onRefresh={load}/>}

      <footer style={S.foot}>FanVerdict © 2026 — Built for hockey fans</footer>
    </div>
  );
}

// ── Auth Modal ──
function AuthModal({ onClose, onLogin }) {
  const [mode, setMode]   = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [err, setErr]     = useState("");
  const [busy, setBusy]   = useState(false);
  const [done, setDone]   = useState(false);

  const submit = async () => {
    if (!email || !pw) return setErr("Please fill in all fields.");
    setBusy(true); setErr("");
    if (mode === "signup") {
      const res = await auth.signUp(email, pw);
      if (res.error) { setErr(res.error.message || "Sign up failed."); setBusy(false); return; }
      setDone(true);
    } else {
      const res = await auth.signIn(email, pw);
      if (res.error || !res.access_token) { setErr(res.error?.message || "Login failed. Check your details."); setBusy(false); return; }
      localStorage.setItem("fv_token", res.access_token);
      if (res.refresh_token) localStorage.setItem("fv_refresh", res.refresh_token);
      const u = await auth.getUser(res.access_token);
      onLogin(res.access_token, u);
    }
    setBusy(false);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <button style={S.modalClose} onClick={onClose}>✕</button>
        {done ? (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:44,marginBottom:16}}>📧</div>
            <h2 style={{fontSize:22,fontWeight:900,letterSpacing:3,color:"#dce6f0",marginBottom:12}}>CHECK YOUR EMAIL</h2>
            <p style={{color:"#4a6070",fontSize:15,lineHeight:1.6}}>We sent a confirmation link to <strong style={{color:"#00d4ff"}}>{email}</strong>. Click it to activate your account.</p>
          </div>
        ) : (
          <>
            <div style={{fontSize:36,textAlign:"center",marginBottom:8}}>🏒</div>
            <h2 style={{fontSize:22,fontWeight:900,letterSpacing:3,color:"#dce6f0",textAlign:"center",marginBottom:24}}>
              {mode==="login" ? "WELCOME BACK" : "JOIN FANVERDICT"}
            </h2>

            {/* Google button */}
            <a href={auth.googleUrl()} style={S.googleBtn}>
              <svg width="18" height="18" viewBox="0 0 48 48" style={{marginRight:10,flexShrink:0}}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Continue with Google
            </a>

            <div style={S.divider}><span style={S.divTxt}>or</span></div>

            <input style={{...S.inp,marginBottom:12}} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
            <input style={{...S.inp,marginBottom:err?8:16}} type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
            {err && <p style={{color:"#ff4d4d",fontSize:13,marginBottom:12}}>{err}</p>}

            <button style={{...S.subBtn,opacity:busy?.6:1}} onClick={submit} disabled={busy}>
              {busy ? "…" : mode==="login" ? "LOG IN" : "CREATE ACCOUNT"}
            </button>

            <p style={{textAlign:"center",fontSize:13,color:"#3a5060",marginTop:16}}>
              {mode==="login" ? "No account? " : "Already have one? "}
              <span style={{color:"#00d4ff",cursor:"pointer"}} onClick={()=>{setMode(m=>m==="login"?"signup":"login");setErr("");}}>
                {mode==="login" ? "Sign up free" : "Log in"}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Profile Page ──
function ProfilePage({ profile, user, savedCount, votedCount, onLogout, onBack }) {
  return (
    <main style={S.main}>
      <button style={S.back} onClick={onBack}>← Back</button>
      <div style={{maxWidth:480,margin:"0 auto"}}>
        <div style={{...S.card,textAlign:"center",padding:36}}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} style={{width:72,height:72,borderRadius:"50%",margin:"0 auto 16px",display:"block",border:"2px solid #00d4ff44"}} alt="avatar"/>
            : <div style={{width:72,height:72,borderRadius:"50%",background:"#00d4ff18",border:"2px solid #00d4ff44",margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>👤</div>
          }
          <h2 style={{fontSize:24,fontWeight:900,letterSpacing:2,color:"#dce6f0",marginBottom:4}}>{profile?.display_name || "Fan"}</h2>
          <p style={{fontSize:13,color:"#3a5060",marginBottom:28}}>{user?.email}</p>
          <div style={{display:"flex",gap:16,justifyContent:"center",marginBottom:28}}>
            <div style={S.statBox}><div style={S.statNum}>{votedCount}</div><div style={S.statLbl}>VOTES CAST</div></div>
            <div style={S.statBox}><div style={S.statNum}>{savedCount}</div><div style={S.statLbl}>SAVED</div></div>
          </div>
          <button style={{...S.subBtn,background:"#ff1a1a22",border:"1px solid #ff1a1a44",color:"#ff4d4d"}} onClick={onLogout}>LOG OUT</button>
        </div>
      </div>
    </main>
  );
}

function FeedCard({ item, idx, uv, lv, pct, total, onVote, onDetail, saved, onSave, loggedIn, onAuthPrompt }) {
  return (
    <div style={{...S.card,animationDelay:`${idx*.07}s`}} className="cfade">
      {item.hot && <div style={S.hot}>🔥 HOT</div>}
      <button style={{...S.saveBtn,...(saved?S.saveBtnOn:{})}} onClick={onSave} title={saved?"Unsave":"Save"}>
        {saved ? "🔖" : "🏷️"}
      </button>
      <CardBody item={item} uv={uv} lv={lv} pct={pct} total={total} onVote={onVote}/>
      <button style={S.fullBtn} className="hbtn" onClick={() => onDetail(item)}>🤖 Get AI Ref Verdict →</button>
    </div>
  );
}

function CardBody({ item, uv, lv, pct, total, onVote }) {
  const [bg,tc,bc] = COLORS[item.type]||COLORS["GENERAL"];
  return (
    <>
      <div style={S.meta}>
        <span style={{...S.tag,background:bg,color:tc,borderColor:bc}}>{item.type}</span>
        <span style={S.game}>{item.game}</span>
      </div>
      <h2 style={S.ctitle}>{item.title}</h2>
      <p style={S.cdesc}>{item.description}</p>
      <div style={S.offBox}><span style={S.offLbl}>OFFICIAL CALL: </span><span style={S.offTxt}>{item.official_call}</span></div>
      {uv===undefined
        ? <div style={S.vrow}>
            <button style={{...S.vb,...S.vba}} className="hbtn" onClick={() => onVote(item.id,0)}>{item.option_a}</button>
            <button style={{...S.vb,...S.vbb}} className="hbtn" onClick={() => onVote(item.id,1)}>{item.option_b}</button>
          </div>
        : <div style={S.res}>
            {[item.option_a,item.option_b].map((opt,oi) => (
              <div key={oi} style={S.rrow}>
                <span style={{...S.rlbl,opacity:uv===oi||uv===-1?1:.4}}>{opt}</span>
                <div style={S.btrack}><div className="banim" style={{width:`${pct(item.id,oi)}%`,background:oi===0?"#00d4ff":"#ff4d4d",opacity:uv===oi||uv===-1?1:.3,height:"100%",borderRadius:4}}/></div>
                <span style={{...S.rpct,color:uv===oi?"#fff":"#445"}}>{pct(item.id,oi)}%</span>
              </div>
            ))}
            <div style={S.vtot}>{total(item.id).toLocaleString()} fan verdicts</div>
          </div>
      }
    </>
  );
}

function AdminPanel({ authed, onAuth, items, lv, onRefresh }) {
  const [pw,setPw]     = useState("");
  const [err,setErr]   = useState(false);
  const [tab,setTab]   = useState("post");
  const [ok,setOk]     = useState(false);
  const [busy,setBusy] = useState(false);
  const [form,setForm] = useState({type:"GOAL REVIEW",game:"",title:"",description:"",option_a:"",option_b:"",official_call:"",hot:false});
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const tryAuth = () => { if(pw===ADMIN_PASSWORD){onAuth(true);setErr(false);}else setErr(true); };

  const post = async () => {
    if(!form.title||!form.description||!form.option_a||!form.option_b||!form.official_call) return alert("Fill in all required fields (*)");
    setBusy(true);
    await db.insert("controversies",{...form,votes_a:0,votes_b:0});
    setOk(true); setTimeout(()=>setOk(false),3500);
    setForm({type:"GOAL REVIEW",game:"",title:"",description:"",option_a:"",option_b:"",official_call:"",hot:false});
    onRefresh(); setBusy(false);
  };

  const remove = async (id) => {
    if(!window.confirm("Delete this controversy?")) return;
    await db.del("controversies",id); onRefresh();
  };

  if(!authed) return (
    <main style={S.main}>
      <div style={S.authBox}>
        <div style={{fontSize:44,marginBottom:16}}>🔐</div>
        <h2 style={{fontSize:24,fontWeight:900,letterSpacing:4,margin:"0 0 24px",color:"#dce6f0"}}>ADMIN ACCESS</h2>
        <input style={{...S.inp,textAlign:"center",letterSpacing:6}} type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryAuth()}/>
        {err && <p style={{color:"#ff4d4d",fontSize:13,marginTop:8}}>Wrong password</p>}
        <button style={{...S.subBtn,marginTop:16}} onClick={tryAuth}>ENTER</button>
      </div>
    </main>
  );

  return (
    <main style={S.main}>
      <div style={{maxWidth:740,margin:"0 auto"}}>
        <h2 style={{fontSize:26,fontWeight:900,letterSpacing:3,marginBottom:28,color:"#dce6f0"}}>⚙ ADMIN PANEL</h2>
        <div style={{display:"flex",gap:8,marginBottom:28}}>
          {[["post","📝 POST NEW"],["manage","📋 MANAGE"]].map(([t,l])=>(
            <button key={t} style={{...S.tabBtn,...(tab===t?S.tabOn:{})}} onClick={()=>setTab(t)}>{l}</button>
          ))}
        </div>
        {tab==="post" && (
          <div style={S.fbox}>
            {ok && <div style={S.succ}>✅ Posted live! Fans can see it now.</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <FG label="TYPE"><select style={S.sel} value={form.type} onChange={e=>set("type",e.target.value)}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></FG>
              <FG label="GAME / DATE"><input style={S.inp} placeholder="e.g. Oilers vs Flames · Apr 27" value={form.game} onChange={e=>set("game",e.target.value)}/></FG>
            </div>
            <FG label="HEADLINE *"><input style={S.inp} placeholder="e.g. Was that a clean hit or charging?" value={form.title} onChange={e=>set("title",e.target.value)}/></FG>
            <FG label="DESCRIPTION *"><textarea style={{...S.inp,minHeight:100,resize:"vertical",lineHeight:1.6}} placeholder="Describe what happened so fans can judge…" value={form.description} onChange={e=>set("description",e.target.value)}/></FG>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <FG label="OPTION A *"><input style={S.inp} placeholder="e.g. ✅ GOOD GOAL" value={form.option_a} onChange={e=>set("option_a",e.target.value)}/></FG>
              <FG label="OPTION B *"><input style={S.inp} placeholder="e.g. ❌ NO GOAL" value={form.option_b} onChange={e=>set("option_b",e.target.value)}/></FG>
            </div>
            <FG label="OFFICIAL CALL *"><input style={S.inp} placeholder="e.g. Goal stands after review" value={form.official_call} onChange={e=>set("official_call",e.target.value)}/></FG>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:15,fontWeight:700,color:"#5a7080",cursor:"pointer",marginBottom:22}}>
              <input type="checkbox" checked={form.hot} onChange={e=>set("hot",e.target.checked)}/> 🔥 Mark as HOT
            </label>
            <button style={{...S.subBtn,opacity:busy?.6:1}} onClick={post} disabled={busy}>{busy?"POSTING…":"🚨 POST CONTROVERSY"}</button>
          </div>
        )}
        {tab==="manage" && (
          <div style={{background:"#0c1420",border:"1px solid #161e2e",borderRadius:14,overflow:"hidden"}}>
            {items.length===0
              ? <p style={{color:"#334",textAlign:"center",padding:40}}>No controversies yet.</p>
              : items.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 22px",borderBottom:"1px solid #0f1825"}}>
                  <div>
                    <div style={{fontSize:10,fontWeight:800,letterSpacing:2,color:"#00d4ff",marginBottom:4}}>{c.type}</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#dce6f0",marginBottom:4}}>{c.title}</div>
                    <div style={{fontSize:12,color:"#445"}}>{c.option_a}: {lv?.[c.id]?.[0]??c.votes_a??0} | {c.option_b}: {lv?.[c.id]?.[1]??c.votes_b??0}</div>
                  </div>
                  <button style={S.delBtn} onClick={()=>remove(c.id)}>🗑 Delete</button>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </main>
  );
}

const FG = ({label,children}) => (
  <div style={{marginBottom:18}}>
    <label style={{display:"block",fontSize:11,fontWeight:800,letterSpacing:2,color:"#2a4050",marginBottom:7}}>{label}</label>
    {children}
  </div>
);

const S = {
  root:      {minHeight:"100vh",background:"#07090d",color:"#dce6f0",fontFamily:"'Barlow Condensed',sans-serif"},
  hdr:       {background:"#0b0f16",borderBottom:"1px solid #161e28",position:"sticky",top:0,zIndex:100},
  hdrI:      {maxWidth:1100,margin:"0 auto",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"},
  logo:      {display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:22,fontWeight:900},
  logoT:     {fontSize:22,fontWeight:900,letterSpacing:3,color:"#dce6f0"},
  acc:       {color:"#00d4ff"},
  nav:       {display:"flex",gap:8,alignItems:"center"},
  nb:        {background:"none",border:"1px solid transparent",color:"#3a5060",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:2,padding:"6px 14px",borderRadius:6,cursor:"pointer"},
  na:        {color:"#00d4ff",borderColor:"#00d4ff33",background:"#00d4ff11"},
  live:      {fontSize:11,fontWeight:800,letterSpacing:2,color:"#ff4d4d",display:"flex",alignItems:"center",gap:4},
  main:      {maxWidth:1100,margin:"0 auto",padding:"40px 20px 80px"},
  hero:      {textAlign:"center",marginBottom:36},
  heroT:     {fontSize:"clamp(48px,9vw,92px)",fontWeight:900,letterSpacing:4,margin:0,background:"linear-gradient(135deg,#fff 30%,#00d4ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"},
  heroS:     {fontSize:17,color:"#3a5060",letterSpacing:2,marginTop:8},
  signupBanner:{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#00d4ff0e",border:"1px solid #00d4ff22",borderRadius:10,padding:"14px 20px",marginBottom:32,fontSize:14,color:"#5a8090",flexWrap:"wrap",gap:10},
  bannerBtn: {background:"#00d4ff",color:"#07090d",border:"none",borderRadius:6,padding:"7px 16px",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:900,letterSpacing:2,cursor:"pointer"},
  ldg:       {textAlign:"center",padding:80,color:"#3a5060",fontSize:16,letterSpacing:2},
  grid:      {display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(330px,1fr))",gap:24},
  card:      {background:"#0c1420",border:"1px solid #161e2e",borderRadius:14,padding:26,position:"relative",overflow:"hidden"},
  hot:       {position:"absolute",top:14,right:46,fontSize:11,fontWeight:800,background:"#ff5a1a22",border:"1px solid #ff5a1a55",color:"#ff7040",padding:"3px 9px",borderRadius:4},
  saveBtn:   {position:"absolute",top:12,right:12,background:"none",border:"none",fontSize:18,cursor:"pointer",opacity:.4,padding:4},
  saveBtnOn: {opacity:1},
  meta:      {display:"flex",alignItems:"center",gap:10,marginBottom:12},
  tag:       {fontSize:10,fontWeight:800,letterSpacing:2,padding:"3px 9px",borderRadius:4,border:"1px solid"},
  game:      {fontSize:11,color:"#2a4050",letterSpacing:1},
  ctitle:    {fontSize:20,fontWeight:800,margin:"0 0 10px",lineHeight:1.2},
  cdesc:     {fontSize:14,color:"#4a6070",lineHeight:1.65,margin:"0 0 16px"},
  offBox:    {background:"#0f1825",border:"1px solid #161e2e",borderRadius:7,padding:"9px 14px",marginBottom:20,fontSize:13},
  offLbl:    {fontWeight:800,color:"#2a5060",letterSpacing:1,marginRight:6},
  offTxt:    {color:"#6a8090"},
  vrow:      {display:"flex",gap:10,marginBottom:12},
  vb:        {flex:1,padding:"12px 6px",borderRadius:8,border:"1px solid",fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:800,letterSpacing:1,cursor:"pointer",transition:"all .2s"},
  vba:       {background:"#00d4ff14",borderColor:"#00d4ff44",color:"#00d4ff"},
  vbb:       {background:"#ff4d4d14",borderColor:"#ff4d4d44",color:"#ff4d4d"},
  res:       {marginBottom:14},
  rrow:      {display:"flex",alignItems:"center",gap:10,marginBottom:8},
  rlbl:      {width:120,fontSize:12,fontWeight:700,flexShrink:0,lineHeight:1.2},
  btrack:    {flex:1,height:8,background:"#0f1825",borderRadius:4,overflow:"hidden"},
  rpct:      {width:36,textAlign:"right",fontSize:13,fontWeight:800,flexShrink:0},
  vtot:      {fontSize:11,color:"#2a4050",letterSpacing:1,textAlign:"right",marginTop:4},
  fullBtn:   {width:"100%",marginTop:10,padding:11,background:"#0f1828",border:"1px solid #1e2840",borderRadius:8,color:"#5060a0",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,cursor:"pointer",transition:"all .2s"},
  aiBox:     {marginTop:22,background:"#090e18",border:"1px solid #161e38",borderRadius:10,padding:20},
  aiHdr:     {display:"flex",alignItems:"center",gap:8,marginBottom:12},
  aiLbl:     {fontSize:12,fontWeight:800,letterSpacing:3,color:"#5060a0"},
  aiWait:    {color:"#3a4060",fontSize:14,fontStyle:"italic",margin:0},
  aiTxt:     {fontSize:15,color:"#9ab0c0",lineHeight:1.75,margin:0},
  back:      {background:"none",border:"1px solid #161e2e",color:"#3a5060",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,padding:"7px 16px",borderRadius:6,cursor:"pointer",marginBottom:28},
  authBox:   {maxWidth:360,margin:"80px auto",background:"#0c1420",border:"1px solid #161e2e",borderRadius:16,padding:40,textAlign:"center"},
  modal:     {background:"#0c1420",border:"1px solid #1e2840",borderRadius:16,padding:36,width:"100%",maxWidth:400,position:"relative"},
  modalClose:{position:"absolute",top:14,right:16,background:"none",border:"none",color:"#3a5060",fontSize:18,cursor:"pointer"},
  googleBtn: {display:"flex",alignItems:"center",justifyContent:"center",width:"100%",padding:"12px",background:"#fff",borderRadius:8,color:"#1a1a1a",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,letterSpacing:1,cursor:"pointer",textDecoration:"none",marginBottom:16},
  divider:   {display:"flex",alignItems:"center",gap:10,margin:"4px 0 16px"},
  divTxt:    {color:"#2a4050",fontSize:12,letterSpacing:1,flexShrink:0},
  tabBtn:    {padding:"10px 18px",background:"#0c1420",border:"1px solid #161e2e",borderRadius:8,color:"#3a5060",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,cursor:"pointer"},
  tabOn:     {background:"#00d4ff18",borderColor:"#00d4ff44",color:"#00d4ff"},
  fbox:      {background:"#0c1420",border:"1px solid #161e2e",borderRadius:14,padding:28},
  inp:       {width:"100%",background:"#080c14",border:"1px solid #161e2e",borderRadius:8,color:"#c0d0e0",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,padding:"11px 14px",boxSizing:"border-box"},
  sel:       {width:"100%",background:"#080c14",border:"1px solid #161e2e",borderRadius:8,color:"#c0d0e0",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,padding:"11px 14px",cursor:"pointer"},
  subBtn:    {width:"100%",padding:14,background:"linear-gradient(135deg,#00a8cc,#0088aa)",border:"none",borderRadius:9,color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,letterSpacing:3,cursor:"pointer"},
  succ:      {background:"#00ff8818",border:"1px solid #00ff8855",color:"#00ff88",borderRadius:8,padding:"12px 16px",marginBottom:20,fontSize:14,fontWeight:700},
  delBtn:    {background:"#ff1a1a14",border:"1px solid #ff1a1a33",color:"#ff4d4d",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,padding:"6px 12px",borderRadius:6,cursor:"pointer",flexShrink:0},
  foot:      {textAlign:"center",padding:"32px 20px",fontSize:11,color:"#1a2530",letterSpacing:2,borderTop:"1px solid #0c1218"},
  statBox:   {background:"#0f1825",border:"1px solid #161e2e",borderRadius:10,padding:"16px 24px",textAlign:"center"},
  statNum:   {fontSize:32,fontWeight:900,color:"#00d4ff",letterSpacing:2},
  statLbl:   {fontSize:10,fontWeight:800,letterSpacing:2,color:"#2a4050",marginTop:4},
};
