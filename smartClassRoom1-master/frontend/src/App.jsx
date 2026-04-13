import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import StudentsPage from './pages/StudentsPage';
import SettingsPage from './pages/SettingsPage';

const PAGE_TITLES = {
  dashboard:  { title: 'Classroom Overview', subtitle: 'Real-time AI-powered engagement analytics · Session active' },
  analytics:  { title: 'Analytics & Reports', subtitle: 'Historical trends, heatmaps & performance breakdowns' },
  students:   { title: 'Student Profiles', subtitle: 'Individual engagement tracking & behavioural insights' },
  settings:   { title: 'System Settings', subtitle: 'Configure sensors, models, and notification preferences' },
};

function App() {
  const [page, setPage] = useState('dashboard');
  const [wsStatus, setWsStatus] = useState('offline');
  const [metrics, setMetrics] = useState({ attention: 72, emotion: 'neutral', noise: 45, faces: 3 });

  const renderPage = () => {
    switch (page) {
      case 'dashboard':  return <DashboardPage  wsStatus={wsStatus} setWsStatus={setWsStatus} metrics={metrics} setMetrics={setMetrics} />;
      case 'analytics':  return <AnalyticsPage  />;
      case 'students':   return <StudentsPage   metrics={metrics} />;
      case 'settings':   return <SettingsPage   />;
      default:           return <DashboardPage  wsStatus={wsStatus} setWsStatus={setWsStatus} metrics={metrics} setMetrics={setMetrics} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setPage} wsStatus={wsStatus} metrics={metrics} />
      <div className="main">
        <Topbar page={PAGE_TITLES[page]} wsStatus={wsStatus} />
        <div className="page-content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default App;
