import React, { useState } from 'react';
import { Search, Filter, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const STUDENTS = [
  { id: 1, name: 'Arjun Kumar',    seat: 'A1', attention: 88, engagement: 91, emotion: 'focused',  sessions: 18, trend: 'up',   lastActive: '2 min ago' },
  { id: 2, name: 'Priya Sharma',   seat: 'A2', attention: 72, engagement: 75, emotion: 'neutral',  sessions: 22, trend: 'up',   lastActive: '1 min ago' },
  { id: 3, name: 'Rahul Singh',    seat: 'B1', attention: 45, engagement: 40, emotion: 'bored',    sessions: 15, trend: 'down', lastActive: '5 min ago' },
  { id: 4, name: 'Sneha Patel',    seat: 'B2', attention: 95, engagement: 97, emotion: 'happy',    sessions: 20, trend: 'up',   lastActive: 'Just now'  },
  { id: 5, name: 'Karan Mehta',    seat: 'C1', attention: 60, engagement: 55, emotion: 'confused', sessions: 17, trend: 'flat', lastActive: '3 min ago' },
  { id: 6, name: 'Divya Nair',     seat: 'C2', attention: 82, engagement: 85, emotion: 'focused',  sessions: 21, trend: 'up',   lastActive: '1 min ago' },
  { id: 7, name: 'Vikram Reddy',   seat: 'D1', attention: 38, engagement: 35, emotion: 'bored',    sessions: 12, trend: 'down', lastActive: '8 min ago' },
  { id: 8, name: 'Anjali Verma',   seat: 'D2', attention: 79, engagement: 80, emotion: 'neutral',  sessions: 19, trend: 'flat', lastActive: '2 min ago' },
  { id: 9, name: 'Suresh Babu',    seat: 'E1', attention: 91, engagement: 93, emotion: 'happy',    sessions: 23, trend: 'up',   lastActive: 'Just now'  },
  { id: 10, name: 'Meera Joshi',   seat: 'E2', attention: 55, engagement: 50, emotion: 'neutral',  sessions: 14, trend: 'down', lastActive: '6 min ago' },
];

const EMOTION_COLORS = {
  happy: '#10b981', focused: '#8b5cf6', neutral: '#3b82f6', confused: '#f59e0b', bored: '#ef4444'
};

const EMOTION_EMOJIS = {
  happy: '😊', focused: '🎯', neutral: '😐', confused: '🤔', bored: '😑'
};

const AVATAR_COLORS = [
  ['#3b82f6','#1e40af'], ['#8b5cf6','#4c1d95'], ['#10b981','#064e3b'],
  ['#f59e0b','#78350f'], ['#ef4444','#7f1d1d'], ['#06b6d4','#164e63'],
  ['#ec4899','#831843'], ['#84cc16','#365314'], ['#f97316','#7c2d12'], ['#a855f7','#4a044e']
];

const getEngLevel = (val) => val > 75 ? 'high' : val > 50 ? 'medium' : 'low';
const getEngLabel = (val) => val > 75 ? 'High' : val > 50 ? 'Medium' : 'Low';

const weekData = (base) =>
  ['Mon','Tue','Wed','Thu','Fri'].map(day => ({
    day,
    attention: Math.max(10, Math.min(100, base + Math.round((Math.random() - 0.5) * 30)))
  }));

const StudentDetail = ({ student, onClose }) => {
  const [wData] = useState(() => weekData(student.attention));
  const eColor  = EMOTION_COLORS[student.emotion] || '#3b82f6';
  const [ac, bg] = AVATAR_COLORS[(student.id - 1) % AVATAR_COLORS.length];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(5,10,24,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
        padding: 32, maxWidth: 480, width: '90%', backdropFilter: 'blur(16px)',
        animation: 'msg-in 0.25s ease'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div className="student-avatar" style={{ width: 56, height: 56, fontSize: '1.2rem', background: `linear-gradient(135deg, ${ac}, ${bg})` }}>
            {student.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{student.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 3 }}>Seat {student.seat} · {student.sessions} sessions attended</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem', padding: 4 }}>✕</button>
        </div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Attention',   val: `${student.attention}%`, color: '#3b82f6' },
            { label: 'Engagement',  val: `${student.engagement}%`, color: '#8b5cf6' },
            { label: 'Emotion',     val: `${EMOTION_EMOJIS[student.emotion]} ${student.emotion}`, color: eColor },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontWeight: 700, color: m.color, fontSize: '1rem', textTransform: 'capitalize' }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* Weekly chart */}
        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 12, color: 'var(--text-muted)' }}>Weekly Attention</div>
        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={wData}>
              <XAxis dataKey="day" stroke="#3d4f7a" tick={{ fill: '#6b7db3', fontSize: 10 }} />
              <YAxis stroke="#3d4f7a" domain={[0, 100]} tick={{ fill: '#6b7db3', fontSize: 9 }} />
              <Tooltip contentStyle={{ background: 'rgba(13,22,48,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} />
              <Bar dataKey="attention" fill={ac} radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recommendation */}
        <div className={`alert-box ${student.attention < 50 ? 'danger' : student.attention < 70 ? 'warning' : 'success'}`} style={{ marginTop: 16 }}>
          <span>{student.attention < 50 ? '⚠️ This student shows low engagement. Consider direct interaction or changing seating.' : student.attention < 70 ? '📌 Moderate engagement. Review preferred topics to boost motivation.' : '✅ Excellent engagement levels. This student is a positive classroom influence.'}</span>
        </div>
      </div>
    </div>
  );
};

