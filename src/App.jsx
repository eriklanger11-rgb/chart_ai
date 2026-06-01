import { useState, useRef, useCallback, useEffect } from "react";

const SUPABASE_URL = "https://sxuvjwkxvwjixuetzsiu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dXZqd2t4dndqaXh1ZXR6c2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTgxMDYsImV4cCI6MjA5NTczNDEwNn0.AGq8JmfOvQkw3lRFwYR-J7F9BOu3bO1pwaez21Dl30c";
const OWNER_EMAIL = "erik.langer11@icloud.com";

const PLANS = [
  { id: "free", name: "Free", price: "0 €", analyses: "1 / Tag", color: "#555", features: ["1 Analyse pro Tag", "Standard-KI", "Werbung"] },
  { id: "basic", name: "Basic", price: "24,99 €", analyses: "5 / Tag", color: "#00BFFF", features: ["5 Analysen pro Tag", "Schnellere Analyse", "Keine Werbung"] },
  { id: "pro", name: "Pro", price: "49,99 €", analyses: "20 / Tag", color: "#00FF88", features: ["20 Analysen pro Tag", "Erweiterte KI", "Höhere Genauigkeit", "Priorisierte Verarbeitung"], popular: true },
  { id: "elite", name: "Elite", price: "99,99 €", analyses: "50 / Tag", color: "#FFD700", features: ["50 Analysen pro Tag", "Schnellste Verarbeitung", "Premium-Signale", "Neue Funktionen zuerst"] },
];

// Supabase fetch helper
async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      ...(opts.headers || {}),
    },
  });
  return res.json();
}

async function sbSignUp(email, password) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password, data: {} }),
    });
    const json = await res.json();
    return json;
  } catch(e) {
    return { error: { message: "Netzwerkfehler. Bitte versuche es erneut." } };
  }
}

async function sbSignIn(email, password) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    return json;
  } catch(e) {
    return { error: { message: "Netzwerkfehler. Bitte versuche es erneut." } };
  }
}

async function sbSignOut(token) {
  return sbFetch("/logout", { method: "POST", headers: { "Authorization": `Bearer ${token}` } });
}

async function sbGetUser(token) {
  return sbFetch("/user", { headers: { "Authorization": `Bearer ${token}` } });
}

function isWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

function parseSignal(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const get = (key) => {
    const line = lines.find(l => l.toUpperCase().startsWith(key.toUpperCase()));
    return line ? line.replace(/^[^:：]+[:：]\s*/i, "").trim() : null;
  };
  return {
    signal: get("SIGNAL") || "BUY",
    entry: get("ENTRY"),
    sl: get("SL") || get("STOP LOSS"),
    tp: get("TP") || get("TAKE PROFIT"),
    note: get("KURZANALYSE") || lines[lines.length - 1] || "",
  };
}

