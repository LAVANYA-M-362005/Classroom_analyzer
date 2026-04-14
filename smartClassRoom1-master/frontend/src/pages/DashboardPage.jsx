import React, { useState, useEffect, useRef } from 'react';
import { Activity, Volume2, Camera, Zap, Send } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import WebcamStream from '../components/WebcamStream';

/* ── Helpers ───────────────────────────────────── */
const EMOTION_META = {
  happy:    { emoji: '😊', color: '#10b981', label: 'Positive signal' },
  neutral:  { emoji: '😐', color: '#3b82f6', label: 'Baseline state' },
  focused:  { emoji: '🎯', color: '#8b5cf6', label: 'Deep focus' },
  confused: { emoji: '🤔', color: '#f59e0b', label: 'Needs clarification' },
  bored:    { emoji: '😑', color: '#ef4444', label: 'Low engagement' },
};

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

/* ── Main Dashboard Page ────────────────────────── */
const DashboardPage = () => {
  const [metrics, setMetrics] = useState({ attention: 0, emotion: 'neutral', noise: 0, faces: 0 });
  const [chartData, setChartData] = useState(Array.from({ length: 16 }, () => ({ time: '', attention: 0, noise: 0 })));
  const [wsStatus, setWsStatus] = useState('offline');
  const [health, setHealth] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hi! Ask me about classroom attention, emotion, noise, or the current analytics database.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/health')
      .then(res => res.json())
      .then(setHealth)
      .catch(() => setHealth(null));

    const connect = () => {
      const ws = new WebSocket('ws://localhost:8000/ws/stream');
      wsRef.current = ws;

      ws.onopen = () => setWsStatus('online');
      ws.onclose = () => {
        setWsStatus('offline');
        setTimeout(connect, 3500);
      };
      ws.onerror = () => setWsStatus('error');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) return;
          setMetrics({ attention: data.attention_level, emotion: data.emotion, noise: data.noise_level, faces: data.faces_detected });
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setChartData(prev => [...prev.slice(-19), { time, attention: data.attention_level, noise: data.noise_level }]);
        } catch (err) {
          console.warn('WS parse error', err);
        }
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  const emotionMeta = EMOTION_META[metrics.emotion] || EMOTION_META.neutral;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = async (message) => {
    if (!message?.trim() || chatLoading) return;
    const userMessage = { role: 'user', text: message.trim() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: message.trim() }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.answer || 'No response available.' }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Unable to reach backend chatbot. Ensure the API is running.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="dashboard-page" style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 22 }}>
        <h1>SmartClass Live Analytics</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: 780 }}>Live webcam analytics with face detection, emotion inference, attention scoring, noise sensing, and persistent session storage.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 24 }}>
        <div className="stat-card blue">
          <div className="stat-label">Attention</div>
          <div className="stat-value">{metrics.attention}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginLeft: 6 }}>%</span></div>
          <div className="stat-sub">Live focus score from camera inference</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Faces detected</div>
          <div className="stat-value">{metrics.faces}</div>
          <div className="stat-sub">Number of faces in the camera frame</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Emotion</div>
          <div className="stat-value" style={{ color: emotionMeta.color }}>{emotionMeta.emoji} {metrics.emotion}</div>
          <div className="stat-sub">Dominant student mood from vision model</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Noise</div>
          <div className="stat-value">{metrics.noise}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginLeft: 6 }}>dB</span></div>
          <div className="stat-sub">Estimated classroom audio level</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginBottom: 24 }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Camera size={18} /> <strong>Live Camera Feed</strong></div>
            <span style={{ color: wsStatus === 'online' ? '#22c55e' : wsStatus === 'offline' ? '#f97316' : '#ef4444' }}>{wsStatus.toUpperCase()}</span>
          </div>
          <div style={{ padding: 18 }}><WebcamStream wsRef={wsRef} /></div>
        </div>

        <div className="card" style={{ padding: 18, display: 'grid', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, lineHeight: 1 }}>{emotionMeta.emoji}</div>
            <div style={{ marginTop: 12, fontWeight: 700, color: emotionMeta.color, textTransform: 'capitalize' }}>{metrics.emotion}</div>
            <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>{emotionMeta.label}</div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}><span>Attention</span><strong>{metrics.attention}%</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}><span>Noise</span><strong>{metrics.noise} dB</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}><span>Detected faces</span><strong>{metrics.faces}</strong></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Zap size={18} /> <strong>Realtime trends</strong></div>
          <span style={{ color: 'var(--text-muted)' }}>Updated from live backend stream</span>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gAttn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNoise" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="attention" stroke="#3b82f6" fill="url(#gAttn)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="noise" stroke="#ef4444" fill="url(#gNoise)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 }}>
        <div className="card" style={{ padding: 18, minHeight: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Send size={18} /> <strong>Classroom Chatbot</strong></div>
            <span style={{ color: chatLoading ? '#f59e0b' : '#6b7280' }}>{chatLoading ? 'Waiting...' : 'Ready'}</span>
          </div>
          <div style={{ display: 'grid', gap: 10, marginBottom: 14, minHeight: 180, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
            {chatMessages.map((msg, index) => (
              <div key={index} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: 12, borderRadius: 14, background: msg.role === 'user' ? 'rgba(59,130,246,0.12)' : 'rgba(229,231,235,0.8)', color: '#111827' }}>
                <div style={{ fontSize: '0.82rem', marginBottom: 6, color: 'var(--text-muted)' }}>{msg.role === 'user' ? 'You' : 'Assistant'}</div>
                <div>{msg.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat(chatInput)}
              placeholder="Ask about attention, noise, or engagement..."
              style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.4)', outline: 'none' }}
            />
            <button
              onClick={() => sendChat(chatInput)}
              style={{ border: 'none', borderRadius: 12, padding: '10px 14px', background: '#2563eb', color: 'white', cursor: 'pointer' }}
            >Send</button>
          </div>
        </div>

        <div className="card" style={{ padding: 18, minHeight: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Activity size={18} /> <strong>Database Status</strong></div>
            <span style={{ color: 'var(--text-muted)' }}>SQLite</span>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>DB file</span><strong>{health?.database_file || 'smartclass.db'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Session records</span><strong>{health?.session_datapoints ?? '—'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>IoT packets</span><strong>{health?.virtual_iot_packets ?? '—'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cloud records</span><strong>{health?.cloud_records ?? '—'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>OpenCV</span><strong>{health?.cv2_available ? 'Yes' : 'No'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Transformer NLP</span><strong>{health?.hf_available ? 'Yes' : 'No'}</strong></div>
          </div>
          <div style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Open <code>backend/smartclass.db</code> with SQLite Browser or run <code>sqlite3 smartclass.db "SELECT * FROM session_log LIMIT 5;"</code> from backend folder.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
