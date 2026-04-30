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

const BADGES = [
  { value: "none",    label: "None",     emoji: "",   color: "#3a5060", bg: "#0a0f18",  border: "#1e2e3e" },
  { value: "hot",     label: "🔥 HOT",   emoji: "🔥", color: "#ff6633", bg: "#0d0a07",  border: "#ff5a1a44" },
  { value: "spicy",   label: "🌶 SPICY", emoji: "🌶", color: "#ff3a6e", bg: "#0d0008",  border: "#ff3a6e44" },
  { value: "viral",   label: "⚡ VIRAL", emoji: "⚡", color: "#ffd700", bg: "#0d0c00",  border: "#ffd70044" },
  { value: "rigged",  label: "🚨 RIGGED",emoji: "🚨", color: "#ff4d4d", bg: "#0d0000",  border: "#ff4d4d44" },
  { value: "lock",    label: "🔒 LOCK",  emoji: "🔒", color: "#4ade80", bg: "#000d06",  border: "#4ade8044" },
];

const getBadge = (item) => {
  if (item.badge) return BADGES.find(b => b.value === item.badge) || BADGES[0];
  if (item.hot) return BADGES[1];
  return BADGES[0];
};

const DEMO_VERDICTS = [
  { id: 1, type: "GOAL REVIEW", game: "Oilers vs Canucks · Apr 18", title: "Skate in the crease or not?", description: "McDavid scores the apparent game-winner but replay shows his skate may have grazed the blue paint. Officials reviewed for 4 minutes.", option_a: "✅ GOOD GOAL", option_b: "❌ NO GOAL", official_call: "Goal stands", votes_a: 4821, votes_b: 3104, badge: "hot", feed_type: "verdict" },
  { id: 2, type: "FIGHT VERDICT", game: "Bruins vs Rangers · Apr 20", title: "Who won the Tkachuk vs Kreider bout?", description: "A massive scrap after a dirty hit in the second period. Both fighters landed heavy shots. Refs gave both 5 minutes.", option_a: "🥊 TKACHUK", option_b: "🥊 KREIDER", official_call: "Double minor — both", votes_a: 6230, votes_b: 2890, badge: "viral", feed_type: "verdict" },
  { id: 3, type: "PENALTY CALL", game: "Leafs vs Lightning · Apr 22", title: "Dive or legitimate penalty?", description: "With 90 seconds left and the score tied, a Leafs forward goes down after light contact. Ref immediately whistles tripping.", option_a: "🚨 REAL PENALTY", option_b: "🎭 TOTAL DIVE", official_call: "Tripping — 2 minutes", votes_a: 1980, votes_b: 7441, badge: "rigged", feed_type: "verdict" },
];

const DEMO_PREDICTIONS = [
  { id: 101, type: "SERIES PREDICTION", game: "Oilers vs Canucks · Series starts May 2", title: "Who takes the series in 7?", description: "Battle of Alberta meets Battle of BC. McDavid vs Pettersson. The Oilers have been on fire but the Canucks swept their first round. Who advances?", option_a: "🛢️ OILERS WIN", option_b: "🐳 CANUCKS WIN", official_call: "Series begins May 2 · 7:00 PM ET", votes_a: 5120, votes_b: 3890, badge: "hot", feed_type: "prediction", game_date: "May 2, 2026" },
  { id: 102, type: "AWARD PREDICTION", game: "NHL Awards · Jun 2026", title: "Connor McDavid wins his 5th Hart Trophy?", description: "McDavid has been virtually unstoppable this season — 53 goals, 97 points in 72 games. But Auston Matthews had a historic start to the season. Does the award go back to Edmonton?", option_a: "🏆 YES — MCDAVID", option_b: "❌ SOMEONE ELSE", official_call: "Award voted on by PHWA members · Jun 2026", votes_a: 8440, votes_b: 2210, badge: "spicy", feed_type: "prediction", game_date: "Jun 2026" },
  { id: 103, type: "GAME PREDICTION", game: "Rangers vs Capitals · Game 1 · May 3", title: "Will this series go 7 games?", description: "The Rangers and Capitals are evenly matched on paper. Both teams have elite goaltending and physical defenses. Is this a sweep or a classic?", option_a: "🎯 GOES 7", option_b: "⚡ OVER IN 5 OR LESS", official_call: "Best-of-7 series begins May 3", votes_a: 4100, votes_b: 2950, badge: "none", feed_type: "prediction", game_date: "May 3, 2026" },
];

