import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// --- Avatar Generator (Adventure Neutral) ---
const diceUrl = seed =>
  `https://api.dicebear.com/7.x/adventurer-neutral/png?seed=${encodeURIComponent(seed)}&size=64`;

export default function SessionQueue(){
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState(null);

  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(null);
  const [userId, setUserId] = useState(null);
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editSessionData, setEditSessionData] = useState({ day_of_week: 'Monday', start_time: '12:00', end_time: '13:00', location: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [yourPosition, setYourPosition] = useState(null);
  const [totalInQueue, setTotalInQueue] = useState(0);
  const [status, setStatus] = useState('Active');

  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const pollTimer = useRef(null);
  const notesRef = useRef(notes);
  const [attendanceMsg, setAttendanceMsg] = useState(null);

  const ABS_BASE = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  const API_ROOT = new URL('../api/', ABS_BASE).pathname;

  // Responsive detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const pageStyle = { position: 'fixed', inset: 0, overflow: 'auto', background: '#f3f4f6', margin: 0, padding: 0, width: '100%', height: '100%', boxSizing: 'border-box' };
  const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '16px' : '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 12 : 0 };
  const backBtn = { background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, width: isMobile ? '100%' : 'auto' };

  // Load queue list every 5 seconds
  useEffect(()=>{
    let mounted = true;
    async function loadList(){
      try{
        const res = await fetch(`${API_ROOT}queue_list.php?session_id=${encodeURIComponent(sessionId)}`,{ credentials:'include', headers:{Accept:'application/json'} });
        if(!res.ok) { const txt = await res.text().catch(()=>res.statusText); if(mounted) setError(`Failed to load queue list: ${txt}`); return; }
        const d = await res.json().catch(()=>null);
        if(!d || !d.ok) { if(mounted) setError(`Failed to load queue list: ${d && d.error ? d.error : 'invalid json'}`); return; }
        if(mounted) setEntries(d.queue || []);
      }catch(e){ console.error(e); }
    }
    loadList();
    const t = setInterval(loadList, 5000);
    return ()=>{ mounted=false; clearInterval(t); }
  },[sessionId, API_ROOT]);

  // Bootstrap user session + polling
  useEffect(()=>{
    let cancelled = false;

    async function bootstrap(){
      try{
        const sres = await fetch(`${API_ROOT}check_session.php?t=${Date.now()}`,{ method:'GET', credentials:'include', cache:'no-store', headers:{Accept:'application/json'} });
        if(!sres.ok){ setBooted(true); return; }
        const sdata = await sres.json().catch(()=>null);
        if(!sdata || !sdata.loggedIn){ navigate('/'); return; }
        if(cancelled) return;
        setEmail(sdata.email);
        setUserId(sdata.user_id ?? null);

        const key = `queue_notes_session_${sessionId}`;
        try {
          const stored = localStorage.getItem(key);
          if (stored !== null && stored !== undefined && stored !== notesRef.current) {
            setNotes(stored);
            notesRef.current = stored;
          }
        } catch (e) {}

        await pollOnce();
        pollTimer.current = setInterval(pollOnce, 3000);

        try{
          const mres = await fetch(`${API_ROOT}office_hours_session_get.php?session_id=${encodeURIComponent(sessionId)}`, { credentials:'include', headers:{Accept:'application/json'} });
          if(mres.ok){
            const md = await mres.json().catch(()=>null);
            if(md && md.ok && md.session){
              setSession(md.session);
              const uid = sdata.user_id ?? null;
              const role = sdata.role ?? '';
              let instructorMatch = uid && parseInt(md.session.instructor_id,10) === Number(uid) && (role === 'professor' || role === 'ta');

              if (!instructorMatch) {
                try {
                  const pc = await fetch(`${API_ROOT}professor_courses.php`, { credentials:'include', headers:{Accept:'application/json'} });
                  if (pc.ok) {
                    const pcd = await pc.json().catch(()=>null);
                    if (pcd && pcd.ok && Array.isArray(pcd.courses)) {
                      instructorMatch = pcd.courses.some(c => String(c.id) === String(md.session.course_id));
                    }
                  }
                } catch(e) {}
              }

              setIsInstructor(Boolean(instructorMatch));
            }
          }
        }catch(e){}

      }catch(e){ console.error(e); if(!cancelled) setError(String(e)); }
      finally{ if(!cancelled) setBooted(true); }
    }

    async function pollOnce(){
      try{
        const res = await fetch(`${API_ROOT}queue_status.php?session_id=${encodeURIComponent(sessionId)}&t=${Date.now()}`,{ credentials:'include', cache:'no-store', headers:{Accept:'application/json'} });
        if(!res.ok) { const txt = await res.text().catch(()=>res.statusText); setError(`Failed to load queue status: ${txt}`); return; }
        const d = await res.json().catch(()=>null);
        if(!d) { setError('Failed to parse queue status response'); return; }
        if(!d.ok) { setError(`Queue status error: ${d.error || 'unknown'}`); return; }

        if(typeof d.total === 'number') setTotalInQueue(d.total);
        setYourPosition(typeof d.position === 'number' ? d.position : null);
        if(typeof d.status === 'string') setStatus(d.status);

        if(typeof d.notes === 'string'){
          const key = `queue_notes_session_${sessionId}`;
          const currentLocal = localStorage.getItem(key) ?? '';
          if((notesRef.current ?? '') === currentLocal){
            setNotes(d.notes);
            notesRef.current = d.notes;
            localStorage.setItem(key, d.notes);
          }
        }
      }catch(e){}
    }

    bootstrap();
    return ()=>{ if(pollTimer.current) clearInterval(pollTimer.current); cancelled=true; }
  },[sessionId, navigate, API_ROOT]);

  async function saveNotes(){
    const key = `queue_notes_session_${sessionId}`;
    localStorage.setItem(key, notes);
    setSaved(true);
    if(email){
      try{
        await fetch(`${API_ROOT}queue_save_notes.php`,{ method:'POST', credentials:'include', headers:{'Content-Type':'application/json', Accept:'application/json'}, body: JSON.stringify({ session_id: sessionId, notes }) });
      }catch(e){}
    }
  }

  async function leaveQueue(){
    if(pollTimer.current) clearInterval(pollTimer.current);
    if(email){
      try{
        await fetch(`${API_ROOT}queue_leave.php`,{ method:'POST', credentials:'include', headers:{'Content-Type':'application/json', Accept:'application/json'}, body: JSON.stringify({ session_id: sessionId, user_email: email }) });
      }catch(e){}
    }
    try{ localStorage.removeItem(`queue_notes_session_${sessionId}`); }catch(e){}
    setNotes(''); notesRef.current = ''; setSaved(false);
    navigate('/dashboard');
  }

  async function markAttendance(userEmail, status){
    try{
      const body = { session_id: sessionId, user_email: userEmail, status };
      const res = await fetch(`${API_ROOT}queue_attendance.php`,{ method:'POST', credentials:'include', headers:{'Content-Type':'application/json', Accept:'application/json'}, body: JSON.stringify(body) });
      if(!res.ok) throw new Error('request failed');
      const d = await res.json().catch(()=>null);
      if(d && d.ok){
        setEntries(prev=>{
          const copy = prev.slice();
          for(let i=0;i<copy.length;i++){
            if(copy[i].user_email === userEmail){ copy[i] = {...copy[i], attendance: status}; break; }
          }
          return copy;
        });
        const student = entries.find(en => en.user_email === userEmail);
        const name = student ? (student.display_name || student.user_email) : userEmail;
        const verb = status === 'present' ? 'Marked present' : 'Marked absent';
        setAttendanceMsg(`${verb}: ${name}`);
        setTimeout(()=>setAttendanceMsg(null), 3000);
      }
    }catch(e){ console.error('Failed to mark attendance:', e); }
  }

  function initiateRemoveStudent(userEmail, displayName) {
    setStudentToRemove({ email: userEmail, name: displayName });
    setShowRemoveModal(true);
  }

  async function confirmRemoveStudent() {
    if (!studentToRemove) return;
    try {
      const res = await fetch(`${API_ROOT}queue_remove.php`, {
        method: 'POST',
        credentials: 'include',
        headers: {'Content-Type':'application/json', Accept:'application/json'},
        body: JSON.stringify({ session_id: sessionId, user_email: studentToRemove.email })
      });
      if (!res.ok) throw new Error('remove failed');
      const d = await res.json().catch(()=>null);
      if (d && d.ok) {
        setEntries(prev => prev.filter(e => e.user_email !== studentToRemove.email));
      }
    } catch (e) {
      console.error('Failed to remove student:', e);
    } finally {
      setShowRemoveModal(false);
      setStudentToRemove(null);
    }
  }

  function cancelRemoveStudent() {
    setShowRemoveModal(false);
    setStudentToRemove(null);
  }

  // -------------------------
  // Loading / Error States
  // -------------------------

  if(!booted) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#111827' }}>Office Hours • Session</h1>
        </div>
        <div style={{ maxWidth: '70rem', margin: '2rem auto', padding: '1.5rem' }}>
          <div style={{ color: '#6b7280' }}>Loading session…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#111827' }}>Office Hours • Session</h1>
        </div>
        <div style={{ maxWidth: '70rem', margin: '2rem auto', padding: '1.5rem' }}>
          <div style={{ color: '#b91c1c', fontWeight: 600 }}>Error loading session</div>
          <div style={{ color: '#6b7280', marginTop: 8 }}>{String(error)}</div>
        </div>
      </div>
    );
  }

  // -------------------------
  // INSTRUCTOR VIEW
  // -------------------------

  if (isInstructor) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#111827', width: isMobile ? '100%' : 'auto' }}>Session Queue • Professor View</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={()=>{
              if(session){ setEditSessionData({ day_of_week: session.day_of_week || 'Monday', start_time: session.start_time || '12:00', end_time: session.end_time || '13:00', location: session.location || '' }); }
              setShowEditForm(true);
            }} style={{ background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 }} onMouseOver={(e)=>e.currentTarget.style.background='#f9fafb'} onMouseOut={(e)=>e.currentTarget.style.background='#fff'}>Edit Session</button>
            <button onClick={()=>navigate(-1)} style={backBtn} onMouseOver={(e)=>e.currentTarget.style.background='#f9fafb'} onMouseOut={(e)=>e.currentTarget.style.background='#fff'}>Back</button>
          </div>
        </div>

        <div style={{ maxWidth: '70rem', margin: '0 auto', padding: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {session ? `${session.day_of_week ?? ''} ${session.start_time ?? ''}${session.end_time ? '–' + session.end_time : ''}` : '—'}
              </div>
              <div style={{ color: '#6b7280' }}>{session && session.location ? session.location : '—'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{totalInQueue}</div>
              <div style={{ color: '#6b7280' }}>Total in Queue</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>

            {entries.length === 0 && <div style={{ color: '#6b7280' }}>No students in queue.</div>}

            {entries.map((e, idx) => (
              <div
                key={idx}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: isMobile ? 12 : 0
                }}
              >

                {/* ⭐ LEFT SIDE — WITH ROUNDED AVATAR */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={diceUrl(e.avatar_seed)}
                    alt="avatar"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      flexShrink: 0
                    }}
                  />

                  <div>
                    <div style={{ fontWeight: 700 }}>{e.display_name || e.user_email}</div>
                    <div style={{ color: '#6b7280' }}>{e.notes || '(no note provided)'}</div>
                  </div>
                </div>

                {/* RIGHT SIDE: time + attendance buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: isMobile ? '100%' : 'auto', flexWrap: 'wrap' }}>
                  <div style={{ color: '#6b7280' }}>
                    {new Date(e.joined_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </div>

                  {idx === 0 && (
                    <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
                      <button onClick={()=>markAttendance(e.user_email, 'present')} style={{ background: e.attendance === 'present' ? '#166534' : '#bbf7d0', color: e.attendance === 'present' ? '#fff' : '#164e2e', border: 'none', padding: '0.5rem 0.75rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, flex: isMobile ? 1 : 'none' }}>Present</button>
                      <button onClick={()=>markAttendance(e.user_email, 'absent')} style={{ background: e.attendance === 'absent' ? '#7f1d1d' : '#fecaca', color: e.attendance === 'absent' ? '#fff' : '#7f1d1d', border: 'none', padding: '0.5rem 0.75rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, flex: isMobile ? 1 : 'none' }}>Absent</button>
                      <button
                        onClick={() => initiateRemoveStudent(e.user_email, e.display_name || e.user_email)}
                        style={{
                          background: '#fff',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 8,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        X
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- Edit Session --- */}
        {showEditForm && (
          <div style={{ maxWidth: '70rem', margin: '2rem auto', padding: 12 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: 12, borderRadius: 8 }}>
              <h2 style={{ marginTop: 0, marginBottom: 12 }}>Edit Session</h2>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <select value={editSessionData.day_of_week} onChange={(e)=>setEditSessionData(s=>({...s, day_of_week: e.target.value}))} style={{ padding:8, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', minWidth: 120 }}>
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                  <option>Sunday</option>
                </select>

                <input type='time' value={editSessionData.start_time} onChange={(e)=>setEditSessionData(s=>({...s, start_time: e.target.value}))} style={{ padding:8, borderRadius:8, border:'1px solid #e5e7eb', width:120 }} />
                <input type='time' value={editSessionData.end_time} onChange={(e)=>setEditSessionData(s=>({...s, end_time: e.target.value}))} style={{ padding:8, borderRadius:8, border:'1px solid #e5e7eb', width:120 }} />

                <input placeholder='Location' value={editSessionData.location} onChange={(e)=>setEditSessionData(s=>({...s, location: e.target.value}))} style={{ padding:8, borderRadius:8, border:'1px solid #e5e7eb', flex:1, minWidth: 200 }} />
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={async ()=>{
                  try{
                    const body = { session_id: sessionId, ...editSessionData };
                    const res = await fetch(`${API_ROOT}update_office_hours_session.php`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json', Accept:'application/json'}, body: JSON.stringify(body) });
                    if(!res.ok) throw new Error('update failed');
                    const d = await res.json().catch(()=>null);
                    if(d && d.ok){
                      const mres = await fetch(`${API_ROOT}office_hours_session_get.php?session_id=${encodeURIComponent(sessionId)}`, { credentials:'include', headers:{Accept:'application/json'} });
                      if(mres.ok){ const md = await mres.json().catch(()=>null); if(md && md.ok && md.session){ setSession(md.session); } }
                      setShowEditForm(false);
                    }
                  }catch(e){ console.error('Failed to update session', e); }
                }} style={{ background:'#111827', color:'#fff', border:'none', padding:'8px 12px', borderRadius:8, fontWeight:600 }}>Save</button>

                <button onClick={async ()=>{
                  if(!window.confirm('Delete this session? This cannot be undone.')) return;
                  try{
                    const res = await fetch(`${API_ROOT}delete_office_hours_session.php`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json', Accept:'application/json'}, body: JSON.stringify({ session_id: sessionId }) });
                    if(!res.ok) throw new Error('delete failed');
                    const d = await res.json().catch(()=>null);
                    if(d && d.ok){
                      navigate('/professorview');
                    }
                  }catch(e){ console.error('Failed to delete session', e); }
                }} style={{ background:'#fee2e2', color:'#991b1b', border:'1px solid #fecaca', padding:'8px 12px', borderRadius:8, fontWeight:600 }}>Delete</button>

                <button onClick={()=>setShowEditForm(false)} style={{ background:'#fff', color:'#111827', border:'1px solid #e5e7eb', padding:'8px 12px', borderRadius:8, fontWeight:600 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Remove confirmation modal */}
        {showRemoveModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={cancelRemoveStudent}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Remove Student from Queue?</h3>
              <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.95rem' }}>
                Are you sure you want to remove <strong>{studentToRemove?.name}</strong> from the queue?
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelRemoveStudent}
                  style={{
                    background: '#fff',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    padding: '0.625rem 1.25rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.95rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveStudent}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '0.625rem 1.25rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.95rem'
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // -------------------------
  // STUDENT VIEW
  // -------------------------

  const containerStyle = { maxWidth: '70rem', margin: '0 auto', padding: isMobile ? '1rem' : '1.5rem' };
  const colGrid = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: isMobile ? 16 : 20 };
  const panel = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: isMobile ? 16 : 20 };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#111827', width: isMobile ? '100%' : 'auto' }}>Office Hours • Session</h1>
        <button onClick={()=>navigate(-1)} style={backBtn}>Back</button>
      </div>

      <div style={containerStyle}>
        <div style={colGrid}>

          {/* Queue status */}
          <div style={panel}>
            <h2 style={{ marginTop:0, marginBottom: 16, fontSize: '20px', fontWeight: 700, color: '#111827' }}>Queue Status</h2>
            <div style={{ display:'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <div>
                <div style={{ fontSize: 40, fontWeight: 800, color: '#111827' }}>{yourPosition ?? '-'}</div>
                <div style={{ color: '#6b7280' }}>Your Position</div>
              </div>
              <div>
                <div style={{ fontSize: 40, fontWeight: 800, color: '#111827' }}>{totalInQueue}</div>
                <div style={{ color: '#6b7280' }}>Total in Queue</div>
              </div>
            </div>
          </div>

          {/* Session details */}
          <div style={panel}>
            <h2 style={{ marginTop:0, marginBottom: 16, fontSize: '20px', fontWeight: 700, color: '#111827' }}>Session Details</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ color: '#6b7280' }}>Time</div>
              <div style={{ fontSize: '1rem', color: '#111827' }}>
                {session ? `${session.day_of_week ?? ''} ${session.start_time ?? ''}${session.end_time ? '–' + session.end_time : ''}` : '—'}
              </div>
              <div style={{ color: '#6b7280' }}>Location</div>
              <div style={{ fontSize:'1rem', color:'#111827' }}>
                {session?.location || '—'}
              </div>
            </div>
          </div>

          {/* Notes */}
          { yourPosition !== null ? (
            <div style={panel}>
              <h2 style={{ marginTop:0, marginBottom: 12, fontSize: '20px', fontWeight: 700, color: '#111827' }}>Your Notes</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                <textarea
                  value={notes}
                  onChange={(e)=>{ const v = e.target.value; setNotes(v); notesRef.current = v; setSaved(false); }}
                  placeholder='Notes for your instructor'
                  style={{
                    width:'100%',
                    minHeight:200,
                    borderRadius:10,
                    padding:12,
                    background:'#fff',
                    color:'#111827',
                    border:'1px solid #e5e7eb',
                    resize:'vertical',
                    boxSizing:'border-box'
                  }}
                  readOnly={saved}
                />

                {saved && (
                  <div style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 8, background: '#dcfce7', color: '#166534', padding: '6px 8px', borderRadius: 999, fontWeight: 600, fontSize: '0.9rem', border: '1px solid #bbf7d0' }}>
                    ✓ Notes saved
                  </div>
                )}

                <div style={{ display:'flex', gap:12, flexDirection: isMobile ? 'column' : 'row' }}>
                  <button onClick={saveNotes} style={{ background: '#111827', color: '#fff', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontWeight: 600 }}>Save Notes</button>
                  <button onClick={leaveQueue} style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontWeight: 600 }}>Leave Queue</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={panel}>
              <div style={{ color: '#6b7280' }}>You are not in the queue.</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
