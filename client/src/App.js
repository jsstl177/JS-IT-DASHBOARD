import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
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
import { themes } from './themes';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './App.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

function App() {
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/data');
      setDashboardData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

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

        <main>
          {showSettings ? (
            isLoggedIn ? (
              <Settings onClose={() => setShowSettings(false)} />
            ) : (
              <Login onLogin={handleLogin} />
            )
          ) : (
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
                <NetworkStatus data={dashboardData.networkStatus || []} />
              </div>
              <div key="tickets" className="dashboard-widget">
                <OpenTickets data={dashboardData.openTickets || []} />
              </div>
              <div key="employee-setup" className="dashboard-widget">
                <EmployeeSetup data={dashboardData.employeeSetup || []} />
              </div>
              <div key="logs" className="dashboard-widget">
                <AutomationLogs data={dashboardData.automationLogs || []} />
              </div>
              <div key="n8n" className="dashboard-widget">
                <N8NExecutions data={dashboardData.n8nExecutions || []} />
              </div>
              <div key="proxmox" className="dashboard-widget">
                <ProxmoxStatus data={dashboardData.proxmoxStatus || []} />
              </div>
              <div key="powerbi" className="dashboard-widget">
                <PowerBI data={dashboardData.powerbiInfo} />
              </div>
            </ResponsiveGridLayout>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