const DEFAULT_ARTICLES = [
  { id: "a1", category: "CONTROVERSIAL CALL", title: "The Goal That Broke a City: How One Crease Call Ended a Dynasty Run", excerpt: "It was 2019. A city held its breath. The replay ran on loop for days. We break down why the crease rule is still the most debated piece of legislation in hockey history.", author: "FanVerdict Staff", date: "Apr 26, 2026", read_time: "6 min read", badge: "hot", photo: "https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=800&q=80" },
  { id: "a2", category: "FIGHT BREAKDOWN", title: "The Unwritten Code: When Fighting Is Accepted and When It Goes Too Far", excerpt: "Hockey's fighting tradition is as old as the sport itself — but in 2026, where is the line? We interviewed 3 retired enforcers about what separates a clean scrap from a dangerous assault on ice.", author: "Mike Danton", date: "Apr 24, 2026", read_time: "8 min read", badge: "viral", photo: "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?w=800&q=80" },
  { id: "a3", category: "OFFSIDE DRAMA", title: "Coach's Challenge Is Ruining the Game — Or Is It Saving It?", excerpt: "Since its introduction, the Coach's Challenge has overturned hundreds of goals and infuriated millions of fans. We crunch the numbers and talk to coaches on both sides.", author: "Sarah Chen", date: "Apr 22, 2026", read_time: "5 min read", badge: "none", photo: "https://images.unsplash.com/photo-1568454537842-d933259bb258?w=800&q=80" },
  { id: "a4", category: "REF WATCH", title: "The Ref Who Missed It All: Inside Hockey's Most Controversial No-Call", excerpt: "Game 7. 12 seconds left. A blatant hook goes uncalled. We tracked down the referee, the coaches, and the players involved — and nobody agrees on what really happened.", author: "FanVerdict Investigates", date: "Apr 20, 2026", read_time: "10 min read", badge: "rigged", photo: "https://images.unsplash.com/photo-1607356050087-9793ed4eee45?w=800&q=80" },
  { id: "a5", category: "FIGHT BREAKDOWN", title: "Bare-Knuckle Respect: The Etiquette of the Hockey Fight Nobody Talks About", excerpt: "You drop gloves, you fight clean, you answer the bell — or you don't. The unspoken rules of hockey fighting are more complex than any referee's rulebook.", author: "Rick Tanner", date: "Apr 18, 2026", read_time: "7 min read", badge: "none", photo: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&q=80" },
  { id: "a6", category: "PENALTY DEBATE", title: "Embellishment: Hockey's Dirtiest Open Secret", excerpt: "Every fan sees it. Every coach knows it. Players do it on purpose — and the league has been trying to stop it for 30 years. Why does diving keep winning?", author: "FanVerdict Staff", date: "Apr 16, 2026", read_time: "5 min read", badge: "spicy", photo: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800&q=80" },
];

const DEFAULT_PARLAYS = [
  { id: "p1", label: "GAME 7 CHAOS PARLAY", legs: 4, odds: "+1840", badge: "hot", description: "Four series go to Game 7 this week. Bet on the chaos.", picks: [{ game: "Oilers vs Canucks", bet: "Oilers ML (Game 7)", line: "-118", sport: "NHL" }, { game: "Bruins vs Panthers", bet: "Panthers ML (Game 7)", line: "+140", sport: "NHL" }, { game: "Rangers vs Capitals", bet: "Rangers ML (Game 7)", line: "-130", sport: "NHL" }, { game: "Stars vs Avs", bet: "Over 5.5 Goals", line: "-115", sport: "NHL" }], payout: "$100 → $1,940" },
  { id: "p2", label: "McDaVID PROP MONSTER", legs: 3, odds: "+620", badge: "viral", description: "McDavid is locked in. Parlay his props for a massive night.", picks: [{ game: "Oilers vs Canucks", bet: "McDavid 1+ Point", line: "-160", sport: "NHL PROPS" }, { game: "Oilers vs Canucks", bet: "McDavid Anytime Goal Scorer", line: "+135", sport: "NHL PROPS" }, { game: "Oilers vs Canucks", bet: "Oilers 1st Period Winner", line: "+105", sport: "NHL PROPS" }], payout: "$100 → $720" },
  { id: "p3", label: "GOALIE SHUTOUT SPECIAL", legs: 2, odds: "+480", badge: "lock", description: "Two elite goalies, two dominant defensive matchups. Back the brick walls.", picks: [{ game: "Rangers vs Capitals", bet: "Igor Shesterkin 25+ Saves", line: "-140", sport: "NHL PROPS" }, { game: "Stars vs Avs", bet: "Jake Oettinger 30+ Saves", line: "+175", sport: "NHL PROPS" }], payout: "$100 → $580" },
  { id: "p4", label: "OVERTIME THRILLER PARLAY", legs: 3, odds: "+1100", badge: "spicy", description: "Playoff hockey is built for overtime. Three games with the look of OT finishes.", picks: [{ game: "Bruins vs Panthers", bet: "Game Goes to OT", line: "+280", sport: "NHL" }, { game: "Leafs vs Lightning", bet: "Game Goes to OT", line: "+260", sport: "NHL" }, { game: "Avs vs Stars", bet: "Over 5.5 Total Goals", line: "-110", sport: "NHL" }], payout: "$100 → $1,200" },
  { id: "p5", label: "CROSS-SPORT MEGA PARLAY", legs: 5, odds: "+3200", badge: "none", description: "High risk, massive reward. Five legs across NHL and NBA playoffs.", picks: [{ game: "Oilers vs Canucks", bet: "Oilers ML", line: "-118", sport: "NHL" }, { game: "Rangers vs Capitals", bet: "Under 5.5 Goals", line: "-105", sport: "NHL" }, { game: "Celtics vs Knicks", bet: "Celtics -6.5", line: "-110", sport: "NBA" }, { game: "Thunder vs Nuggets", bet: "Thunder ML", line: "+115", sport: "NBA" }, { game: "Pacers vs Bucks", bet: "Over 224.5 Points", line: "-112", sport: "NBA" }], payout: "$100 → $3,300" },
  { id: "p6", label: "PENALTY MINUTE MADNESS", legs: 3, odds: "+740", badge: "rigged", description: "Playoff hockey gets physical. Fade the clean teams, back the hitters.", picks: [{ game: "Bruins vs Panthers", bet: "Both Teams 10+ PIM", line: "+175", sport: "NHL" }, { game: "Stars vs Avs", bet: "Avs Bowen Byram Anytime Point", line: "+200", sport: "NHL PROPS" }, { game: "Oilers vs Canucks", bet: "Darnell Nurse 3+ Hits", line: "-120", sport: "NHL PROPS" }], payout: "$100 → $840" },
];

const COLORS = {
  "GOAL REVIEW":        ["#00d4ff18","#00d4ff","#00d4ff44"],
  "FIGHT VERDICT":      ["#ff4d4d18","#ff4d4d","#ff4d4d44"],
  "PENALTY CALL":       ["#ffd70018","#ffd700","#ffd70044"],
  "3 STARS":            ["#c084fc18","#c084fc","#c084fc44"],
  "OFFSIDE REVIEW":     ["#4ade8018","#4ade80","#4ade8044"],
  "GENERAL":            ["#fb923c18","#fb923c","#fb923c44"],
  "SERIES PREDICTION":  ["#a78bfa18","#a78bfa","#a78bfa44"],
  "AWARD PREDICTION":   ["#fbbf2418","#fbbf24","#fbbf2444"],
  "GAME PREDICTION":    ["#34d39918","#34d399","#34d39944"],
  "PLAYER PROP":        ["#f472b618","#f472b6","#f472b644"],
};
const VERDICT_TYPES = ["GOAL REVIEW","FIGHT VERDICT","PENALTY CALL","3 STARS","OFFSIDE REVIEW","GENERAL"];
const PREDICTION_TYPES = ["SERIES PREDICTION","AWARD PREDICTION","GAME PREDICTION","PLAYER PROP"];

const CAT_COLORS = {
  "CONTROVERSIAL CALL": "#00d4ff", "FIGHT BREAKDOWN": "#ff4d4d",
  "OFFSIDE DRAMA": "#4ade80", "REF WATCH": "#ffd700",
  "PENALTY DEBATE": "#fb923c", "GENERAL": "#c084fc",
};
const ARTICLE_CATEGORIES = Object.keys(CAT_COLORS);

const SPORT_COLORS = {
  "NHL": ["#00d4ff18","#00d4ff","#00d4ff33"],
  "NHL PROPS": ["#c084fc18","#c084fc","#c084fc33"],
  "NBA": ["#ff8c0018","#ff8c00","#ff8c0033"],
};
const SPORT_OPTIONS = ["NHL", "NHL PROPS", "NBA"];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#07090d;font-family:'Barlow Condensed',sans-serif}
  input::placeholder,textarea::placeholder{color:#2a3a4a}
  input:focus,textarea:focus,select:focus{border-color:#00d4ff55!important;outline:none;box-shadow:0 0 0 3px #00d4ff11}
  .cfade{animation:fadeUp .45s ease both}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .hbtn:hover{filter:brightness(1.25);transform:scale(1.02)}
  .banim{transition:width 1s cubic-bezier(.4,0,.2,1)}
  .blink{animation:blink 1.4s ease infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.15}}
  .pulse{animation:pulse 1.6s ease infinite;display:inline-block}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
  .modal-bg{position:fixed;inset:0;background:#000000ee;z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)}
  .art-card{transition:all .22s ease;cursor:pointer}
  .art-card:hover{border-color:#00d4ff33!important;transform:translateY(-3px);box-shadow:0 12px 40px #00000066}
  .feed-card{transition:border-color .2s ease}
  .feed-card:hover{border-color:#1e3a4a!important}
  .pred-card{transition:border-color .2s ease}
  .pred-card:hover{border-color:#2e1a4a!important}
  .parlay-card{transition:all .22s ease;cursor:pointer}
  .parlay-card:hover{border-color:#ffd70044!important;transform:translateY(-2px)}
  .nav-btn{background:none;border:1px solid transparent;color:#3a5060;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:6px;cursor:pointer;transition:all .18s ease}
  .nav-btn:hover{color:#7a9aaa;border-color:#1e2e3e}
  .nav-btn.active{color:#00d4ff;border-color:#00d4ff44;background:#00d4ff0d}
  .vote-btn{transition:all .2s ease}
  .vote-btn:hover{transform:translateY(-1px)}
  .gate-modal{animation:gateIn .3s cubic-bezier(.34,1.56,.64,1) both}
  @keyframes gateIn{from{opacity:0;transform:scale(.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
  .section-tab{font-family:'Barlow Condensed',sans-serif;font-weight:800;letter-spacing:2px;font-size:15px;cursor:pointer;padding:10px 0;border:none;background:transparent;transition:all .2s ease;position:relative}
  .section-tab::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;border-radius:2px;transition:all .2s ease}
  .section-tab.tab-verdict{color:#00d4ff}
  .section-tab.tab-verdict::after{background:#00d4ff}
  .section-tab.tab-prediction{color:#a78bfa}
  .section-tab.tab-prediction::after{background:#a78bfa}
  .section-tab.tab-inactive{color:#2a4050}
  .section-tab.tab-inactive::after{background:transparent}
  .edit-panel{animation:slideDown .2s ease both}
  @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
  .badge-btn{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:800;letter-spacing:1.5px;cursor:pointer;padding:5px 11px;border-radius:5px;transition:all .15s ease}
  .badge-btn:hover{filter:brightness(1.2);transform:scale(1.03)}
  ::-webkit-scrollbar{width:6px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:#1e2840;border-radius:3px}
`;

function BadgePicker({ value, onChange }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: 2, color: "#243040", marginBottom: 9 }}>BADGE</label>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {BADGES.map(b => {
          const active = value === b.value;
          return (
            <button
              key={b.value}
              className="badge-btn"
              onClick={() => onChange(b.value)}
              style={{
                background: active ? b.bg : "transparent",
                border: `1px solid ${active ? b.border : "#0f1820"}`,
                color: active ? b.color : "#3a5060",
              }}
            >
              {b.label || "None"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VoteGateModal({ onClose, onLogin, pendingVote }) {
  const [mode, setMode]   = useState("signup");
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [err, setErr]     = useState("");
  const [busy, setBusy]   = useState(false);
  const [done, setDone]   = useState(false);

  const perks = [
    { icon: "🗳️", text: "Cast votes on every controversial call" },
    { icon: "📊", text: "See live fan verdict breakdowns" },
    { icon: "🤖", text: "Unlock AI ref verdicts on every play" },
    { icon: "🔖", text: "Save & track your verdicts all season" },
  ];

  const submit = async () => {
    if (!email || !pw) return setErr("Fill in both fields.");
    if (pw.length < 6) return setErr("Password must be 6+ characters.");
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
      <div className="gate-modal" onClick={e => e.stopPropagation()} style={{
        background: "#080d16", border: "1px solid #0f1e30", borderRadius: 20,
        width: "100%", maxWidth: 460, overflow: "hidden", position: "relative",
      }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#00d4ff,#0066ff,#c084fc)" }} />
        <button onClick={onClose} style={{ position:"absolute",top:14,right:16,background:"none",border:"none",color:"#2a3a4a",fontSize:18,cursor:"pointer",padding:4,zIndex:1 }}>✕</button>
        {done ? (
          <div style={{ padding: "44px 36px", textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: 3, color: "#dce6f0", marginBottom: 12 }}>CHECK YOUR EMAIL</h2>
            <p style={{ color: "#5a7080", fontSize: 16, lineHeight: 1.7, marginBottom: 24 }}>
              Confirmation sent to <strong style={{ color: "#00d4ff" }}>{email}</strong>.<br />Click the link then come back to cast your vote.
            </p>
            <button style={{ ...S.subBtn, background: "#0c1420", border: "1px solid #1e2840", color: "#5a7080" }} onClick={onClose}>← BACK TO FEED</button>
          </div>
        ) : (
          <>
            <div style={{ padding: "28px 32px 0", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏒</div>
              <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: 2, color: "#dce6f0", marginBottom: 6, lineHeight: 1.1 }}>
                {mode === "signup" ? "JOIN TO CAST YOUR VOTE" : "LOG IN TO VOTE"}
              </h2>
              <p style={{ fontSize: 15, color: "#4a6070", letterSpacing: 0.5, marginBottom: 20 }}>
                {mode === "signup" ? "Free forever. No credit card. Just your take." : "Good to have you back."}
              </p>
              {mode === "signup" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22, textAlign: "left" }}>
                  {perks.map((p, i) => (
                    <div key={i} style={{ background: "#0a1018", border: "1px solid #0f1a28", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{p.icon}</span>
                      <span style={{ fontSize: 14, color: "#6a8090", lineHeight: 1.4 }}>{p.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: "0 32px 28px" }}>
              <a href={auth.googleUrl()} style={{ ...S.googleBtn, marginBottom: 16 }}>
                <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 10, flexShrink: 0 }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </a>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 14px" }}>
                <div style={{ flex: 1, height: 1, background: "#0f1825" }} />
                <span style={{ color: "#1e2e3e", fontSize: 13, letterSpacing: 1 }}>or</span>
                <div style={{ flex: 1, height: 1, background: "#0f1825" }} />
              </div>
              <input style={{ ...S.inp, marginBottom: 10 }} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
              <input style={{ ...S.inp, marginBottom: err ? 8 : 16 }} type="password" placeholder={mode === "signup" ? "Create a password (6+ chars)" : "Password"} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
              {err && <p style={{ color: "#ff4d4d", fontSize: 14, marginBottom: 12, letterSpacing: 0.3 }}>{err}</p>}
              <button style={{ ...S.subBtn, opacity: busy ? 0.6 : 1, marginBottom: 14 }} onClick={submit} disabled={busy}>
                {busy ? "…" : mode === "signup" ? "CREATE FREE ACCOUNT & VOTE" : "LOG IN & VOTE"}
              </button>
              <p style={{ textAlign: "center", fontSize: 15, color: "#4a6070" }}>
                {mode === "signup" ? "Already have an account? " : "No account? "}
                <span style={{ color: "#00d4ff", cursor: "pointer", fontWeight: 700 }} onClick={() => { setMode(m => m === "signup" ? "login" : "signup"); setErr(""); }}>
                  {mode === "signup" ? "Log in" : "Sign up free"}
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage]         = useState("verdicts");
  const [feedTab, setFeedTab]   = useState("verdicts");
  const [items, setItems]       = useState([]);
  const [articles, setArticles] = useState(DEFAULT_ARTICLES);
  const [parlays, setParlays]   = useState(DEFAULT_PARLAYS);
  const [loading, setLoading]   = useState(true);
  const [lv, setLv]             = useState({});
  const [uv, setUv]             = useState({});
  const [ai, setAi]             = useState({});
  const [aiLoad, setAiLoad]     = useState({});
  const [active, setActive]     = useState(null);
  const [activeArticle, setActiveArticle] = useState(null);
  const [activeParlayId, setActiveParlayId] = useState(null);
  const [adminOk, setAdminOk]   = useState(false);
  const [token, setToken]       = useState(null);
  const [user, setUser]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showVoteGate, setShowVoteGate] = useState(false);
  const [pendingVote, setPendingVote]   = useState(null);

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
      else setPage(p => p === "admin" ? "verdicts" : p);
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  const goHome = () => { window.location.hash = ""; setPage("verdicts"); };

  const load = useCallback(async () => {
    setLoading(true);
    const data = await db.select("controversies");
    const dbList = Array.isArray(data) && data.length ? data : [];
    const allItems = dbList.length ? dbList : [...DEMO_VERDICTS, ...DEMO_PREDICTIONS];
    setItems(allItems);
    setLv(allItems.reduce((a, c) => ({ ...a, [c.id]: [c.votes_a || 0, c.votes_b || 0] }), {}));
    const arts = await db.select("articles");
    if (Array.isArray(arts) && arts.length) setArticles(arts);
    const pars = await db.select("parlays");
    if (Array.isArray(pars) && pars.length) setParlays(pars);
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
    setShowVoteGate(false);
    if (pendingVote) {
      const { id, oi } = pendingVote;
      setPendingVote(null);
      setTimeout(() => castVote(id, oi, t, u), 300);
    }
  };

  const handleLogout = async () => {
    if (token) await auth.signOut(token);
    localStorage.removeItem("fv_token");
    localStorage.removeItem("fv_refresh");
    setToken(null); setUser(null); setProfile(null); setUv({});
  };

  const castVote = async (id, oi, tok, usr) => {
    const t = tok || token;
    const u = usr || user;
    if (uv[id] !== undefined) return;
    setUv(p => ({ ...p, [id]: oi }));
    setLv(p => { const v = [...(p[id] || [0, 0])]; v[oi]++; return { ...p, [id]: v }; });
    const item = items.find(c => c.id === id);
    if (item) await db.update("controversies", id, { [oi === 0 ? "votes_a" : "votes_b"]: (item[oi === 0 ? "votes_a" : "votes_b"] || 0) + 1 });
    if (t && u) {
      const prof = profile || {};
      const newSaved = [...(prof.saved_ids || []), id];
      setProfile(p => ({ ...(p || {}), saved_ids: newSaved }));
      await db.updateProfile(t, u.id, { saved_ids: newSaved });
    }
  };

  const vote = (id, oi) => {
    if (!user) { setPendingVote({ id, oi }); setShowVoteGate(true); return; }
    if (uv[id] !== undefined) return;
    castVote(id, oi);
  };

  const toggleSave = async (id) => {
    if (!user) { setShowVoteGate(true); return; }
    const saved = profile?.saved_ids || [];
    const newSaved = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id];
    setProfile(p => ({ ...p, saved_ids: newSaved }));
    await db.updateProfile(token, user.id, { saved_ids: newSaved });
  };

  const getAI = async (item) => {
    if (ai[item.id] || aiLoad[item.id]) return;
    setAiLoad(p => ({ ...p, [item.id]: true }));
    try {
      const isPrediction = item.feed_type === "prediction";
      const systemPrompt = isPrediction
        ? "You are a sharp veteran hockey analyst. Give a bold 2-3 sentence prediction breakdown. Take a clear stance on which side has the better case. End with a one-line verdict in ALL CAPS."
        : "You are a sharp veteran hockey analyst and referee. Give a decisive 2-3 sentence verdict. Be bold, take a clear stance. End with a one-line verdict in ALL CAPS.";
      const userPrompt = isPrediction
        ? `PREDICTION: "${item.title}"\n\n${item.description}\n\nUpcoming: ${item.official_call}\nOptions: "${item.option_a}" vs "${item.option_b}"\n\nGive your prediction analysis.`
        : `${item.type}: "${item.title}"\n\n${item.description}\n\nOfficial call: ${item.official_call}\nOptions: "${item.option_a}" vs "${item.option_b}"\n\nGive your verdict.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }),
      });
      const d = await res.json();
      setAi(p => ({ ...p, [item.id]: d.content?.map(b => b.text || "").join("") || "Verdict unavailable." }));
    } catch { setAi(p => ({ ...p, [item.id]: "AI ref timed out — try again." })); }
    setAiLoad(p => ({ ...p, [item.id]: false }));
  };

  const openDetail = (item) => { setActive(item); setPage("detail"); getAI(item); };
  const openArticle = (article) => { setActiveArticle(article); setPage("article"); };
  const openParlay = (id) => { setActiveParlayId(id); setPage("parlay_detail"); };
  const total = (id) => Math.max((lv[id]?.[0] || 0) + (lv[id]?.[1] || 0), 1);
  const pct = (id, i) => Math.round(((lv[id]?.[i] || 0) / total(id)) * 100);
  const savedItems = items.filter(c => profile?.saved_ids?.includes(c.id));

  const verdictItems = items.filter(c => !c.feed_type || c.feed_type === "verdict");
  const predictionItems = items.filter(c => c.feed_type === "prediction");

  const handleAddArticle = (a) => setArticles(prev => [a, ...prev]);
  const handleDeleteArticle = (id) => setArticles(prev => prev.filter(a => a.id !== id));
  const handleUpdateArticle = (id, patch) => setArticles(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  const handleAddParlay = (p) => setParlays(prev => [p, ...prev]);
  const handleDeleteParlay = (id) => setParlays(prev => prev.filter(p => p.id !== id));
  const handleUpdateParlay = (id, patch) => setParlays(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  const handleUpdateItem = (id, patch) => setItems(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));

  const isHomePage = page === "verdicts" || page === "predictions";
  const navCls = (targetPage) => {
    const pages = Array.isArray(targetPage) ? targetPage : [targetPage];
    return "nav-btn" + (pages.includes(page) ? " active" : "");
  };
  const homeNavCls = () => "nav-btn" + (isHomePage ? " active" : "");

  return (
    <div style={S.root}>
      <style>{css}</style>

      <header style={S.hdr}>
        <div style={S.hdrI}>
          <div style={S.logo} onClick={goHome}>
            <span style={S.logoIcon}>🏒</span>
            <span style={S.logoT}>FAN<span style={S.acc}>VERDICT</span></span>
          </div>
          <nav style={S.nav}>
            <button className={homeNavCls()} onClick={goHome}>HOME</button>
            <button className={navCls(["forum", "article"])} onClick={() => setPage("forum")}>FORUM</button>
            <button className={navCls(["parlay", "parlay_detail"])} onClick={() => setPage("parlay")}>PARLAYS</button>
            {user && <button className={navCls("saved")} onClick={() => setPage("saved")}>SAVED</button>}
            {user && (
              <button className={navCls("profile")} onClick={() => setPage("profile")}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} style={{ width: 20, height: 20, borderRadius: "50%", verticalAlign: "middle", marginRight: 4, border: "1px solid #00d4ff44" }} alt="avatar" />
                  : <span style={{ marginRight: 4 }}>👤</span>}
                {profile?.display_name?.split(" ")[0] || "ME"}
              </button>
            )}
            {!user && (
              <button className="nav-btn" style={{ background: "#00d4ff14", borderColor: "#00d4ff33", color: "#00d4ff" }} onClick={() => setShowAuth(true)}>
                LOG IN
              </button>
            )}
          </nav>
          <div style={S.live}><span className="blink" style={{ color: "#ff4d4d" }}>●</span> LIVE</div>
        </div>
      </header>

      {showVoteGate && (
        <VoteGateModal
          onClose={() => { setShowVoteGate(false); setPendingVote(null); }}
          onLogin={handleLogin}
          pendingVote={pendingVote}
        />
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={handleLogin} />}

      {isHomePage && (
        <main style={S.main}>
          <div style={S.hero}>
            <div style={S.heroPill}>🏒 PLAYOFF SEASON · LIVE VERDICTS</div>
            <h1 style={S.heroT}>YOU'RE THE REF.</h1>
            <p style={S.heroS}>Officials made their call. Now the fans decide.</p>
          </div>

          <div style={{ borderBottom: "1px solid #0f1820", marginBottom: 32, display: "flex", gap: 32 }}>
            <button
              className={`section-tab ${feedTab === "verdicts" ? "tab-verdict" : "tab-inactive"}`}
              onClick={() => { setFeedTab("verdicts"); setPage("verdicts"); }}
            >
              <span style={{ marginRight: 7 }}>🔴</span> VERDICTS
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: feedTab === "verdicts" ? "#00d4ff" : "#1e3040", background: feedTab === "verdicts" ? "#00d4ff14" : "#0a0f18", border: feedTab === "verdicts" ? "1px solid #00d4ff33" : "1px solid #0f1820", padding: "2px 8px", borderRadius: 4 }}>{verdictItems.length}</span>
            </button>
            <button
              className={`section-tab ${feedTab === "predictions" ? "tab-prediction" : "tab-inactive"}`}
              onClick={() => { setFeedTab("predictions"); setPage("predictions"); }}
            >
              <span style={{ marginRight: 7 }}>🔮</span> PREDICTIONS
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: feedTab === "predictions" ? "#a78bfa" : "#1e3040", background: feedTab === "predictions" ? "#a78bfa14" : "#0a0f18", border: feedTab === "predictions" ? "1px solid #a78bfa33" : "1px solid #0f1820", padding: "2px 8px", borderRadius: 4 }}>{predictionItems.length}</span>
            </button>
          </div>

          {feedTab === "verdicts" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff4d4d" }} className="blink" />
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: "#3a5060" }}>LIVE & RECENT CALLS — WHAT DO YOU THINK?</span>
              </div>
              {loading
                ? <div style={S.ldg}><span className="pulse">Loading controversies…</span></div>
                : verdictItems.length === 0
                  ? <EmptyState icon="🏒" title="No verdicts yet." sub="Check back after the next game." />
                  : <div style={S.grid}>{verdictItems.map((c, i) => (
                    <FeedCard key={c.id} item={c} idx={i} uv={uv[c.id]} lv={lv[c.id] || [0, 0]} pct={pct} total={total}
                      onVote={vote} onDetail={openDetail}
                      saved={profile?.saved_ids?.includes(c.id)} onSave={() => toggleSave(c.id)}
                      loggedIn={!!user} onAuthPrompt={() => setShowVoteGate(true)}
                    />
                  ))}</div>
              }
            </>
          )}

          {feedTab === "predictions" && (
            <>
              <div style={{ background: "#0a0812", border: "1px solid #a78bfa22", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 22 }}>🔮</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: "#a78bfa", marginBottom: 3 }}>PREDICT THE FUTURE</div>
                  <div style={{ fontSize: 14, color: "#4a4060", lineHeight: 1.5 }}>Vote on upcoming games, series, and awards before they happen. See how your prediction stacks up against the fanbase.</div>
                </div>
              </div>
              {loading
                ? <div style={S.ldg}><span className="pulse">Loading predictions…</span></div>
                : predictionItems.length === 0
                  ? <EmptyState icon="🔮" title="No predictions yet." sub="Check back before the next big game." />
                  : <div style={S.grid}>{predictionItems.map((c, i) => (
                    <PredictionCard key={c.id} item={c} idx={i} uv={uv[c.id]} lv={lv[c.id] || [0, 0]} pct={pct} total={total}
                      onVote={vote} onDetail={openDetail}
                      saved={profile?.saved_ids?.includes(c.id)} onSave={() => toggleSave(c.id)}
                      loggedIn={!!user} onAuthPrompt={() => setShowVoteGate(true)}
                    />
                  ))}</div>
              }
            </>
          )}
        </main>
      )}

      {page === "saved" && (
        <main style={S.main}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: 3, color: "#dce6f0" }}>SAVED VERDICTS</h2>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: "#00d4ff", background: "#00d4ff14", border: "1px solid #00d4ff33", padding: "3px 10px", borderRadius: 4 }}>{savedItems.length}</span>
          </div>
          {savedItems.length === 0
            ? <EmptyState icon="🔖" title="No saved verdicts yet." sub="Vote on a controversy to save it here." />
            : <div style={S.grid}>{savedItems.map((c, i) => {
              const Card = c.feed_type === "prediction" ? PredictionCard : FeedCard;
              return <Card key={c.id} item={c} idx={i} uv={uv[c.id]} lv={lv[c.id] || [0, 0]} pct={pct} total={total}
                onVote={vote} onDetail={openDetail}
                saved={true} onSave={() => toggleSave(c.id)}
                loggedIn={!!user} onAuthPrompt={() => setShowVoteGate(true)}
              />;
            })}</div>
          }
        </main>
      )}

      {page === "detail" && active && (
        <main style={S.main}>
          <button style={S.back} onClick={goHome}>← Back</button>
          <div style={{ maxWidth: 660, margin: "0 auto" }}>
            <div style={{ ...S.card, marginBottom: 0 }}>
              <CardBody item={active} uv={uv[active.id]} lv={lv[active.id] || [0, 0]} pct={pct} total={total} onVote={vote} loggedIn={!!user} onAuthPrompt={() => setShowVoteGate(true)} />
            </div>
            <div style={S.aiBox}>
              <div style={S.aiHdr}>
                <span style={S.aiIcon}>🤖</span>
                <span style={S.aiLbl}>{active.feed_type === "prediction" ? "AI PREDICTION BREAKDOWN" : "AI REF VERDICT"}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: "#2a3850", letterSpacing: 1 }}>POWERED BY CLAUDE</span>
              </div>
              {aiLoad[active.id]
                ? <div style={{ padding: "8px 0" }}>
                  <p style={S.aiWait} className="pulse">{active.feed_type === "prediction" ? "Analyzing the matchup…" : "Reviewing the play…"}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 14 }}>{[1,2,3].map(i => <div key={i} style={{ height: 6, flex: 1, background: "#0f1825", borderRadius: 3 }} />)}</div>
                </div>
                : ai[active.id]
                  ? <p style={S.aiTxt}>{ai[active.id]}</p>
                  : <button style={S.aiCallBtn} className="hbtn" onClick={() => getAI(active)}>{active.feed_type === "prediction" ? "Get AI Prediction →" : "Ask the AI Ref →"}</button>
              }
            </div>
          </div>
        </main>
      )}

      {page === "forum" && <ForumPage articles={articles} onOpenArticle={openArticle} />}
      {page === "article" && activeArticle && <ArticlePage article={activeArticle} onBack={() => setPage("forum")} />}
      {page === "parlay" && <ParlayPage parlays={parlays} onOpenParlay={openParlay} />}
      {page === "parlay_detail" && activeParlayId && (
        <ParlayDetailPage parlay={parlays.find(p => p.id === activeParlayId)} onBack={() => setPage("parlay")} />
      )}
      {page === "profile" && user && (
        <ProfilePage profile={profile} user={user} savedCount={profile?.saved_ids?.length || 0}
          votedCount={Object.keys(uv).length} onLogout={handleLogout} onBack={goHome} />
      )}
      {page === "admin" && (
        <AdminPanel authed={adminOk} onAuth={setAdminOk} items={items} lv={lv} onRefresh={load}
          articles={articles} onAddArticle={handleAddArticle} onDeleteArticle={handleDeleteArticle} onUpdateArticle={handleUpdateArticle}
          parlays={parlays} onAddParlay={handleAddParlay} onDeleteParlay={handleDeleteParlay} onUpdateParlay={handleUpdateParlay}
          onUpdateItem={handleUpdateItem}
        />
      )}

      <footer style={S.foot}>
        <span style={{ color: "#2a3a46" }}>FanVerdict © 2026</span>
        <span style={{ color: "#0f1820", margin: "0 12px" }}>·</span>
        <span style={{ color: "#2a3a46" }}>Built for hockey fans</span>
        <span style={{ color: "#0f1820", margin: "0 12px" }}>·</span>
        <span style={{ color: "#2a3a46", fontSize: 12 }}>Must be 19+. Gambling can be addictive. Play responsibly.</span>
      </footer>
    </div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#4a6070" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontSize: 18, letterSpacing: 1 }}>{title}</p>
      {sub && <p style={{ fontSize: 15, marginTop: 6, color: "#3a5060" }}>{sub}</p>}
    </div>
  );
}

