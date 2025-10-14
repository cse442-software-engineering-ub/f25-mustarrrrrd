// src/ProfilePage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;

const YEARS = ["Freshman","Sophomore","Junior","Senior","Graduate Student","PhD Student","Faculty"];
const PRONOUNS = ["he/him","she/her","they/them","he/they","she/they","ze/zir","prefer not to say"];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState("");

  // Load profile via cookie session
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_ROOT}profile_get.php`, { credentials: "include" });
        if (!res.ok) { setProfile(null); return; }
        const data = await res.json();
        if (data?.ok) { setProfile(data.profile); setDraft(data.profile); }
      } finally { setLoading(false); }
    })();
  }, []);

  // Display name (no titles)
  const displayName = useMemo(() => {
    if (!profile) return "";
    return profile.preferred_name || profile.name || "";
  }, [profile]);

  // Dirty check
  const isDirty = useMemo(() => {
    if (!profile || !draft) return false;
    const keys = ["name","preferred_name","pronouns","academic_year","major","disabilities"];
    return keys.some(k => (draft[k] || "") !== (profile[k] || ""));
  }, [profile, draft]);

  async function save() {
    setMsg("");
    try {
      const { name, preferred_name, pronouns, academic_year, major, disabilities } = draft;
      const res = await fetch(`${API_ROOT}profile_update.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, preferred_name, pronouns, academic_year, major, disabilities }),
      });
      const data = await res.json();
      if (data?.ok) {
        setProfile(draft);
        setEditing(false);
        setMsg("Saved.");
        setTimeout(() => setMsg(""), 2000);
      } else {
        setMsg(data?.message || "Save failed.");
      }
    } catch { setMsg("Server error."); }
  }

  async function signOut() {
    try { await fetch(`${API_ROOT}logout.php`, { method: "POST", credentials: "include" }); } catch {}
    window.location.href = new URL("", ABS_BASE).pathname; // back to login
  }

  if (loading) return <div style={{color:"#fff",padding:24,background:"#000",minHeight:"100vh"}}>Loading…</div>;

  if (!profile) {
    return (
      <div style={{color:"#fff",padding:24,background:"#000",minHeight:"100vh"}}>
        <h1>Profile</h1>
        <p>You're not signed in.</p>
        <Link to="/" style={{ color:"#8ab4ff" }}>Go to Login</Link>
      </div>
    );
  }

  const [firstName, lastName] = (() => {
    const parts = (draft?.name || "").trim().split(/\s+/);
    return [parts[0] || "", parts.slice(1).join(" ") || ""];
  })();

  /** === Layout: fixed header, extra top whitespace, no h-scroll, wider cards === */
  const HEADER_H = 64;
  const TOP_SPACER = 160;
  const EDIT_BONUS = 293;
  const effectiveTopPad = HEADER_H + TOP_SPACER + (editing ? EDIT_BONUS : 0);

  const page = {
    minHeight:"100vh",
    width:"100%",
    background:"#000",
    color:"#fff",
    fontFamily:"system-ui, sans-serif",
    overflowX:"hidden",
    scrollPaddingTop: effectiveTopPad,
  };

  const topBar = {
    position:"fixed",
    left:0,
    right:0,
    top:0,
    height:HEADER_H,
    zIndex: 3000,
    display:"flex",
    alignItems:"center",
    borderBottom:"1px solid #222",
    background:"rgba(18,18,18,0.98)",
    backdropFilter:"blur(2px)",
  };

  const container = {
    width:"100%",
    maxWidth:"1600px",
    margin:"0 auto",
    padding:"0 24px",
    boxSizing:"border-box",
  };

  const contentWrap = {
    ...container,
    paddingTop: effectiveTopPad,
    paddingBottom: 64,
  };

  const grid = {
    display:"grid",
    gridTemplateColumns:"minmax(340px, 460px) 1fr",
    gap:32,
    alignItems:"start",
    width:"100%",
  };

  const card = {
    background:"#0f0f0f",
    border:"1px solid #222",
    borderRadius:16,
  };

  const sectionHeader = { padding:24, borderBottom:"1px solid #222" };
  const sectionBody = { padding:24 };

  const inputBase = {
    padding:12,
    borderRadius:10,
    border:"1px solid #333",
    background:"#111",
    color:"#fff",
    fontSize:16,
    width:"100%",
    minWidth:0,
    boxSizing:"border-box",
  };

  const selectBase = { ...inputBase, appearance:"none" };

  const twoCol = {
    display:"grid",
    gridTemplateColumns:"minmax(300px,1fr) minmax(300px,1fr)",
    gap:20,
    alignItems:"start",
  };

  const field = (label, value, onChange, props={}) => (
    <label style={{ display:"grid", gap:8, minWidth:0 }}>
      <span style={{ fontSize:12, color:"#aaa", textTransform:"uppercase", letterSpacing:0.4 }}>{label}</span>
      <input value={value ?? ""} onChange={e=>onChange(e.target.value)} style={inputBase} {...props}/>
    </label>
  );

  function startEditing() {
    setEditing(true);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <div style={page}>
      {/* Fixed header — the ONLY place for Edit/Cancel/Save */}
      <div style={topBar}>
        <div style={{ ...container, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            {/* Back now goes to /dashboard */}
            <Link to="/dashboard" style={{ color:"#8ab4ff", fontSize:16, whiteSpace:"nowrap" }}>← Back</Link>
            <h1 style={{ margin:0, fontSize:22, whiteSpace:"nowrap" }}>Profile</h1>
          </div>
          {!editing ? (
            <button
              onClick={startEditing}
              style={{ background:"#1f6feb", border:0, color:"#fff", padding:"10px 16px", borderRadius:12, fontSize:15, fontWeight:700 }}
            >
              Edit Profile
            </button>
          ) : (
            <div style={{ display:"flex", gap:10 }}>
              <button
                onClick={()=>{ setDraft(profile); setEditing(false); setMsg(""); }}
                style={{ background:"transparent", border:"1px solid #333", color:"#fff", padding:"10px 16px", borderRadius:12, fontSize:15 }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!isDirty}
                style={{
                  background:"#1f6feb", border:0, color:"#fff", padding:"10px 16px", borderRadius:12, fontSize:15, fontWeight:700,
                  opacity:isDirty?1:0.6, cursor:isDirty?"pointer":"not-allowed"
                }}
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={contentWrap}>
        <div style={grid}>
          {/* LEFT: SUMMARY */}
          <aside style={{ ...card, padding:24 }}>
            <div style={{ display:"flex", gap:18, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
              <div style={{
                width:120, height:120, borderRadius:"50%", background:"#222",
                overflow:"hidden", display:"grid", placeItems:"center", fontWeight:800, fontSize:34, flex:"0 0 auto"
              }}>
                {/* Initials only (no upload/preview) */}
                {(profile.preferred_name || profile.name || "?")
                  .split(" ").slice(0,2).map(p=>p[0]?.toUpperCase()).join("") || "?"}
              </div>
              <div style={{ minWidth: 200, flex:"1 1 auto" }}>
                <div style={{ fontSize:28, lineHeight:1.2, wordBreak:"break-word" }}>{displayName}</div>
                {profile.preferred_name && profile.preferred_name !== profile.name && (
                  <div style={{ fontSize:13, color:"#aaa" }}>Full name: {profile.name}</div>
                )}
              </div>
            </div>

            <div style={{ display:"grid", gap:10, fontSize:16 }}>
              {profile.pronouns && <div style={{ color:"#bbb" }}>Pronouns: <span style={{ color:"#fff" }}>{profile.pronouns}</span></div>}
              <div style={{ color:"#bbb" }}>Year: <span style={{ color:"#fff" }}>{profile.academic_year || "—"}</span></div>
              <div style={{ color:"#bbb" }}>Major: <span style={{ color:"#fff" }}>{profile.major || "—"}</span></div>
              <div style={{ color:"#bbb" }}>Email: <span style={{ color:"#8ab4ff" }}>{profile.email}</span></div>
            </div>
          </aside>

          {/* RIGHT: MAIN */}
          <main style={{ display:"grid", gap:28, width:"100%" }}>
            {/* IDENTITY */}
            <section style={card}>
              <div style={sectionHeader}><h3 style={{ margin:0, fontSize:20 }}>Identity</h3></div>
              {!editing ? (
                <div style={{ ...sectionBody, ...twoCol }}>
                  <Labeled label="Name" value={profile.name} />
                  <Labeled label="Preferred Name" value={profile.preferred_name || "—"} />
                  <Labeled label="Pronouns" value={profile.pronouns || "—"} />
                </div>
              ) : (
                <div style={{ ...sectionBody, display:"grid", gap:20 }}>
                  <div style={twoCol}>
                    {field("First Name", firstName, v => setDraft(d => ({...d, name: `${v} ${lastName}`.trim()})))}
                    {field("Last Name",  lastName,  v => setDraft(d => ({...d, name: `${firstName} ${v}`.trim()})))}
                    {field("Preferred Name", draft?.preferred_name || "", v => setDraft(d => ({...d, preferred_name: v})))}
                    <label style={{ display:"grid", gap:8, minWidth:0 }}>
                      <span style={{ fontSize:12, color:"#aaa", textTransform:"uppercase", letterSpacing:0.4 }}>Email</span>
                      <input value={profile.email} disabled style={{ ...inputBase, background:"#151515", color:"#aaa" }}/>
                    </label>
                    <label style={{ display:"grid", gap:8, minWidth:0 }}>
                      <span style={{ fontSize:12, color:"#aaa", textTransform:"uppercase", letterSpacing:0.4 }}>Pronouns</span>
                      <select
                        value={draft?.pronouns || ""}
                        onChange={e=> setDraft(d => ({...d, pronouns: e.target.value}))}
                        style={selectBase}
                      >
                        <option value="">Select</option>
                        {PRONOUNS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </section>

            {/* ACADEMIC */}
            <section style={card}>
              <div style={sectionHeader}><h3 style={{ margin:0, fontSize:20 }}>Academic Information</h3></div>
              {!editing ? (
                <div style={{ ...sectionBody, ...twoCol }}>
                  <Labeled label="Academic Year" value={profile.academic_year || "—"} />
                  <Labeled label="Major" value={profile.major || "—"} />
                </div>
              ) : (
                <div style={{ ...sectionBody, ...twoCol }}>
                  <label style={{ display:"grid", gap:8, minWidth:0 }}>
                    <span style={{ fontSize:12, color:"#aaa", textTransform:"uppercase", letterSpacing:0.4 }}>Academic Year</span>
                    <select
                      value={draft?.academic_year || ""}
                      onChange={e=> setDraft(d => ({...d, academic_year: e.target.value}))}
                      style={selectBase}
                    >
                      <option value="">(select)</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </label>
                  {field("Major", draft?.major || "", v => setDraft(d => ({...d, major: v})))}
                </div>
              )}
            </section>

            {/* ACCESSIBILITY */}
            <section style={card}>
              <div style={sectionHeader}><h3 style={{ margin:0, fontSize:20 }}>Accessibility & Accommodations</h3></div>
              {!editing ? (
                <div style={sectionBody}>
                  <div style={{ color:"#aaa", fontSize:12, textTransform:"uppercase", letterSpacing:0.4 }}>Disability Accommodations</div>
                  <div style={{ whiteSpace:"pre-wrap", marginTop:8, fontSize:16 }}>
                    {profile.disabilities || "No accommodations specified"}
                  </div>
                  <div style={{ color:"#777", fontSize:12, marginTop:10 }}>
                    This information is private and only visible to you.
                  </div>
                </div>
              ) : (
                <div style={sectionBody}>
                  <label style={{ display:"grid", gap:8 }}>
                    <span style={{ fontSize:12, color:"#aaa", textTransform:"uppercase", letterSpacing:0.4 }}>Disability Accommodations</span>
                    <textarea
                      rows={6}
                      value={draft?.disabilities || ""}
                      onChange={e=> setDraft(d => ({...d, disabilities: e.target.value}))}
                      style={{ ...inputBase, resize:"vertical" }}
                    />
                  </label>
                  <div style={{ color:"#777", fontSize:12, marginTop:10 }}>
                    This information is private and only visible to you.
                  </div>
                </div>
              )}
            </section>

            {/* SIGN OUT */}
            <div style={{ display:"flex", justifyContent:"flex-end", width:"100%" }}>
              <button
                onClick={signOut}
                style={{ background:"#b3261e", border:0, color:"#fff", padding:"12px 16px", borderRadius:10, fontSize:16 }}
              >
                Sign Out
              </button>
            </div>

            {msg && <div style={{ color:"#9ad", fontSize:14 }}>{msg}</div>}
          </main>
        </div>
      </div>
    </div>
  );
}

function Labeled({ label, value }) {
  return (
    <div>
      <div style={{ color:"#aaa", fontSize:12, textTransform:"uppercase", letterSpacing:0.4 }}>{label}</div>
      <div style={{ fontSize:16 }}>{value}</div>
    </div>
  );
}
