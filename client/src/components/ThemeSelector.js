/**
 * @fileoverview Theme toggle button component.
 * Switches between light and dark themes with a single click.
 */

import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

function ThemeSelector({ currentTheme, onThemeChange }) {
  const isDark = currentTheme === 'dark';

  return (
    <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
      <IconButton
        onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
        sx={{ color: 'inherit' }}
        size="small"
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default ThemeSelector;
