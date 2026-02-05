import { useState, useCallback } from 'react';

const STORAGE_KEY = 'dashboardTabs';
const OLD_LAYOUT_KEY = 'dashboardLayout';

export const ALL_MODULE_KEYS = [
  'network', 'monthly-uptime', 'weekly-uptime', 'tickets', 'alerts', 'assets',
  'employee-setup', 'logs', 'n8n', 'proxmox', 'powerbi', 'superops-doc', 'custom-links'
];

export const MODULE_DISPLAY_NAMES = {
  'network': 'Network Status',
  'monthly-uptime': 'Monthly Uptime',
  'weekly-uptime': 'Weekly Uptime',
  'tickets': 'Open Cases',
  'alerts': 'Alerts',
  'assets': 'Assets',
  'employee-setup': 'Employee Setup',
  'logs': 'Automation Logs',
  'n8n': 'N8N Executions',
  'proxmox': 'Proxmox Status',
  'powerbi': 'KPI / Power BI',
  'superops-doc': 'SuperOps Documentation',
  'custom-links': 'Custom Links'
};

// Storage key for custom module names
const CUSTOM_MODULE_NAMES_KEY = 'customModuleNames';

// Get custom module names from localStorage
function getCustomModuleNames() {
  try {
    const raw = localStorage.getItem(CUSTOM_MODULE_NAMES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {}
  return null;
}

// Save custom module names to localStorage
function saveCustomModuleNames(names) {
  localStorage.setItem(CUSTOM_MODULE_NAMES_KEY, JSON.stringify(names));
}

// Get display name for a module (custom if available, otherwise default)
function getModuleDisplayName(moduleKey) {
  const customNames = getCustomModuleNames();
  if (customNames && customNames[moduleKey]) {
    return customNames[moduleKey];
  }
  return MODULE_DISPLAY_NAMES[moduleKey] || moduleKey;
}

// Update a custom module name
function updateCustomModuleName(moduleKey, newName) {
  const customNames = getCustomModuleNames() || {};
  customNames[moduleKey] = newName.trim() || MODULE_DISPLAY_NAMES[moduleKey] || moduleKey;
  saveCustomModuleNames(customNames);
}

// Reset custom module names to defaults
function resetCustomModuleNames() {
  localStorage.removeItem(CUSTOM_MODULE_NAMES_KEY);
}

const DEFAULT_LAYOUT = [
  { i: 'network', x: 0, y: 0, w: 6, h: 4 },
  { i: 'monthly-uptime', x: 6, y: 0, w: 6, h: 6 },
  { i: 'weekly-uptime', x: 0, y: 4, w: 6, h: 4 },
  { i: 'tickets', x: 6, y: 4, w: 6, h: 4 },
  { i: 'alerts', x: 0, y: 8, w: 6, h: 4 },
  { i: 'assets', x: 6, y: 8, w: 6, h: 6 },
  { i: 'employee-setup', x: 0, y: 14, w: 6, h: 6 },
  { i: 'logs', x: 0, y: 20, w: 6, h: 4 },
  { i: 'n8n', x: 6, y: 20, w: 6, h: 4 },
  { i: 'proxmox', x: 0, y: 24, w: 6, h: 4 },
  { i: 'powerbi', x: 6, y: 24, w: 6, h: 4 },
  { i: 'superops-doc', x: 0, y: 28, w: 12, h: 10 },
];

function generateId() {
  return 'tab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

function createDefaultState(layout) {
  const defaultTabId = generateId();
  return {
    activeTabId: defaultTabId,
    tabs: [
      {
        id: defaultTabId,
        name: 'Dashboard',
        modules: [...ALL_MODULE_KEYS],
        layout: layout || DEFAULT_LAYOUT,
      },
    ],
  };
}

// Add any newly-registered modules that aren't on any tab to the first tab.
function migrateNewModules(state) {
  const assigned = new Set(state.tabs.flatMap((t) => t.modules));
  const missing = ALL_MODULE_KEYS.filter((key) => !assigned.has(key));
  if (missing.length === 0) return state;

  const firstTab = state.tabs[0];
  const bottomY = getBottomY(firstTab.layout);
  const newLayout = missing.map((mod, idx) => ({
    i: mod,
    x: (idx % 2) * 6,
    y: bottomY + Math.floor(idx / 2) * 4,
    w: 6,
    h: 4,
  }));

  const updatedFirst = {
    ...firstTab,
    modules: [...firstTab.modules, ...missing],
    layout: [...firstTab.layout, ...newLayout],
  };

  return {
    ...state,
    tabs: state.tabs.map((t) => (t.id === updatedFirst.id ? updatedFirst : t)),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
        return migrateNewModules(parsed);
      }
    }
  } catch {}

  // Migrate from legacy layout key
  try {
    const legacyRaw = localStorage.getItem(OLD_LAYOUT_KEY);
    if (legacyRaw) {
      const legacyLayout = JSON.parse(legacyRaw);
      if (Array.isArray(legacyLayout) && legacyLayout.length > 0) {
        const state = createDefaultState(legacyLayout);
        localStorage.removeItem(OLD_LAYOUT_KEY);
        return state;
      }
    }
  } catch {}

  return createDefaultState(DEFAULT_LAYOUT);
}

function persist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getBottomY(layout) {
  if (!layout || layout.length === 0) return 0;
  return Math.max(...layout.map((item) => item.y + item.h));
}

export function useDashboardTabs() {
  const [state, setState] = useState(loadState);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0];

  const update = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persist(next);
      return next;
    });
  }, []);

  const setActiveTabId = useCallback((tabId) => {
    update((prev) => ({ ...prev, activeTabId: tabId }));
  }, [update]);

  const addTab = useCallback((name) => {
    const newTab = {
      id: generateId(),
      name: name.trim() || 'New Tab',
      modules: [],
      layout: [],
    };
    update((prev) => ({
      ...prev,
      tabs: [...prev.tabs, newTab],
    }));
  }, [update]);

  const renameTab = useCallback((tabId, newName) => {
    update((prev) => ({
      ...prev,
      tabs: prev.tabs.map((t) =>
        t.id === tabId ? { ...t, name: newName.trim() || t.name } : t
      ),
    }));
  }, [update]);

  const deleteTab = useCallback((tabId) => {
    update((prev) => {
      if (prev.tabs.length <= 1) return prev;

      const tabToDelete = prev.tabs.find((t) => t.id === tabId);
      if (!tabToDelete) return prev;

      const remainingTabs = prev.tabs.filter((t) => t.id !== tabId);
      const firstTab = remainingTabs[0];

      // Move orphaned modules to the first remaining tab
      const orphanedModules = tabToDelete.modules;
      const bottomY = getBottomY(firstTab.layout);
      const orphanedLayout = orphanedModules.map((mod, idx) => ({
        i: mod,
        x: (idx % 2) * 6,
        y: bottomY + Math.floor(idx / 2) * 4,
        w: 6,
        h: 4,
      }));

      const updatedFirst = {
        ...firstTab,
        modules: [...firstTab.modules, ...orphanedModules],
        layout: [...firstTab.layout, ...orphanedLayout],
      };

      const newTabs = remainingTabs.map((t) =>
        t.id === updatedFirst.id ? updatedFirst : t
      );

      return {
        activeTabId: prev.activeTabId === tabId ? newTabs[0].id : prev.activeTabId,
        tabs: newTabs,
      };
    });
  }, [update]);

  const updateTabLayout = useCallback((tabId, newLayout) => {
    update((prev) => ({
      ...prev,
      tabs: prev.tabs.map((t) => {
        if (t.id !== tabId) return t;
        // Only keep layout items for modules on this tab
        const filtered = newLayout.filter((item) => t.modules.includes(item.i));
        return { ...t, layout: filtered };
      }),
    }));
  }, [update]);

  const moveModule = useCallback((moduleKey, fromTabId, toTabId) => {
    if (fromTabId === toTabId) return;
    update((prev) => ({
      ...prev,
      tabs: prev.tabs.map((t) => {
        if (t.id === fromTabId) {
          return {
            ...t,
            modules: t.modules.filter((m) => m !== moduleKey),
            layout: t.layout.filter((item) => item.i !== moduleKey),
          };
        }
        if (t.id === toTabId) {
          const bottomY = getBottomY(t.layout);
          return {
            ...t,
            modules: [...t.modules, moduleKey],
            layout: [
              ...t.layout,
              { i: moduleKey, x: 0, y: bottomY, w: 6, h: 4 },
            ],
          };
        }
        return t;
      }),
    }));
  }, [update]);

  const addModuleToTab = useCallback((moduleKey, tabId) => {
    update((prev) => {
      // Check the module isn't already on another tab
      const alreadyOn = prev.tabs.find((t) => t.modules.includes(moduleKey));
      if (alreadyOn) return prev;

      return {
        ...prev,
        tabs: prev.tabs.map((t) => {
          if (t.id !== tabId) return t;
          const bottomY = getBottomY(t.layout);
          return {
            ...t,
            modules: [...t.modules, moduleKey],
            layout: [
              ...t.layout,
              { i: moduleKey, x: 0, y: bottomY, w: 6, h: 4 },
            ],
          };
        }),
      };
    });
  }, [update]);

  const getUnassignedModules = useCallback(() => {
    const assigned = new Set(state.tabs.flatMap((t) => t.modules));
    return ALL_MODULE_KEYS.filter((key) => !assigned.has(key));
  }, [state.tabs]);

  const reorderTabs = useCallback((oldIndex, newIndex) => {
    update((prev) => {
      if (oldIndex < 0 || oldIndex >= prev.tabs.length) return prev;
      if (newIndex < 0 || newIndex >= prev.tabs.length) return prev;
      if (oldIndex === newIndex) return prev;

      const newTabs = [...prev.tabs];
      const [movedTab] = newTabs.splice(oldIndex, 1);
      newTabs.splice(newIndex, 0, movedTab);

      return { ...prev, tabs: newTabs };
    });
  }, [update]);

  // Module name management
  const updateModuleDisplayName = useCallback((moduleKey, newName) => {
    updateCustomModuleName(moduleKey, newName);
  }, []);

  const resetModuleDisplayNames = useCallback(() => {
    resetCustomModuleNames();
  }, []);

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    activeTab,
    setActiveTabId,
    addTab,
    renameTab,
    deleteTab,
    updateTabLayout,
    moveModule,
    getUnassignedModules,
    addModuleToTab,
    reorderTabs,
    updateModuleDisplayName,
    resetModuleDisplayNames,
  };
}

// Export helper functions for direct use
export { getModuleDisplayName, updateCustomModuleName, resetCustomModuleNames };
