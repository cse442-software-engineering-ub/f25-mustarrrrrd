import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import characterImg from './assets/character.png';
import goatImg from './assets/goat.png';
import carImg from './assets/car.png';
import noEntryImg from './assets/minus.png';
import notify, { confirmDialog } from './notify';
import CustomAlert from "./ui/CustomAlert";
import { containsBadWord } from "./utils/badWords";

// --- Avatar Generator (Adventure Neutral) ---
const diceUrl = seed =>
  `https://api.dicebear.com/7.x/adventurer-neutral/png?seed=${encodeURIComponent(seed)}&size=64`;

export default function SessionQueue() {
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

  // Helper: generate an .ics file for the current session (next occurrence)
  function parse12HourTime(timeStr) {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const parts = timeStr.trim().split(' ');
    if (parts.length === 2) {
      const [timePart, period] = parts;
      const [hStr, mStr] = timePart.split(':');
      let h = parseInt(hStr, 10) || 0;
      const m = parseInt(mStr, 10) || 0;
      if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (period.toUpperCase() === 'AM' && h === 12) h = 0;
      return { hours: h, minutes: m };
    }
    // fallback: try HH:MM
    const [hh, mm] = (timeStr || '').split(':');
    return { hours: parseInt(hh, 10) || 0, minutes: parseInt(mm, 10) || 0 };
  }

  function nextDateForWeekday(dayName, timeStr) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const target = days.indexOf(dayName);
    const now = new Date();
    if (target === -1) return null;
    const today = now.getDay();
    let diff = (target - today + 7) % 7;
    const { hours, minutes } = parse12HourTime(timeStr || '12:00 PM');
    const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    if (diff === 0 && candidate > now) {
      // today later
    } else if (diff === 0) {
      // already passed today -> next week
      diff = 7;
    }
    if (diff > 0) candidate.setDate(candidate.getDate() + diff);
    return candidate;
  }

  function formatDateForICS(d) {
    // format as UTC YYYYMMDDTHHMMSSZ
    const pad = (n) => String(n).padStart(2, '0');
    return (
      d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      'Z'
    );
  }

  function downloadICS() {
    if (!session) return;
    // compute start and end datetimes (next occurrence)
    const start = nextDateForWeekday(session.day_of_week, session.start_time);
    const end = nextDateForWeekday(session.day_of_week, session.end_time || session.start_time);
    if (!start || !end) {
      notify('Unable to compute session time for .ics', 'error');
      return;
    }

    const uid = `session-${session.id}@local`;
    const dtstamp = formatDateForICS(new Date());
    const dtstart = formatDateForICS(start);
    const dtend = formatDateForICS(end);

    const summary = `Office Hours (${session.course_id || 'Course'})`;
    const location = session.location || '';
    const description = `Office hours session for ${session.course_id || ''} — ${session.day_of_week} ${session.start_time}${session.end_time ? '–' + session.end_time : ''}`;

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//cse442-software-engineering-ub//Mustard//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];

    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `officehours-session-${session.id}.ics`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 5000);
  }

  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const pollTimer = useRef(null);
  const notesRef = useRef(notes);
  const [attendanceMsg, setAttendanceMsg] = useState(null);

  // Dino game state
  const [gameActive, setGameActive] = useState(false);
  const [dinoY, setDinoY] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [powerUps, setPowerUps] = useState([]);
  const [gameScore, setGameScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isInvincible, setIsInvincible] = useState(false);
  const [speedBoost, setSpeedBoost] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [particles, setParticles] = useState([]);
  const [milestone, setMilestone] = useState(null);
  const gameLoopRef = useRef(null);
  const frameCountRef = useRef(0);
  const gameContainerRef = useRef(null);
  const dinoVelocityRef = useRef(0);
  const audioContextRef = useRef(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [yourBestScore, setYourBestScore] = useState(null);
  const [yourBestRank, setYourBestRank] = useState(null);
  const lastSubmittedScoreRef = useRef(null);

  // Alert state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("error");

  const ABS_BASE = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  const API_ROOT = new URL('../api/', ABS_BASE).pathname;

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      const res = await fetch(`${API_ROOT}dino_leaderboard.php`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        console.error('Leaderboard fetch failed:', res.status, text);
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json().catch(() => null);
      if (!data) {
        throw new Error('Invalid response from server');
      }

      if (data.ok !== true) {
        const msg = data?.error || 'Failed to load leaderboard';
        throw new Error(msg);
      }

      console.log('Leaderboard data received:', data);
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      setYourBestScore(typeof data.yourBest === 'number' ? data.yourBest : null);
      setYourBestRank(typeof data.yourRank === 'number' ? data.yourRank : null);
      setLeaderboardError(null);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setLeaderboardError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLeaderboardLoading(false);
    }
  }, [API_ROOT]);

  const submitLeaderboardScore = useCallback(async (score) => {
    try {
      console.log('Submitting leaderboard score:', score);
      const res = await fetch(`${API_ROOT}dino_leaderboard.php`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ score }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        console.error('Leaderboard submit failed:', res.status, text);
        notify(`Failed to submit score: ${res.status}`, 'error');
        // Still refresh to show current leaderboard
        setTimeout(() => fetchLeaderboard(), 500);
        return;
      }

      const data = await res.json().catch(() => null);
      if (!data) {
        console.error('Invalid response from server');
        notify('Failed to submit score: invalid response', 'error');
        setTimeout(() => fetchLeaderboard(), 500);
        return;
      }

      if (data.ok !== true) {
        const msg = data?.error || 'Failed to submit score';
        console.warn('Score submission warning:', msg);
        // Don't show error if it's just "not higher than best"
        if (msg !== 'Score not higher than best') {
          notify(msg, 'error');
        }
      }

      console.log('Score submission response:', data);

      // Update from response if available
      if (Array.isArray(data.leaderboard)) {
        console.log('Updating leaderboard from response:', data.leaderboard.length, 'entries');
        setLeaderboard(data.leaderboard);
      }
      if (typeof data.yourBest === 'number') {
        setYourBestScore(data.yourBest);
      }
      if (typeof data.yourRank === 'number') {
        setYourBestRank(data.yourRank);
      }

      // Always refresh to get latest leaderboard
      setTimeout(() => {
        console.log('Refreshing leaderboard after submission');
        fetchLeaderboard();
      }, 500);
    } catch (err) {
      console.error('Failed to submit leaderboard score', err);
      notify('Failed to submit score', 'error');
      // Still try to refresh
      setTimeout(() => fetchLeaderboard(), 500);
    }
  }, [API_ROOT, fetchLeaderboard]);

  // Responsive detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const pageStyle = { position: 'fixed', inset: 0, overflow: 'auto', background: 'var(--bg-secondary)', margin: 0, padding: 0, width: '100%', height: '100%', boxSizing: 'border-box' };
  const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '16px' : '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 12 : 0 };
  const backBtn = { background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, width: isMobile ? '100%' : 'auto' };

  // Load queue list every 5 seconds
  useEffect(() => {
    let mounted = true;
    async function loadList() {
      try {
        const res = await fetch(`${API_ROOT}queue_list.php?session_id=${encodeURIComponent(sessionId)}`, { credentials: 'include', headers: { Accept: 'application/json' } });
        if (!res.ok) { const txt = await res.text().catch(() => res.statusText); if (mounted) setError(`Failed to load queue list: ${txt}`); return; }
        const d = await res.json().catch(() => null);
        if (!d || !d.ok) { if (mounted) setError(`Failed to load queue list: ${d && d.error ? d.error : 'invalid json'}`); return; }
        if (mounted) setEntries(d.queue || []);
      } catch (e) { console.error(e); }
    }
    loadList();
    const t = setInterval(loadList, 5000);
    return () => { mounted = false; clearInterval(t); }
  }, [sessionId, API_ROOT]);

  // Bootstrap user session + polling
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const sres = await fetch(`${API_ROOT}check_session.php?t=${Date.now()}`, { method: 'GET', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
        if (!sres.ok) { setBooted(true); return; }
        const sdata = await sres.json().catch(() => null);
        if (!sdata || !sdata.loggedIn) { navigate('/'); return; }
        if (cancelled) return;
        setEmail(sdata.email);
        setUserId(sdata.user_id ?? null);

        const key = `queue_notes_session_${sessionId}`;
        try {
          const stored = localStorage.getItem(key);
          if (stored !== null && stored !== undefined && stored !== notesRef.current) {
            setNotes(stored);
            notesRef.current = stored;
          }
        } catch (e) { }

        await pollOnce();
        pollTimer.current = setInterval(pollOnce, 3000);

        try {
          const mres = await fetch(`${API_ROOT}office_hours_session_get.php?session_id=${encodeURIComponent(sessionId)}`, { credentials: 'include', headers: { Accept: 'application/json' } });
          if (mres.ok) {
            const md = await mres.json().catch(() => null);
            if (md && md.ok && md.session) {
              setSession(md.session);
              const uid = sdata.user_id ?? null;
              const role = sdata.role ?? '';
              let instructorMatch = uid && parseInt(md.session.instructor_id, 10) === Number(uid) && (role === 'professor' || role === 'ta');

              if (!instructorMatch) {
                try {
                  const pc = await fetch(`${API_ROOT}professor_courses.php`, { credentials: 'include', headers: { Accept: 'application/json' } });
                  if (pc.ok) {
                    const pcd = await pc.json().catch(() => null);
                    if (pcd && pcd.ok && Array.isArray(pcd.courses)) {
                      instructorMatch = pcd.courses.some(c => String(c.id) === String(md.session.course_id));
                    }
                  }
                } catch (e) { }
              }

              setIsInstructor(Boolean(instructorMatch));
            }
          }
        } catch (e) { }

      } catch (e) { console.error(e); if (!cancelled) setError(String(e)); }
      finally { if (!cancelled) setBooted(true); }
    }

    async function pollOnce() {
      try {
        const res = await fetch(`${API_ROOT}queue_status.php?session_id=${encodeURIComponent(sessionId)}&t=${Date.now()}`, { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
        if (!res.ok) { const txt = await res.text().catch(() => res.statusText); setError(`Failed to load queue status: ${txt}`); return; }
        const d = await res.json().catch(() => null);
        if (!d) { setError('Failed to parse queue status response'); return; }
        if (!d.ok) { setError(`Queue status error: ${d.error || 'unknown'}`); return; }

        if (typeof d.total === 'number') setTotalInQueue(d.total);
        setYourPosition(typeof d.position === 'number' ? d.position : null);
        if (typeof d.status === 'string') setStatus(d.status);

        if (typeof d.notes === 'string') {
          const key = `queue_notes_session_${sessionId}`;
          const currentLocal = localStorage.getItem(key) ?? '';
          if ((notesRef.current ?? '') === currentLocal) {
            setNotes(d.notes);
            notesRef.current = d.notes;
            localStorage.setItem(key, d.notes);
          }
        }
      } catch (e) { }
    }

    bootstrap();
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); cancelled = true; }
  }, [sessionId, navigate, API_ROOT]);

  // Load high score on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dino_high_score');
      if (saved) setHighScore(parseInt(saved, 10));

    } catch (e) { }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!gameOver) return;
    if (!email) return;
    const finalScore = Math.floor(gameScore / 10);
    if (finalScore <= 0) return;
    if (lastSubmittedScoreRef.current === finalScore) return;
    lastSubmittedScoreRef.current = finalScore;
    submitLeaderboardScore(finalScore);
  }, [gameOver, gameScore, email, submitLeaderboardScore]);

  useEffect(() => {
    if (gameActive && !gameOver) {
      lastSubmittedScoreRef.current = null;
    }
  }, [gameActive, gameOver]);

  // Dino game logic
  useEffect(() => {
    if (!gameActive || gameOver || isPaused) return;

    const GRAVITY = 0.6;
    const GROUND = 0;
    const DINO_WIDTH = 35;
    const DINO_HEIGHT = 35;
    const OBSTACLE_WIDTH = 15;
    const POWERUP_SIZE = 30;

    const containerWidth = gameContainerRef.current?.offsetWidth || 600;

    const gameLoop = () => {
      frameCountRef.current += 1;

      const scoreLevel = Math.floor(gameScore / 1000);
      const speedIncrease = scoreLevel * 0.5;
      const baseSpeed = (speedBoost ? 6 : 4) + speedIncrease;

      dinoVelocityRef.current -= GRAVITY;

      setDinoY(prevY => {
        const newY = prevY + dinoVelocityRef.current;
        if (newY <= GROUND) {
          dinoVelocityRef.current = 0;
          return GROUND;
        }
        return newY;
      });

      setObstacles(obs => {
        const updated = obs.map(o => ({ ...o, x: o.x - baseSpeed }))
          .filter(o => o.x > -50);

        const randomInterval = 60 + Math.floor(Math.random() * 40);
        if (frameCountRef.current % randomInterval === 0 && Math.random() > 0.3) {
          const obstacleType = Math.random() > 0.7 ? 'tall' : 'cactus';
          const height = obstacleType === 'tall' ? 60 : 40;
          updated.push({
            x: containerWidth,
            y: GROUND,
            width: OBSTACLE_WIDTH,
            height,
            type: obstacleType
          });
        }

        const birdInterval = 100 + Math.floor(Math.random() * 60);
        if (frameCountRef.current % birdInterval === 0 && Math.random() > 0.7) {
          const minSafeDistance = baseSpeed * 60 * 2.5;
          const hasNearbyObstacle = updated.some(o =>
            o.type !== 'bird' && Math.abs(o.x - containerWidth) < minSafeDistance
          );

          if (!hasNearbyObstacle) {
            updated.push({
              x: containerWidth,
              y: 60,
              width: 25,
              height: 25,
              type: 'bird'
            });
          }
        }

        return updated;
      });

      setPowerUps(pups => {
        const updated = pups.map(p => ({ ...p, x: p.x - baseSpeed }))
          .filter(p => p.x > -POWERUP_SIZE && !p.collected);

        if (frameCountRef.current % 250 === 0 && Math.random() > 0.4) {
          const powerUpType = Math.random() > 0.5 ? 'invincible' : 'speed';
          updated.push({
            x: containerWidth,
            y: 40 + Math.random() * 60,
            size: POWERUP_SIZE,
            type: powerUpType,
            collected: false
          });
        }

        return updated;
      });

      // Update particles
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        life: p.life - 1
      })).filter(p => p.life > 0));

      setGameScore(s => {
        const newScore = s + (speedBoost ? 2 : 1);
        const displayScore = Math.floor(newScore / 10);

        // Check for milestones
        if (displayScore > 0 && displayScore % 100 === 0 && Math.floor(s / 10) !== displayScore) {
          setMilestone(displayScore);
          setTimeout(() => setMilestone(null), 2000);
          playSound('milestone');
        }

        return newScore;
      });
    };

    gameLoopRef.current = setInterval(gameLoop, 1000 / 60);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameActive, gameOver, isPaused, isInvincible, speedBoost, gameScore]);

  // Collision detection
  useEffect(() => {
    if (!gameActive || gameOver || isPaused) return;

    const DINO_WIDTH = 35;
    const DINO_HEIGHT = 35;

    const collisionCheck = setInterval(() => {
      const padding = 3;
      const dinoLeft = 50 + padding;
      const dinoRight = 50 + DINO_WIDTH - padding;
      const dinoTop = dinoY + DINO_HEIGHT - padding;
      const dinoBottom = dinoY + padding;

      setPowerUps(pups => {
        return pups.map(pup => {
          if (pup.collected) return pup;

          const pupLeft = pup.x;
          const pupRight = pup.x + pup.size;
          const pupTop = pup.y + pup.size;
          const pupBottom = pup.y;

          if (dinoRight > pupLeft && dinoLeft < pupRight &&
            dinoTop > pupBottom && dinoBottom < pupTop) {

            // Create particles
            createParticles(pup.x + pup.size / 2, pup.y + pup.size / 2, pup.type);
            playSound('powerup');

            if (pup.type === 'invincible') {
              setIsInvincible(true);
              setTimeout(() => setIsInvincible(false), 3000);
            } else if (pup.type === 'speed') {
              setSpeedBoost(true);
              setTimeout(() => setSpeedBoost(false), 4000);
            }

            return { ...pup, collected: true };
          }
          return pup;
        });
      });

      if (!isInvincible) {
        setObstacles(obs => {
          for (const obstacle of obs) {
            const obsPadding = obstacle.type === 'bird' ? 2 : 3;
            const obsLeft = obstacle.x + obsPadding;
            const obsRight = obstacle.x + obstacle.width - obsPadding;
            const obsTop = obstacle.y + obstacle.height - obsPadding;
            const obsBottom = obstacle.y + obsPadding;

            if (dinoRight > obsLeft && dinoLeft < obsRight &&
              dinoTop > obsBottom && dinoBottom < obsTop) {
              setGameOver(true);
              setGameActive(false);
              playSound('gameover');

              // Save high score
              setGameScore(score => {
                const finalScore = Math.floor(score / 10);
                if (finalScore > highScore) {
                  setHighScore(finalScore);
                  try {
                    localStorage.setItem('dino_high_score', finalScore.toString());
                  } catch (e) { }
                }
                return score;
              });
              break;
            }
          }
          return obs;
        });
      }
    }, 1000 / 60);

    return () => clearInterval(collisionCheck);
  }, [gameActive, gameOver, isPaused, dinoY, isInvincible, highScore]);

  const createParticles = (x, y, type) => {
    const color = type === 'invincible' ? '#fbbf24' : '#3b82f6';
    const newParticles = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 20,
        color
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const playSound = (type) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'jump') {
        osc.frequency.value = 400;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'powerup') {
        osc.frequency.value = 600;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'gameover') {
        osc.frequency.value = 200;
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'milestone') {
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      // Audio not supported
    }
  };

  const handleJump = () => {
    if (dinoY === 0 && gameActive && !gameOver && !isPaused) {
      dinoVelocityRef.current = 12;
      playSound('jump');
    }
  };

  const togglePause = () => {
    if (gameActive && !gameOver) {
      setIsPaused(prev => !prev);
    }
  };

  const startGame = () => {
    setGameActive(true);
    setGameOver(false);
    setIsPaused(false);
    setDinoY(0);
    dinoVelocityRef.current = 0;
    setObstacles([]);
    setPowerUps([]);
    setParticles([]);
    setGameScore(0);
    setIsInvincible(false);
    setSpeedBoost(false);
    setMilestone(null);
    frameCountRef.current = 0;

    // 🔥 ADD THIS: Auto-focus the game container so spacebar works immediately
    setTimeout(() => {
      if (gameContainerRef.current) {
        gameContainerRef.current.focus();
      }
    }, 0);
  };

  async function saveNotes() {
    if (containsBadWord(notes)) {
      setAlertTitle("Warning");
      setAlertMessage("Do not use inappropriate language. Your note has not been saved");
      setAlertType("error");
      setAlertOpen(true);
      setNotes(""); // Clear the text box
      return;
    }

    const key = `queue_notes_session_${sessionId}`;
    localStorage.setItem(key, notes);
    setSaved(true);
    if (email) {
      try {
        await fetch(`${API_ROOT}queue_save_notes.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ session_id: sessionId, notes }) });
      } catch (e) { }
    }
  }

  async function leaveQueue() {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (email) {
      try {
        await fetch(`${API_ROOT}queue_leave.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ session_id: sessionId, user_email: email }) });
      } catch (e) { }
    }
    try { localStorage.removeItem(`queue_notes_session_${sessionId}`); } catch (e) { }
    setNotes(''); notesRef.current = ''; setSaved(false);
    navigate('/dashboard');
  }

  async function markAttendance(userEmail, status) {
    try {
      const body = { session_id: sessionId, user_email: userEmail, status };
      const res = await fetch(`${API_ROOT}queue_attendance.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('request failed');
      const d = await res.json().catch(() => null);
      if (d && d.ok) {
        setEntries(prev => {
          const copy = prev.slice();
          for (let i = 0; i < copy.length; i++) {
            if (copy[i].user_email === userEmail) { copy[i] = { ...copy[i], attendance: status }; break; }
          }
          return copy;
        });
        const student = entries.find(en => en.user_email === userEmail);
        const name = student ? (student.display_name || student.user_email) : userEmail;
        const verb = status === 'present' ? 'Marked present' : 'Marked absent';
        setAttendanceMsg(`${verb}: ${name}`);
        setTimeout(() => setAttendanceMsg(null), 3000);
      }
    } catch (e) { console.error('Failed to mark attendance:', e); }
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
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ session_id: sessionId, user_email: studentToRemove.email })
      });
      if (!res.ok) throw new Error('remove failed');
      const d = await res.json().catch(() => null);
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

  if (!booted) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: 'var(--text-primary)' }}>Office Hours • Session</h1>
        </div>
        <div style={{ maxWidth: '70rem', margin: '2rem auto', padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-secondary)' }}>Loading session…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: 'var(--text-primary)' }}>Office Hours • Session</h1>
        </div>
        <div style={{ maxWidth: '70rem', margin: '2rem auto', padding: '1.5rem' }}>
          <div style={{ color: 'var(--error-color)', fontWeight: 600 }}>Error loading session</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{String(error)}</div>
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
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: 'var(--text-primary)', width: isMobile ? '100%' : 'auto' }}>Session Queue • Professor View</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => {
              if (session) { setEditSessionData({ day_of_week: session.day_of_week || 'Monday', start_time: session.start_time || '12:00', end_time: session.end_time || '13:00', location: session.location || '' }); }
              setShowEditForm(true);
            }} style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 }} onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseOut={(e) => e.currentTarget.style.background = 'var(--card-bg)'}>Edit Session</button>
            <button onClick={() => navigate(-1)} style={backBtn} onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseOut={(e) => e.currentTarget.style.background = 'var(--card-bg)'}>Back</button>
          </div>
        </div>

        <div style={{ maxWidth: '70rem', margin: '0 auto', padding: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {session ? `${session.day_of_week ?? ''} ${session.start_time ?? ''}${session.end_time ? '–' + session.end_time : ''}` : '—'}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>{session && session.location ? session.location : '—'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{totalInQueue}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Total in Queue</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>

            {entries.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>No students in queue.</div>}

            {entries.map((e, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
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
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{e.display_name || e.user_email}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{e.notes || '(no note provided)'}</div>
                  </div>
                </div>

                {/* RIGHT SIDE: time + attendance buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: isMobile ? '100%' : 'auto', flexWrap: 'wrap' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {new Date(e.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {idx === 0 && (
                    <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
                      <button onClick={() => markAttendance(e.user_email, 'present')} style={{ background: e.attendance === 'present' ? '#166534' : '#bbf7d0', color: e.attendance === 'present' ? '#fff' : '#164e2e', border: 'none', padding: '0.5rem 0.75rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, flex: isMobile ? 1 : 'none' }}>Present</button>
                      <button onClick={() => markAttendance(e.user_email, 'absent')} style={{ background: e.attendance === 'absent' ? '#7f1d1d' : '#fecaca', color: e.attendance === 'absent' ? '#fff' : '#7f1d1d', border: 'none', padding: '0.5rem 0.75rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, flex: isMobile ? 1 : 'none' }}>Absent</button>
                      <button
                        onClick={() => initiateRemoveStudent(e.user_email, e.display_name || e.user_email)}
                        style={{
                          background: 'var(--card-bg)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
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
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: 12, borderRadius: 8 }}>
              <h2 style={{ marginTop: 0, marginBottom: 12, color: 'var(--text-primary)' }}>Edit Session</h2>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <select value={editSessionData.day_of_week} onChange={(e) => setEditSessionData(s => ({ ...s, day_of_week: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)', minWidth: 120 }}>
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                  <option>Sunday</option>
                </select>

                <input type='time' value={editSessionData.start_time} onChange={(e) => setEditSessionData(s => ({ ...s, start_time: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)', width: 120 }} />
                <input type='time' value={editSessionData.end_time} onChange={(e) => setEditSessionData(s => ({ ...s, end_time: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)', width: 120 }} />

                <input placeholder='Location' value={editSessionData.location} onChange={(e) => setEditSessionData(s => ({ ...s, location: e.target.value }))} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)', flex: 1, minWidth: 200 }} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => {
                  try {
                    const body = { session_id: sessionId, ...editSessionData };
                    const res = await fetch(`${API_ROOT}update_office_hours_session.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
                    if (!res.ok) throw new Error('update failed');
                    const d = await res.json().catch(() => null);
                    if (d && d.ok) {
                      const mres = await fetch(`${API_ROOT}office_hours_session_get.php?session_id=${encodeURIComponent(sessionId)}`, { credentials: 'include', headers: { Accept: 'application/json' } });
                      if (mres.ok) { const md = await mres.json().catch(() => null); if (md && md.ok && md.session) { setSession(md.session); } }
                      setShowEditForm(false);
                    }
                  } catch (e) { console.error('Failed to update session', e); }
                }} style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>Save</button>

                <button onClick={async () => {
                  const ok = await confirmDialog('Delete this session? This cannot be undone.');
                  if (!ok) return;
                  try {
                    const res = await fetch(`${API_ROOT}delete_office_hours_session.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ session_id: sessionId }) });
                    if (!res.ok) throw new Error('delete failed');
                    const d = await res.json().catch(() => null);
                    if (d && d.ok) {
                      navigate('/professorview');
                    }
                  } catch (e) { console.error('Failed to delete session', e); notify('Failed to delete session', 'error'); }
                }} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>Delete</button>

                <button onClick={() => setShowEditForm(false)} style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Remove confirmation modal */}
        {showRemoveModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={cancelRemoveStudent}>
            <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: '1.5rem', maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px var(--card-shadow)' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Remove Student from Queue?</h3>
              <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Are you sure you want to remove <strong>{studentToRemove?.name}</strong> from the queue?
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelRemoveStudent}
                  style={{
                    background: 'var(--card-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
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
  const panel = { background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: isMobile ? 16 : 20 };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: 'var(--text-primary)', width: isMobile ? '100%' : 'auto' }}>Office Hours • Session</h1>
        <button onClick={() => navigate(-1)} style={backBtn}>Back</button>
      </div>

      <div style={containerStyle}>
        <div style={colGrid}>

          {/* Queue status */}
          <div style={panel}>
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Queue Status</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <div>
                <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--text-primary)' }}>{yourPosition ?? '-'}</div>
                <div style={{ color: 'var(--text-secondary)' }}>Your Position</div>
              </div>
              <div>
                <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--text-primary)' }}>{totalInQueue}</div>
                <div style={{ color: 'var(--text-secondary)' }}>Total in Queue</div>
              </div>
            </div>
          </div>

          {/* Session details */}
          <div style={panel}>
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Session Details</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ color: 'var(--text-secondary)' }}>Time</div>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                {session ? `${session.day_of_week ?? ''} ${session.start_time ?? ''}${session.end_time ? '–' + session.end_time : ''}` : '—'}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>Location</div>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                {session?.location || '—'}
              </div>
              {/* ICS download: only show when the user is currently in the queue for this session */}
              {yourPosition !== null && session && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={downloadICS} style={{ background: '#eef2ff', color: '#1e40af', border: '1px solid #c7d2fe', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                    Download .ics
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {yourPosition !== null ? (
            <div style={panel}>
              <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Your Notes</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                <textarea
                  value={notes}
                  onChange={(e) => { const v = e.target.value; setNotes(v); notesRef.current = v; setSaved(false); }}
                  placeholder='Notes for your instructor'
                  style={{
                    width: '100%',
                    minHeight: 200,
                    borderRadius: 10,
                    padding: 12,
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />

                {saved && (
                  <div style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 8, background: '#dcfce7', color: '#166534', padding: '6px 8px', borderRadius: 999, fontWeight: 600, fontSize: '0.9rem', border: '1px solid #bbf7d0' }}>
                    ✓ Notes saved
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
                  <button onClick={saveNotes} style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontWeight: 600, border: 'none' }}>Save Notes</button>
                  <button onClick={leaveQueue} style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontWeight: 600, border: '1px solid #fecaca' }}>Leave Queue</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={panel}>
              <div style={{ color: 'var(--text-secondary)' }}>You are not in the queue.</div>
            </div>
          )}

        </div>

        {/* Dino Game - Only show if in queue */}
        {yourPosition !== null && (
          <div style={{ ...panel, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Waiting Game</h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {isInvincible && (
                  <div style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: 6, fontSize: '14px', fontWeight: 600 }}>
                    🐐 Invincible
                  </div>
                )}
                {speedBoost && (
                  <div style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: 6, fontSize: '14px', fontWeight: 600 }}>
                    🏎️ Speed Boost
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Score: {Math.floor(gameScore / 10)}
                  </div>
                  {highScore > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Best: {highScore}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              ref={gameContainerRef}
              onClick={handleJump}
              onKeyDown={(e) => {
                if (e.code === 'Space' || e.code === 'ArrowUp') {
                  e.preventDefault();
                  handleJump();
                } else if (e.code === 'KeyP' || e.code === 'Escape') {
                  e.preventDefault();
                  togglePause();
                }
              }}
              tabIndex={0}
              style={{
                position: 'relative',
                width: '100%',
                height: isMobile ? 200 : 250,
                background: '#f7f7f7',
                border: '2px solid #535353',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {/* Ground line */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 2,
                background: '#535353'
              }} />

              {/* Character */}
              <img
                src={characterImg}
                alt="character"
                style={{
                  position: 'absolute',
                  left: 50,
                  bottom: dinoY,
                  width: 40,
                  height: 40,
                  objectFit: 'cover',
                  borderRadius: '50%',
                  boxShadow: isInvincible ? '0 0 15px #fbbf24' : 'none',
                  filter: isInvincible ? 'brightness(1.3) saturate(1.5)' : 'none'
                }}
              />

              {/* Obstacles */}
              {obstacles.map((obs, idx) => (
                <div
                  key={`obs-${idx}`}
                  style={{
                    position: 'absolute',
                    left: obs.x,
                    bottom: obs.y,
                    width: obs.width,
                    height: obs.height,
                    transition: 'none'
                  }}
                >
                  {obs.type === 'bird' ? (
                    <img src={noEntryImg} alt="obstacle" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#535353', borderRadius: 2 }} />
                  )}
                </div>
              ))}

              {/* Power-ups */}
              {powerUps.map((pup, idx) => (
                !pup.collected && (
                  <div key={`pup-${idx}`} style={{ position: 'absolute', left: pup.x, bottom: pup.y, width: pup.size, height: pup.size, transition: 'none' }}>
                    <img
                      src={pup.type === 'invincible' ? goatImg : carImg}
                      alt="powerup"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', filter: `drop-shadow(0 0 8px ${pup.type === 'invincible' ? 'rgba(251,191,36,0.6)' : 'rgba(59,130,246,0.6)'})` }}
                    />
                  </div>
                )
              ))}

              {/* Particles */}
              {particles.map((p, idx) => (
                <div
                  key={`particle-${idx}`}
                  style={{
                    position: 'absolute',
                    left: p.x,
                    bottom: p.y,
                    width: 4,
                    height: 4,
                    background: p.color,
                    borderRadius: '50%',
                    opacity: p.life / 20
                  }}
                />
              ))}

              {/* Milestone notification */}
              {milestone && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '36px',
                  fontWeight: 800,
                  color: '#fbbf24',
                  textShadow: '0 0 10px rgba(0,0,0,0.5)',
                  animation: 'pulse 0.5s ease-in-out',
                  pointerEvents: 'none'
                }}>
                  {milestone}! 🎉
                </div>
              )}

              {/* Pause overlay */}
              {isPaused && gameActive && !gameOver && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16
                }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>PAUSED</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePause(); }}
                    style={{
                      background: '#535353',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Resume
                  </button>
                  <div style={{ fontSize: 14, color: '#ccc' }}>Press P or ESC to resume</div>
                </div>
              )}

              {/* Start/Game Over overlay */}
              {(!gameActive || gameOver) && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(247, 247, 247, 0.95)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12
                }}>
                  {gameOver && (
                    <>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#535353' }}>GAME OVER</div>
                      <div style={{ fontSize: 18, color: '#535353' }}>Score: {Math.floor(gameScore / 10)}</div>
                      {Math.floor(gameScore / 10) > highScore && (
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#16a34a' }}>🎉 New Record!</div>
                      )}
                      {highScore > 0 && Math.floor(gameScore / 10) <= highScore && (
                        <div style={{ fontSize: 14, color: '#737373' }}>Best: {highScore}</div>
                      )}
                    </>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); startGame(); }}
                    style={{
                      background: '#535353',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {gameOver ? 'Play Again' : 'Start Game'}
                  </button>
                  <div style={{ fontSize: 14, color: '#535353', textAlign: 'center', maxWidth: '90%' }}>
                    <div>Space/Click/↑ to jump • P to pause</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#737373' }}>
                      🐐 Invincibility • 🏎️ Speed Boost
                    </div>
                  </div>
                </div>
              )}

              {/* Pause button (visible during active game) */}
              {gameActive && !gameOver && !isPaused && (
                <button
                  onClick={(e) => { e.stopPropagation(); togglePause(); }}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'rgba(83, 83, 83, 0.8)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    zIndex: 10
                  }}
                >
                  ⏸ Pause
                </button>
              )}
            </div>
            <div style={{ marginTop: 20, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Global Leaderboard</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {yourBestScore !== null
                      ? `Your best: ${yourBestScore}${yourBestRank ? ` (rank #${yourBestRank})` : ''}`
                      : 'Play the game to earn a spot on the board!'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={fetchLeaderboard}
                    disabled={leaderboardLoading}
                    style={{
                      background: leaderboardLoading ? '#d1d5db' : '#eef2ff',
                      color: leaderboardLoading ? '#6b7280' : '#3730a3',
                      border: '1px solid #e0e7ff',
                      borderRadius: 8,
                      padding: '6px 12px',
                      cursor: leaderboardLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {leaderboardLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>

              {leaderboardError && (
                <div style={{ marginTop: 12, color: '#b91c1c', background: '#fee2e2', padding: 8, borderRadius: 8, fontSize: 13 }}>
                  {leaderboardError}
                </div>
              )}

              {!leaderboardError && (
                <div style={{ marginTop: 12 }}>
                  {leaderboard.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)' }}>No scores yet. Be the first!</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {leaderboard.map((entry) => {
                        const updatedLabel = entry.updated_at
                          ? new Date(entry.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          : '';
                        return (
                          <div
                            key={`${entry.rank}-${entry.name}-${entry.score}`}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              border: '1px solid var(--border-color)',
                              borderRadius: 8,
                              background: 'var(--bg-tertiary)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', minWidth: 32, textAlign: 'center' }}>
                                #{entry.rank}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.name}</div>
                                {updatedLabel && (
                                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{updatedLabel}</div>
                                )}
                              </div>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#166534' }}>{entry.score}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <CustomAlert
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
      />
    </div>
  );
}