const S = {
  root: { background: "#0A0A0A", minHeight: "100vh", fontFamily: "'Courier New', monospace", color: "#e0e0e0" },
  nav: { background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 },
  logo: { fontSize: 16, fontWeight: 700, letterSpacing: 5, color: "#00BFFF", cursor: "pointer" },
  logoSpan: { color: "#00FF88" },
  btn: (col = "#00BFFF", ghost = false) => ({
    fontSize: 11, padding: "7px 16px", borderRadius: 4,
    border: `1px solid ${col}55`, background: ghost ? "transparent" : `${col}15`,
    color: col, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", fontFamily: "inherit",
  }),
  // AUTH
  authWrap: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "85vh", padding: "0 20px" },
  authCard: { background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10, padding: "32px 28px", width: "100%", maxWidth: 380 },
  authTitle: { fontSize: 20, fontWeight: 900, letterSpacing: 4, color: "#fff", textTransform: "uppercase", marginBottom: 4, textAlign: "center" },
  authSub: { fontSize: 10, color: "#333", letterSpacing: 2, textAlign: "center", marginBottom: 28, textTransform: "uppercase" },
  authLabel: { fontSize: 10, color: "#444", letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 6 },
  authInput: { width: "100%", background: "#111", border: "1px solid #222", borderRadius: 4, padding: "10px 12px", color: "#bbb", fontSize: 12, fontFamily: "inherit", marginBottom: 14, boxSizing: "border-box" },
  authBtn: (loading) => ({
    width: "100%", padding: "11px", fontSize: 12, fontWeight: 700, letterSpacing: 3,
    textTransform: "uppercase", background: loading ? "#111" : "#00BFFF15",
    border: "1px solid #00BFFF55", borderRadius: 6, color: loading ? "#333" : "#00BFFF",
    cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", marginTop: 4,
  }),
  authSwitch: { fontSize: 11, color: "#333", textAlign: "center", marginTop: 16 },
  authLink: { color: "#00BFFF", cursor: "pointer", textDecoration: "underline" },
  authErr: { background: "#ff446610", border: "1px solid #ff446633", borderRadius: 4, padding: "8px 12px", fontSize: 11, color: "#ff4466", marginBottom: 14 },
  authOk: { background: "#00FF8810", border: "1px solid #00FF8833", borderRadius: 4, padding: "8px 12px", fontSize: 11, color: "#00FF88", marginBottom: 14 },
  // APP
  tabBar: { background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", display: "flex" },
  tab: (active) => ({
    padding: "12px 16px", fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
    cursor: "pointer", color: active ? "#00BFFF" : "#444",
    borderBottom: active ? "2px solid #00BFFF" : "2px solid transparent",
    background: "transparent", border: "none", borderBottom: active ? "2px solid #00BFFF" : "2px solid transparent",
    fontFamily: "inherit",
  }),
  content: { flex: 1, padding: "24px 20px", maxWidth: 680, margin: "0 auto", width: "100%", boxSizing: "border-box" },
  dropzone: (drag, hasImg) => ({
    border: `2px dashed ${drag ? "#00FF88" : hasImg ? "#00BFFF55" : "#1e1e1e"}`,
    borderRadius: 8, padding: hasImg ? 0 : "48px 24px",
    textAlign: "center", cursor: "pointer", background: drag ? "#00FF8808" : "#0d0d0d",
    overflow: "hidden",
  }),
  analyseBtn: (disabled) => ({
    width: "100%", marginTop: 14, padding: "13px", fontSize: 13, fontWeight: 700,
    letterSpacing: 3, textTransform: "uppercase",
    background: disabled ? "#111" : "linear-gradient(135deg,#00BFFF22,#00FF8811)",
    border: `1px solid ${disabled ? "#1a1a1a" : "#00BFFF55"}`,
    borderRadius: 6, color: disabled ? "#333" : "#00BFFF",
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
  }),
  resultCard: { marginTop: 18, background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 8, overflow: "hidden" },
  planCard: (col, pop) => ({
    background: "#0d0d0d", border: `1px solid ${pop ? col + "55" : "#1a1a1a"}`,
    borderRadius: 8, padding: 16, position: "relative",
  }),
};

