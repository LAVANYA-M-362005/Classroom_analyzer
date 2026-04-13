import React from 'react';
import {
  LayoutDashboard, TrendingUp, Users, Settings,
  BrainCircuit, Wifi, WifiOff, AlertTriangle, Zap
} from 'lucide-react';

const NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'analytics', icon: TrendingUp,      label: 'Analytics' },
  { id: 'students',  icon: Users,           label: 'Students'  },
  { id: 'settings',  icon: Settings,        label: 'Settings'  },
];

const Sidebar = ({ activePage, onNavigate, wsStatus, metrics }) => {
  const statusData = {
    online:  { label: 'Connected',    color: 'online', Icon: Wifi },
    offline: { label: 'Disconnected', color: 'offline', Icon: WifiOff },
    error:   { label: 'Error',        color: 'warn',   Icon: AlertTriangle },
  }[wsStatus] || { label: 'Connecting…', color: 'warn', Icon: AlertTriangle };

  const engLevel = metrics.attention > 75 ? 'High' : metrics.attention > 50 ? 'Medium' : 'Low';
  const engColor = metrics.attention > 75 ? '#10b981' : metrics.attention > 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <BrainCircuit size={22} color="white" />
        </div>
        <div className="sidebar-brand-text">
          <h2>SmartClass AI</h2>
          <span>Engagement Analyzer</span>
        </div>
      </div>

      {/* Nav Section */}
      <div className="sidebar-section-label">Navigation</div>
      {NAV.map(({ id, icon: Icon, label }) => (
        <div
          key={id}
          className={`nav-item ${activePage === id ? 'active' : ''}`}
          onClick={() => onNavigate(id)}
          id={`nav-${id}`}
        >
          <Icon size={18} className="nav-icon" />
          <span>{label}</span>
        </div>
      ))}

      {/* Live Metrics Section */}
      <div className="sidebar-section-label" style={{ marginTop: 28 }}>Live Metrics</div>

      <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Attention</span>
          <span style={{ color: engColor, fontWeight: 600 }}>{metrics.attention}%</span>
        </div>
        <div className="stat-bar" style={{ height: 5 }}>
          <div
            className="stat-bar-fill"
            style={{
              width: `${metrics.attention}%`,
              background: `linear-gradient(90deg, #3b82f6, #06b6d4)`,
            }}
          />
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span>Noise Level</span>
          <span style={{ color: metrics.noise > 65 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{metrics.noise} dB</span>
        </div>
        <div className="stat-bar" style={{ height: 5 }}>
          <div
            className="stat-bar-fill"
            style={{
              width: `${metrics.noise}%`,
              background: metrics.noise > 65 ? 'linear-gradient(90deg,#ef4444,#f59e0b)' : 'linear-gradient(90deg, #10b981, #06b6d4)',
            }}
          />
        </div>

        <div style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Emotion</span>
          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{metrics.emotion}</span>
        </div>

        <div style={{
          marginTop: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}>
          <span>Engagement</span>
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: engColor }}>{engLevel}</span>
        </div>
      </div>

      {/* Status */}
      <div className="sidebar-status">
        <div className="status-row">
          <span className="status-label">Stream</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', color: wsStatus === 'online' ? 'var(--green)' : wsStatus === 'error' ? 'var(--amber)' : 'var(--red)' }}>
              {statusData.label}
            </span>
            <div className={`status-dot ${statusData.color}`} />
          </div>
        </div>
        <div className="status-row">
          <span className="status-label">AI Model</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--green)' }}>Active</span>
            <div className="status-dot online" />
          </div>
        </div>
        <div className="status-row">
          <span className="status-label">Faces Detected</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{metrics.faces}</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
