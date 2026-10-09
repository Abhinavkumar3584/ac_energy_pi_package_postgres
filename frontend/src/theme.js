import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#2563EB',      // Electric Blue
      light: '#60A5FA',
      dark: '#1D4ED8',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F97316',    // Energy Amber/Orange
      light: '#FDBA74',
      dark: '#C2410C',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#EAB308',    // Solar Golden Yellow
      light: '#FDE047',
      dark: '#A16207',
    },
    success: {
      main: '#10B981',    // Emerald Green Live
      light: '#34D399',
      dark: '#059669',
    },
    text: {
      primary: '#0F172A',  // Slate 900 for ultra clarity
      secondary: '#64748B', // Slate 500
    },
    background: {
      default: 'transparent',
      paper: 'rgba(255, 255, 255, 0.90)',
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
      color: '#0F172A',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: '#0F172A',
    },
    h6: {
      fontWeight: 700,
      color: '#0F172A',
    },
    subtitle1: {
      color: '#475569',
      fontWeight: 500,
    },
    subtitle2: {
      color: '#64748B',
      fontWeight: 600,
      fontSize: '0.8rem',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    },
    body1: {
      color: '#1E293B',
    },
    body2: {
      color: '#64748B',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px)',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.07), 0 4px 6px -2px rgba(15, 23, 42, 0.03)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 10,
        },
      },
    },
  },
});
