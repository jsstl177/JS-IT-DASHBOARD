import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Snackbar, Alert } from '@mui/material';
import { Responsive, WidthProvider } from 'react-grid-layout';
import axios from 'axios';
import NetworkStatus from './components/NetworkStatus';
import OpenTickets from './components/OpenTickets';
import AutomationLogs from './components/AutomationLogs';
import N8NExecutions from './components/N8NExecutions';
import ProxmoxStatus from './components/ProxmoxStatus';
import PowerBI from './components/PowerBI';
import EmployeeSetup from './components/EmployeeSetup';
import Settings from './components/Settings';
import Login from './components/Login';
import ThemeSelector from './components/ThemeSelector';
import ErrorBoundary from './components/ErrorBoundary';
import { themes } from './themes';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './App.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

function App() {
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'default');
  const [layout, setLayout] = useState([
    { i: 'network', x: 0, y: 0, w: 6, h: 4 },
    { i: 'tickets', x: 6, y: 0, w: 6, h: 4 },
    { i: 'employee-setup', x: 0, y: 4, w: 12, h: 6 },
    { i: 'logs', x: 0, y: 10, w: 6, h: 4 },
    { i: 'n8n', x: 6, y: 10, w: 6, h: 4 },
    { i: 'proxmox', x: 0, y: 14, w: 6, h: 4 },
    { i: 'powerbi', x: 6, y: 14, w: 6, h: 4 }
  ]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await axios.get('/api/dashboard/data');
      setDashboardData(response.data);
      setError(null);
      setLoading(false);
      setRetrying(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Retrying...');
      setLoading(false);

      // Auto-retry after 10 seconds
      setRetrying(true);
      setTimeout(() => {
        fetchDashboardData();
      }, 10000);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleLogin = (token) => {
    localStorage.setItem('authToken', token);
    setIsLoggedIn(true);
    setShowSettings(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
    setShowSettings(false);
  };

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    localStorage.setItem('theme', themeName);
  };

  const networkStatus = dashboardData.networkStatus || {};
  const openTickets = dashboardData.openTickets || {};
  const automationLogs = dashboardData.automationLogs || {};
  const n8nExecutions = dashboardData.n8nExecutions || {};
  const proxmoxStatus = dashboardData.proxmoxStatus || {};

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <ThemeProvider theme={themes[currentTheme]}>
      <CssBaseline />
      <div className="App">
        <header className="app-header">
          <h1>JS IT Dashboard</h1>
          <div className="header-actions">
            <ThemeSelector currentTheme={currentTheme} onThemeChange={handleThemeChange} />
            <button onClick={() => setShowSettings(!showSettings)}>
              {showSettings ? 'Dashboard' : 'Settings'}
            </button>
            {isLoggedIn && (
              <button onClick={handleLogout}>Logout</button>
            )}
          </div>
        </header>

        <Snackbar
          open={!!error}
          autoHideDuration={retrying ? null : 6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setError(null)} variant="filled">
            {error}
            {retrying && ' Auto-retrying...'}
          </Alert>
        </Snackbar>

        <main>
          {showSettings ? (
            isLoggedIn ? (
              <Settings onClose={() => setShowSettings(false)} />
            ) : (
              <Login onLogin={handleLogin} />
            )
          ) : (
            <ErrorBoundary>
              <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: layout }}
                onLayoutChange={(currentLayout) => setLayout(currentLayout)}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={30}
                isDraggable={true}
                isResizable={true}
              >
                <div key="network" className="dashboard-widget">
                  <NetworkStatus
                    data={networkStatus.items || []}
                    sourceUrl={networkStatus.sourceUrl}
                  />
                </div>
                <div key="tickets" className="dashboard-widget">
                  <OpenTickets
                    data={openTickets.items || []}
                    sourceUrl={openTickets.sourceUrl}
                  />
                </div>
                <div key="employee-setup" className="dashboard-widget">
                  <EmployeeSetup data={dashboardData.employeeSetup || []} />
                </div>
                <div key="logs" className="dashboard-widget">
                  <AutomationLogs
                    data={automationLogs.items || []}
                    sourceUrl={automationLogs.sourceUrl}
                  />
                </div>
                <div key="n8n" className="dashboard-widget">
                  <N8NExecutions
                    data={n8nExecutions.items || []}
                    sourceUrl={n8nExecutions.sourceUrl}
                  />
                </div>
                <div key="proxmox" className="dashboard-widget">
                  <ProxmoxStatus
                    data={proxmoxStatus.items || []}
                    sourceUrl={proxmoxStatus.sourceUrl}
                  />
                </div>
                <div key="powerbi" className="dashboard-widget">
                  <PowerBI data={dashboardData.powerbiInfo} />
                </div>
              </ResponsiveGridLayout>
            </ErrorBoundary>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
