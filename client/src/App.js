import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Snackbar, Alert, Box, Typography } from '@mui/material';
import { Responsive, WidthProvider } from 'react-grid-layout';
import axios from 'axios';
import NetworkStatus from './components/NetworkStatus';
import MonthlyUptime from './components/MonthlyUptime';
import OpenTickets from './components/OpenTickets';
import AutomationLogs from './components/AutomationLogs';
import N8NExecutions from './components/N8NExecutions';
import ProxmoxStatus from './components/ProxmoxStatus';
import PowerBI from './components/PowerBI';
import Alerts from './components/Alerts';
import Assets from './components/Assets';
import EmployeeSetup from './components/EmployeeSetup';
import SuperOpsDoc from './components/SuperOpsDoc';
import Settings from './components/Settings';
import Login from './components/Login';
import ThemeSelector from './components/ThemeSelector';
import ErrorBoundary from './components/ErrorBoundary';
import TabBar from './components/TabBar';
import { useDashboardTabs, MODULE_DISPLAY_NAMES } from './hooks/useDashboardTabs';
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
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'light');

  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    addTab,
    renameTab,
    deleteTab,
    updateTabLayout,
    moveModule,
    getUnassignedModules,
    addModuleToTab,
  } = useDashboardTabs();

  const getRefreshSeconds = () => {
    const stored = localStorage.getItem('refreshInterval');
    return stored ? Number(stored) : 60;
  };

  const [countdown, setCountdown] = useState(getRefreshSeconds());
  const [refreshSeconds, setRefreshSeconds] = useState(getRefreshSeconds());
  const refreshSecondsRef = useRef(getRefreshSeconds());

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

  // Data fetch interval — restarts when refreshSeconds changes
  useEffect(() => {
    fetchDashboardData();
    setCountdown(refreshSeconds);

    const dataInterval = setInterval(() => {
      fetchDashboardData();
      setCountdown(refreshSeconds);
    }, refreshSeconds * 1000);

    return () => clearInterval(dataInterval);
  }, [fetchDashboardData, refreshSeconds]);

  // 1-second tick for the countdown display
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Listen for localStorage changes (same tab via patched setItem, other tabs via storage event)
  useEffect(() => {
    const applyNewInterval = () => {
      const secs = getRefreshSeconds();
      refreshSecondsRef.current = secs;
      setRefreshSeconds(secs);
      setCountdown(secs);
    };

    const handleStorageEvent = (e) => {
      if (e.key === 'refreshInterval') applyNewInterval();
    };

    window.addEventListener('storage', handleStorageEvent);

    // Patch localStorage.setItem so same-tab writes also update the countdown
    const origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key, value) => {
      origSetItem(key, value);
      if (key === 'refreshInterval') applyNewInterval();
    };

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      localStorage.setItem = origSetItem;
    };
  }, []);

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
  const monthlyUptime = dashboardData.monthlyUptime || {};
  const openTickets = dashboardData.openTickets || {};
  const automationLogs = dashboardData.automationLogs || {};
  const n8nExecutions = dashboardData.n8nExecutions || {};
  const proxmoxStatus = dashboardData.proxmoxStatus || {};
  const alerts = dashboardData.alerts || {};
  const assets = dashboardData.assets || {};
  const superOpsDoc = dashboardData.superOpsDoc || {};

  const [resolvingAlerts, setResolvingAlerts] = useState(new Set());

  const handleResolveAlert = useCallback(async (alertId) => {
    try {
      const response = await axios.post('/api/dashboard/resolve-alert', { alertId });
      if (response.data.success) {
        setResolvingAlerts(prev => {
          const newSet = new Set(prev);
          newSet.delete(alertId);
          return newSet;
        });
        // Refresh dashboard data to update the alerts list
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      throw error;
    }
  }, [fetchDashboardData]);

  // Map of module key → rendered component
  const moduleComponents = {
    'network': (
      <NetworkStatus
        data={networkStatus.items || []}
        sourceUrl={networkStatus.sourceUrl}
        totalMonitors={networkStatus.totalMonitors || 0}
      />
    ),
    'monthly-uptime': (
      <MonthlyUptime
        data={monthlyUptime.items || []}
        sourceUrl={monthlyUptime.sourceUrl}
      />
    ),
    'tickets': (
      <OpenTickets
        data={openTickets.items || []}
        sourceUrl={openTickets.sourceUrl}
        totalCount={openTickets.totalCount || 0}
      />
    ),
    'alerts': (
      <Alerts
        data={alerts.items || []}
        sourceUrl={alerts.sourceUrl}
        totalCount={alerts.totalCount || 0}
        onResolve={handleResolveAlert}
      />
    ),
    'assets': (
      <Assets
        data={assets.items || []}
        sourceUrl={assets.sourceUrl}
        totalCount={assets.totalCount || 0}
      />
    ),
    'employee-setup': (
      <EmployeeSetup data={dashboardData.employeeSetup || []} />
    ),
    'logs': (
      <AutomationLogs
        data={automationLogs.items || []}
        status={automationLogs.status}
        sourceUrl={automationLogs.sourceUrl}
      />
    ),
    'n8n': (
      <N8NExecutions
        data={n8nExecutions.items || []}
        sourceUrl={n8nExecutions.sourceUrl}
      />
    ),
    'proxmox': (
      <ProxmoxStatus
        data={proxmoxStatus.items || []}
        sourceUrl={proxmoxStatus.sourceUrl}
      />
    ),
    'powerbi': (
      <PowerBI data={dashboardData.powerbiInfo} />
    ),
    'superops-doc': (
      <SuperOpsDoc data={superOpsDoc} />
    ),
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <ThemeProvider theme={themes[currentTheme] || themes.light}>
      <CssBaseline />
      <div className="App">
        <header className="app-header">
          <div className="header-brand">
            <img src="/logo.png" alt="Johnstone Supply" className="header-logo" />
            <div className="header-title">
              <h1>Johnstone Supply - The Wines Group</h1>
              <span className="header-subtitle">IT Dashboard</span>
            </div>
          </div>
          <span className="refresh-countdown">Refresh in {countdown}s</span>
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
            <>
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onTabChange={setActiveTabId}
                onAddTab={addTab}
                onRenameTab={renameTab}
                onDeleteTab={deleteTab}
                onMoveModule={moveModule}
                onAddModuleToTab={addModuleToTab}
                unassignedModules={getUnassignedModules()}
                moduleDisplayNames={MODULE_DISPLAY_NAMES}
              />
              <ErrorBoundary>
                {activeTab.modules.length > 0 ? (
                  <ResponsiveGridLayout
                    key={activeTabId}
                    className="layout"
                    layouts={{ lg: activeTab.layout }}
                    onLayoutChange={(currentLayout) => {
                      updateTabLayout(activeTabId, currentLayout);
                    }}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={30}
                    isDraggable={true}
                    isResizable={true}
                    draggableCancel="a,button,input,textarea,select,.MuiAccordionSummary-root,.MuiCheckbox-root,.MuiIconButton-root,.MuiChip-root,.MuiTab-root"
                  >
                    {activeTab.modules.map((moduleKey) => (
                      <div key={moduleKey} className="dashboard-widget">
                        {moduleComponents[moduleKey]}
                      </div>
                    ))}
                  </ResponsiveGridLayout>
                ) : (
                  <Box className="tab-empty-state">
                    <ViewModuleEmpty />
                  </Box>
                )}
              </ErrorBoundary>
            </>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}

function ViewModuleEmpty() {
  return (
    <>
      <Typography variant="h6" color="text.secondary">
        No modules on this tab
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Use the <MoreVertIcon /> menu to manage modules, or add modules from another tab.
      </Typography>
    </>
  );
}

// Inline the icon for the empty state hint
function MoreVertIcon() {
  return (
    <span style={{ verticalAlign: 'middle', display: 'inline-flex' }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="19" r="2" />
      </svg>
    </span>
  );
}

export default App;
