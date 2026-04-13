import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, Volume2, Smile, Users, Camera,
  BrainCircuit, Send, TrendingUp, Zap
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import WebcamStream from '../components/WebcamStream';

/* ── Helpers ───────────────────────────────────── */
const EMOTION_META = {
  happy:    { emoji: '😊', color: '#10b981', label: 'Positive signal' },
  neutral:  { emoji: '😐', color: '#3b82f6', label: 'Baseline state' },
  focused:  { emoji: '🎯', color: '#8b5cf6', label: 'Deep focus' },
  confused: { emoji: '🤔', color: '#f59e0b', label: 'Needs clarification' },
  bored:    { emoji: '😑', color: '#ef4444', label: 'Low engagement' },
};

const SUGGESTIONS = [
  'What is the current engagement level?',
  'Which students seem distracted?',
  'Summarize today\'s session',
  'How is the noise level?',
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(13,22,48,0.96)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
          <span style={{ color: 'var(--text-muted)' }}>{p.name}</span>
        </div>
      ))}
    </div>
  );
};

const RadialGauge = ({ value, max = 100, color, size = 100 }) => {
  const r   = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(value / max, 1);
  const dash = pct * circ;

  return (
    <div className="ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div className="ring-text">
        <div className="rt-val" style={{ color }}>{value}</div>
        <div className="rt-unit">/ {max}</div>
      </div>
    </div>
  );
};

