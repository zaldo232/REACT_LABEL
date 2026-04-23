/**
 * @file        App.jsx
 * @description 앱 진입점 - 조건부 활동 감지 및 자동 로그아웃 감시
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import useAppStore from './store/useAppStore';
import createAppTheme from './theme/theme';
import AppRoutes from './routes/AppRoutes';
import apiClient from './utils/apiClient';

const App = () => {
  const { isDarkMode, isAuth, user, setUser, setLogout, isInitialized, setInitialized } = useAppStore();
  
  /** [영역 분리: 활동 추적용 Ref] */
  const lastActivityTimeRef = useRef(Date.now());

  /** [영역 분리: 초기 세션 복구] */
  useEffect(() => {
    const restoreAuthSession = async () => {
      try {
        const response = await apiClient.get('/auth/check');
        if (response.data.success && response.data.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        setLogout();
      } finally {
        setInitialized(true);
      }
    };
    restoreAuthSession();
  }, [setUser, setLogout, setInitialized]);

  /** [영역 분리: 실시간 세션 만료 감시 (공통)]
   * 모든 사용자는 서버 세션이 끊겼는지 1초마다 확인받습니다.
   */
  useEffect(() => {
    if (!isAuth) return;

    const authMonitor = setInterval(async () => {
      try {
        await apiClient.get('/auth/check');
      } catch (error) {
        // 인터셉터가 401을 잡아 알람을 띄우므로 여기선 타이머만 종료
        clearInterval(authMonitor);
      }
    }, 1000); 

    return () => clearInterval(authMonitor);
  }, [isAuth]);

  /** [영역 분리: 활동 감지 및 세션 연장 (단기 세션 전용)] 
   * ★ 1년짜리 장기 세션(isLongSession)일 때는 작동하지 않도록 필터링
   */
  useEffect(() => {
    // 인증 전이거나 1년 유지 세션이면 이벤트를 등록하지 않음
    if (!isAuth || !user || user.isLongSession) return;

    console.log("단기 세션: 사용자 활동 감시를 시작합니다.");

    const updateActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);

    // 활동 중이면 2초마다 서버에 Heartbeat 전송하여 세션 연장
    const heartbeatInterval = setInterval(async () => {
      const timeSinceLastActivity = Date.now() - lastActivityTimeRef.current;

      if (timeSinceLastActivity < 2000) {
        try {
          await apiClient.get('/auth/check');
        } catch (e) {
          clearInterval(heartbeatInterval);
        }
      }
    }, 2000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      clearInterval(heartbeatInterval);
    };
  }, [isAuth, user]);

  const theme = useMemo(() => createAppTheme(isDarkMode), [isDarkMode]);

  if (!isInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
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