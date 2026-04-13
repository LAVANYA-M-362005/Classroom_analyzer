import React, { useState } from 'react';
import {
  Camera, Mic, Cloud, BrainCircuit, Bell, Shield,
  Monitor, Wifi, Database, Zap, Server
} from 'lucide-react';

const Toggle = ({ on, onToggle }) => (
  <div className={`toggle ${on ? 'on' : ''}`} onClick={onToggle} role="switch" aria-checked={on}>
    <div className="toggle-knob" />
  </div>
);

const SYSTEM_ARCH = [
  { icon: '📷', label: 'Camera\nSensor',   color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  { icon: '🎤', label: 'Microphone\nSensor', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  { icon: '🤖', label: 'Deep\nLearning',   color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  { icon: '☁️', label: 'Cloud\nPlatform',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { icon: '📊', label: 'Dashboard\n& NLP',  color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
];

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    cameraEnabled:    true,
    micEnabled:       true,
    cloudSync:        true,
    nlpEnabled:       true,
    alertsEnabled:    true,
    autoReport:       false,
    darkMode:         true,
    noiseAlert:       true,
    facePrivacy:      false,
    autoSave:         true,
  });

  const [apiKey, setApiKey] = useState('');
  const [threshold, setThreshold] = useState(50);
  const [noiseThresh, setNoiseThresh] = useState(65);

  const toggle = (key) => setSettings(s => ({ ...s, [key]: !s[key] }));

  const TOGGLE_SECTIONS = [
    {
      title: 'Sensors', icon: <Camera size={16} />, items: [
        { key: 'cameraEnabled', label: 'Camera Feed', desc: 'Enable live classroom camera stream for face detection & emotion analysis' },
        { key: 'micEnabled',    label: 'Microphone',  desc: 'Enable audio capture for real-time noise level monitoring' },
      ]
    },
    {
      title: 'AI & Processing', icon: <BrainCircuit size={16} />, items: [
        { key: 'nlpEnabled',   label: 'NLP Assistant',       desc: 'Enable Gemini-powered natural language query interface' },
        { key: 'facePrivacy',  label: 'Privacy Mode',        desc: 'Blur faces in recordings; only engagement metrics are stored' },
      ]
    },
    {
      title: 'Cloud & Data', icon: <Cloud size={16} />, items: [
        { key: 'cloudSync',   label: 'Cloud Sync',      desc: 'Continuously upload session data to cloud for historical analytics' },
        { key: 'autoSave',    label: 'Auto Save',       desc: 'Automatically save session reports at end of class' },
        { key: 'autoReport',  label: 'Auto Reports',    desc: 'Generate and email weekly engagement summary reports' },
      ]
    },
    {
      title: 'Notifications', icon: <Bell size={16} />, items: [
        { key: 'alertsEnabled', label: 'Engagement Alerts', desc: 'Notify when class-wide attention drops below threshold' },
        { key: 'noiseAlert',    label: 'Noise Alerts',      desc: 'Notify when classroom noise exceeds the configured limit' },
      ]
    },
  ];

  return (
    <>
      {/* System Architecture */}
      <div className="card fade-in" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title"><Server size={18} /> System Architecture</div>
          <div className="card-badge green">OPERATIONAL</div>
        </div>
        <div className="architecture-flow">
          {SYSTEM_ARCH.map((node, i) => (
            <React.Fragment key={i}>
              <div className="arch-node" style={{ borderColor: `${node.color}30` }}>
                <div className="arch-icon" style={{ background: node.bg, fontSize: '1.6rem' }}>
                  {node.icon}
                </div>
                <div className="arch-label" style={{ whiteSpace: 'pre-line', color: node.color }}>{node.label}</div>
              </div>
              {i < SYSTEM_ARCH.length - 1 && (
                <div className="arch-arrow">→</div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* System Status */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 20 }}>
          {[
            { icon: <Camera size={15} />,      label: 'Camera',      status: settings.cameraEnabled, color: '#3b82f6' },
            { icon: <Mic size={15} />,         label: 'Microphone',  status: settings.micEnabled,    color: '#8b5cf6' },
            { icon: <BrainCircuit size={15} />, label: 'AI Model',   status: true,                   color: '#10b981' },
            { icon: <Cloud size={15} />,        label: 'Cloud',      status: settings.cloudSync,     color: '#f59e0b' },
            { icon: <Wifi size={15} />,         label: 'WebSocket',  status: true,                   color: '#ec4899' },
          ].map(item => (
            <div key={item.label} style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: item.status ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${item.status ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center'
            }}>
              <div style={{ color: item.status ? item.color : '#ef4444' }}>{item.icon}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.label}</div>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: item.status ? '#10b981' : '#ef4444',
                boxShadow: item.status ? '0 0 6px #10b981' : '0 0 6px #ef4444'
              }} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2 fade-in-1">
        {/* Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {TOGGLE_SECTIONS.map(section => (
            <div key={section.title} className="card">
              <div className="card-header" style={{ marginBottom: 12 }}>
                <div className="card-title" style={{ fontSize: '0.9rem' }}>
                  {section.icon} {section.title}
                </div>
              </div>
              {section.items.map(item => (
                <div key={item.key} className="toggle-row">
                  <div className="toggle-info">
                    <h4>{item.label}</h4>
                    <p>{item.desc}</p>
                  </div>
                  <Toggle on={settings[item.key]} onToggle={() => toggle(item.key)} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Config Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* API Key */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Shield size={18} /> API Configuration</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                Gemini API Key
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  id="gemini-api-key-input"
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIza…"
                  style={{
                    flex: 1, padding: '10px 14px',
                    borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'var(--bg-input)', color: 'white',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', outline: 'none'
                  }}
                />
                <button id="save-api-key-btn" style={{
                  padding: '10px 18px', borderRadius: 10,
                  background: 'var(--grad-blue)', border: 'none',
                  color: 'white', fontWeight: 600, fontSize: '0.85rem',
                  cursor: 'pointer', fontFamily: 'Inter', whiteSpace: 'nowrap'
                }}>Save Key</button>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 6 }}>
                Get your free key at <span style={{ color: 'var(--blue-light)' }}>aistudio.google.com</span>
              </div>
            </div>

            <div className="divider" />

            {/* Attention Threshold */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Attention Alert Threshold</label>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6' }}>{threshold}%</span>
              </div>
              <input
                id="attention-threshold-slider"
                type="range" min={20} max={90} value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
                <span>20%</span><span>90%</span>
              </div>
            </div>

            {/* Noise Threshold */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Noise Alert Threshold</label>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>{noiseThresh} dB</span>
              </div>
              <input
                id="noise-threshold-slider"
                type="range" min={30} max={100} value={noiseThresh}
                onChange={e => setNoiseThresh(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
                <span>30 dB</span><span>100 dB</span>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="card">
            <div className="card-header"><div className="card-title"><Zap size={18} /> About the System</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Platform',    'Smart Classroom Engagement Analyzer'],
                ['Version',     'v1.0.0'],
                ['Backend',     'FastAPI + Python 3.11'],
                ['AI Model',    'ViT Face Expression + Gemini Flash'],
                ['Frontend',    'React + Vite + Recharts'],
                ['Protocol',    'WebSocket (live) + REST API'],
                ['Data',        'Cloud-synced, encrypted at rest'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['IoT', 'Deep Learning', 'Cloud', 'NLP', 'Computer Vision'].map(t => (
                <span key={t} className="tag blue">{t}</span>
              ))}
            </div>
          </div>

          {/* Quick Docs */}
          <div className="card">
            <div className="card-header"><div className="card-title"><Database size={18} /> How It Works</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.83rem', color: 'var(--text-muted)' }}>
              {[
                { num: '01', text: 'Camera and microphone capture live classroom data at configurable intervals' },
                { num: '02', text: 'Deep learning models (ViT) detect faces and classify emotions in real-time' },
                { num: '03', text: 'Attention & engagement metrics are computed and streamed via WebSocket' },
                { num: '04', text: 'Results are stored in the cloud and visualised on the interactive dashboard' },
                { num: '05', text: 'Teachers query analytics in natural language via the Gemini-powered assistant' },
              ].map(item => (
                <div key={item.num} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 800, color: 'var(--blue)', fontSize: '0.7rem', minWidth: 20, marginTop: 2 }}>{item.num}</span>
                  <span style={{ lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
