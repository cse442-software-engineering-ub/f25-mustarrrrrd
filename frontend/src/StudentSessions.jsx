import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function StudentSessions(){
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [inQueueMap, setInQueueMap] = useState({}); // sessionId -> boolean
  const [reservedSessionId, setReservedSessionId] = useState(null); // tracks which session is reserved (not active)
  const [loading, setLoading] = useState(true);

  const ABS_BASE = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  const API_ROOT = new URL('../api/', ABS_BASE).pathname;

  // Parse 12-hour time format "3:00 PM" to 24-hour { hours, minutes }
  function parse12HourTime(timeStr) {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const parts = timeStr.trim().split(' '); // ["3:00", "PM"]
    if (parts.length !== 2) return { hours: 0, minutes: 0 };

    const [timePart, period] = parts;
    const [h, m] = timePart.split(':').map(nt => parseInt(nt, 10) || 0);

    let hours = h;
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return { hours, minutes: m };
  }

  function nextStartDateForSession(s) {
    if (!s || !s.day_of_week || !s.start_time) return null;
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const target = dayNames.indexOf(s.day_of_week);
    if (target === -1) return null;
    const now = new Date();
    const today = now.getDay();
    let daysUntil = (target - today + 7) % 7;
    // Build date for the next occurrence (could be today)
    const { hours: h, minutes: m } = parse12HourTime(s.start_time);
    const d = new Date(now);
    d.setDate(now.getDate() + daysUntil);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function joinAllowedWithin24h(s) {
    const startThis = nextStartDateForSession(s);
    if (!startThis) return false;
    const now = new Date();
    const ms24 = 24 * 60 * 60 * 1000;

    // compute end time for this occurrence (if provided)
    let endThis = null;
    if (s.end_time) {
      const { hours: eh, minutes: em } = parse12HourTime(s.end_time);
      endThis = new Date(startThis);
      endThis.setHours(eh, em, 0, 0);
    }

    // If currently during the session (between start and end), allow joining
    if (endThis && now >= startThis && now <= endThis) return true;

    // If now is before the session start, allow if within 24 hours
    if (now < startThis) return (startThis.getTime() - now.getTime()) <= ms24;

    // Now is after endThis (session ended). Compute next week's start and allow only if within 24 hours of that next start
    const startNext = new Date(startThis);
    startNext.setDate(startThis.getDate() + 7);
    return (startNext.getTime() - now.getTime()) <= ms24;
  }

  useEffect(()=>{
    let mounted = true;
    async function load(){
      try{
        const res = await fetch(`${API_ROOT}office_hours_sessions_list.php?course_id=${encodeURIComponent(courseId)}`,{ credentials:'include', headers:{Accept:'application/json'} });
        if(!res.ok) return;
        const d = await res.json().catch(()=>null);
        if(!d || !d.ok) return;
        if(mounted) setSessions(d.sessions || []);
      }catch(e){ console.error(e); }
      finally{ if(mounted) setLoading(false); }
    }
    load();
    return ()=>{ mounted=false; }
  },[courseId]);

  // When sessions load, check whether current user is in each session's queue
  useEffect(()=>{
    let mounted = true;
    if (!sessions || sessions.length === 0) return;

    async function checkInQueues(){
      try{
        const checks = sessions.map(s =>
          fetch(`${API_ROOT}queue_status.php?session_id=${encodeURIComponent(s.id)}&t=${Date.now()}`, { credentials:'include', cache:'no-store', headers:{Accept:'application/json'} })
            .then(r => r.ok ? r.json().catch(()=>null) : null)
            .then(d => ({ id: s.id, inQueue: !!(d && (typeof d.position === 'number')) }))
            .catch(()=>({ id: s.id, inQueue: false }))
        );
        const results = await Promise.all(checks);
        if (!mounted) return;
        const map = {};
        let reserved = null;
        for (const r of results) {
          map[r.id] = Boolean(r.inQueue);
          // Track which session is reserved (in queue)
          if (r.inQueue) {
            reserved = r.id;
          }
        }
        setInQueueMap(map);
        setReservedSessionId(reserved);
      }catch(e){ console.error('Failed to check queue status for sessions', e); }
    }

    checkInQueues();
    return ()=>{ mounted = false; };
  }, [sessions]);

  // Join but stay on list (from button) or navigate to session (from card click)
  const joinSession = async (sessionId, stayOnList = true) => {
    try{
      const res = await fetch(`${API_ROOT}queue_join.php`,{
        method:'POST', credentials:'include', headers:{'Content-Type':'application/json', Accept:'application/json'},
        body: JSON.stringify({ course_id: courseId, session_id: sessionId })
      });
      const data = await res.json();

      // Check if there's an error (e.g., already reserved another session)
      if (!data.ok && data.error === 'already_reserved') {
        alert(data.message || 'You already have a reservation for another session in this course.');
        return;
      }
    }catch(e){
      console.error('Failed to join session', e);
    }
    if (stayOnList) {
      setInQueueMap(prev => ({ ...prev, [sessionId]: true }));
      setReservedSessionId(sessionId);
    } else {
      navigate(`/session/${sessionId}`);
    }
  };

  const leaveSession = async (sessionId) => {
    try{
      await fetch(`${API_ROOT}queue_leave.php`,{
        method:'POST', credentials:'include', headers:{'Content-Type':'application/json', Accept:'application/json'},
        body: JSON.stringify({ session_id: sessionId })
      });
    }catch(e){ /* ignore */ }
    setInQueueMap(prev => ({ ...prev, [sessionId]: false }));
    // Clear reserved session if this was it
    if (reservedSessionId === sessionId) {
      setReservedSessionId(null);
    }
  };

  // Use light dashboard background and wider layout similar to QueueDetails
  const pageStyle = {
    position: 'fixed', inset: 0, overflow: 'auto', background: 'var(--bg-secondary)', margin: 0, padding: 0, width: '100%', height: '100%', boxSizing: 'border-box'
  };
  const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' };
  const backBtn = { background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 };
  const containerStyle = { maxWidth: '70rem', margin: '0 auto', padding: '1.5rem' };
  const listStyle = { display: 'grid', gap: 12 };
  const cardStyle = { background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>Sessions • {courseId}</h1>
        <button onClick={() => navigate('/dashboard')} style={backBtn} onMouseOver={(e)=>e.currentTarget.style.background='var(--bg-tertiary)'} onMouseOut={(e)=>e.currentTarget.style.background='var(--card-bg)'}>Back to Dashboard</button>
      </div>

      <div style={containerStyle}>
        {loading && <div style={{ color: 'var(--text-secondary)' }}>Loading sessions…</div>}
        {!loading && sessions.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>No sessions scheduled for this course.</div>}
        <div style={listStyle}>
          {sessions.map(s => (
            <div key={s.id} style={cardStyle} onClick={() => navigate(`/session/${s.id}`)}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.day_of_week} • {s.start_time}–{s.end_time}</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{s.location || '(no location)'}</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>Instructor: {s.instructor_name || s.instructor_email || '(TBA)'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                { inQueueMap[s.id] ? (
                  <button onClick={(e)=>{ e.stopPropagation(); leaveSession(s.id); }} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }} onMouseOver={(e)=>e.currentTarget.style.background='#fecaca'} onMouseOut={(e)=>e.currentTarget.style.background='#fee2e2'}>Leave Queue</button>
                ) : (
                  (() => {
                    // Check if another session is already reserved
                    const anotherReserved = reservedSessionId && reservedSessionId !== s.id;
                    if (anotherReserved) {
                      return (
                        <button disabled title='You already have a reservation for another session in this course. Please cancel it first.' style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 10, fontWeight: 600, cursor: 'not-allowed' }}>Join</button>
                      );
                    }

                    const allowed = joinAllowedWithin24h(s);
                    if (!allowed) {
                      return (
                        <button disabled title='Joining is allowed within 24 hours of the session start' style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 10, fontWeight: 600, cursor: 'not-allowed' }}>Join</button>
                      );
                    }
                    return (
                      <button onClick={(e)=>{ e.stopPropagation(); joinSession(s.id, true); }} style={{ background: 'var(--button-bg)', color: 'var(--button-text)', border: '1px solid var(--button-bg)', padding: '8px 12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }} onMouseOver={(e)=>e.currentTarget.style.background='var(--button-hover)'} onMouseOut={(e)=>e.currentTarget.style.background='var(--button-bg)'}>Join</button>
                    );
                  })()
                )}
                <button onClick={(e)=>{ e.stopPropagation(); navigate(`/session/${s.id}`); }} style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }} onMouseOver={(e)=>e.currentTarget.style.background='var(--bg-tertiary)'} onMouseOut={(e)=>e.currentTarget.style.background='var(--card-bg)'}>View</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
