import React from 'react';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { themeNames } from '../themes';

function ThemeSelector({ currentTheme, onThemeChange }) {
  return (
    <FormControl size="small" style={{ marginRight: '10px', minWidth: '120px' }}>
      <InputLabel>Theme</InputLabel>
      <Select
        value={currentTheme}
        label="Theme"
        onChange={(e) => onThemeChange(e.target.value)}
      >
        {Object.entries(themeNames).map(([key, name]) => (
          <MenuItem key={key} value={key}>
            {name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default ThemeSelector;