/* ── Main Dashboard Page ────────────────────────── */
const DashboardPage = ({ wsStatus, setWsStatus, metrics, setMetrics }) => {
  const [chartData, setChartData]     = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({ time: '', attention: 0, noise: 0, engagement: 0 }))
  );
  const [histData, setHistData]       = useState(null);
  const [nlpQuery, setNlpQuery]       = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'ai', text: '👋 Hello! I\'m your SmartClass AI assistant. Ask me anything about student engagement, noise levels, or classroom dynamics!' }
  ]);
  const [isSending, setIsSending]     = useState(false);
  const wsRef                         = useRef(null);
  const chatEndRef                    = useRef(null);

  /* WebSocket */
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('ws://localhost:8000/ws/stream');
      wsRef.current = ws;
      ws.onopen  = () => setWsStatus('online');
      ws.onclose = () => { setWsStatus('offline'); setTimeout(connect, 3500); };
      ws.onerror = () => setWsStatus('error');
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.error) return;
          setMetrics({ attention: d.attention_level, emotion: d.emotion, noise: d.noise_level, faces: d.faces_detected });
          const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setChartData(prev => {
            const next = [...prev, { time: t, attention: d.attention_level, noise: d.noise_level, engagement: Math.round((d.attention_level + (100 - d.noise_level)) / 2) }];
            return next.length > 30 ? next.slice(-30) : next;
          });
        } catch (_) {}
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, []); // eslint-disable-line

  /* Historical */
  useEffect(() => {
    fetch('http://localhost:8000/api/metrics/historical')
      .then(r => r.json()).then(setHistData).catch(() => {});
  }, []);

  /* Chat scroll */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  const sendQuery = async (q) => {
    const question = (q || nlpQuery).trim();
    if (!question || isSending) return;
    setChatHistory(p => [...p, { sender: 'user', text: question }]);
    setNlpQuery('');
    setIsSending(true);
    try {
      const res  = await fetch('http://localhost:8000/api/query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      setChatHistory(p => [...p, { sender: 'ai', text: data.answer }]);
    } catch {
      setChatHistory(p => [...p, { sender: 'ai', text: '❌ Backend unreachable. Make sure the FastAPI server is running on port 8000.' }]);
    } finally { setIsSending(false); }
  };

  const eMeta     = EMOTION_META[metrics.emotion] || EMOTION_META.neutral;
  const histBars  = histData
    ? histData.labels.map((day, i) => ({ day, attention: histData.attention[i], engagement: histData.engagement[i] }))
    : [];

  return (
    <>
      {/* ── Stat Cards ── */}
      <div className="stats-grid fade-in">
        <div className="stat-card blue">
          <div className="stat-icon blue"><Activity size={20} /></div>
          <div className="stat-label">Attention Level</div>
          <div className="stat-value" style={{ color: '#60a5fa' }}>{metrics.attention}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginLeft: 4 }}>%</span></div>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{ width: `${metrics.attention}%`, background: 'linear-gradient(90deg,#3b82f6,#06b6d4)' }} />
          </div>
          <div className={`stat-sub ${metrics.attention > 70 ? 'up' : 'down'}`} style={{ marginTop: 8 }}>
            {metrics.attention > 70 ? '↑ High engagement' : '↓ Low engagement'}
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon green"><Users size={20} /></div>
          <div className="stat-label">Faces Detected</div>
          <div className="stat-value" style={{ color: '#6ee7b7' }}>{metrics.faces}</div>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{ width: `${Math.min(metrics.faces * 10, 100)}%`, background: 'linear-gradient(90deg,#10b981,#06b6d4)' }} />
          </div>
          <div className="stat-sub up" style={{ marginTop: 8 }}>Active in frame</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon purple"><Smile size={20} /></div>
          <div className="stat-label">Dominant Emotion</div>
          <div className="stat-value" style={{ color: eMeta.color, fontSize: '1.6rem', textTransform: 'capitalize', marginTop: 4 }}>
            {eMeta.emoji} {metrics.emotion}
          </div>
          <div style={{ marginTop: 8, fontSize: '0.78rem', fontWeight: 600, color: eMeta.color }}>{eMeta.label}</div>
        </div>

        <div className="stat-card amber">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d' }}><Volume2 size={20} /></div>
          <div className="stat-label">Noise Level</div>
          <div className="stat-value" style={{ color: metrics.noise > 65 ? '#fca5a5' : '#fcd34d' }}>
            {metrics.noise}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginLeft: 4 }}>dB</span>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{ width: `${metrics.noise}%`, background: metrics.noise > 65 ? 'linear-gradient(90deg,#ef4444,#f59e0b)' : 'linear-gradient(90deg,#10b981,#f59e0b)' }} />
          </div>
          <div className={`stat-sub ${metrics.noise > 65 ? 'down' : 'up'}`} style={{ marginTop: 8 }}>
            {metrics.noise > 65 ? '⚠ High noise' : '✓ Acceptable level'}
          </div>
        </div>
      </div>

      {/* ── Camera + Realtime Chart ── */}
      <div className="grid-65-35 fade-in-1">
        {/* Camera Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Camera size={18} /> Live Camera Feed</div>
            <div className="card-badge green">STREAMING</div>
          </div>
          <WebcamStream wsRef={wsRef} />

          {/* Mini info row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {[
              { label: 'FACES', val: metrics.faces, color: '#10b981' },
              { label: 'ATTN', val: `${metrics.attention}%`, color: '#3b82f6' },
              { label: 'EMOTION', val: metrics.emotion, color: eMeta.color },
              { label: 'NOISE', val: `${metrics.noise}dB`, color: metrics.noise > 65 ? '#ef4444' : '#10b981' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 10,
                padding: '10px 8px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color, textTransform: 'capitalize' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gauges */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <div className="card-header" style={{ width: '100%' }}>
            <div className="card-title"><Zap size={18} /> Live Metrics</div>
          </div>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <RadialGauge value={metrics.attention} color="#3b82f6" size={110} />
              <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Attention</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <RadialGauge value={metrics.noise} color={metrics.noise > 65 ? '#ef4444' : '#10b981'} size={110} />
              <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Noise dB</div>
            </div>
          </div>
          <div style={{
            width: '100%',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 12,
            padding: '14px 16px',
            border: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 6 }}>{eMeta.emoji}</div>
            <div style={{ fontWeight: 700, textTransform: 'capitalize', color: eMeta.color }}>{metrics.emotion}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{eMeta.label}</div>
          </div>
        </div>
      </div>

      {/* ── Real-Time Attention Chart ── */}
      <div className="card fade-in-2" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title"><Activity size={18} /> Real-Time Attention & Noise</div>
          <div className="card-badge blue">LIVE</div>
        </div>
        <div className="chart-wrap-tall">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gAttn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNoise" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" stroke="#3d4f7a" tick={{ fill: '#6b7db3', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis stroke="#3d4f7a" domain={[0, 100]} tick={{ fill: '#6b7db3', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#6b7db3', fontSize: '0.8rem' }} />
              <Area type="monotone" dataKey="attention" stroke="#3b82f6" fill="url(#gAttn)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="noise"     stroke="#ef4444" fill="url(#gNoise)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Historical + NLP ── */}
      <div className="grid-2 fade-in-3">
        {/* Historical Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><TrendingUp size={18} /> Weekly Engagement</div>
            <div className="card-badge purple">HISTORY</div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histBars} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" stroke="#3d4f7a" tick={{ fill: '#6b7db3', fontSize: 11 }} />
                <YAxis stroke="#3d4f7a" domain={[0, 100]} tick={{ fill: '#6b7db3', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#6b7db3', fontSize: '0.8rem' }} />
                <Bar dataKey="attention"  fill="#3b82f6" radius={[6,6,0,0]} />
                <Bar dataKey="engagement" fill="#8b5cf6" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NLP Chat */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><BrainCircuit size={18} /> AI Assistant</div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Powered by Gemini</span>
          </div>

          {/* Suggestions */}
          <div className="chat-suggestions" style={{ marginBottom: 10 }}>
            {SUGGESTIONS.map((s, i) => (
              <div key={i} className="suggestion-chip" onClick={() => sendQuery(s)}>{s}</div>
            ))}
          </div>

          {/* Chat feed */}
          <div className="chat-feed">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`msg ${msg.sender}`}>{msg.text}</div>
            ))}
            {isSending && (
              <div className="msg ai thinking">
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-row">
            <input
              id="chat-input"
              className="chat-input"
              placeholder='Ask about engagement, attention, students…'
              value={nlpQuery}
              onChange={e => setNlpQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendQuery()}
            />
            <button id="chat-send-btn" className="chat-send-btn" onClick={() => sendQuery()} disabled={isSending}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
