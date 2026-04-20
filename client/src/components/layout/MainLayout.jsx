/**
 * @file        MainLayout.jsx
 * @description 애플리케이션의 전체 화면 골격을 담당하는 메인 레이아웃 컴포넌트
 * (사이드바 개폐에 따른 너비 동적 계산 및 다크모드 전역 배경색이 반영되었습니다.)
 */

import React from 'react';
import { 
  Box, 
  Toolbar 
} from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import useAppStore from '../../store/useAppStore';

/** [상수] 사이드바 확장 시의 고정 너비 (Sidebar.jsx의 drawerWidth와 동일해야 함) */
const DRAWER_WIDTH = 260;

const MainLayout = () => {
  /** [영역 분리: 상태 관리] 
   * Zustand 전역 스토어에서 사이드바 상태 및 토글 함수 추출 
   */
  const { 
    sidebarOpen, 
    toggleSidebar 
  } = useAppStore();

  /** [영역 분리: 렌더링 영역] */
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        // 다크모드/라이트모드에 따른 전역 배경색 자동 적용
        backgroundColor: 'background.default' 
      }}
    >
      
      {/* 1. 상단 네비게이션 바 (Header 영역) */}
      <Header 
        onDrawerToggle={toggleSidebar} 
      />
      
      {/* 2. 좌측 네비게이션 메뉴 (Sidebar 영역) */}
      <Sidebar 
        open={sidebarOpen} 
      />
      
      {/* 3. 중앙 메인 콘텐츠 래퍼 (Wrapper) */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3,
          
          // ★ 핵심 버그 수정: 화면 밖 밀림 현상 방지
          // 사이드바가 열려있으면 전체 너비에서 사이드바 크기를 뺀 값을 최대치로 강제 고정
          width: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          maxWidth: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          
          // 사이드바가 열리고 닫힐 때 콘텐츠 영역이 부드럽게 늘어나는 애니메이션
          transition: (theme) => theme.transitions.create(['width', 'max-width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* Header가 fixed(고정) 속성이므로, 아래 콘텐츠가 가려지지 않도록 동일한 높이의 빈 공간 확보 */}
        <Toolbar /> 
        
        {/* 실제 하위 페이지 화면이 표시되는 콘텐츠 박스 */}
        <Box 
          sx={{ 
            backgroundColor: 'background.paper', // 다크모드 대응
            borderRadius: 2, 
            p: 3, 
            minHeight: 'calc(100vh - 120px)', // Header 및 패딩을 제외한 꽉 찬 화면 유지
            boxShadow: '0 0 10px rgba(0,0,0,0.05)',
            // 내부 콘텐츠가 넘칠 경우 레이아웃이 깨지지 않도록 방지
            overflow: 'hidden' 
          }}
        >
          {/* React Router의 자식 Route (LabelDesignPage 등) 동적 렌더링 */}
          <Outlet />
        </Box>
      </Box>

    </Box>
  );
};

export default MainLayout;