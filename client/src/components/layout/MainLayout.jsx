/**
 * @file        MainLayout.jsx
 * @description 애플리케이션의 전체 화면 골격을 담당하는 메인 레이아웃 컴포넌트
 */

import React, { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const MainLayout = () => {
  /** [상태 관리] */

  // 사이드바의 열림/닫힘 상태를 관리하는 State (기본적으로 열린 상태로 시작)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /** [이벤트 핸들러] */

  /**
   * 사이드바 토글(Toggle) 핸들러
   * @description 상단 Header 컴포넌트의 햄버거 메뉴 버튼을 클릭했을 때 호출되어 사이드바의 상태를 반전시킴
   */
  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  /** [렌더링 영역] */
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        backgroundColor: '#f4f6f8' // 앱 전체의 기본 배경색 (테마 배경색과 동일하게 유지)
      }}
    >
      
      {/* 1. 상단 네비게이션 바 (Header 영역) */}
      <Header 
        onDrawerToggle={handleDrawerToggle} 
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
          width: '100%',
          transition: 'margin 0.3s', // 사이드바가 열리고 닫힐 때 콘텐츠 영역이 부드럽게 밀리는 애니메이션 효과
        }}
      >
        {/* Header가 fixed(고정) 속성이므로, 그 아래로 콘텐츠가 파고들어 가려지는 것을 방지하기 위해 Toolbar 컴포넌트로 동일한 높이의 빈 공간 확보 */}
        <Toolbar /> 
        
        {/* 실제 페이지 화면(Card 디자인)이 표시되는 하얀색 콘텐츠 박스 */}
        <Box 
          sx={{ 
            backgroundColor: '#fff', 
            borderRadius: 2, 
            p: 3, 
            minHeight: 'calc(100vh - 120px)', // 뷰포트 전체 높이에서 Header 및 패딩 영역 높이를 제외하여 꽉 찬 화면 유지
            boxShadow: '0 0 10px rgba(0,0,0,0.05)' // 은은한 그림자 효과 부여
          }}
        >
          {/* React Router의 자식 Route 컴포넌트(Dashboard, Scan 페이지 등)들이 이 자리에 동적으로 렌더링됨 */}
          <Outlet />
        </Box>
      </Box>

    </Box>
  );
};

export default MainLayout;