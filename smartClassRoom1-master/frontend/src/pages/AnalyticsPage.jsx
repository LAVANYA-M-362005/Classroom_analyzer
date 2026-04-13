import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Clock, Users, Activity, AlertCircle } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(13,22,48,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
          <span style={{ color: 'var(--text-muted)' }}>{p.name}</span>
        </div>
      ))}
    </div>
  );
};

/* Generate mock hourly data for a school day */
const generateHourlyData = () => {
  const hours = ['8:00','8:30','9:00','9:30','10:00','10:30','11:00','11:30','12:00','12:30','1:00','1:30','2:00','2:30','3:00'];
  return hours.map((h, i) => ({
    time: h,
    attention:  55 + Math.round(Math.sin(i * 0.6) * 20 + Math.random() * 15),
    engagement: 50 + Math.round(Math.cos(i * 0.5) * 18 + Math.random() * 15),
    noise:      30 + Math.round(Math.random() * 40),
    faces:      Math.round(18 + Math.random() * 8),
  }));
};

const weeklyData = [
  { day: 'Mon', attention: 75, engagement: 80, noise: 42, sessions: 4 },
  { day: 'Tue', attention: 82, engagement: 85, noise: 38, sessions: 5 },
  { day: 'Wed', attention: 68, engagement: 70, noise: 58, sessions: 4 },
  { day: 'Thu', attention: 90, engagement: 92, noise: 35, sessions: 6 },
  { day: 'Fri', attention: 85, engagement: 88, noise: 40, sessions: 5 },
];

const radarData = [
  { subject: 'Attention',   A: 82 },
  { subject: 'Engagement',  A: 78 },
  { subject: 'Quiet',       A: 70 },
  { subject: 'Participation', A: 65 },
  { subject: 'Focus',       A: 88 },
  { subject: 'Mood',        A: 74 },
];

const emotionTimeData = [
  { time: '8:00',  happy: 30, focused: 40, neutral: 20, bored: 10 },
  { time: '9:00',  happy: 25, focused: 50, neutral: 15, bored: 10 },
  { time: '10:00', happy: 35, focused: 45, neutral: 12, bored:  8 },
  { time: '11:00', happy: 20, focused: 35, neutral: 25, bored: 20 },
  { time: '12:00', happy: 15, focused: 25, neutral: 30, bored: 30 },
  { time: '1:00',  happy: 28, focused: 42, neutral: 20, bored: 10 },
  { time: '2:00',  happy: 32, focused: 48, neutral: 15, bored:  5 },
  { time: '3:00',  happy: 30, focused: 44, neutral: 18, bored:  8 },
];

const METRICS_SUMMARY = [
  { label: 'Avg Attention',    value: '80%',   change: '+3.2%',  up: true,  color: '#3b82f6' },
  { label: 'Avg Engagement',   value: '83%',   change: '+5.1%',  up: true,  color: '#8b5cf6' },
  { label: 'Peak Noise',       value: '58 dB', change: '-2 dB',  up: true,  color: '#10b981' },
  { label: 'Total Sessions',   value: '24',    change: '+4',     up: true,  color: '#f59e0b' },
  { label: 'Avg Faces/Class',  value: '22',    change: '+1',     up: true,  color: '#06b6d4' },
  { label: 'Distraction Evts', value: '14',    change: '-6',     up: true,  color: '#ec4899' },
];

const INSIGHTS = [
  { type: 'success', icon: '✅', text: 'Thursday had the highest engagement at 92% — correlates with group activity sessions.' },
  { type: 'warning', icon: '⚠️', text: 'Wednesday shows a 14% dip in attention. Consider introducing interactive content mid-week.' },
  { type: 'info',    icon: '📊', text: 'Emotion data shows peak focus at 10:00–11:00 AM. Schedule complex topics in this window.' },
  { type: 'danger',  icon: '🔔', text: 'Noise exceeded 55 dB on 3 occasions this week. Review seating arrangement.' },
];

