import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://egkrjclqwlkokqjcqdsa.supabase.co";
const SUPABASE_KEY = "sb_publishable_EVcJqH1aRCMzwVM7GkgUbw_hvsdKG9b";
const ADMIN_PASSWORD = "puck2026";

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

const auth = {
  async signUp(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: H, body: JSON.stringify({ email, password }) });
    return r.json();
  },
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: H, body: JSON.stringify({ email, password }) });
    return r.json();
  },
  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: { ...H, Authorization: `Bearer ${token}` } });
  },
  googleUrl() { return `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`; },
  async getSession() {
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
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { ...H, Authorization: `Bearer ${token}` } });
      if (!r.ok) return null;
      return r.json();
    } catch { return null; }
  },
};

const db = {
  async select(t) { try { const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?order=created_at.desc`, { headers: H }); return r.ok ? r.json() : []; } catch { return []; } },
  async insert(t, row) { try { await fetch(`${SUPABASE_URL}/rest/v1/${t}`, { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(row) }); } catch {} },
  async update(t, id, patch) { try { await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`, { method: "PATCH", headers: H, body: JSON.stringify(patch) }); } catch {} },
  async del(t, id) { try { await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`, { method: "DELETE", headers: H }); } catch {} },
  async upsertProfile(token, uid, data) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, { method: "POST", headers: { ...H, Authorization: `Bearer ${token}`, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ id: uid, ...data }) });
    } catch {}
  },
  async getProfile(token, uid) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, { headers: { ...H, Authorization: `Bearer ${token}` } });
      const data = await r.json();
      return data?.[0] || null;
    } catch { return null; }
  },
  async updateProfile(token, uid, patch) {
    try { await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, { method: "PATCH", headers: { ...H, Authorization: `Bearer ${token}` }, body: JSON.stringify(patch) }); } catch {}
  },
};

const DEMO = [
  { id: 1, type: "GOAL REVIEW", game: "Oilers vs Canucks · Apr 18", title: "Skate in the crease or not?", description: "McDavid scores the apparent game-winner but replay shows his skate may have grazed the blue paint. Officials reviewed for 4 minutes.", option_a: "✅ GOOD GOAL", option_b: "❌ NO GOAL", official_call: "Goal stands", votes_a: 4821, votes_b: 3104, hot: true },
  { id: 2, type: "FIGHT VERDICT", game: "Bruins vs Rangers · Apr 20", title: "Who won the Tkachuk vs Kreider bout?", description: "A massive scrap after a dirty hit in the second period. Both fighters landed heavy shots. Refs gave both 5 minutes.", option_a: "🥊 TKACHUK", option_b: "🥊 KREIDER", official_call: "Double minor — both", votes_a: 6230, votes_b: 2890, hot: true },
  { id: 3, type: "PENALTY CALL", game: "Leafs vs Lightning · Apr 22", title: "Dive or legitimate penalty?", description: "With 90 seconds left and the score tied, a Leafs forward goes down after light contact. Ref immediately whistles tripping.", option_a: "🚨 REAL PENALTY", option_b: "🎭 TOTAL DIVE", official_call: "Tripping — 2 minutes", votes_a: 1980, votes_b: 7441, hot: false },
];

const DEFAULT_ARTICLES = [
  { id: "a1", category: "CONTROVERSIAL CALL", title: "The Goal That Broke a City: How One Crease Call Ended a Dynasty Run", excerpt: "It was 2019. A city held its breath. The replay ran on loop for days. We break down why the crease rule is still the most debated piece of legislation in hockey history.", author: "FanVerdict Staff", date: "Apr 26, 2026", read_time: "6 min read", hot: true, photo: "https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=800&q=80" },
  { id: "a2", category: "FIGHT BREAKDOWN", title: "The Unwritten Code: When Fighting Is Accepted and When It Goes Too Far", excerpt: "Hockey's fighting tradition is as old as the sport itself — but in 2026, where is the line? We interviewed 3 retired enforcers about what separates a clean scrap from a dangerous assault on ice.", author: "Mike Danton", date: "Apr 24, 2026", read_time: "8 min read", hot: true, photo: "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?w=800&q=80" },
  { id: "a3", category: "OFFSIDE DRAMA", title: "Coach's Challenge Is Ruining the Game — Or Is It Saving It?", excerpt: "Since its introduction, the Coach's Challenge has overturned hundreds of goals and infuriated millions of fans. We crunch the numbers and talk to coaches on both sides.", author: "Sarah Chen", date: "Apr 22, 2026", read_time: "5 min read", hot: false, photo: "https://images.unsplash.com/photo-1568454537842-d933259bb258?w=800&q=80" },
  { id: "a4", category: "REF WATCH", title: "The Ref Who Missed It All: Inside Hockey's Most Controversial No-Call", excerpt: "Game 7. 12 seconds left. A blatant hook goes uncalled. We tracked down the referee, the coaches, and the players involved — and nobody agrees on what really happened.", author: "FanVerdict Investigates", date: "Apr 20, 2026", read_time: "10 min read", hot: true, photo: "https://images.unsplash.com/photo-1607356050087-9793ed4eee45?w=800&q=80" },
  { id: "a5", category: "FIGHT BREAKDOWN", title: "Bare-Knuckle Respect: The Etiquette of the Hockey Fight Nobody Talks About", excerpt: "You drop gloves, you fight clean, you answer the bell — or you don't. The unspoken rules of hockey fighting are more complex than any referee's rulebook.", author: "Rick Tanner", date: "Apr 18, 2026", read_time: "7 min read", hot: false, photo: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&q=80" },
  { id: "a6", category: "PENALTY DEBATE", title: "Embellishment: Hockey's Dirtiest Open Secret", excerpt: "Every fan sees it. Every coach knows it. Players do it on purpose — and the league has been trying to stop it for 30 years. Why does diving keep winning?", author: "FanVerdict Staff", date: "Apr 16, 2026", read_time: "5 min read", hot: false, photo: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800&q=80" },
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

const CAT_COLORS = {
  "CONTROVERSIAL CALL": "#00d4ff", "FIGHT BREAKDOWN": "#ff4d4d",
  "OFFSIDE DRAMA": "#4ade80", "REF WATCH": "#ffd700",
  "PENALTY DEBATE": "#fb923c", "GENERAL": "#c084fc",
};
const ARTICLE_CATEGORIES = Object.keys(CAT_COLORS);

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
  .art-card:hover{border-color:#00d4ff44!important;transform:translateY(-2px);transition:all .2s}
  .art-card{transition:all .2s}
`;

export default function App() {
  const [page, setPage]         = useState("feed");
  const [items, setItems]       = useState([]);
  const [articles, setArticles] = useState(DEFAULT_ARTICLES);
  const [loading, setLoading]   = useState(true);
  const [lv, setLv]             = useState({});
  const [uv, setUv]             = useState({});
  const [ai, setAi]             = useState({});
  const [aiLoad, setAiLoad]     = useState({});
  const [active, setActive]     = useState(null);
  const [activeArticle, setActiveArticle] = useState(null);
  const [adminOk, setAdminOk]   = useState(false);
  const [token, setToken]       = useState(null);
  const [user, setUser]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await auth.getSession();
      if (t) {
        const u = await auth.getUser(t);
        if (u && !u.error) {
          setToken(t); setUser(u);
          const p = await db.getProfile(t, u.id);
          if (p) {
            setProfile(p);
            setUv(Object.fromEntries((p.saved_ids || []).map(id => [id, -1])));
          } else {
            const displayName = u.user_metadata?.full_name || u.email?.split("@")[0] || "Fan";
            const avatarUrl = u.user_metadata?.avatar_url || null;
            await db.upsertProfile(t, u.id, { email: u.email, display_name: displayName, avatar_url: avatarUrl, saved_ids: [] });
            setProfile({ display_name: displayName, avatar_url: avatarUrl, saved_ids: [] });
          }
        } else { localStorage.removeItem("fv_token"); }
      }
    })();
  }, []);

  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#admin2002") setPage("admin");
      else setPage(p => p === "admin" ? "feed" : p);
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
    const arts = await db.select("articles");
    if (Array.isArray(arts) && arts.length) setArticles(arts);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const handleLogin = async (t, u) => {
    setToken(t); setUser(u);
    const p = await db.getProfile(t, u.id);
    if (p) {
      setProfile(p);
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
  const openArticle = (article) => { setActiveArticle(article); setPage("article"); };
  const total = (id) => Math.max((lv[id]?.[0]||0)+(lv[id]?.[1]||0), 1);
  const pct   = (id, i) => Math.round(((lv[id]?.[i]||0)/total(id))*100);
  const savedItems = items.filter(c => profile?.saved_ids?.includes(c.id));

  const handleAddArticle = (a) => setArticles(prev => [a, ...prev]);
  const handleDeleteArticle = (id) => setArticles(prev => prev.filter(a => a.id !== id));

  return (
    <div style={S.root}>
      <style>{css}</style>

      <header style={S.hdr}>
        <div style={S.hdrI}>
          <div style={S.logo} onClick={goFeed}>🏒 <span style={S.logoT}>FAN<span style={S.acc}>VERDICT</span></span></div>
          <nav style={S.nav}>
            <button style={{...S.nb,...(page==="feed"?S.na:{})}} onClick={goFeed}>FEED</button>
            <button style={{...S.nb,...(page==="forum"||page==="article"?S.na:{})}} onClick={()=>setPage("forum")}>FORUM</button>
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
            ? <p style={{color:"#3a5060",fontSize:16,letterSpacing:1}}>No saved verdicts yet.</p>
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
          <button style={S.back} onClick={goFeed}>← Back to Feed</button>
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

      {page==="forum" && (
        <ForumPage articles={articles} onOpenArticle={openArticle}/>
      )}

      {page==="article" && activeArticle && (
        <ArticlePage article={activeArticle} onBack={()=>setPage("forum")}/>
      )}

      {page==="profile" && user && (
        <ProfilePage profile={profile} user={user} savedCount={profile?.saved_ids?.length||0}
          votedCount={Object.keys(uv).length} onLogout={handleLogout} onBack={goFeed}/>
      )}

      {page==="admin" && (
        <AdminPanel authed={adminOk} onAuth={setAdminOk} items={items} lv={lv} onRefresh={load}
          articles={articles} onAddArticle={handleAddArticle} onDeleteArticle={handleDeleteArticle}/>
      )}

      <footer style={S.foot}>FanVerdict © 2026 — Built for hockey fans</footer>
    </div>
  );
}

// ── Auth Modal ──
function AuthModal({ onClose, onLogin }) {
  const [mode, setMode]   = useState("login");
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
      if (res.error || !res.access_token) { setErr(res.error?.message || "Login failed."); setBusy(false); return; }
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
            <p style={{color:"#4a6070",fontSize:15,lineHeight:1.6,marginBottom:24}}>
              We sent a confirmation link to <strong style={{color:"#00d4ff"}}>{email}</strong>. Click it to activate your account.
            </p>
            <button style={{...S.subBtn,background:"#0c1420",border:"1px solid #1e2840",color:"#5a7080"}} onClick={onClose}>
              ← BACK TO SITE
            </button>
          </div>
        ) : (
          <>
            <div style={{fontSize:36,textAlign:"center",marginBottom:8}}>🏒</div>
            <h2 style={{fontSize:22,fontWeight:900,letterSpacing:3,color:"#dce6f0",textAlign:"center",marginBottom:24}}>
              {mode==="login" ? "WELCOME BACK" : "JOIN FANVERDICT"}
            </h2>
            <a href={auth.googleUrl()} style={S.googleBtn}>
              <svg width="18" height="18" viewBox="0 0 48 48" style={{marginRight:10,flexShrink:0}}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
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

// ── Forum Page ──
function ForumPage({ articles, onOpenArticle }) {
  const [filter, setFilter] = useState("ALL");
  const categories = ["ALL", ...ARTICLE_CATEGORIES];
  const filtered = filter === "ALL" ? articles : articles.filter(a => a.category === filter);
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <main style={S.main}>

      {/* ── FORUM HEADER — same card style as feed cards and login modal ── */}
      <div style={{
        background: "#0c1420",
        border: "1px solid #1e2840",
        borderRadius: 14,
        padding: "28px 32px 24px",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* blue top accent line — same vibe as the modal/card borders */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, #00d4ff88, #00d4ff22, transparent)",
        }}/>

        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
          <h1 style={{fontSize:"clamp(26px,5vw,46px)",fontWeight:900,letterSpacing:3,color:"#dce6f0",lineHeight:1}}>
            THE LOCKER ROOM
          </h1>
          <span style={{
            fontSize:10,fontWeight:800,letterSpacing:2,
            color:"#00d4ff",background:"#00d4ff14",
            border:"1px solid #00d4ff33",padding:"4px 11px",borderRadius:4,
          }}>FORUM</span>
        </div>
        <p style={{color:"#3a5060",fontSize:14,letterSpacing:1}}>
          Controversial calls. Epic fights. The debates that never die.
        </p>
      </div>

      {/* ── Filter pills ── */}
      <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
        {categories.map(cat => (
          <button key={cat} onClick={()=>setFilter(cat)} style={{
            padding:"6px 13px",
            background:filter===cat?(CAT_COLORS[cat]||"#00d4ff")+"22":"#0c1420",
            border:`1px solid ${filter===cat?(CAT_COLORS[cat]||"#00d4ff")+"66":"#161e2e"}`,
            borderRadius:6, color:filter===cat?(CAT_COLORS[cat]||"#00d4ff"):"#3a5060",
            fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:800, letterSpacing:1.5, cursor:"pointer"
          }}>{cat}</button>
        ))}
      </div>

      {filtered.length===0 && <p style={{color:"#3a5060",textAlign:"center",padding:60}}>No articles in this category yet.</p>}

      {/* ── Featured article ── */}
      {featured && (
        <div className="art-card" onClick={()=>onOpenArticle(featured)} style={{
          background:"#0c1420", border:`1px solid ${CAT_COLORS[featured.category]||"#00d4ff"}33`,
          borderRadius:14, marginBottom:24, overflow:"hidden", cursor:"pointer",
        }}>
          <div style={{position:"relative",height:220,overflow:"hidden"}}>
            <img src={featured.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 20%,#0c142088 65%,#0c1420 100%)"}}/>
            <div style={{position:"absolute",bottom:16,left:20,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:10,fontWeight:800,letterSpacing:2,color:CAT_COLORS[featured.category]||"#00d4ff",background:(CAT_COLORS[featured.category]||"#00d4ff")+"22",border:`1px solid ${CAT_COLORS[featured.category]||"#00d4ff"}44`,padding:"3px 10px",borderRadius:4}}>{featured.category}</span>
              {featured.hot && <span style={{fontSize:10,fontWeight:800,color:"#ff7040",background:"#ff5a1a22",border:"1px solid #ff5a1a55",padding:"3px 9px",borderRadius:4}}>🔥 HOT</span>}
            </div>
          </div>
          <div style={{padding:"22px 24px"}}>
            <h2 style={{fontSize:"clamp(18px,2.5vw,26px)",fontWeight:900,lineHeight:1.2,color:"#dce6f0",marginBottom:11}}>{featured.title}</h2>
            <p style={{fontSize:13,color:"#4a6070",lineHeight:1.7,marginBottom:14}}>{featured.excerpt}</p>
            <div style={{display:"flex",gap:14,fontSize:11,color:"#2a4050"}}>
              <span>By {featured.author}</span><span>·</span><span>{featured.date}</span><span>·</span><span>{featured.read_time}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Article grid ── */}
      {rest.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:18}}>
          {rest.map(a => {
            const col = CAT_COLORS[a.category]||"#00d4ff";
            return (
              <div key={a.id} className="art-card" onClick={()=>onOpenArticle(a)}
                style={{background:"#0c1420",border:"1px solid #161e2e",borderRadius:13,overflow:"hidden",cursor:"pointer"}}>
                <div style={{position:"relative",height:150,overflow:"hidden"}}>
                  <img src={a.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 30%,#0c1420cc 100%)"}}/>
                  <div style={{position:"absolute",bottom:10,left:14,display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:9,fontWeight:800,letterSpacing:1.5,color:col,background:col+"22",border:`1px solid ${col}44`,padding:"2px 8px",borderRadius:4}}>{a.category}</span>
                    {a.hot && <span style={{fontSize:10,color:"#ff7040"}}>🔥 HOT</span>}
                  </div>
                </div>
                <div style={{padding:"16px 18px"}}>
                  <h3 style={{fontSize:16,fontWeight:800,lineHeight:1.25,color:"#dce6f0",marginBottom:8}}>{a.title}</h3>
                  <p style={{fontSize:12,color:"#3a5060",lineHeight:1.6,marginBottom:12,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{a.excerpt}</p>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#1a3040"}}>
                    <span>{a.author}</span><span>{a.read_time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

// ── Article Page ──
function ArticlePage({ article, onBack }) {
  const [aiContent, setAiContent] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const color = CAT_COLORS[article.category]||"#00d4ff";

  const generateArticle = async () => {
    if (aiContent || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:"You are a sharp, opinionated hockey journalist. Write vivid, punchy sports writing. Take strong stances. Short paragraphs. No fluff.",
          messages:[{role:"user",content:`Write a full ~400 word editorial based on:\n\nTitle: ${article.title}\nCategory: ${article.category}\nPremise: ${article.excerpt}\n\nEngaging, controversial, take a clear stance.`}],
        }),
      });
      const d = await res.json();
      setAiContent(d.content?.map(b=>b.text||"").join("")||"");
    } catch { setAiContent("Article generation failed — try again."); }
    setAiLoading(false);
  };

  useEffect(() => { generateArticle(); }, []);

  return (
    <main style={S.main}>
      <button style={S.back} onClick={onBack}>← Back to Forum</button>
      <div style={{maxWidth:680,margin:"0 auto"}}>
        <div style={{borderRadius:13,overflow:"hidden",marginBottom:28,position:"relative",height:280}}>
          <img src={article.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 20%,#07090d88 60%,#07090d 100%)"}}/>
          <div style={{position:"absolute",bottom:20,left:22,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:10,fontWeight:800,letterSpacing:2,color,background:color+"22",border:`1px solid ${color}44`,padding:"3px 10px",borderRadius:4}}>{article.category}</span>
            {article.hot && <span style={{fontSize:10,fontWeight:800,color:"#ff7040",background:"#ff5a1a22",border:"1px solid #ff5a1a55",padding:"3px 9px",borderRadius:4}}>🔥 HOT</span>}
          </div>
        </div>
        <h1 style={{fontSize:"clamp(22px,4vw,38px)",fontWeight:900,lineHeight:1.15,color:"#dce6f0",marginBottom:14}}>{article.title}</h1>
        <div style={{display:"flex",gap:14,fontSize:12,color:"#2a4050",marginBottom:28,flexWrap:"wrap"}}>
          <span>By {article.author}</span><span>·</span><span>{article.date}</span><span>·</span><span>{article.read_time}</span>
        </div>
        <div style={{borderLeft:`3px solid ${color}`,paddingLeft:18,marginBottom:28}}>
          <p style={{fontSize:16,color:"#6a8090",lineHeight:1.8,fontStyle:"italic"}}>{article.excerpt}</p>
        </div>
        <div style={{background:"#090e18",border:"1px solid #161e38",borderRadius:12,padding:26,minHeight:180}}>
          {aiLoading
            ? <p className="pulse" style={{color:"#3a4060",fontSize:14,fontStyle:"italic"}}>Writing the full story…</p>
            : aiContent
              ? <div style={{fontSize:14,color:"#8a9eb0",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{aiContent}</div>
              : <button style={S.fullBtn} className="hbtn" onClick={generateArticle}>Load Full Article</button>
          }
        </div>
      </div>
    </main>
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
          <h2 style={{fontSize:24,fontWeight:900,letterSpacing:2,color:"#dce6f0",marginBottom:4}}>{profile?.display_name||"Fan"}</h2>
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

// ── Feed Card ──
// HOT badge and save button are now in a flex row at the top — no more absolute positioning overlap
function FeedCard({ item, idx, uv, lv, pct, total, onVote, onDetail, saved, onSave, loggedIn, onAuthPrompt }) {
  return (
    <div style={{...S.card,animationDelay:`${idx*.07}s`}} className="cfade">
      {/* Top row: HOT badge left, save button right — inline so they never overlap */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,minHeight:26}}>
        {item.hot
          ? <span style={S.hotInline}>🔥 HOT</span>
          : <span/>
        }
        <button style={{...S.saveBtn,...(saved?S.saveBtnOn:{})}} onClick={onSave} title={saved?"Unsave":"Save"}>
          {saved ? "🔖" : "🏷️"}
        </button>
      </div>
      <CardBody item={item} uv={uv} lv={lv} pct={pct} total={total} onVote={onVote}/>
      <button style={S.fullBtn} className="hbtn" onClick={() => onDetail(item)}>🤖 Get AI Ref Verdict →</button>
    </div>
  );
}

// ── Card Body ──
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
            <button style={{...S.vb,...S.vba}} className="hbtn" onClick={()=>onVote(item.id,0)}>{item.option_a}</button>
            <button style={{...S.vb,...S.vbb}} className="hbtn" onClick={()=>onVote(item.id,1)}>{item.option_b}</button>
          </div>
        : <div style={S.res}>
            {[item.option_a,item.option_b].map((opt,oi)=>(
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

// ── Admin Panel ──
function AdminPanel({ authed, onAuth, items, lv, onRefresh, articles, onAddArticle, onDeleteArticle }) {
  const [pw,setPw]       = useState("");
  const [err,setErr]     = useState(false);
  const [tab,setTab]     = useState("post");
  const [ok,setOk]       = useState(false);
  const [artOk,setArtOk] = useState(false);
  const [busy,setBusy]   = useState(false);
  const [form,setForm]   = useState({type:"GOAL REVIEW",game:"",title:"",description:"",option_a:"",option_b:"",official_call:"",hot:false});
  const [artForm,setArtForm] = useState({category:"CONTROVERSIAL CALL",title:"",excerpt:"",author:"FanVerdict Staff",read_time:"5 min read",hot:false,photo:""});

  const set    = (k,v) => setForm(p=>({...p,[k]:v}));
  const setArt = (k,v) => setArtForm(p=>({...p,[k]:v}));
  const tryAuth = () => { if(pw===ADMIN_PASSWORD){onAuth(true);setErr(false);}else setErr(true); };

  const post = async () => {
    if(!form.title||!form.description||!form.option_a||!form.option_b||!form.official_call) return alert("Fill in all required fields (*)");
    setBusy(true);
    await db.insert("controversies",{...form,votes_a:0,votes_b:0});
    setOk(true); setTimeout(()=>setOk(false),3500);
    setForm({type:"GOAL REVIEW",game:"",title:"",description:"",option_a:"",option_b:"",official_call:"",hot:false});
    onRefresh(); setBusy(false);
  };

  const postArticle = async () => {
    if(!artForm.title||!artForm.excerpt) return alert("Fill in title and excerpt.");
    setBusy(true);
    const newArt = {
      ...artForm,
      id:"art_"+Date.now(),
      color: CAT_COLORS[artForm.category]||"#00d4ff",
      date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
      photo: artForm.photo || "https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=800&q=80",
    };
    await db.insert("articles", newArt);
    onAddArticle(newArt);
    setArtOk(true); setTimeout(()=>setArtOk(false),3500);
    setArtForm({category:"CONTROVERSIAL CALL",title:"",excerpt:"",author:"FanVerdict Staff",read_time:"5 min read",hot:false,photo:""});
    setBusy(false);
  };

  const remove = async (id) => {
    if(!window.confirm("Delete this controversy?")) return;
    await db.del("controversies",id); onRefresh();
  };

  const removeArticle = async (id) => {
    if(!window.confirm("Delete this article?")) return;
    await db.del("articles",id);
    onDeleteArticle(id);
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

  const tabs = [["post","POST VERDICT"],["manage","MANAGE VERDICTS"],["forum_post","POST ARTICLE"],["forum_manage","MANAGE ARTICLES"]];

  return (
    <main style={S.main}>
      <div style={{maxWidth:740,margin:"0 auto"}}>
        <h2 style={{fontSize:26,fontWeight:900,letterSpacing:3,marginBottom:28,color:"#dce6f0"}}>⚙ ADMIN PANEL</h2>
        <div style={{display:"flex",gap:8,marginBottom:28,flexWrap:"wrap"}}>
          {tabs.map(([t,l])=>(
            <button key={t} style={{...S.tabBtn,...(tab===t?S.tabOn:{})}} onClick={()=>setTab(t)}>{l}</button>
          ))}
        </div>

        {tab==="post" && (
          <div style={S.fbox}>
            {ok && <div style={S.succ}>✅ Posted live!</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <FG label="TYPE"><select style={S.sel} value={form.type} onChange={e=>set("type",e.target.value)}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></FG>
              <FG label="GAME / DATE"><input style={S.inp} placeholder="e.g. Oilers vs Flames · Apr 27" value={form.game} onChange={e=>set("game",e.target.value)}/></FG>
            </div>
            <FG label="HEADLINE *"><input style={S.inp} placeholder="e.g. Was that a clean hit?" value={form.title} onChange={e=>set("title",e.target.value)}/></FG>
            <FG label="DESCRIPTION *"><textarea style={{...S.inp,minHeight:100,resize:"vertical",lineHeight:1.6}} placeholder="Describe what happened…" value={form.description} onChange={e=>set("description",e.target.value)}/></FG>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <FG label="OPTION A *"><input style={S.inp} placeholder="e.g. GOOD GOAL" value={form.option_a} onChange={e=>set("option_a",e.target.value)}/></FG>
              <FG label="OPTION B *"><input style={S.inp} placeholder="e.g. NO GOAL" value={form.option_b} onChange={e=>set("option_b",e.target.value)}/></FG>
            </div>
            <FG label="OFFICIAL CALL *"><input style={S.inp} placeholder="e.g. Goal stands after review" value={form.official_call} onChange={e=>set("official_call",e.target.value)}/></FG>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:15,fontWeight:700,color:"#5a7080",cursor:"pointer",marginBottom:22}}>
              <input type="checkbox" checked={form.hot} onChange={e=>set("hot",e.target.checked)}/> 🔥 Mark as HOT
            </label>
            <button style={{...S.subBtn,opacity:busy?.6:1}} onClick={post} disabled={busy}>{busy?"POSTING…":"POST CONTROVERSY"}</button>
          </div>
        )}

        {tab==="manage" && (
          <div style={{background:"#0c1420",border:"1px solid #161e2e",borderRadius:14,overflow:"hidden"}}>
            {items.length===0
              ? <p style={{color:"#334",textAlign:"center",padding:40}}>No controversies yet.</p>
              : items.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 22px",borderBottom:"1px solid #0f1825",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:800,letterSpacing:2,color:"#00d4ff",marginBottom:4}}>{c.type}</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#dce6f0",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                    <div style={{fontSize:12,color:"#445"}}>{c.option_a}: {lv?.[c.id]?.[0]??c.votes_a??0} | {c.option_b}: {lv?.[c.id]?.[1]??c.votes_b??0}</div>
                  </div>
                  <button style={S.delBtn} onClick={()=>remove(c.id)}>🗑 Delete</button>
                </div>
              ))
            }
          </div>
        )}

        {tab==="forum_post" && (
          <div style={S.fbox}>
            {artOk && <div style={S.succ}>✅ Article published to the Forum!</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <FG label="CATEGORY">
                <select style={S.sel} value={artForm.category} onChange={e=>setArt("category",e.target.value)}>
                  {ARTICLE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </FG>
              <FG label="AUTHOR"><input style={S.inp} placeholder="e.g. FanVerdict Staff" value={artForm.author} onChange={e=>setArt("author",e.target.value)}/></FG>
            </div>
            <FG label="TITLE *"><input style={S.inp} placeholder="e.g. The Call That Ended a Dynasty" value={artForm.title} onChange={e=>setArt("title",e.target.value)}/></FG>
            <FG label="EXCERPT *"><textarea style={{...S.inp,minHeight:100,resize:"vertical",lineHeight:1.6}} placeholder="2-3 hook sentences. AI writes the full body automatically." value={artForm.excerpt} onChange={e=>setArt("excerpt",e.target.value)}/></FG>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <FG label="READ TIME"><input style={S.inp} placeholder="5 min read" value={artForm.read_time} onChange={e=>setArt("read_time",e.target.value)}/></FG>
              <FG label="PHOTO URL"><input style={S.inp} placeholder="https://images.unsplash.com/..." value={artForm.photo} onChange={e=>setArt("photo",e.target.value)}/></FG>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:15,fontWeight:700,color:"#5a7080",cursor:"pointer",marginBottom:16}}>
              <input type="checkbox" checked={artForm.hot} onChange={e=>setArt("hot",e.target.checked)}/> 🔥 Mark as HOT
            </label>
            <div style={{background:"#080c14",border:"1px solid #0f1925",borderRadius:8,padding:"11px 14px",marginBottom:18,fontSize:12,color:"#3a5060"}}>
              💡 AI writes the full article body automatically when readers open it.
            </div>
            <button style={{...S.subBtn,opacity:busy?.6:1}} onClick={postArticle} disabled={busy}>{busy?"PUBLISHING…":"PUBLISH ARTICLE"}</button>
          </div>
        )}

        {tab==="forum_manage" && (
          <div style={{background:"#0c1420",border:"1px solid #161e2e",borderRadius:14,overflow:"hidden"}}>
            {articles.length===0
              ? <p style={{color:"#334",textAlign:"center",padding:40}}>No articles yet.</p>
              : articles.map(a=>(
                <div key={a.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 22px",borderBottom:"1px solid #0f1825",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:800,letterSpacing:2,color:CAT_COLORS[a.category]||"#00d4ff",marginBottom:4}}>{a.category}</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#dce6f0",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.title}</div>
                    <div style={{fontSize:12,color:"#2a4050"}}>{a.author} · {a.date}{a.hot?" · 🔥 HOT":""}</div>
                  </div>
                  <button style={S.delBtn} onClick={()=>removeArticle(a.id)}>🗑 Delete</button>
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
  // Card no longer uses overflow:hidden so the inner flex top row works cleanly
  card:      {background:"#0c1420",border:"1px solid #1e2840",borderRadius:14,padding:26,position:"relative"},
  // HOT is now inline in a flex row — no more absolute positioning
  hotInline: {fontSize:11,fontWeight:800,background:"#ff5a1a22",border:"1px solid #ff5a1a55",color:"#ff7040",padding:"3px 9px",borderRadius:4,display:"inline-block"},
  saveBtn:   {background:"none",border:"none",fontSize:18,cursor:"pointer",opacity:.4,padding:4,lineHeight:1},
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
  authBox:   {maxWidth:360,margin:"80px auto",background:"#0c1420",border:"1px solid #1e2840",borderRadius:16,padding:40,textAlign:"center"},
  modal:     {background:"#0c1420",border:"1px solid #1e2840",borderRadius:16,padding:36,width:"100%",maxWidth:400,position:"relative"},
  modalClose:{position:"absolute",top:14,right:16,background:"none",border:"none",color:"#3a5060",fontSize:18,cursor:"pointer"},
  googleBtn: {display:"flex",alignItems:"center",justifyContent:"center",width:"100%",padding:"12px",background:"#fff",borderRadius:8,color:"#1a1a1a",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,letterSpacing:1,cursor:"pointer",textDecoration:"none",marginBottom:16},
  divider:   {display:"flex",alignItems:"center",gap:10,margin:"4px 0 16px"},
  divTxt:    {color:"#2a4050",fontSize:12,letterSpacing:1,flexShrink:0},
  tabBtn:    {padding:"10px 18px",background:"#0c1420",border:"1px solid #161e2e",borderRadius:8,color:"#3a5060",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,cursor:"pointer"},
  tabOn:     {background:"#00d4ff18",borderColor:"#00d4ff44",color:"#00d4ff"},
  fbox:      {background:"#0c1420",border:"1px solid #1e2840",borderRadius:14,padding:28},
  inp:       {width:"100%",background:"#080c14",border:"1px solid #1e2840",borderRadius:8,color:"#c0d0e0",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,padding:"11px 14px",boxSizing:"border-box"},
  sel:       {width:"100%",background:"#080c14",border:"1px solid #1e2840",borderRadius:8,color:"#c0d0e0",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,padding:"11px 14px",cursor:"pointer"},
  subBtn:    {width:"100%",padding:14,background:"linear-gradient(135deg,#00a8cc,#0088aa)",border:"none",borderRadius:9,color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,letterSpacing:3,cursor:"pointer"},
  succ:      {background:"#00ff8818",border:"1px solid #00ff8855",color:"#00ff88",borderRadius:8,padding:"12px 16px",marginBottom:20,fontSize:14,fontWeight:700},
  delBtn:    {background:"#ff1a1a14",border:"1px solid #ff1a1a33",color:"#ff4d4d",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,padding:"6px 12px",borderRadius:6,cursor:"pointer",flexShrink:0},
  foot:      {textAlign:"center",padding:"32px 20px",fontSize:11,color:"#1a2530",letterSpacing:2,borderTop:"1px solid #0c1218"},
  statBox:   {background:"#0f1825",border:"1px solid #161e2e",borderRadius:10,padding:"16px 24px",textAlign:"center"},
  statNum:   {fontSize:32,fontWeight:900,color:"#00d4ff",letterSpacing:2},
  statLbl:   {fontSize:10,fontWeight:800,letterSpacing:2,color:"#2a4050",marginTop:4},
};
