/**
 * @file        MainLayout.jsx
 * @description 애플리케이션의 전체 화면 골격을 담당하는 메인 레이아웃 컴포넌트
 * (CssBaseline을 추가하여 테마 배경색 미적용 버그를 해결하고, 사이드바 개폐에 따른 너비를 동적으로 계산합니다.)
 */

import React from 'react';
import { 
  Box, 
  Toolbar,
  CssBaseline,
  useTheme 
} from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import useAppStore from '../../store/useAppStore';

/** [상수] 사이드바 확장 시의 고정 너비 */
const DRAWER_WIDTH = 260;

const MainLayout = () => {
  /** [영역 분리: 상태 관리] 
   * Zustand 전역 스토어에서 사이드바 상태 및 토글 함수 추출 
   */
  const { 
    sidebarOpen, 
    toggleSidebar,
    isDarkMode 
  } = useAppStore();

  const theme = useTheme();

  /** [영역 분리: 렌더링 영역] */
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        // 테마에서 설정한 default 배경색(라이트: 회색 / 다크: 딥네이비)을 전체 바닥에 적용
        backgroundColor: 'background.default',
        transition: 'background-color 0.3s ease'
      }}
    >
      {/* 핵심 해결사: CssBaseline
        MUI 테마의 전역 스타일(배경색, 폰트 등)을 실제 브라우저 body에 강제 주입합니다.
        이게 없으면 라이트 모드에서 배경이 그냥 흰색으로 고정됩니다.
      */}
      <CssBaseline />
      
      {/* 1. 상단 네비게이션 바 */}
      <Header 
        onDrawerToggle={toggleSidebar} 
      />
      
      {/* 2. 좌측 네비게이션 메뉴 */}
      <Sidebar 
        open={sidebarOpen} 
      />
      
      {/* 3. 중앙 메인 콘텐츠 영역 (Main Wrapper) */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          display: 'flex',
          flexDirection: 'column',
          p: 2,
          // 사이드바 상태에 따른 동적 너비 계산
          width: sidebarOpen 
            ? `calc(100% - ${DRAWER_WIDTH}px)` 
            : '100%',
          maxWidth: sidebarOpen 
            ? `calc(100% - ${DRAWER_WIDTH}px)` 
            : '100%',
          transition: theme.transitions.create(['width', 'max-width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* 고정 헤더(fixed) 높이만큼 공간을 확보하여 콘텐츠 가림 방지 */}
        <Toolbar /> 
        
        {/* 실제 하위 페이지 화면이 표시되는 콘텐츠 카드 박스 */}
        <Box 
          sx={{ 
            backgroundColor: 'background.paper', 
            borderRadius: 3, // 둥근 모서리 적용
            p: 3, 
            flex: 1,
            // 헤더 및 외부 패딩을 제외한 꽉 찬 화면 유지 (스크롤 방지 보정값)
            minHeight: 'calc(100vh - 160px)', 
            // 입체감을 위한 모드별 그림자 최적화
            boxShadow: isDarkMode 
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden' 
          }}
        >
          {/* React Router의 자식 Route 페이지들이 이곳에 렌더링됨 */}
          <Outlet />
        </Box>
      </Box>

    </Box>
  );
};

export default MainLayout;