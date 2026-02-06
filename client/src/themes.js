/**
 * @fileoverview Material-UI theme definitions for the dashboard.
 * Provides light and dark themes with Johnstone Supply branding,
 * shared typography, rounded component styling, and consistent spacing.
 */

import { createTheme } from '@mui/material/styles';

const sharedTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
};

const sharedShape = {
  borderRadius: 12,
};

const sharedComponents = (mode) => ({
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        boxShadow: mode === 'light'
          ? '0 2px 12px rgba(0, 0, 0, 0.06)'
          : '0 2px 12px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        textTransform: 'none',
        fontWeight: 600,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 20,
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 10,
        },
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 10,
      },
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        borderRadius: 10,
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 16,
      },
    },
  },
});

// Light Theme — Johnstone Supply blue & white
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#003876',
      light: '#1a5dab',
      dark: '#002550',
    },
    secondary: {
      main: '#4a90d9',
    },
    background: {
      default: '#f0f4f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a2332',
      secondary: '#5a6a7e',
    },
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: sharedComponents('light'),
});

// Dark Theme — deep navy with blue accents
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#5b9bd5',
      light: '#8bbfea',
      dark: '#3a7ab8',
    },
    secondary: {
      main: '#82b1ff',
    },
    background: {
      default: '#0d1117',
      paper: '#161b22',
    },
    text: {
      primary: '#e6edf3',
      secondary: '#8b949e',
    },
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: sharedComponents('dark'),
});

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};

export const themeNames = {
  light: 'Light',
  dark: 'Dark',
};