const AnalyticsPage = () => {
  const [hourly] = useState(generateHourlyData);
  const [activeWeek, setActiveWeek] = useState('This Week');

  return (
    <>
      {/* ── Summary Stat Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }} className="fade-in">
        {METRICS_SUMMARY.map(m => (
          <div key={m.label} className="stat-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: '0.72rem', color: m.up ? 'var(--green)' : 'var(--red)', marginTop: 4, fontWeight: 600 }}>
              {m.up ? '↑' : '↓'} {m.change} vs last week
            </div>
          </div>
        ))}
      </div>

      {/* ── Weekly + Radar ── */}
      <div className="grid-65-35 fade-in-1">
        <div className="card">
          <div className="card-header">
            <div className="card-title"><TrendingUp size={18} /> Weekly Attention vs Engagement</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['This Week', 'Last Week'].map(w => (
                <button key={w} onClick={() => setActiveWeek(w)} style={{
                  padding: '4px 12px', borderRadius: 8, border: '1px solid',
                  borderColor: activeWeek === w ? 'var(--blue)' : 'rgba(255,255,255,0.08)',
                  background: activeWeek === w ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: activeWeek === w ? 'var(--blue-light)' : 'var(--text-muted)',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter'
                }}>{w}</button>
              ))}
            </div>
          </div>
          <div className="chart-wrap-tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" stroke="#3d4f7a" tick={{ fill: '#6b7db3', fontSize: 12 }} />
                <YAxis stroke="#3d4f7a" domain={[0, 100]} tick={{ fill: '#6b7db3', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#6b7db3', fontSize: '0.8rem' }} />
                <Bar dataKey="attention"  name="Attention %"  fill="#3b82f6" radius={[8,8,0,0]} />
                <Bar dataKey="engagement" name="Engagement %"  fill="#8b5cf6" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><Activity size={18} /> Classroom Health Radar</div>
          </div>
          <div className="chart-wrap-tall" style={{ display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="rgba(255,255,255,0.07)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7db3', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#3d4f7a', fontSize: 9 }} />
                <Radar dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Hourly Trend ── */}
      <div className="card fade-in-2" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title"><Clock size={18} /> Today's Hourly Attention Trend</div>
          <div className="card-badge blue">TODAY</div>
        </div>
        <div className="chart-wrap-tall">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourly}>
              <defs>
                <linearGradient id="lAttn" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="lEng" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" stroke="#3d4f7a" tick={{ fill: '#6b7db3', fontSize: 10 }} />
              <YAxis stroke="#3d4f7a" domain={[0, 100]} tick={{ fill: '#6b7db3', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#6b7db3', fontSize: '0.8rem' }} />
              <Line type="monotone" dataKey="attention"  stroke="url(#lAttn)" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="engagement" stroke="url(#lEng)"  strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Emotion Stack + Insights ── */}
      <div className="grid-2 fade-in-3">
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Users size={18} /> Emotion Distribution Over Time</div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emotionTimeData} stackOffset="expand">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" stroke="#3d4f7a" tick={{ fill: '#6b7db3', fontSize: 10 }} />
                <YAxis stroke="#3d4f7a" tickFormatter={v => `${Math.round(v * 100)}%`} tick={{ fill: '#6b7db3', fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#6b7db3', fontSize: '0.8rem' }} />
                <Area type="monotone" dataKey="focused" stackId="1" stroke="#8b5cf6" fill="rgba(139,92,246,0.5)"   />
                <Area type="monotone" dataKey="happy"   stackId="1" stroke="#10b981" fill="rgba(16,185,129,0.5)"   />
                <Area type="monotone" dataKey="neutral" stackId="1" stroke="#3b82f6" fill="rgba(59,130,246,0.4)"   />
                <Area type="monotone" dataKey="bored"   stackId="1" stroke="#ef4444" fill="rgba(239,68,68,0.35)"   />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><AlertCircle size={18} /> AI Insights</div>
            <div className="card-badge purple">AUTO-GENERATED</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {INSIGHTS.map((ins, i) => (
              <div key={i} className={`alert-box ${ins.type}`} style={{ marginBottom: 8 }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{ins.icon}</span>
                <span>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default AnalyticsPage;
