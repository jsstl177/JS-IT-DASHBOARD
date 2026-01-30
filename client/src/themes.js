import { createTheme } from '@mui/material/styles';

// Default Theme
const defaultTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Dark Theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// High Contrast Theme
const highContrastTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000',
    },
    secondary: {
      main: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#000000',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Blue Ocean Theme
const blueOceanTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#006994',
    },
    secondary: {
      main: '#00a6fb',
    },
    background: {
      default: '#e3f2fd',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Forest Theme
const forestTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2e7d32',
    },
    secondary: {
      main: '#4caf50',
    },
    background: {
      default: '#e8f5e8',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

export const themes = {
  default: defaultTheme,
  dark: darkTheme,
  highContrast: highContrastTheme,
  blueOcean: blueOceanTheme,
  forest: forestTheme,
};

export const themeNames = {
  default: 'Default',
  dark: 'Dark',
  highContrast: 'High Contrast',
  blueOcean: 'Blue Ocean',
  forest: 'Forest',
};