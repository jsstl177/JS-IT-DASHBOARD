import { useState, useCallback } from 'react';

const STORAGE_KEY = 'settingsLayout';

const SETTINGS_MODULE_KEYS = [
  'current-configs',
  'add-edit-service',
  'dashboard-settings',
  'password-change',
  'user-management'
];

const SETTINGS_MODULE_DISPLAY_NAMES = {
  'current-configs': 'Current Configurations',
  'add-edit-service': 'Add/Edit Service',
  'dashboard-settings': 'Dashboard Settings',
  'password-change': 'Change Password',
  'user-management': 'User Management'
};

const DEFAULT_LAYOUT = [
  { i: 'current-configs', x: 0, y: 0, w: 6, h: 6 },
  { i: 'add-edit-service', x: 6, y: 0, w: 6, h: 8 },
  { i: 'dashboard-settings', x: 0, y: 6, w: 6, h: 4 },
  { i: 'password-change', x: 6, y: 8, w: 6, h: 6 },
  { i: 'user-management', x: 0, y: 10, w: 12, h: 8 }
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  return DEFAULT_LAYOUT;
}

function persist(layout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export function useSettingsLayout() {
  const [layout, setLayout] = useState(loadState);

  const updateLayout = useCallback((newLayout) => {
    setLayout(newLayout);
    persist(newLayout);
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    persist(DEFAULT_LAYOUT);
  }, []);

  return {
    layout,
    updateLayout,
    resetLayout,
    moduleKeys: SETTINGS_MODULE_KEYS,
    moduleDisplayNames: SETTINGS_MODULE_DISPLAY_NAMES
  };
}

export default useSettingsLayout;