// ── FIXED: Badge is now inline in the meta row, not absolutely positioned ──
function FeedCard({ item, idx, uv, lv, pct, total, onVote, onDetail, loggedIn, onAuthPrompt }) {
  const badge = getBadge(item);
  return (
    <div style={{ ...S.card, animationDelay: `${idx * .07}s` }} className="cfade feed-card">
      <CardBody item={item} uv={uv} lv={lv} pct={pct} total={total} onVote={onVote} loggedIn={loggedIn} onAuthPrompt={onAuthPrompt} badge={badge} />
      <button style={S.aiBtn} className="hbtn" onClick={() => onDetail(item)}>
        <span style={{ marginRight: 6 }}>🤖</span> Get AI Ref Verdict →
      </button>
    </div>
  );
}

function PredictionCard({ item, idx, uv, lv, pct, total, onVote, onDetail, loggedIn, onAuthPrompt }) {
  const badge = getBadge(item);
  return (
    <div style={{ ...S.card, animationDelay: `${idx * .07}s`, borderColor: "#1a1030", background: "#0b0a18" }} className="cfade pred-card">
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #a78bfa, #7c3aed)" }} />
      {item.game_date && (
        <div style={{ position: "absolute", bottom: 68, right: 16, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#6040a0", background: "#120d20", border: "1px solid #a78bfa22", borderRadius: 4, padding: "3px 8px" }}>
          📅 {item.game_date}
        </div>
      )}
      <CardBody item={item} uv={uv} lv={lv} pct={pct} total={total} onVote={onVote} loggedIn={loggedIn} onAuthPrompt={onAuthPrompt} isPrediction badge={badge} />
      <button style={{ ...S.aiBtn, borderColor: "#1e0f40", color: "#6040a0" }} className="hbtn" onClick={() => onDetail(item)}>
        <span style={{ marginRight: 6 }}>🔮</span> Get AI Prediction →
      </button>
    </div>
  );
}

// ── FIXED: Badge rendered inline in the meta row alongside the type tag ──
function CardBody({ item, uv, lv, pct, total, onVote, loggedIn, onAuthPrompt, isPrediction, badge: badgeProp }) {
  const [bg, tc, bc] = COLORS[item.type] || COLORS["GENERAL"];
  const hasVoted = uv !== undefined;
  const badge = badgeProp || getBadge(item);

  return (
    <>
      <div style={{ ...S.meta, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ ...S.tag, background: bg, color: tc, borderColor: bc }}>{item.type}</span>
          <span style={S.game}>{item.game}</span>
        </div>
        {badge.value !== "none" && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 6, padding: "4px 10px", flexShrink: 0 }}>
            <span style={{ fontSize: 12, lineHeight: 1 }}>{badge.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, color: badge.color, lineHeight: 1 }}>{badge.label.replace(badge.emoji, "").trim()}</span>
          </div>
        )}
      </div>
      <h2 style={S.ctitle}>{item.title}</h2>
      <p style={S.cdesc}>{item.description}</p>
      <div style={{ ...S.offBox, borderColor: isPrediction ? "#a78bfa22" : "#0f1820", background: isPrediction ? "#0d0a18" : "#080d14" }}>
        <span style={{ ...S.offLbl, color: isPrediction ? "#3d2060" : "#1e3040" }}>{isPrediction ? "UPCOMING " : "OFFICIAL CALL "}</span>
        <span style={S.offTxt}>{item.official_call}</span>
      </div>

      {!hasVoted ? (
        <div style={S.vrow}>
          <button className="vote-btn" style={{ ...S.vb, ...(isPrediction ? S.vbPredA : S.vba) }} onClick={() => onVote(item.id, 0)}>{item.option_a}</button>
          <button className="vote-btn" style={{ ...S.vb, ...(isPrediction ? S.vbPredB : S.vbb) }} onClick={() => onVote(item.id, 1)}>{item.option_b}</button>
        </div>
      ) : (
        <div style={S.res}>
          {[item.option_a, item.option_b].map((opt, oi) => (
            <div key={oi} style={S.rrow}>
              <span style={{ ...S.rlbl, opacity: uv === oi || uv === -1 ? 1 : 0.35, color: uv === oi ? (isPrediction ? (oi === 0 ? "#a78bfa" : "#7c3aed") : (oi === 0 ? "#00d4ff" : "#ff4d4d")) : "#6a8090" }}>{opt}</span>
              <div style={S.btrack}>
                <div className="banim" style={{
                  width: `${pct(item.id, oi)}%`,
                  background: isPrediction
                    ? (oi === 0 ? "linear-gradient(90deg,#6d28d9,#a78bfa)" : "linear-gradient(90deg,#4c1d95,#7c3aed)")
                    : (oi === 0 ? "linear-gradient(90deg,#0099bb,#00d4ff)" : "linear-gradient(90deg,#cc2233,#ff4d4d)"),
                  opacity: uv === oi || uv === -1 ? 1 : 0.25,
                  height: "100%", borderRadius: 4,
                }} />
              </div>
              <span style={{ ...S.rpct, color: uv === oi ? (isPrediction ? "#a78bfa" : (oi === 0 ? "#00d4ff" : "#ff4d4d")) : "#2a4050" }}>{pct(item.id, oi)}%</span>
            </div>
          ))}
          <div style={S.vtot}>{total(item.id).toLocaleString()} {isPrediction ? "predictions" : "fan verdicts"}</div>
        </div>
      )}
    </>
  );
}

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
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <button style={S.modalClose} onClick={onClose}>✕</button>
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: "#dce6f0", marginBottom: 12 }}>CHECK YOUR EMAIL</h2>
            <p style={{ color: "#5a7080", fontSize: 16, lineHeight: 1.7, marginBottom: 24 }}>
              We sent a confirmation link to <strong style={{ color: "#00d4ff" }}>{email}</strong>.<br />Click it to activate your account.
            </p>
            <button style={{ ...S.subBtn, background: "#0c1420", border: "1px solid #1e2840", color: "#5a7080" }} onClick={onClose}>← BACK TO SITE</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 38, textAlign: "center", marginBottom: 6 }}>🏒</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: "#dce6f0", textAlign: "center", marginBottom: 6 }}>
              {mode === "login" ? "WELCOME BACK" : "JOIN FANVERDICT"}
            </h2>
            <p style={{ textAlign: "center", fontSize: 15, color: "#4a6070", marginBottom: 24, letterSpacing: 0.5 }}>
              {mode === "login" ? "Good to see you again." : "The fans are waiting for your verdict."}
            </p>
            <a href={auth.googleUrl()} style={S.googleBtn}>
              <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 10, flexShrink: 0 }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </a>
            <div style={S.divider}>
              <div style={{ flex: 1, height: 1, background: "#0f1825" }} />
              <span style={S.divTxt}>or</span>
              <div style={{ flex: 1, height: 1, background: "#0f1825" }} />
            </div>
            <input style={{ ...S.inp, marginBottom: 10 }} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={{ ...S.inp, marginBottom: err ? 8 : 18 }} type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
            {err && <p style={{ color: "#ff4d4d", fontSize: 14, marginBottom: 12, letterSpacing: 0.3 }}>{err}</p>}
            <button style={{ ...S.subBtn, opacity: busy ? 0.6 : 1 }} onClick={submit} disabled={busy}>
              {busy ? "…" : mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
            </button>
            <p style={{ textAlign: "center", fontSize: 15, color: "#4a6070", marginTop: 16 }}>
              {mode === "login" ? "No account? " : "Already have one? "}
              <span style={{ color: "#00d4ff", cursor: "pointer", fontWeight: 700 }} onClick={() => { setMode(m => m === "login" ? "signup" : "login"); setErr(""); }}>
                {mode === "login" ? "Sign up free" : "Log in"}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ParlayPage({ parlays, onOpenParlay }) {
  const [filter, setFilter] = useState("ALL");
  const filters = ["ALL", "2 LEGS", "3 LEGS", "4+ LEGS", "🔥 HOT"];
  const filtered = parlays.filter(p => {
    if (filter === "ALL") return true;
    if (filter === "🔥 HOT") return p.badge === "hot" || p.hot;
    if (filter === "2 LEGS") return p.legs === 2;
    if (filter === "3 LEGS") return p.legs === 3;
    if (filter === "4+ LEGS") return p.legs >= 4;
    return true;
  });

  return (
    <main style={S.main}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, letterSpacing: 3, color: "#dce6f0" }}>PARLAY</h1>
          <span style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, letterSpacing: 3, color: "#ffd700" }}>BOARD</span>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#ffd700", background: "#ffd70014", border: "1px solid #ffd70033", padding: "3px 10px", borderRadius: 4, alignSelf: "center" }}>LIVE ODDS</span>
        </div>
        <p style={{ color: "#4a6070", fontSize: 16, letterSpacing: 0.5 }}>Curated parlays built for playoff hockey fans. Real lines. Real risk. Real payout.</p>
      </div>
      <div style={{ background: "#0a0d10", border: "1px solid #ffd70022", borderRadius: 10, padding: "12px 18px", marginBottom: 28, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 14, color: "#ffd70066" }}>⚠</span>
        <span style={{ fontSize: 14, color: "#4a5060", letterSpacing: 0.3 }}>Odds are for informational purposes only. Must be 19+ to bet. Gambling involves risk. Play responsibly.</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        {filters.map(f => {
          const active = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 14px", background: active ? "#ffd70014" : "transparent", border: `1px solid ${active ? "#ffd70055" : "#161e2e"}`, borderRadius: 20, color: active ? "#ffd700" : "#3a5060", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", transition: "all .15s ease" }}>{f}</button>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 22 }}>
        {filtered.map((parlay, i) => (
          <ParlayCard key={parlay.id} parlay={parlay} idx={i} onOpen={() => onOpenParlay(parlay.id)} />
        ))}
      </div>
    </main>
  );
}

// ── FIXED: Badge inline in header row, not absolutely positioned ──
function ParlayCard({ parlay, idx, onOpen }) {
  const isPos = parlay.odds.startsWith("+");
  const badge = getBadge(parlay);
  return (
    <div className="cfade parlay-card" style={{ background: "#0b1018", border: "1px solid #161e2e", borderRadius: 16, padding: "22px 24px", position: "relative", overflow: "hidden", animationDelay: `${idx * .07}s`, cursor: "pointer" }} onClick={onOpen}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#ffd700", background: "#ffd70014", border: "1px solid #ffd70033", padding: "3px 9px", borderRadius: 4 }}>💰 {parlay.legs}-LEG PARLAY</span>
        {badge.value !== "none" && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 6, padding: "3px 9px" }}>
            <span style={{ fontSize: 11, lineHeight: 1 }}>{badge.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: badge.color, lineHeight: 1 }}>{badge.label.replace(badge.emoji, "").trim()}</span>
          </div>
        )}
      </div>
      <h2 style={{ fontSize: 19, fontWeight: 900, letterSpacing: 1.5, color: "#dce6f0", marginBottom: 8, lineHeight: 1.2 }}>{parlay.label}</h2>
      <p style={{ fontSize: 15, color: "#4a6070", lineHeight: 1.6, marginBottom: 18 }}>{parlay.description}</p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: isPos ? "#4ade80" : "#ff4d4d", letterSpacing: 1, lineHeight: 1 }}>{parlay.odds}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#2a4050", letterSpacing: 1, marginBottom: 2 }}>AMERICAN ODDS</div>
          <div style={{ fontSize: 13, color: "#ffd700", fontWeight: 700 }}>{parlay.payout}</div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #0f1820", paddingTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
        {parlay.picks.slice(0, 2).map((pick, i) => {
          const [bg, tc] = SPORT_COLORS[pick.sport] || SPORT_COLORS["NHL"];
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: tc, background: bg, border: `1px solid ${tc}44`, padding: "2px 7px", borderRadius: 3, flexShrink: 0, whiteSpace: "nowrap" }}>{pick.sport}</span>
              <span style={{ fontSize: 14, color: "#5a7080", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{pick.bet}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#4a6070", flexShrink: 0 }}>{pick.line}</span>
            </div>
          );
        })}
        {parlay.picks.length > 2 && <div style={{ fontSize: 13, color: "#2a4050", letterSpacing: 0.5, paddingTop: 2 }}>+{parlay.picks.length - 2} more leg{parlay.picks.length - 2 > 1 ? "s" : ""} → tap to view</div>}
      </div>
    </div>
  );
}

