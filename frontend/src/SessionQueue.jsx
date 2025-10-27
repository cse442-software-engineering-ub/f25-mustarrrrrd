import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function SessionQueue(){
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

  // layout constants used throughout — declare early so early returns can reference them
  const pageStyle = { position: 'fixed', inset: 0, overflow: 'auto', background: '#f3f4f6', margin: 0, padding: 0, width: '100%', height: '100%', boxSizing: 'border-box' };
  const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#fff' };
  const backBtn = { background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 };

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
  },[sessionId]);

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

        // Restore any locally-saved notes immediately so navigating back preserves them
        try {
          const key = `queue_notes_session_${sessionId}`;
          const stored = localStorage.getItem(key);
          if (stored !== null && stored !== undefined && stored !== notesRef.current) {
            setNotes(stored);
            notesRef.current = stored;
          }
        } catch (e) { /* ignore localStorage errors */ }
        // prime status and notes
        await pollOnce();
        pollTimer.current = setInterval(pollOnce, 3000);

        // fetch session metadata so we can show details and instructor controls
        try{
          const mres = await fetch(`${API_ROOT}office_hours_session_get.php?session_id=${encodeURIComponent(sessionId)}`, { credentials:'include', headers:{Accept:'application/json'} });
          if(mres.ok){
            const md = await mres.json().catch(()=>null);
            if(md && md.ok && md.session){
              setSession(md.session);
              // mark instructor if current user is the session instructor
              // Require that the session's instructor_id matches the logged-in user AND the user has a staff role
              const uid = sdata.user_id ?? null;
              const role = sdata.role ?? '';
              let instructorMatch = uid && parseInt(md.session.instructor_id,10) === Number(uid) && (role === 'professor' || role === 'ta');
              // If not matched by instructor_id, also check whether the current user is listed as professor for the session's course
              if (!instructorMatch) {
                try {
                  const pc = await fetch(`${API_ROOT}professor_courses.php`, { credentials:'include', headers:{Accept:'application/json'} });
                  if (pc.ok) {
                    const pcd = await pc.json().catch(()=>null);
                    if (pcd && pcd.ok && Array.isArray(pcd.courses)) {
                      instructorMatch = pcd.courses.some(c => String(c.id) === String(md.session.course_id));
                    }
                  }
                } catch(e) { /* ignore */ }
              }
              setIsInstructor(Boolean(instructorMatch));
            }
          }
        }catch(e){ /* ignore */ }
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
          // Only overwrite the textarea if the current in-memory notes match localStorage
          // (i.e. user hasn't started editing). Use notesRef to avoid stale closure values.
          if((notesRef.current ?? '') === currentLocal){
            setNotes(d.notes);
            notesRef.current = d.notes;
            localStorage.setItem(key, d.notes);
          }
        }
      }catch(e){ /* ignore transient errors */ }
    }

  bootstrap();
    return ()=>{ if(pollTimer.current) clearInterval(pollTimer.current); cancelled=true; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[sessionId]);

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
        // optimistic update: set attendance on entries
        setEntries(prev=>{
          const copy = prev.slice();
          for(let i=0;i<copy.length;i++){
            if(copy[i].user_email === userEmail){ copy[i] = {...copy[i], attendance: status}; break; }
          }
          return copy;
        });
        // show small confirmation including student name
        const student = entries.find(en => en.user_email === userEmail);
        const name = student ? (student.display_name || student.user_email) : userEmail;
        const verb = status === 'present' ? 'Marked present' : 'Marked absent';
        setAttendanceMsg(`${verb}: ${name}`);
        setTimeout(()=>setAttendanceMsg(null), 3000);
      }
    }catch(e){ console.error('Failed to mark attendance:', e); }
  }

  if(!booted) {
    // show a lightweight loading shell instead of a blank page
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' }}>Office Hours • Session</h1>
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
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' }}>Office Hours • Session</h1>
        </div>
        <div style={{ maxWidth: '70rem', margin: '2rem auto', padding: '1.5rem' }}>
          <div style={{ color: '#b91c1c', fontWeight: 600 }}>Error loading session</div>
          <div style={{ color: '#6b7280', marginTop: 8 }}>{String(error)}</div>
        </div>
      </div>
    );
  }

  // If current user is the session instructor, show a compact professor-only queue list
  if (isInstructor) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' }}>Session Queue • Professor View</h1>
          <button onClick={()=>navigate(-1)} style={backBtn} onMouseOver={(e)=>e.currentTarget.style.background='#f9fafb'} onMouseOut={(e)=>e.currentTarget.style.background='#fff'}>Back</button>
        </div>

        <div style={{ maxWidth: '70rem', margin: '0 auto', padding: '1.5rem' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{session ? `${session.day_of_week ?? ''} ${session.start_time ?? ''}${session.end_time ? '–' + session.end_time : ''}` : '—'}</div>
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
              <div key={idx} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{e.display_name || e.user_email}</div>
                  <div style={{ color: '#6b7280' }}>{e.notes || '(no note provided)'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: '#6b7280' }}>{new Date(e.joined_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  {idx === 0 && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={()=>markAttendance(e.user_email, 'present')} style={{ background: e.attendance === 'present' ? '#166534' : '#bbf7d0', color: e.attendance === 'present' ? '#fff' : '#164e2e', border: 'none', padding: '0.5rem 0.75rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Present</button>
                      <button onClick={()=>markAttendance(e.user_email, 'absent')} style={{ background: e.attendance === 'absent' ? '#7f1d1d' : '#fecaca', color: e.attendance === 'absent' ? '#fff' : '#7f1d1d', border: 'none', padding: '0.5rem 0.75rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Absent</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const containerStyle = { maxWidth: '70rem', margin: '0 auto', padding: '1.5rem' };
  const colGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 };
  const panel = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' }}>Office Hours • Session</h1>
        <button onClick={()=>navigate(-1)} style={backBtn} onMouseOver={(e)=>e.currentTarget.style.background='#f9fafb'} onMouseOut={(e)=>e.currentTarget.style.background='#fff'}>Back</button>
      </div>

      <div style={containerStyle}>
        <div style={colGrid}>
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

          <div style={panel}>
            <h2 style={{ marginTop:0, marginBottom: 16, fontSize: '20px', fontWeight: 700, color: '#111827' }}>Session Details</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ color: '#6b7280' }}>Time</div>
              <div style={{ fontSize: '1rem', color: '#111827' }}>{session ? `${session.day_of_week ?? ''} ${session.start_time ?? ''}${session.end_time ? '–' + session.end_time : ''}` : '—'}</div>
              <div style={{ color: '#6b7280' }}>Location</div>
              <div style={{ fontSize: '1rem', color: '#111827' }}>{session && session.location ? session.location : '—'}</div>
            </div>
          </div>

          { yourPosition !== null ? (
            <div style={panel}>
              <h2 style={{ marginTop:0, marginBottom: 12, fontSize: '20px', fontWeight: 700, color: '#111827' }}>Your Notes</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea value={notes} onChange={(e)=>{ const v = e.target.value; setNotes(v); notesRef.current = v; setSaved(false); }} placeholder='Notes for your instructor' style={{ width:'100%', minHeight:140, borderRadius:10, padding:12, background:'#fff', color:'#111827', border:'1px solid #e5e7eb' }} readOnly={saved} />
                {saved && (
                  <div style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 8, background: '#dcfce7', color: '#166534', padding: '6px 8px', borderRadius: 999, fontWeight: 600, fontSize: '0.9rem', border: '1px solid #bbf7d0' }}>
                    ✓ Notes saved
                  </div>
                )}
                <div style={{ marginTop:0, display:'flex', gap:12 }}>
                  <button onClick={saveNotes} style={{ background: '#111827', color: '#fff', border: '1px solid #111827', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }} onMouseOver={(e)=>e.currentTarget.style.background='#1f2937'} onMouseOut={(e)=>e.currentTarget.style.background='#111827'}>Save Notes</button>
                  <button onClick={leaveQueue} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }} onMouseOver={(e)=>e.currentTarget.style.background='#fecaca'} onMouseOut={(e)=>e.currentTarget.style.background='#fee2e2'}>Leave Queue</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={panel}>
              <div style={{ color: '#6b7280' }}>You are not in the queue.</div>
            </div>
          )}

        </div>

        {/* attendee list deliberately omitted for student view - students should not see other users */}
      </div>
    </div>
  );
}
