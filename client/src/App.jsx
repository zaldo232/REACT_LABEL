/**
 * @file        App.jsx
 * @description 앱 진입점 및 세션 복구 로직 (경로 불일치 해결)
 */

import React, { useEffect, useMemo } from 'react';
import { 
  ThemeProvider, 
  CssBaseline, 
  Box, 
  CircularProgress 
} from '@mui/material';
import useAppStore from './store/useAppStore';
import createAppTheme from './theme/theme';
import AppRoutes from './routes/AppRoutes';
import apiClient from './utils/apiClient';

const App = () => {
  const { 
    isDarkMode, 
    setUser, 
    setLogout, 
    isInitialized, 
    setInitialized 
  } = useAppStore();

  /** [영역 분리: 인증 복구 로직] */
  useEffect(() => {
    const restoreAuthSession = async () => {
      try {
        /** * [수정 포인트] 콘솔 로그 404의 원인! 
         * 서버는 /auth/check로 정의되어 있는데 /auth/me를 호출하고 있었습니다.
         */
        const response = await apiClient.get('/auth/check');
        
        if (response.data.success && response.data.user) {
          setUser(response.data.user);
        } else {
          setLogout();
        }
      } catch (error) {
        // 세션 정보가 없거나 에러 시 강제 로그아웃
        console.warn('세션 확인 실패:', error.message);
        setLogout();
      } finally {
        setInitialized(true);
      }
    };

    restoreAuthSession();
  }, [setUser, setLogout, setInitialized]);

  /** [영역 분리: 테마 설정] */
  const theme = useMemo(
    () => createAppTheme(isDarkMode), 
    [isDarkMode]
  );

  /** [렌더링 영역] */
  if (!isInitialized) {
    return (
      <Box 
        sx={{ 
          display:         'flex', 
          height:          '100vh', 
          alignItems:      'center', 
          justifyContent:  'center',
          backgroundColor: isDarkMode ? '#121212' : '#f4f6f8'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> 
      <AppRoutes />
    </ThemeProvider>
  );
};

export default App;