function ParlayDetailPage({ parlay, onBack }) {
  const [aiVerdict, setAiVerdict] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const isPos = parlay.odds.startsWith("+");
  const badge = getBadge(parlay);

  const getAIParlayVerdict = async () => {
    if (aiVerdict || aiLoading) return;
    setAiLoading(true);
    try {
      const picksText = parlay.picks.map((p, i) => `${i + 1}. ${p.game} — ${p.bet} (${p.line})`).join("\n");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: "You are a sharp sports betting analyst who specializes in NHL parlays. Give a punchy, confident 3-4 sentence breakdown of this parlay's potential. Mention the riskiest leg and the strongest leg. End with a bold one-line take in ALL CAPS.",
          messages: [{ role: "user", content: `Parlay: ${parlay.label}\nOdds: ${parlay.odds}\nPayout: ${parlay.payout}\n\nLegs:\n${picksText}\n\nGive your analyst breakdown.` }],
        }),
      });
      const d = await res.json();
      setAiVerdict(d.content?.map(b => b.text || "").join("") || "Verdict unavailable.");
    } catch { setAiVerdict("AI analyst timed out — try again."); }
    setAiLoading(false);
  };

  useEffect(() => { getAIParlayVerdict(); }, []);

  return (
    <main style={S.main}>
      <button style={S.back} onClick={onBack}>← Back to Parlays</button>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ background: "#0b1018", border: "1px solid #1a2030", borderRadius: 16, padding: "28px 30px", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#ffd700", background: "#ffd70014", border: "1px solid #ffd70033", padding: "3px 10px", borderRadius: 4 }}>💰 {parlay.legs}-LEG PARLAY</span>
            {badge.value !== "none" && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, padding: "3px 10px", borderRadius: 4 }}>{badge.label}</span>}
          </div>
          <h1 style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 900, letterSpacing: 2, color: "#dce6f0", marginBottom: 10, lineHeight: 1.15 }}>{parlay.label}</h1>
          <p style={{ fontSize: 16, color: "#4a6070", lineHeight: 1.7, marginBottom: 24 }}>{parlay.description}</p>
          <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
            <div style={{ background: "#070c12", border: "1px solid #0f1820", borderRadius: 10, padding: "16px 22px", flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#2a4050", marginBottom: 6 }}>TOTAL ODDS</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: isPos ? "#4ade80" : "#ff4d4d", letterSpacing: 1, lineHeight: 1 }}>{parlay.odds}</div>
            </div>
            <div style={{ background: "#070c12", border: "1px solid #0f1820", borderRadius: 10, padding: "16px 22px", flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#2a4050", marginBottom: 6 }}>$100 PAYS</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#ffd700", letterSpacing: 1, lineHeight: 1 }}>{parlay.payout.split("→")[1]?.trim()}</div>
            </div>
            <div style={{ background: "#070c12", border: "1px solid #0f1820", borderRadius: 10, padding: "16px 22px", flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#2a4050", marginBottom: 6 }}>LEGS</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#c084fc", letterSpacing: 1, lineHeight: 1 }}>{parlay.legs}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2.5, color: "#1e3040", marginBottom: 14 }}>ALL PICKS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {parlay.picks.map((pick, i) => {
              const [bg, tc, bc] = SPORT_COLORS[pick.sport] || SPORT_COLORS["NHL"];
              const lineNum = parseFloat(pick.line);
              const lineColor = lineNum > 0 ? "#4ade80" : lineNum < -150 ? "#ff6b6b" : "#ffd700";
              return (
                <div key={i} style={{ background: "#070b12", border: "1px solid #111820", borderLeft: `3px solid ${tc}`, borderRadius: 8, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: bg, border: `1px solid ${bc}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: tc, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 13, color: "#3a5060", letterSpacing: 0.5, marginBottom: 3 }}>{pick.game}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#c0d0e0" }}>{pick.bet}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: tc, background: bg, border: `1px solid ${bc}`, padding: "3px 8px", borderRadius: 3 }}>{pick.sport}</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: lineColor }}>{pick.line}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={S.aiBox}>
          <div style={S.aiHdr}>
            <span style={S.aiIcon}>🤖</span>
            <span style={S.aiLbl}>AI ANALYST BREAKDOWN</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: "#2a3850", letterSpacing: 1 }}>POWERED BY CLAUDE</span>
          </div>
          {aiLoading
            ? <div style={{ padding: "8px 0" }}><p style={S.aiWait} className="pulse">Breaking down the parlay…</p><div style={{ display: "flex", gap: 6, marginTop: 14 }}>{[1,2,3].map(i => <div key={i} style={{ height: 6, flex: 1, background: "#0f1825", borderRadius: 3 }} />)}</div></div>
            : aiVerdict
              ? <p style={S.aiTxt}>{aiVerdict}</p>
              : <button style={S.aiCallBtn} className="hbtn" onClick={getAIParlayVerdict}>Get AI Breakdown →</button>
          }
        </div>
        <div style={{ marginTop: 16, background: "#070a0e", border: "1px solid #0f1418", borderRadius: 8, padding: "12px 16px" }}>
          <p style={{ fontSize: 13, color: "#2a3a46", lineHeight: 1.7, letterSpacing: 0.2 }}>
            ⚠️ <strong style={{ color: "#3a4a56" }}>Disclaimer:</strong> Odds shown are for entertainment and informational purposes only. FanVerdict does not facilitate gambling transactions. Lines may differ from your sportsbook. Must be 19+ (18+ in some jurisdictions). If gambling is a problem for you, call 1-800-522-4700 (North America).
          </p>
        </div>
      </div>
    </main>
  );
}

function ForumPage({ articles, onOpenArticle }) {
  const [filter, setFilter] = useState("ALL");
  const categories = ["ALL", ...ARTICLE_CATEGORIES];
  const filtered = filter === "ALL" ? articles : articles.filter(a => a.category === filter);
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <main style={S.main}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <h1 style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, letterSpacing: 3, color: "#dce6f0" }}>THE LOCKER ROOM</h1>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#00d4ff", background: "#00d4ff14", border: "1px solid #00d4ff33", padding: "3px 10px", borderRadius: 4, alignSelf: "center" }}>FORUM</span>
        </div>
        <p style={{ color: "#4a6070", fontSize: 16, letterSpacing: 0.5 }}>Controversial calls. Epic fights. The debates that never die.</p>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        {categories.map(cat => {
          const col = CAT_COLORS[cat] || "#00d4ff";
          const active = filter === cat;
          return (
            <button key={cat} onClick={() => setFilter(cat)} style={{ padding: "5px 14px", background: active ? col + "1a" : "transparent", border: `1px solid ${active ? col + "66" : "#161e2e"}`, borderRadius: 20, color: active ? col : "#3a5060", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", transition: "all .15s ease" }}>{cat}</button>
          );
        })}
      </div>
      {filtered.length === 0 && <EmptyState icon="📰" title="No articles in this category yet." />}
      {featured && (
        <div className="art-card" onClick={() => onOpenArticle(featured)} style={{ background: "#0c1420", border: `1px solid ${CAT_COLORS[featured.category] || "#00d4ff"}22`, borderRadius: 16, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ position: "relative", height: 240, overflow: "hidden" }}>
            <img src={featured.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .4s ease" }} onError={e => e.target.style.display = "none"} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 15%,#0c142090 60%,#0c1420 100%)" }} />
            {(() => { const b = getBadge(featured); return b.value !== "none" && (
              <div style={{ position: "absolute", top: 16, right: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: b.color, background: "#07090dcc", border: `1px solid ${b.border}`, padding: "4px 10px", borderRadius: 20, letterSpacing: 1 }}>{b.label}</span>
              </div>
            ); })()}
            <div style={{ position: "absolute", bottom: 18, left: 22 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: CAT_COLORS[featured.category] || "#00d4ff", background: "#07090dcc", border: `1px solid ${CAT_COLORS[featured.category] || "#00d4ff"}44`, padding: "4px 12px", borderRadius: 20 }}>{featured.category}</span>
            </div>
          </div>
          <div style={{ padding: "22px 26px 24px" }}>
            <h2 style={{ fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 900, lineHeight: 1.2, color: "#dce6f0", marginBottom: 10 }}>{featured.title}</h2>
            <p style={{ fontSize: 15, color: "#5a7080", lineHeight: 1.75, marginBottom: 16 }}>{featured.excerpt}</p>
            <div style={{ display: "flex", gap: 12, fontSize: 14, color: "#3a5060", alignItems: "center" }}>
              <span style={{ color: "#4a6070" }}>By {featured.author}</span>
              <span style={{ color: "#1a2a36" }}>·</span>
              <span style={{ color: "#3a5060" }}>{featured.date}</span>
              <span style={{ color: "#1a2a36" }}>·</span>
              <span style={{ color: "#3a5060" }}>{featured.read_time}</span>
            </div>
          </div>
        </div>
      )}
      {rest.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 18 }}>
          {rest.map(a => {
            const col = CAT_COLORS[a.category] || "#00d4ff";
            const b = getBadge(a);
            return (
              <div key={a.id} className="art-card" onClick={() => onOpenArticle(a)} style={{ background: "#0c1420", border: "1px solid #121a24", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ position: "relative", height: 160, overflow: "hidden" }}>
                  <img src={a.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 25%,#0c1420dd 100%)" }} />
                  {b.value !== "none" && (
                    <div style={{ position: "absolute", top: 10, right: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: b.color, background: "#07090dcc", border: `1px solid ${b.border}`, padding: "3px 8px", borderRadius: 20, letterSpacing: 1 }}>{b.label}</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 10, left: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: col, background: "#07090dcc", border: `1px solid ${col}44`, padding: "3px 9px", borderRadius: 20 }}>{a.category}</span>
                  </div>
                </div>
                <div style={{ padding: "16px 18px 18px" }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.25, color: "#dce6f0", marginBottom: 8 }}>{a.title}</h3>
                  <p style={{ fontSize: 14, color: "#4a6070", lineHeight: 1.65, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.excerpt}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#3a4a56" }}>
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

function ArticlePage({ article, onBack }) {
  const [aiContent, setAiContent] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const color = CAT_COLORS[article.category] || "#00d4ff";
  const badge = getBadge(article);

  const generateArticle = async () => {
    if (aiContent || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: "You are a sharp, opinionated hockey journalist. Write vivid, punchy sports writing. Take strong stances. Short paragraphs. No fluff.",
          messages: [{ role: "user", content: `Write a full ~400 word editorial based on:\n\nTitle: ${article.title}\nCategory: ${article.category}\nPremise: ${article.excerpt}\n\nEngaging, controversial, take a clear stance.` }],
        }),
      });
      const d = await res.json();
      setAiContent(d.content?.map(b => b.text || "").join("") || "");
    } catch { setAiContent("Article generation failed — try again."); }
    setAiLoading(false);
  };

  useEffect(() => { generateArticle(); }, []);

  return (
    <main style={S.main}>
      <button style={S.back} onClick={onBack}>← Back to Forum</button>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 30, position: "relative", height: 300 }}>
          <img src={article.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 20%,#07090d88 55%,#07090d 100%)" }} />
          {badge.value !== "none" && (
            <div style={{ position: "absolute", top: 16, right: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: badge.color, background: "#07090dcc", border: `1px solid ${badge.border}`, padding: "4px 10px", borderRadius: 20, letterSpacing: 1 }}>{badge.label}</span>
            </div>
          )}
          <div style={{ position: "absolute", bottom: 20, left: 24 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color, background: "#07090dcc", border: `1px solid ${color}44`, padding: "4px 12px", borderRadius: 20 }}>{article.category}</span>
          </div>
        </div>
        <h1 style={{ fontSize: "clamp(22px,4vw,38px)", fontWeight: 900, lineHeight: 1.15, color: "#dce6f0", marginBottom: 14 }}>{article.title}</h1>
        <div style={{ display: "flex", gap: 12, fontSize: 14, color: "#3a5060", marginBottom: 28, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "#4a6070" }}>By {article.author}</span>
          <span style={{ color: "#1a2a36" }}>·</span>
          <span>{article.date}</span>
          <span style={{ color: "#1a2a36" }}>·</span>
          <span>{article.read_time}</span>
        </div>
        <div style={{ borderLeft: `3px solid ${color}44`, paddingLeft: 20, marginBottom: 28 }}>
          <p style={{ fontSize: 17, color: "#7a8fa0", lineHeight: 1.85, fontStyle: "italic" }}>{article.excerpt}</p>
        </div>
        <div style={{ background: "#090e18", border: "1px solid #111828", borderRadius: 14, padding: 28, minHeight: 200 }}>
          {aiLoading
            ? <div><p className="pulse" style={{ color: "#4a5070", fontSize: 15, fontStyle: "italic", marginBottom: 16 }}>Writing the full story…</p>{[100, 85, 92, 70].map((w, i) => <div key={i} style={{ height: 10, width: `${w}%`, background: "#0f1825", borderRadius: 3, marginBottom: 10 }} />)}</div>
            : aiContent
              ? <div style={{ fontSize: 16, color: "#8a9eb0", lineHeight: 1.95, whiteSpace: "pre-wrap" }}>{aiContent}</div>
              : <button style={S.aiCallBtn} className="hbtn" onClick={generateArticle}>Load Full Article →</button>
          }
        </div>
      </div>
    </main>
  );
}

function ProfilePage({ profile, user, savedCount, votedCount, onLogout, onBack }) {
  return (
    <main style={S.main}>
      <button style={S.back} onClick={onBack}>← Back</button>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <div style={{ ...S.card, textAlign: "center", padding: "40px 36px" }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} style={{ width: 76, height: 76, borderRadius: "50%", margin: "0 auto 18px", display: "block", border: "2px solid #00d4ff33" }} alt="avatar" />
            : <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#00d4ff0d", border: "2px solid #00d4ff22", margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>👤</div>
          }
          <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: 2, color: "#dce6f0", marginBottom: 4 }}>{profile?.display_name || "Fan"}</h2>
          <p style={{ fontSize: 15, color: "#3a5060", marginBottom: 30, letterSpacing: 0.3 }}>{user?.email}</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 32 }}>
            <div style={S.statBox}><div style={S.statNum}>{votedCount}</div><div style={S.statLbl}>VOTES CAST</div></div>
            <div style={S.statBox}><div style={S.statNum}>{savedCount}</div><div style={S.statLbl}>SAVED</div></div>
          </div>
          <button style={{ ...S.subBtn, background: "transparent", border: "1px solid #ff1a1a33", color: "#ff4d4d" }} onClick={onLogout}>LOG OUT</button>
        </div>
      </div>
    </main>
  );
}

// ── Admin Panel ──
function AdminPanel({ authed, onAuth, items, lv, onRefresh, articles, onAddArticle, onDeleteArticle, onUpdateArticle, parlays, onAddParlay, onDeleteParlay, onUpdateParlay, onUpdateItem }) {
  const [pw, setPw]         = useState("");
  const [err, setErr]       = useState(false);
  const [tab, setTab]       = useState("post");
  const [ok, setOk]         = useState(false);
  const [artOk, setArtOk]   = useState(false);
  const [parOk, setParOk]   = useState(false);
  const [busy, setBusy]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [editingArt, setEditingArt] = useState(null);
  const [editingPar, setEditingPar] = useState(null);
  const [saveOk, setSaveOk]         = useState(null);

  const [form, setForm] = useState({ type: "GOAL REVIEW", game: "", title: "", description: "", option_a: "", option_b: "", official_call: "", badge: "none", feed_type: "verdict", game_date: "" });
  const [artForm, setArtForm] = useState({ category: "CONTROVERSIAL CALL", title: "", excerpt: "", author: "FanVerdict Staff", read_time: "5 min read", badge: "none", photo: "" });

  const emptyPick = () => ({ game: "", bet: "", line: "", sport: "NHL" });
  const [parForm, setParForm] = useState({ label: "", odds: "", description: "", badge: "none", payout: "", picks: [emptyPick(), emptyPick()] });

  const [editForm, setEditForm]     = useState({});
  const [editArtForm, setEditArtForm] = useState({});
  const [editParForm, setEditParForm] = useState({});

  const set    = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setArt = (k, v) => setArtForm(p => ({ ...p, [k]: v }));
  const setPar = (k, v) => setParForm(p => ({ ...p, [k]: v }));

  const updatePick = (idx, k, v) => setParForm(p => { const picks = [...p.picks]; picks[idx] = { ...picks[idx], [k]: v }; return { ...p, picks }; });
  const addPick    = () => setParForm(p => ({ ...p, picks: [...p.picks, emptyPick()] }));
  const removePick = (idx) => setParForm(p => ({ ...p, picks: p.picks.filter((_, i) => i !== idx) }));

  const updateEditPick = (idx, k, v) => setEditParForm(p => { const picks = [...(p.picks || [])]; picks[idx] = { ...picks[idx], [k]: v }; return { ...p, picks }; });
  const addEditPick    = () => setEditParForm(p => ({ ...p, picks: [...(p.picks || []), emptyPick()] }));
  const removeEditPick = (idx) => setEditParForm(p => ({ ...p, picks: (p.picks || []).filter((_, i) => i !== idx) }));

  const tryAuth = () => { if (pw === ADMIN_PASSWORD) { onAuth(true); setErr(false); } else setErr(true); };

  const post = async () => {
    if (!form.title || !form.description || !form.option_a || !form.option_b || !form.official_call) return alert("Fill in all required fields (*)");
    setBusy(true);
    await db.insert("controversies", { ...form, votes_a: 0, votes_b: 0 });
    setOk(true); setTimeout(() => setOk(false), 3500);
    setForm({ type: "GOAL REVIEW", game: "", title: "", description: "", option_a: "", option_b: "", official_call: "", badge: "none", feed_type: "verdict", game_date: "" });
    onRefresh(); setBusy(false);
  };

  const postArticle = async () => {
    if (!artForm.title || !artForm.excerpt) return alert("Fill in title and excerpt.");
    setBusy(true);
    const newArt = { ...artForm, id: "art_" + Date.now(), color: CAT_COLORS[artForm.category] || "#00d4ff", date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), photo: artForm.photo || "https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=800&q=80" };
    await db.insert("articles", newArt);
    onAddArticle(newArt);
    setArtOk(true); setTimeout(() => setArtOk(false), 3500);
    setArtForm({ category: "CONTROVERSIAL CALL", title: "", excerpt: "", author: "FanVerdict Staff", read_time: "5 min read", badge: "none", photo: "" });
    setBusy(false);
  };

  const postParlay = async () => {
    if (!parForm.label || !parForm.odds || !parForm.description || !parForm.payout) return alert("Fill in all required parlay fields (*).");
    const validPicks = parForm.picks.filter(p => p.game && p.bet && p.line);
    if (validPicks.length < 2) return alert("Add at least 2 complete picks.");
    setBusy(true);
    const newParlay = { id: "par_" + Date.now(), label: parForm.label, legs: validPicks.length, odds: parForm.odds, badge: parForm.badge, description: parForm.description, payout: parForm.payout, picks: validPicks };
    await db.insert("parlays", newParlay);
    onAddParlay(newParlay);
    setParOk(true); setTimeout(() => setParOk(false), 3500);
    setParForm({ label: "", odds: "", description: "", badge: "none", payout: "", picks: [emptyPick(), emptyPick()] });
    setBusy(false);
  };

  // ── FIXED: delete calls onRefresh only for new posts, not edits ──
  const remove       = async (id) => { if (!window.confirm("Delete this controversy?")) return; await db.del("controversies", id); onRefresh(); };
  const removeArticle = async (id) => { if (!window.confirm("Delete this article?")) return; await db.del("articles", id); onDeleteArticle(id); };
  const removeParlay  = async (id) => { if (!window.confirm("Delete this parlay?")) return; await db.del("parlays", id); onDeleteParlay(id); };

  const startEdit = (item) => { setEditingId(item.id); setEditForm({ ...item }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  // ── FIXED: saveEdit updates local state immediately, no refresh ──
  const saveEdit = async () => {
    setBusy(true);
    await db.update("controversies", editingId, editForm);
    onUpdateItem(editingId, editForm);
    setSaveOk(editingId); setTimeout(() => setSaveOk(null), 2500);
    setEditingId(null); setEditForm({});
    setBusy(false);
  };

  const startEditArt = (art) => { setEditingArt(art.id); setEditArtForm({ ...art }); };
  const cancelEditArt = () => { setEditingArt(null); setEditArtForm({}); };

  // ── FIXED: saveEditArt updates local state immediately, no refresh ──
  const saveEditArt = async () => {
    setBusy(true);
    await db.update("articles", editingArt, editArtForm);
    onUpdateArticle(editingArt, editArtForm);
    setSaveOk(editingArt); setTimeout(() => setSaveOk(null), 2500);
    setEditingArt(null); setEditArtForm({});
    setBusy(false);
  };

  const startEditPar = (par) => { setEditingPar(par.id); setEditParForm({ ...par, picks: par.picks ? [...par.picks.map(p => ({ ...p }))] : [emptyPick(), emptyPick()] }); };
  const cancelEditPar = () => { setEditingPar(null); setEditParForm({}); };

  // ── FIXED: saveEditPar updates local state immediately, no refresh ──
  const saveEditPar = async () => {
    const validPicks = (editParForm.picks || []).filter(p => p.game && p.bet && p.line);
    if (validPicks.length < 2) return alert("Need at least 2 complete picks.");
    setBusy(true);
    const patch = { ...editParForm, legs: validPicks.length, picks: validPicks };
    await db.update("parlays", editingPar, patch);
    onUpdateParlay(editingPar, patch);
    setSaveOk(editingPar); setTimeout(() => setSaveOk(null), 2500);
    setEditingPar(null); setEditParForm({});
    setBusy(false);
  };

  if (!authed) return (
    <main style={S.main}>
      <div style={S.authBox}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>🔐</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, margin: "0 0 24px", color: "#dce6f0" }}>ADMIN ACCESS</h2>
        <input style={{ ...S.inp, textAlign: "center", letterSpacing: 6 }} type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && tryAuth()} />
        {err && <p style={{ color: "#ff4d4d", fontSize: 14, marginTop: 8 }}>Wrong password</p>}
        <button style={{ ...S.subBtn, marginTop: 18 }} onClick={tryAuth}>ENTER</button>
      </div>
    </main>
  );

  const tabs = [["post", "POST VERDICT"], ["manage", "MANAGE VERDICTS"], ["forum_post", "POST ARTICLE"], ["forum_manage", "MANAGE ARTICLES"], ["parlay_post", "POST PARLAY"], ["parlay_manage", "MANAGE PARLAYS"]];

  return (
    <main style={S.main}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: 3, marginBottom: 28, color: "#dce6f0" }}>⚙ ADMIN PANEL</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {tabs.map(([t, l]) => (
            <button key={t} style={{ ...S.tabBtn, ...(tab === t ? S.tabOn : {}) }} onClick={() => setTab(t)}>{l}</button>
          ))}
        </div>

        {tab === "post" && (
          <div style={S.fbox}>
            {ok && <div style={S.succ}>✅ Posted live!</div>}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {["verdict", "prediction"].map(ft => (
                <button key={ft} onClick={() => { set("feed_type", ft); set("type", ft === "verdict" ? "GOAL REVIEW" : "SERIES PREDICTION"); }} style={{ flex: 1, padding: "10px", background: form.feed_type === ft ? (ft === "verdict" ? "#00d4ff0d" : "#a78bfa0d") : "transparent", border: `1px solid ${form.feed_type === ft ? (ft === "verdict" ? "#00d4ff44" : "#a78bfa44") : "#0f1820"}`, borderRadius: 8, color: form.feed_type === ft ? (ft === "verdict" ? "#00d4ff" : "#a78bfa") : "#3a5060", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 2, cursor: "pointer", transition: "all .15s" }}>
                  {ft === "verdict" ? "🔴 VERDICT" : "🔮 PREDICTION"}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FG label="TYPE">
                <select style={S.sel} value={form.type} onChange={e => set("type", e.target.value)}>
                  {(form.feed_type === "verdict" ? VERDICT_TYPES : PREDICTION_TYPES).map(t => <option key={t}>{t}</option>)}
                </select>
              </FG>
              <FG label="GAME / DATE"><input style={S.inp} placeholder="e.g. Oilers vs Flames · Apr 27" value={form.game} onChange={e => set("game", e.target.value)} /></FG>
            </div>
            <FG label="HEADLINE *"><input style={S.inp} placeholder="e.g. Was that a clean hit?" value={form.title} onChange={e => set("title", e.target.value)} /></FG>
            <FG label="DESCRIPTION *"><textarea style={{ ...S.inp, minHeight: 100, resize: "vertical", lineHeight: 1.6 }} placeholder="Describe what happened…" value={form.description} onChange={e => set("description", e.target.value)} /></FG>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FG label="OPTION A *"><input style={S.inp} placeholder="e.g. GOOD GOAL" value={form.option_a} onChange={e => set("option_a", e.target.value)} /></FG>
              <FG label="OPTION B *"><input style={S.inp} placeholder="e.g. NO GOAL" value={form.option_b} onChange={e => set("option_b", e.target.value)} /></FG>
            </div>
            <FG label={form.feed_type === "prediction" ? "UPCOMING EVENT *" : "OFFICIAL CALL *"}>
              <input style={S.inp} placeholder={form.feed_type === "prediction" ? "e.g. Series begins May 2 · 7:00 PM ET" : "e.g. Goal stands after review"} value={form.official_call} onChange={e => set("official_call", e.target.value)} />
            </FG>
            {form.feed_type === "prediction" && (
              <FG label="GAME DATE (shown on card)">
                <input style={S.inp} placeholder="e.g. May 2, 2026" value={form.game_date || ""} onChange={e => set("game_date", e.target.value)} />
              </FG>
            )}
            <div style={{ marginBottom: 22 }}>
              <BadgePicker value={form.badge} onChange={v => set("badge", v)} />
            </div>
            <button style={{ ...S.subBtn, opacity: busy ? 0.6 : 1 }} onClick={post} disabled={busy}>{busy ? "POSTING…" : `POST ${form.feed_type === "prediction" ? "PREDICTION" : "VERDICT"}`}</button>
          </div>
        )}

        {tab === "manage" && (
          <div style={{ background: "#0c1420", border: "1px solid #111828", borderRadius: 14, overflow: "hidden" }}>
            {items.length === 0
              ? <p style={{ color: "#334", textAlign: "center", padding: 40 }}>No items yet.</p>
              : items.map(c => (
                <div key={c.id} style={{ borderBottom: "1px solid #0d1620" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: c.feed_type === "prediction" ? "#a78bfa" : "#00d4ff" }}>{c.type}</span>
                        <span style={{ fontSize: 10, color: c.feed_type === "prediction" ? "#6040a0" : "#2a5060", background: c.feed_type === "prediction" ? "#a78bfa11" : "#00d4ff11", border: `1px solid ${c.feed_type === "prediction" ? "#a78bfa22" : "#00d4ff22"}`, padding: "1px 6px", borderRadius: 3 }}>{c.feed_type === "prediction" ? "PREDICTION" : "VERDICT"}</span>
                        {(() => { const b = getBadge(c); return b.value !== "none" ? <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: b.color, background: b.bg, border: `1px solid ${b.border}`, padding: "1px 7px", borderRadius: 3 }}>{b.label}</span> : null; })()}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#dce6f0", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                      <div style={{ fontSize: 13, color: "#3a5060" }}>{c.option_a}: {lv?.[c.id]?.[0] ?? c.votes_a ?? 0} | {c.option_b}: {lv?.[c.id]?.[1] ?? c.votes_b ?? 0}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {saveOk === c.id && <span style={{ fontSize: 13, color: "#4ade80", alignSelf: "center" }}>✓ Saved</span>}
                      <button style={{ ...S.editBtn }} onClick={() => editingId === c.id ? cancelEdit() : startEdit(c)}>
                        {editingId === c.id ? "✕ Cancel" : "✏ Edit"}
                      </button>
                      <button style={S.delBtn} onClick={() => remove(c.id)}>🗑</button>
                    </div>
                  </div>
                  {editingId === c.id && (
                    <div className="edit-panel" style={{ background: "#070b12", borderTop: "1px solid #0f1a2a", padding: "20px 22px 24px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <FG label="TYPE">
                          <select style={S.sel} value={editForm.type || ""} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}>
                            {[...VERDICT_TYPES, ...PREDICTION_TYPES].map(t => <option key={t}>{t}</option>)}
                          </select>
                        </FG>
                        <FG label="GAME / DATE"><input style={S.inp} value={editForm.game || ""} onChange={e => setEditForm(p => ({ ...p, game: e.target.value }))} /></FG>
                      </div>
                      <FG label="HEADLINE"><input style={S.inp} value={editForm.title || ""} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} /></FG>
                      <FG label="DESCRIPTION"><textarea style={{ ...S.inp, minHeight: 80, resize: "vertical", lineHeight: 1.6 }} value={editForm.description || ""} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></FG>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <FG label="OPTION A"><input style={S.inp} value={editForm.option_a || ""} onChange={e => setEditForm(p => ({ ...p, option_a: e.target.value }))} /></FG>
                        <FG label="OPTION B"><input style={S.inp} value={editForm.option_b || ""} onChange={e => setEditForm(p => ({ ...p, option_b: e.target.value }))} /></FG>
                      </div>
                      <FG label="OFFICIAL CALL / UPCOMING"><input style={S.inp} value={editForm.official_call || ""} onChange={e => setEditForm(p => ({ ...p, official_call: e.target.value }))} /></FG>
                      {editForm.feed_type === "prediction" && (
                        <FG label="GAME DATE"><input style={S.inp} value={editForm.game_date || ""} onChange={e => setEditForm(p => ({ ...p, game_date: e.target.value }))} /></FG>
                      )}
                      <div style={{ marginBottom: 18 }}>
                        <BadgePicker value={editForm.badge || (editForm.hot ? "hot" : "none")} onChange={v => setEditForm(p => ({ ...p, badge: v }))} />
                      </div>
                      <button style={{ ...S.subBtn, opacity: busy ? 0.6 : 1 }} onClick={saveEdit} disabled={busy}>{busy ? "SAVING…" : "SAVE CHANGES"}</button>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {tab === "forum_post" && (
          <div style={S.fbox}>
            {artOk && <div style={S.succ}>✅ Article published to the Forum!</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FG label="CATEGORY"><select style={S.sel} value={artForm.category} onChange={e => setArt("category", e.target.value)}>{ARTICLE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></FG>
              <FG label="AUTHOR"><input style={S.inp} placeholder="e.g. FanVerdict Staff" value={artForm.author} onChange={e => setArt("author", e.target.value)} /></FG>
            </div>
            <FG label="TITLE *"><input style={S.inp} placeholder="e.g. The Call That Ended a Dynasty" value={artForm.title} onChange={e => setArt("title", e.target.value)} /></FG>
            <FG label="EXCERPT *"><textarea style={{ ...S.inp, minHeight: 100, resize: "vertical", lineHeight: 1.6 }} placeholder="2-3 hook sentences. AI writes the full body automatically." value={artForm.excerpt} onChange={e => setArt("excerpt", e.target.value)} /></FG>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FG label="READ TIME"><input style={S.inp} placeholder="5 min read" value={artForm.read_time} onChange={e => setArt("read_time", e.target.value)} /></FG>
              <FG label="PHOTO URL"><input style={S.inp} placeholder="https://images.unsplash.com/..." value={artForm.photo} onChange={e => setArt("photo", e.target.value)} /></FG>
            </div>
            <div style={{ marginBottom: 18 }}>
              <BadgePicker value={artForm.badge} onChange={v => setArt("badge", v)} />
            </div>
            <div style={{ background: "#070b12", border: "1px solid #0f1825", borderRadius: 8, padding: "11px 14px", marginBottom: 18, fontSize: 14, color: "#3a5060", letterSpacing: 0.3 }}>
              💡 AI writes the full article body automatically when readers open it.
            </div>
            <button style={{ ...S.subBtn, opacity: busy ? 0.6 : 1 }} onClick={postArticle} disabled={busy}>{busy ? "PUBLISHING…" : "PUBLISH ARTICLE"}</button>
          </div>
        )}

        {tab === "forum_manage" && (
          <div style={{ background: "#0c1420", border: "1px solid #111828", borderRadius: 14, overflow: "hidden" }}>
            {articles.length === 0
              ? <p style={{ color: "#334", textAlign: "center", padding: 40 }}>No articles yet.</p>
              : articles.map(a => (
                <div key={a.id} style={{ borderBottom: "1px solid #0d1620" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: CAT_COLORS[a.category] || "#00d4ff" }}>{a.category}</span>
                        {(() => { const b = getBadge(a); return b.value !== "none" ? <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: b.color, background: b.bg, border: `1px solid ${b.border}`, padding: "1px 7px", borderRadius: 3 }}>{b.label}</span> : null; })()}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#dce6f0", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                      <div style={{ fontSize: 13, color: "#3a5060" }}>{a.author} · {a.date}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {saveOk === a.id && <span style={{ fontSize: 13, color: "#4ade80", alignSelf: "center" }}>✓ Saved</span>}
                      <button style={S.editBtn} onClick={() => editingArt === a.id ? cancelEditArt() : startEditArt(a)}>
                        {editingArt === a.id ? "✕ Cancel" : "✏ Edit"}
                      </button>
                      <button style={S.delBtn} onClick={() => removeArticle(a.id)}>🗑</button>
                    </div>
                  </div>
                  {editingArt === a.id && (
                    <div className="edit-panel" style={{ background: "#070b12", borderTop: "1px solid #0f1a2a", padding: "20px 22px 24px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <FG label="CATEGORY">
                          <select style={S.sel} value={editArtForm.category || ""} onChange={e => setEditArtForm(p => ({ ...p, category: e.target.value }))}>
                            {ARTICLE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </FG>
                        <FG label="AUTHOR"><input style={S.inp} value={editArtForm.author || ""} onChange={e => setEditArtForm(p => ({ ...p, author: e.target.value }))} /></FG>
                      </div>
                      <FG label="TITLE"><input style={S.inp} value={editArtForm.title || ""} onChange={e => setEditArtForm(p => ({ ...p, title: e.target.value }))} /></FG>
                      <FG label="EXCERPT"><textarea style={{ ...S.inp, minHeight: 80, resize: "vertical", lineHeight: 1.6 }} value={editArtForm.excerpt || ""} onChange={e => setEditArtForm(p => ({ ...p, excerpt: e.target.value }))} /></FG>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <FG label="READ TIME"><input style={S.inp} value={editArtForm.read_time || ""} onChange={e => setEditArtForm(p => ({ ...p, read_time: e.target.value }))} /></FG>
                        <FG label="PHOTO URL"><input style={S.inp} value={editArtForm.photo || ""} onChange={e => setEditArtForm(p => ({ ...p, photo: e.target.value }))} /></FG>
                      </div>
                      <div style={{ marginBottom: 18 }}>
                        <BadgePicker value={editArtForm.badge || (editArtForm.hot ? "hot" : "none")} onChange={v => setEditArtForm(p => ({ ...p, badge: v }))} />
                      </div>
                      <button style={{ ...S.subBtn, opacity: busy ? 0.6 : 1 }} onClick={saveEditArt} disabled={busy}>{busy ? "SAVING…" : "SAVE CHANGES"}</button>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {tab === "parlay_post" && (
          <div style={S.fbox}>
            {parOk && <div style={S.succ}>✅ Parlay posted to the board!</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FG label="PARLAY LABEL *"><input style={S.inp} placeholder="e.g. GAME 7 CHAOS PARLAY" value={parForm.label} onChange={e => setPar("label", e.target.value)} /></FG>
              <FG label="ODDS *"><input style={S.inp} placeholder="e.g. +1840 or -110" value={parForm.odds} onChange={e => setPar("odds", e.target.value)} /></FG>
            </div>
            <FG label="DESCRIPTION *"><textarea style={{ ...S.inp, minHeight: 80, resize: "vertical", lineHeight: 1.6 }} placeholder="Short hook for the parlay…" value={parForm.description} onChange={e => setPar("description", e.target.value)} /></FG>
            <FG label="PAYOUT *"><input style={S.inp} placeholder="e.g. $100 → $1,940" value={parForm.payout} onChange={e => setPar("payout", e.target.value)} /></FG>
            <div style={{ marginBottom: 22 }}>
              <BadgePicker value={parForm.badge} onChange={v => setPar("badge", v)} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2.5, color: "#1e3040", marginBottom: 14 }}>PICKS (min 2)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {parForm.picks.map((pick, idx) => (
                <div key={idx} style={{ background: "#070b12", border: "1px solid #0f1820", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: "#ffd700" }}>LEG {idx + 1}</span>
                    {parForm.picks.length > 2 && (
                      <button onClick={() => removePick(idx)} style={{ background: "transparent", border: "1px solid #ff1a1a22", color: "#cc3333", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 5, cursor: "pointer" }}>✕ Remove</button>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <FG label="GAME"><input style={S.inp} placeholder="e.g. Oilers vs Canucks" value={pick.game} onChange={e => updatePick(idx, "game", e.target.value)} /></FG>
                    <FG label="SPORT"><select style={S.sel} value={pick.sport} onChange={e => updatePick(idx, "sport", e.target.value)}>{SPORT_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></FG>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                    <FG label="BET / SELECTION"><input style={S.inp} placeholder="e.g. Oilers ML (Game 7)" value={pick.bet} onChange={e => updatePick(idx, "bet", e.target.value)} /></FG>
                    <FG label="LINE"><input style={{ ...S.inp, width: 90 }} placeholder="-118" value={pick.line} onChange={e => updatePick(idx, "line", e.target.value)} /></FG>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addPick} style={{ width: "100%", padding: "10px", background: "transparent", border: "1px dashed #1e3040", borderRadius: 8, color: "#3a5060", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 1, cursor: "pointer", marginBottom: 22, transition: "all .15s" }}>+ ADD LEG</button>
            <button style={{ ...S.subBtn, background: "linear-gradient(135deg,#9a7a00,#c09800)", opacity: busy ? 0.6 : 1 }} onClick={postParlay} disabled={busy}>{busy ? "POSTING…" : "POST PARLAY"}</button>
          </div>
        )}

        {tab === "parlay_manage" && (
          <div style={{ background: "#0c1420", border: "1px solid #111828", borderRadius: 14, overflow: "hidden" }}>
            {parlays.length === 0
              ? <p style={{ color: "#334", textAlign: "center", padding: 40 }}>No parlays yet.</p>
              : parlays.map(p => (
                <div key={p.id} style={{ borderBottom: "1px solid #0d1620" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#ffd700" }}>💰 {p.legs}-LEG</span>
                        {(() => { const b = getBadge(p); return b.value !== "none" ? <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: b.color, background: b.bg, border: `1px solid ${b.border}`, padding: "1px 7px", borderRadius: 3 }}>{b.label}</span> : null; })()}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#dce6f0", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label}</div>
                      <div style={{ fontSize: 13, color: "#3a5060" }}>{p.odds} · {p.payout}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {saveOk === p.id && <span style={{ fontSize: 13, color: "#4ade80", alignSelf: "center" }}>✓ Saved</span>}
                      <button style={S.editBtn} onClick={() => editingPar === p.id ? cancelEditPar() : startEditPar(p)}>
                        {editingPar === p.id ? "✕ Cancel" : "✏ Edit"}
                      </button>
                      <button style={S.delBtn} onClick={() => removeParlay(p.id)}>🗑</button>
                    </div>
                  </div>
                  {editingPar === p.id && (
                    <div className="edit-panel" style={{ background: "#070b12", borderTop: "1px solid #0f1a2a", padding: "20px 22px 24px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <FG label="PARLAY LABEL"><input style={S.inp} value={editParForm.label || ""} onChange={e => setEditParForm(f => ({ ...f, label: e.target.value }))} /></FG>
                        <FG label="ODDS"><input style={S.inp} value={editParForm.odds || ""} onChange={e => setEditParForm(f => ({ ...f, odds: e.target.value }))} /></FG>
                      </div>
                      <FG label="DESCRIPTION"><textarea style={{ ...S.inp, minHeight: 70, resize: "vertical", lineHeight: 1.6 }} value={editParForm.description || ""} onChange={e => setEditParForm(f => ({ ...f, description: e.target.value }))} /></FG>
                      <FG label="PAYOUT"><input style={S.inp} value={editParForm.payout || ""} onChange={e => setEditParForm(f => ({ ...f, payout: e.target.value }))} /></FG>
                      <div style={{ marginBottom: 18 }}>
                        <BadgePicker value={editParForm.badge || (editParForm.hot ? "hot" : "none")} onChange={v => setEditParForm(f => ({ ...f, badge: v }))} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2.5, color: "#1e3040", marginBottom: 12 }}>PICKS</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                        {(editParForm.picks || []).map((pick, idx) => (
                          <div key={idx} style={{ background: "#0a0f18", border: "1px solid #111820", borderRadius: 9, padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#ffd700" }}>LEG {idx + 1}</span>
                              {(editParForm.picks || []).length > 2 && (
                                <button onClick={() => removeEditPick(idx)} style={{ background: "transparent", border: "1px solid #ff1a1a22", color: "#cc3333", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 5, cursor: "pointer" }}>✕</button>
                              )}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                              <FG label="GAME"><input style={S.inp} value={pick.game || ""} onChange={e => updateEditPick(idx, "game", e.target.value)} /></FG>
                              <FG label="SPORT"><select style={S.sel} value={pick.sport || "NHL"} onChange={e => updateEditPick(idx, "sport", e.target.value)}>{SPORT_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></FG>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                              <FG label="BET"><input style={S.inp} value={pick.bet || ""} onChange={e => updateEditPick(idx, "bet", e.target.value)} /></FG>
                              <FG label="LINE"><input style={{ ...S.inp, width: 85 }} value={pick.line || ""} onChange={e => updateEditPick(idx, "line", e.target.value)} /></FG>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={addEditPick} style={{ width: "100%", padding: "9px", background: "transparent", border: "1px dashed #1e3040", borderRadius: 7, color: "#3a5060", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer", marginBottom: 18 }}>+ ADD LEG</button>
                      <button style={{ ...S.subBtn, background: "linear-gradient(135deg,#9a7a00,#c09800)", opacity: busy ? 0.6 : 1 }} onClick={saveEditPar} disabled={busy}>{busy ? "SAVING…" : "SAVE CHANGES"}</button>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}
      </div>
    </main>
  );
}

const FG = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: 2, color: "#243040", marginBottom: 7 }}>{label}</label>
    {children}
  </div>
);

const S = {
  root:      { minHeight: "100vh", background: "#07090d", color: "#dce6f0", fontFamily: "'Barlow Condensed',sans-serif" },
  hdr:       { background: "#080c13", borderBottom: "1px solid #0f1820", position: "sticky", top: 0, zIndex: 100 },
  hdrI:      { maxWidth: 1100, margin: "0 auto", padding: "13px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo:      { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  logoIcon:  { fontSize: 20 },
  logoT:     { fontSize: 21, fontWeight: 900, letterSpacing: 3, color: "#dce6f0" },
  acc:       { color: "#00d4ff" },
  nav:       { display: "flex", gap: 4, alignItems: "center" },
  live:      { fontSize: 12, fontWeight: 800, letterSpacing: 2, color: "#5a6070", display: "flex", alignItems: "center", gap: 5 },
  main:      { maxWidth: 1100, margin: "0 auto", padding: "44px 24px 80px" },
  hero:      { textAlign: "center", marginBottom: 44, paddingTop: 12 },
  heroPill:  { display: "inline-block", fontSize: 14, fontWeight: 800, letterSpacing: 2.5, color: "#3a6070", background: "#0c1820", border: "1px solid #0f2030", borderRadius: 20, padding: "5px 14px", marginBottom: 18 },
  heroT:     { fontSize: "clamp(52px,10vw,100px)", fontWeight: 900, letterSpacing: 4, margin: "0 0 10px", background: "linear-gradient(135deg,#e8f0f8 20%,#00d4ff 80%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 },
  heroS:     { fontSize: 21, color: "#2a4050", letterSpacing: 2, marginTop: 6 },
  ldg:       { textAlign: "center", padding: 80, color: "#3a5060", fontSize: 18, letterSpacing: 2 },
  grid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 22 },
  card:      { background: "#0b1018", border: "1px solid #111820", borderRadius: 16, padding: "24px 26px", position: "relative", overflow: "hidden" },
  // ── FIXED: meta is now flex with space-between so badge aligns to same row as type tag ──
  meta:      { display: "flex", alignItems: "center", gap: 10, marginBottom: 13 },
  tag:       { fontSize: 11, fontWeight: 800, letterSpacing: 2, padding: "3px 10px", borderRadius: 4, border: "1px solid", whiteSpace: "nowrap" },
  game:      { fontSize: 13, color: "#3a5060", letterSpacing: 0.5 },
  ctitle:    { fontSize: 21, fontWeight: 800, margin: "0 0 10px", lineHeight: 1.2, color: "#d0dce8" },
  cdesc:     { fontSize: 15, color: "#4a6070", lineHeight: 1.75, margin: "0 0 16px" },
  offBox:    { background: "#080d14", border: "1px solid #0f1820", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, display: "flex", gap: 8, alignItems: "baseline" },
  offLbl:    { fontWeight: 800, color: "#1e3040", letterSpacing: 1.5, fontSize: 11, flexShrink: 0 },
  offTxt:    { fontSize: 14, color: "#6a8090", lineHeight: 1.4 },
  vrow:      { display: "flex", gap: 10, marginBottom: 14 },
  vb:        { flex: 1, padding: "14px 8px", borderRadius: 8, border: "1px solid", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 0.5, cursor: "pointer", transition: "all .2s" },
  vba:       { background: "#00d4ff0d", borderColor: "#00d4ff33", color: "#00d4ff" },
  vbb:       { background: "#ff4d4d0d", borderColor: "#ff4d4d33", color: "#ff5555" },
  vbPredA:   { background: "#a78bfa0d", borderColor: "#a78bfa44", color: "#a78bfa" },
  vbPredB:   { background: "#7c3aed0d", borderColor: "#7c3aed44", color: "#9c64fa" },
  res:       { marginBottom: 14 },
  rrow:      { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  rlbl:      { width: 120, fontSize: 14, fontWeight: 700, flexShrink: 0, lineHeight: 1.2, transition: "color .2s" },
  btrack:    { flex: 1, height: 7, background: "#0a0f18", borderRadius: 4, overflow: "hidden" },
  rpct:      { width: 38, textAlign: "right", fontSize: 14, fontWeight: 800, flexShrink: 0, transition: "color .2s" },
  vtot:      { fontSize: 13, color: "#2a3e4e", letterSpacing: 1, textAlign: "right", marginTop: 6 },
  aiBtn:     { width: "100%", marginTop: 12, padding: "12px 16px", background: "#0a0f18", border: "1px solid #141e30", borderRadius: 8, color: "#4060a0", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 1, cursor: "pointer", transition: "all .2s", display: "flex", alignItems: "center", justifyContent: "center" },
  aiBox:     { marginTop: 4, background: "#080d16", border: "1px solid #0f1830", borderRadius: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: "18px 26px 22px" },
  aiHdr:     { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 },
  aiIcon:    { fontSize: 17 },
  aiLbl:     { fontSize: 12, fontWeight: 800, letterSpacing: 3, color: "#3a4870" },
  aiWait:    { color: "#3a4870", fontSize: 15, fontStyle: "italic", margin: 0 },
  aiTxt:     { fontSize: 16, color: "#8a9eb0", lineHeight: 1.8, margin: 0 },
  aiCallBtn: { width: "100%", padding: 12, background: "#0a0f18", border: "1px solid #141e30", borderRadius: 8, color: "#4060a0", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 1, cursor: "pointer" },
  back:      { background: "none", border: "1px solid #0f1820", color: "#3a5060", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 1, padding: "7px 16px", borderRadius: 6, cursor: "pointer", marginBottom: 28, transition: "all .2s" },
  authBox:   { maxWidth: 360, margin: "80px auto", background: "#0b1018", border: "1px solid #111820", borderRadius: 18, padding: 40, textAlign: "center" },
  modal:     { background: "#0b1018", border: "1px solid #141e2e", borderRadius: 18, padding: "36px 32px", width: "100%", maxWidth: 400, position: "relative" },
  modalClose: { position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "#2a3a4a", fontSize: 18, cursor: "pointer", padding: 4 },
  googleBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "12px", background: "#fff", borderRadius: 9, color: "#111", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: 0.5, cursor: "pointer", textDecoration: "none", marginBottom: 18, transition: "opacity .15s" },
  divider:   { display: "flex", alignItems: "center", gap: 12, margin: "0 0 18px" },
  divTxt:    { color: "#1e2e3e", fontSize: 13, letterSpacing: 1 },
  tabBtn:    { padding: "9px 18px", background: "transparent", border: "1px solid #0f1820", borderRadius: 8, color: "#3a5060", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, cursor: "pointer", transition: "all .15s" },
  tabOn:     { background: "#00d4ff0d", borderColor: "#00d4ff33", color: "#00d4ff" },
  fbox:      { background: "#0b1018", border: "1px solid #111820", borderRadius: 14, padding: 28 },
  inp:       { width: "100%", background: "#070b12", border: "1px solid #0f1820", borderRadius: 8, color: "#b0c4d4", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, padding: "11px 14px", boxSizing: "border-box", transition: "border-color .15s" },
  sel:       { width: "100%", background: "#070b12", border: "1px solid #0f1820", borderRadius: 8, color: "#b0c4d4", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, padding: "11px 14px", cursor: "pointer" },
  subBtn:    { width: "100%", padding: 14, background: "linear-gradient(135deg,#0099bb,#007a99)", border: "none", borderRadius: 9, color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 900, letterSpacing: 3, cursor: "pointer", transition: "opacity .15s" },
  succ:      { background: "#00ff8811", border: "1px solid #00ff8833", color: "#00cc66", borderRadius: 8, padding: "11px 16px", marginBottom: 20, fontSize: 14, fontWeight: 700, letterSpacing: 0.5 },
  editBtn:   { background: "transparent", border: "1px solid #00d4ff22", color: "#00d4ff77", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, padding: "6px 12px", borderRadius: 6, cursor: "pointer", flexShrink: 0, transition: "all .15s" },
  delBtn:    { background: "transparent", border: "1px solid #ff1a1a22", color: "#cc3333", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, padding: "6px 12px", borderRadius: 6, cursor: "pointer", flexShrink: 0, transition: "all .15s" },
  foot:      { textAlign: "center", padding: "28px 20px", fontSize: 12, letterSpacing: 2, borderTop: "1px solid #0a0f18" },
  statBox:   { background: "#080d14", border: "1px solid #0f1820", borderRadius: 12, padding: "18px 28px", textAlign: "center", flex: 1 },
  statNum:   { fontSize: 34, fontWeight: 900, color: "#00d4ff", letterSpacing: 2, lineHeight: 1 },
  statLbl:   { fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#1e3040", marginTop: 6 },
};
