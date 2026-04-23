/**
 * @file        theme.js
 * @description 애플리케이션 전역 테마 설정 파일
 */

import { createTheme } from '@mui/material/styles';

/**
 * [함수] createAppTheme
 * @param {boolean} isDarkMode - 다크모드 활성화 여부
 */
const createAppTheme = (isDarkMode) => {
  const mode = isDarkMode ? 'dark' : 'light';

  return createTheme({
    /** [영역 1: 팔레트 설정] */
    palette: {
      mode,
      primary: {
        main: isDarkMode ? '#3b82f6' : '#2563eb',
      },
      secondary: {
        main: isDarkMode ? '#f472b6' : '#db2777',
      },

      background: {
        default: isDarkMode ? '#0b1120' : '#f1f5f9',
        paper: isDarkMode ? '#1e293b' : '#ffffff',
      },

      text: {
        primary: isDarkMode ? '#f8fafc' : '#0f172a',
        secondary: isDarkMode ? '#94a3b8' : '#64748b',
      },

      divider: isDarkMode ? '#334155' : '#e2e8f0',

      /** [커스텀 레이아웃 영역별 독립 색상] */
      layout: {
        header: {
          background: isDarkMode ? '#111827' : '#1e40af', 
          font: isDarkMode ? '#f8fafc' : '#ffffff', 
          icon: isDarkMode ? '#94a3b8' : '#ffffff',
          border: isDarkMode ? '#334155' : '#1e40af',
        },
        
        sidebar: {
          background: isDarkMode ? '#0f172a' : '#0f172a',
          font: '#94a3b8',
          activeFont: '#ffffff',
          activeBg: 'rgba(59, 130, 246, 0.2)',
          hoverBg: 'rgba(255, 255, 255, 0.05)',
          border: isDarkMode ? '#1e293b' : '#0f172a',
        },
        
        datagrid: {
          headerBg: isDarkMode ? '#111827' : '#f8fafc',
          headerFont: isDarkMode ? '#f8fafc' : '#334155',
          rowHover: isDarkMode ? '#334155' : '#f1f5f9',
          border: isDarkMode ? '#334155' : '#e2e8f0',
          selectedRow: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
        },
        
        design: {
          canvasBg: isDarkMode ? '#15181d' : '#b5bcc7',
          paper: '#ffffff',
          grid: isDarkMode 
            ? 'rgba(0, 0, 0, 0.18)' 
            : 'rgba(0, 0, 0, 0.18)', 
          layerBg: isDarkMode ? '#111827' : '#f8fafc',
        },
      },
    },

    /** [영역 2: 타이포그래피 설정] */
    typography: {
      fontFamily: [
        'Pretendard',
        '-apple-system',
        'BlinkMacSystemFont',
        'sans-serif',
      ].join(','),
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
    },

    /** [영역 3: 컴포넌트 스타일 오버라이드] */
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
            boxShadow: isDarkMode 
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
              : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            borderRadius: 0,
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            backgroundImage: 'none',
          },
        },
      },

      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDarkMode ? '#0b1120' : '#f1f5f9',
            transition: 'background-color 0.3s ease',
          },
        },
      },

      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : '#f9fafb',
              '& fieldset': {
                borderColor: isDarkMode ? '#334155' : '#d1d5db',
              },
              '&:hover fieldset': {
                borderColor: isDarkMode ? '#3b82f6' : '#2563eb',
              },
            },
          },
        },
      },
    },
  });
};

export default createAppTheme;