const StudentsPage = ({ metrics }) => {
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = STUDENTS.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || getEngLevel(s.attention) === filter;
    return matchSearch && matchFilter;
  });

  const avgAttn = Math.round(STUDENTS.reduce((a, s) => a + s.attention, 0) / STUDENTS.length);
  const highEng = STUDENTS.filter(s => s.attention > 75).length;
  const lowEng  = STUDENTS.filter(s => s.attention < 50).length;

  return (
    <>
      {selected && <StudentDetail student={selected} onClose={() => setSelected(null)} />}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }} className="fade-in">
        {[
          { label: 'Total Students', val: STUDENTS.length, color: '#3b82f6', sub: 'In session' },
          { label: 'Avg Attention',  val: `${avgAttn}%`,   color: '#8b5cf6', sub: 'Class average' },
          { label: 'High Engaged',   val: highEng,          color: '#10b981', sub: '>75% attention' },
          { label: 'Needs Attention', val: lowEng,          color: '#ef4444', sub: '<50% attention' },
        ].map(m => (
          <div key={m.label} className="stat-card">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: m.color }}>{m.val}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }} className="fade-in-1">
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            id="student-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students…"
            style={{
              width: '100%', padding: '11px 16px 11px 40px',
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
              background: 'var(--bg-input)', color: 'var(--text-main)',
              fontFamily: 'Inter', fontSize: '0.9rem', outline: 'none'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all','high','medium','low'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '10px 16px', borderRadius: 10, border: '1px solid',
              borderColor: filter === f ? 'var(--blue)' : 'rgba(255,255,255,0.08)',
              background: filter === f ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: filter === f ? 'var(--blue-light)' : 'var(--text-muted)',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter',
              textTransform: 'capitalize'
            }}>{f === 'all' ? 'All' : `${f} Eng.`}</button>
          ))}
        </div>
      </div>

      {/* Student List */}
      <div className="card fade-in-2">
        <div className="card-header">
          <div className="card-title"><Filter size={18} /> Student Roster ({filtered.length})</div>
          <div className="card-badge blue">LIVE MONITORING</div>
        </div>

        {filtered.map((s, i) => {
          const [ac, bg] = AVATAR_COLORS[(s.id - 1) % AVATAR_COLORS.length];
          const eng = getEngLevel(s.attention);
          const TrendIcon = s.trend === 'up' ? TrendingUp : s.trend === 'down' ? TrendingDown : Minus;
          const trendColor = s.trend === 'up' ? '#10b981' : s.trend === 'down' ? '#ef4444' : '#f59e0b';

          return (
            <div
              key={s.id}
              className="student-card"
              style={{ animationDelay: `${i * 0.03}s` }}
              onClick={() => setSelected(s)}
              id={`student-${s.id}`}
            >
              <div className="student-avatar" style={{ background: `linear-gradient(135deg, ${ac}, ${bg})` }}>
                {s.name.split(' ').map(n => n[0]).join('')}
              </div>

              <div className="student-info">
                <div className="student-name">{s.name}</div>
                <div className="student-meta">Seat {s.seat} · {EMOTION_EMOJIS[s.emotion]} {s.emotion} · {s.lastActive}</div>
              </div>

              {/* Attention mini-bar */}
              <div style={{ width: 100 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>Attention</span><span style={{ fontWeight: 700, color: EMOTION_COLORS[s.emotion] }}>{s.attention}%</span>
                </div>
                <div className="mini-progress">
                  <div className="mini-progress-fill" style={{ width: `${s.attention}%`, background: `linear-gradient(90deg, ${ac}, ${bg})` }} />
                </div>
              </div>

              <div className="student-metrics">
                <div className={`eng-chip ${eng}`}>{getEngLabel(s.attention)}</div>
                <TrendIcon size={16} color={trendColor} />
              </div>

              <ChevronRight size={16} color="var(--text-dim)" />
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No students match your search
          </div>
        )}
      </div>
    </>
  );
};

export default StudentsPage;