export default function ChartAI() {
  // Auth state
  const [authPage, setAuthPage] = useState("landing"); // landing | login | signup | app
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [session, setSession] = useState(null); // { access_token, user }

  // App state
  const [freeUsed, setFreeUsed] = useState(false);
  const weekend = isWeekend();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [drag, setDrag] = useState(false);
  const [activeTab, setActiveTab] = useState("analyse");
  const fileRef = useRef();

  const userEmail = session?.user?.email || "";
  const isOwner = userEmail === OWNER_EMAIL;
  const plan = isOwner ? "elite" : "free";

  // Restore session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ca_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.access_token) {
          setSession(parsed);
          setAuthPage("app");
        }
      }
    } catch(e) {}
  }, []);

  const saveSession = (s) => {
    setSession(s);
    try { localStorage.setItem("ca_session", JSON.stringify(s)); } catch(e) {}
  };

  const clearSession = () => {
    setSession(null);
    try { localStorage.removeItem("ca_session"); } catch(e) {}
  };

  // SIGN UP
  const handleSignUp = async () => {
    if (!authEmail || !authPassword) { setAuthError("Bitte E-Mail und Passwort eingeben."); return; }
    if (authPassword.length < 6) { setAuthError("Passwort muss mindestens 6 Zeichen haben."); return; }
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try {
      const data = await sbSignUp(authEmail, authPassword);
      setAuthLoading(false);
      if (data?.error) {
        const msg = data.error.message || "";
        if (msg.toLowerCase().includes("already")) {
          setAuthError("Diese E-Mail ist bereits registriert. Bitte einloggen.");
        } else {
          setAuthError(msg || "Registrierung fehlgeschlagen. Bitte erneut versuchen.");
        }
        return;
      }
      // If email confirmation is disabled in Supabase, user gets access_token directly
      if (data?.access_token) {
        saveSession({ access_token: data.access_token, user: data.user });
        setAuthPage("app");
        return;
      }
      setAuthSuccess("Fast geschafft! Bitte bestätige deine E-Mail und logge dich dann ein.");
      setAuthPage("login");
    } catch(e) {
      setAuthLoading(false);
      setAuthError("Verbindungsfehler. Bitte erneut versuchen.");
    }
  };

  // SIGN IN
  const handleSignIn = async () => {
    if (!authEmail || !authPassword) { setAuthError("Bitte E-Mail und Passwort eingeben."); return; }
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    const data = await sbSignIn(authEmail, authPassword);
    setAuthLoading(false);
    if (data.error) { setAuthError(data.error.message || "Login fehlgeschlagen. Passwort oder E-Mail falsch."); return; }
    saveSession({ access_token: data.access_token, user: data.user });
    setAuthPage("app");
  };

  // SIGN OUT
  const handleSignOut = async () => {
    if (session?.access_token) await sbSignOut(session.access_token);
    clearSession();
    setAuthPage("landing");
    setHistory([]);
    setFreeUsed(false);
    setImage(null);
    setResult(null);
  };

  // FILE HANDLING
  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setImage({ base64: dataUrl.split(",")[1], dataUrl, name: file.name, type: file.type || "image/jpeg" });
      setResult(null); setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = (e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); };

  // ANALYSE
  const analyse = async () => {
    if (!image) return;
    if (!isOwner && plan === "free" && freeUsed) { setActiveTab("plans"); return; }
    setLoading(true); setResult(null); setError(null);
    try {
      const weekendNote = weekend
        ? `\n\nWICHTIG – WOCHENENDE: Heute ist Wochenende. Aktien- und Forex-Märkte sind geschlossen. Erkenne ob dieser Chart Krypto zeigt (Bitcoin, Ethereum, Solana, BNB, XRP usw.). Wenn JA: analysiere normal. Wenn NEIN: Antworte NUR mit: GESPERRT: Dieser Markt ist am Wochenende geschlossen.`
        : "";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Du bist Chart AI, ein professioneller Trading-Signal-Assistent. Analysiere den hochgeladenen Chart und antworte AUSSCHLIESSLICH in diesem Format:

SIGNAL: [BUY oder SELL]
ENTRY: [Kurs]
SL: [Stop Loss Kurs]
TP: [Take Profit Kurs]
KURZANALYSE: [1-2 Sätze, präzise, auf Deutsch.]${weekendNote}`,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: image.type, data: image.base64 } },
            { type: "text", text: "Analysiere diesen Chart." }
          ]}]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      if (!text) throw new Error("Keine Antwort.");
      if (text.toUpperCase().includes("GESPERRT")) {
        setError("🔒 Am Wochenende nur Krypto-Charts möglich. Aktien & Forex sind geschlossen.");
        setLoading(false); return;
      }
      const parsed = parseSignal(text);
      setResult(parsed);
      if (!isOwner && plan === "free") setFreeUsed(true);
      setHistory(prev => [{ id: Date.now(), signal: parsed.signal, entry: parsed.entry, sl: parsed.sl, tp: parsed.tp, note: parsed.note, time: "gerade eben", img: image.dataUrl }, ...prev]);
    } catch(e) { setError("Analyse fehlgeschlagen. Bitte erneut versuchen."); }
    setLoading(false);
  };

  // ---- LANDING ----
  if (authPage === "landing") return (
    <div style={S.root}>
      <nav style={S.nav}>
        <div style={S.logo}>CHART <span style={S.logoSpan}>AI</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.btn("#555", true)} onClick={() => { setAuthPage("login"); setAuthError(""); setAuthSuccess(""); }}>Login</button>
          <button style={S.btn("#00BFFF")} onClick={() => { setAuthPage("signup"); setAuthError(""); setAuthSuccess(""); }}>Registrieren</button>
        </div>
      </nav>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "85vh", textAlign: "center", padding: "0 20px", gap: 18 }}>
        <div style={{ fontSize: "clamp(40px,8vw,80px)", fontWeight: 900, letterSpacing: 12, color: "#fff", lineHeight: 1 }}>
          <span style={{ color: "#00BFFF" }}>CHART</span> <span style={{ color: "#00FF88" }}>AI</span>
        </div>
        <div style={{ fontSize: 13, color: "#444", letterSpacing: 6, textTransform: "uppercase" }}>Upload · Analyse · Trade</div>
        <p style={{ fontSize: 13, color: "#333", maxWidth: 420, lineHeight: 1.8 }}>
          Lade einen Chart-Screenshot hoch und erhalte in Sekunden ein klares BUY/SELL-Signal mit Entry, Stop Loss und Take Profit.
        </p>
        <button style={{ ...S.btn("#00BFFF"), padding: "13px 36px", fontSize: 13, letterSpacing: 3, marginTop: 8 }} onClick={() => { setAuthPage("signup"); setAuthError(""); }}>
          Kostenlos starten
        </button>
        <div style={{ display: "flex", gap: 28, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {PLANS.map(p => (
            <div key={p.id} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: p.color }}>{p.price}</div>
              <div style={{ fontSize: 9, color: "#2a2a2a", letterSpacing: 2, textTransform: "uppercase" }}>{p.name} · {p.analyses}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---- LOGIN ----
  if (authPage === "login") return (
    <div style={S.root}>
      <nav style={S.nav}>
        <div style={S.logo} onClick={() => setAuthPage("landing")}>CHART <span style={S.logoSpan}>AI</span></div>
      </nav>
      <div style={S.authWrap}>
        <div style={S.authCard}>
          <div style={S.authTitle}>Willkommen</div>
          <div style={S.authSub}>Einloggen</div>
          {authError && <div style={S.authErr}>{authError}</div>}
          {authSuccess && <div style={S.authOk}>{authSuccess}</div>}
          <label style={S.authLabel}>E-Mail</label>
          <input style={S.authInput} type="email" placeholder="deine@email.de" value={authEmail} onChange={e => setAuthEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignIn()} />
          <label style={S.authLabel}>Passwort</label>
          <input style={S.authInput} type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignIn()} />
          <button style={S.authBtn(authLoading)} onClick={handleSignIn} disabled={authLoading}>
            {authLoading ? "Einloggen..." : "⚡ Einloggen"}
          </button>
          <div style={S.authSwitch}>
            Noch kein Konto? <span style={S.authLink} onClick={() => { setAuthPage("signup"); setAuthError(""); setAuthSuccess(""); }}>Registrieren</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ---- SIGNUP ----
  if (authPage === "signup") return (
    <div style={S.root}>
      <nav style={S.nav}>
        <div style={S.logo} onClick={() => setAuthPage("landing")}>CHART <span style={S.logoSpan}>AI</span></div>
      </nav>
      <div style={S.authWrap}>
        <div style={S.authCard}>
          <div style={S.authTitle}>Konto erstellen</div>
          <div style={S.authSub}>Kostenlos · 1 Analyse pro Tag</div>
          {authError && <div style={S.authErr}>{authError}</div>}
          {authSuccess && <div style={S.authOk}>{authSuccess}</div>}
          <label style={S.authLabel}>E-Mail</label>
          <input style={S.authInput} type="email" placeholder="deine@email.de" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
          <label style={S.authLabel}>Passwort</label>
          <input style={S.authInput} type="password" placeholder="Min. 6 Zeichen" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
          <button style={S.authBtn(authLoading)} onClick={handleSignUp} disabled={authLoading}>
            {authLoading ? "Registrieren..." : "🚀 Konto erstellen"}
          </button>
          <div style={S.authSwitch}>
            Bereits registriert? <span style={S.authLink} onClick={() => { setAuthPage("login"); setAuthError(""); setAuthSuccess(""); }}>Einloggen</span>
          </div>
          <div style={{ fontSize: 9, color: "#1e1e1e", textAlign: "center", marginTop: 14 }}>
            Mit der Registrierung stimmst du den Nutzungsbedingungen zu. Keine Finanzberatung.
          </div>
        </div>
      </div>
    </div>
  );

  // ---- APP ----
  const isBuy = result?.signal?.toUpperCase().includes("BUY");

  return (
    <div style={S.root}>
      <nav style={S.nav}>
        <div style={S.logo} onClick={() => setAuthPage("landing")}>CHART <span style={S.logoSpan}>AI</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isOwner && <span style={{ fontSize: 10, color: "#FFD700", letterSpacing: 1 }}>👑 OWNER</span>}
          <span style={{ fontSize: 10, color: freeUsed && !isOwner ? "#ff4466" : "#00FF88", letterSpacing: 1 }}>
            {isOwner ? "∞ Unbegrenzt" : freeUsed ? "Limit erreicht" : "1 Analyse frei"}
          </span>
          <button style={S.btn("#555", true)} onClick={handleSignOut}>Abmelden</button>
          {!isOwner && <button style={S.btn("#00BFFF")} onClick={() => setActiveTab("plans")}>Upgrade</button>}
        </div>
      </nav>

      <div style={S.tabBar}>
        {[["analyse","Analyse"],["history","Verlauf"],["plans","Pläne"],["account","Konto"]].map(([id, label]) => (
          <button key={id} style={S.tab(activeTab === id)} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      <div style={S.content}>

        {activeTab === "analyse" && <>
          {weekend && (
            <div style={{ marginBottom: 14, padding: "10px 14px", background: "#FFD70010", border: "1px solid #FFD70033", borderRadius: 6, display: "flex", gap: 10, alignItems: "center" }}>
              <span>🔒</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#FFD700", letterSpacing: 1 }}>WOCHENENDE – NUR KRYPTO</div>
                <div style={{ fontSize: 10, color: "#665500" }}>Aktien & Forex geschlossen. Nur Krypto-Charts möglich.</div>
              </div>
            </div>
          )}

          <div style={S.dropzone(drag, !!image)} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={onDrop} onClick={()=>!image&&fileRef.current?.click()}>
            {image ? (
              <>
                <img src={image.dataUrl} alt="Chart" style={{ width: "100%", maxHeight: 260, objectFit: "contain", display: "block" }} />
                <div style={{ padding: "7px 12px", background: "#0d0d0d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#333" }}>{image.name}</span>
                  <button style={{ fontSize: 10, color: "#ff4466", background: "transparent", border: "none", cursor: "pointer" }} onClick={e=>{e.stopPropagation();setImage(null);setResult(null);}}>✕ Entfernen</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 32, opacity: 0.2 }}>📊</div>
                <div style={{ fontSize: 11, color: "#2a2a2a", letterSpacing: 2, textTransform: "uppercase", marginTop: 10 }}>Chart-Screenshot hier ablegen</div>
                <div style={{ fontSize: 10, color: "#1a1a1a", marginTop: 6 }}>oder klicken · PNG · JPG · TradingView · MT4 · Binance · Bybit</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e=>handleFile(e.target.files[0])} />

          {!isOwner && freeUsed ? (
            <div style={{ marginTop: 16, padding: 20, background: "#0d0d0d", border: "1px solid #FFD70033", borderRadius: 8, textAlign: "center" }}>
              <div style={{ color: "#FFD700", fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>⚡ Tages-Limit erreicht</div>
              <div style={{ color: "#555", fontSize: 12, marginBottom: 14 }}>Upgrade für mehr Analysen.</div>
              <button style={S.btn("#FFD700")} onClick={() => setActiveTab("plans")}>Jetzt upgraden →</button>
            </div>
          ) : (
            <button style={S.analyseBtn(!image || loading)} onClick={analyse} disabled={!image || loading}>
              {loading ? "⏳ KI analysiert..." : "⚡ Analyse starten"}
            </button>
          )}

          {loading && (
            <div style={{ marginTop: 18, padding: 20, background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 8, textAlign: "center" }}>
              <div style={{ color: "#00BFFF", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>KI analysiert Chart...</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                {[0,1,2,3].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#00BFFF", animation: `pulse 1.2s ${i*0.2}s infinite` }}></div>)}
              </div>
            </div>
          )}

          {error && <div style={{ marginTop: 14, padding: 12, background: "#ff446610", border: "1px solid #ff446633", borderRadius: 6, color: "#ff4466", fontSize: 12 }}>{error}</div>}

          {result && !loading && (
            <div style={S.resultCard}>
              <div style={{ background: isBuy ? "#00FF8812" : "#ff446612", borderBottom: `1px solid ${isBuy ? "#00FF8833" : "#ff446633"}`, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 4, color: isBuy ? "#00FF88" : "#ff4466" }}>{isBuy ? "🟢 BUY" : "🔴 SELL"}</div>
                <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, textTransform: "uppercase" }}>Signal generiert</div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[["Entry", result.entry, "#00BFFF"], ["Stop Loss", result.sl, "#ff4466"], ["Take Profit", result.tp, "#00FF88"]].map(([l, v, c]) => (
                    <div key={l} style={{ background: "#111", borderRadius: 6, padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v || "—"}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#111", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#888", lineHeight: 1.6, borderLeft: "2px solid #00BFFF44" }}>
                  <span style={{ fontSize: 9, color: "#00BFFF", letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 5 }}>KI-Analyse</span>
                  {result.note}
                </div>
                <div style={{ marginTop: 10, fontSize: 9, color: "#1e1e1e", textAlign: "center" }}>⚠ Keine Finanzberatung. Alle Signale basieren auf Wahrscheinlichkeiten.</div>
              </div>
            </div>
          )}
        </>}

        {activeTab === "history" && <>
          <div style={{ fontSize: 9, color: "#333", letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>Analysehistorie</div>
          {history.length === 0 && <div style={{ color: "#2a2a2a", fontSize: 12, textAlign: "center", marginTop: 40 }}>Noch keine Analysen in dieser Sitzung.</div>}
          {history.map(h => (
            <div key={h.id} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 8, padding: "12px 14px", marginBottom: 10, display: "flex", gap: 12, alignItems: "center" }}>
              {h.img ? <img src={h.img} style={{ width: 48, height: 38, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} alt="" /> : <div style={{ width: 48, height: 38, borderRadius: 4, background: "#111", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#222" }}>📊</div>}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#bbb" }}>Analyse</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: h.signal === "BUY" ? "#00FF88" : "#ff4466" }}>{h.signal === "BUY" ? "🟢 BUY" : "🔴 SELL"}</span>
                </div>
                <div style={{ fontSize: 11, color: "#444" }}>E: <span style={{ color: "#00BFFF" }}>{h.entry}</span> · SL: <span style={{ color: "#ff4466" }}>{h.sl}</span> · TP: <span style={{ color: "#00FF88" }}>{h.tp}</span></div>
                <div style={{ fontSize: 10, color: "#2a2a2a", marginTop: 2 }}>{h.time}</div>
              </div>
            </div>
          ))}
        </>}

        {activeTab === "plans" && <>
          <div style={{ fontSize: 9, color: "#333", letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>Abonnements</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {PLANS.map(p => (
              <div key={p.id} style={S.planCard(p.color, p.popular)}>
                {p.popular && <div style={{ position: "absolute", top: 10, right: 10, fontSize: 9, padding: "2px 7px", borderRadius: 3, background: "#00FF8815", color: "#00FF88", border: "1px solid #00FF8833", letterSpacing: 1 }}>BELIEBT</div>}
                <div style={{ fontSize: 13, fontWeight: 700, color: p.color, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{p.price}{p.id !== "free" && <span style={{ fontSize: 11, color: "#444" }}>/Mo</span>}</div>
                <div style={{ fontSize: 10, color: "#333", letterSpacing: 1, marginBottom: 10 }}>{p.analyses}</div>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {p.features.map((f, i) => <li key={i} style={{ fontSize: 11, color: "#555", padding: "2px 0", display: "flex", gap: 6 }}><span style={{ color: p.color }}>▸</span>{f}</li>)}
                </ul>
                <button style={{ marginTop: 12, width: "100%", padding: "8px", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", background: p.color + "15", border: `1px solid ${p.color}44`, borderRadius: 4, color: p.color, cursor: "pointer", fontFamily: "inherit" }}>
                  {p.id === "free" ? "Aktuell" : "Auswählen"}
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 10, color: "#2a2a2a", textAlign: "center" }}>Stripe · PayPal · Jederzeit kündbar</div>
        </>}

        {activeTab === "account" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 9, color: "#333", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>Konto</div>
            {isOwner && (
              <div style={{ padding: "10px 14px", background: "#FFD70010", border: "1px solid #FFD70033", borderRadius: 6, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 16 }}>👑</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#FFD700", letterSpacing: 1 }}>Owner Account</div>
                  <div style={{ fontSize: 10, color: "#665500" }}>Keine Limits · Alle Features · Unbegrenzte Analysen</div>
                </div>
              </div>
            )}
            {[["E-Mail", userEmail], ["Plan", isOwner ? "Owner (Unbegrenzt)" : "Free"], ["Analysen heute", isOwner ? "∞ Unbegrenzt" : freeUsed ? "1/1 genutzt" : "0/1 verfügbar"]].map(([k, v]) => (
              <div key={k} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 6, padding: "11px 14px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#444", letterSpacing: 1 }}>{k}</span>
                <span style={{ fontSize: 11, color: isOwner && k === "Plan" ? "#FFD700" : "#888" }}>{v}</span>
              </div>
            ))}
            {isOwner && (
              <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 6, padding: "11px 14px" }}>
                <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Owner E-Mail (in Code ändern)</div>
                <div style={{ fontSize: 11, color: "#2a2a2a", fontFamily: "monospace" }}>const OWNER_EMAIL = "{OWNER_EMAIL}"</div>
              </div>
            )}
            <button style={{ marginTop: 6, padding: "10px", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", background: "#ff446610", border: "1px solid #ff446633", borderRadius: 6, color: "#ff4466", cursor: "pointer", fontFamily: "inherit" }} onClick={handleSignOut}>
              Abmelden
            </button>
          </div>
        )}

      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.2}50%{opacity:1}}`}</style>
    </div>
  );
}
