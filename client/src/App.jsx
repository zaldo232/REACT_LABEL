/**
 * @file        App.jsx
 * @description 애플리케이션의 메인 레이아웃 및 전역 설정 컴포넌트
 * (인증 세션 복구 로직과 다크모드 테마 적용을 담당합니다.)
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
  /** [전역 상태 추출] */
  const { 
    isDarkMode, 
    setUser, 
    setLogout, 
    isInitialized, 
    setInitialized 
  } = useAppStore();

  /** [영역 분리: 인증 복구 로직]
   * 앱이 처음 로드될 때 서버에 세션 정보를 확인하여 자동 로그인을 수행합니다.
   */
  useEffect(() => {
    const restoreAuthSession = async () => {
      try {
        // 서버의 /auth/me (또는 /auth/check) API를 호출하여 세션 유효성 확인
        const response = await apiClient.get('/auth/me');
        
        if (response.data.success && response.data.user) {
          // 유저 정보가 확인되면 전역 상태에 저장 (다크모드 설정 포함됨)
          setUser(response.data.user);
        } else {
          setLogout();
        }
      } catch (error) {
        console.warn('인증 세션이 없거나 만료되었습니다.');
        setLogout();
      } finally {
        // 모든 인증 확인 절차가 완료되었음을 표시 (깜빡임 방지 플래그)
        setInitialized(true);
      }
    };

    restoreAuthSession();
  }, [setUser, setLogout, setInitialized]);

  /** [영역 분리: 동적 테마 설정] 
   * 다크모드 상태가 변경될 때마다 새로운 테마 객체를 생성합니다.
   */
  const theme = useMemo(
    () => createAppTheme(isDarkMode), 
    [isDarkMode]
  );

  /** [렌더링 영역] */

  // 초기화 전(서버 응답 대기 중)에는 로딩 스피너를 보여주어 튕김 현상을 방지함
  if (!isInitialized) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          height: '100vh', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: isDarkMode ? '#121212' : '#f4f6f8'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline: 테마 모드에 맞춰 배경색/글자색을 자동으로 초기화 */}
      <CssBaseline /> 
      
      <AppRoutes />
    </ThemeProvider>
  );
};

export default App;