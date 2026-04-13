import React from 'react';
import { Download, RefreshCw, Bell } from 'lucide-react';

const Topbar = ({ page, wsStatus }) => {
  const isLive = wsStatus === 'online';

  return (
    <div className="topbar">
      <div className="topbar-title">
        <h1>{page?.title || 'Dashboard'}</h1>
        <p>{page?.subtitle}</p>
      </div>

      <div className="topbar-actions">
        {isLive && (
          <div className="live-chip">
            <div className="dot" />
            LIVE
          </div>
        )}

        <button className="topbar-btn" title="Refresh data" id="topbar-refresh-btn">
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>

        <button className="topbar-btn" title="Notifications" id="topbar-notification-btn">
          <Bell size={15} />
          <span>Alerts</span>
        </button>

        <button className="topbar-btn primary" title="Export report" id="topbar-export-btn">
          <Download size={15} />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
};

export default Topbar;
