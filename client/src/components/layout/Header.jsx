/**
 * @file        Header.jsx
 * @description 애플리케이션 상단 내비게이션 바(Header) 컴포넌트
 * (전역 테마의 헤더 색상 설정을 따르며, 다크모드 토글 기능을 포함합니다.)
 */

import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box, 
  Button,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import useAppStore from '../../store/useAppStore';

/**
 * [컴포넌트] Header
 * @param {Function} onDrawerToggle - 모바일 환경 등에서 사이드바 개폐를 제어하는 함수
 */
const Header = ({ onDrawerToggle }) => {
  /** [영역 분리: 라우팅 및 전역 상태 관리] */
  const navigate = useNavigate();
  
  const { 
    user, 
    setLogout, 
    isDarkMode, 
    toggleDarkMode 
  } = useAppStore();

  /** [영역 분리: 이벤트 핸들러] */

  /**
   * 로그아웃 처리 함수
   * @description 서버에 세션 파기를 요청한 후, 성공 여부와 관계없이 클라이언트 전역 상태를 초기화하고 로그인 화면으로 이동
   */
  const handleLogout = async () => {
    try {
      // 1. 백엔드에 로그아웃 API 호출 (서버 세션 및 쿠키 파기)
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('로그아웃 에러:', error);
    } finally {
      // 2. 백엔드 통신 상태와 무관하게 클라이언트 전역 상태 즉시 초기화
      setLogout();
      
      // 3. 로그인 페이지로 사용자 리다이렉트
      navigate('/login');
    }
  };

  /** [영역 분리: 렌더링 영역] */
  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1, 
        // 시스템 메인 컬러 하드코딩 대신, theme.js에서 세분화한 헤더 색상 적용
        backgroundColor: (theme) => theme.palette.layout.header.background,
        color: (theme) => theme.palette.layout.header.font,
        borderBottom: (theme) => `1px solid ${theme.palette.layout.header.border}`,
        boxShadow: 'none'
      }}
    >
      <Toolbar>
        
        {/* 좌측: 사이드바 개폐 토글 버튼 */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{ 
            mr: 2 
          }}
        >
          <MenuIcon />
        </IconButton>
        
        {/* 중앙: 시스템 로고 및 타이틀 영역 */}
        <Typography 
          variant="h6" 
          component="div" 
          noWrap 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 'bold',
            letterSpacing: 1
          }}
        >
          My Admin Framework
        </Typography>
        
        {/* 우측: 사용자 정보 및 제어 영역 */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1 
          }}
        >
          {/* 다크모드 토글 버튼 추가 */}
          <Tooltip 
            title={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"} 
            placement="bottom"
          >
            <IconButton 
              color="inherit" 
              onClick={toggleDarkMode}
              sx={{ 
                mr: 1 
              }}
            >
              {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>

          <AccountCircleIcon />
          
          <Typography 
            variant="body2" 
            sx={{ 
              mr: 2 
            }}
          >
            {/* 전역 상태에 저장된 로그인 유저 이름 확인 후 분기 처리 */}
            {user?.userName ? `${user.userName}님` : '관리자님'}
          </Typography>
          
          <Button 
            color="inherit" 
            size="small" 
            onClick={handleLogout}
            sx={{ 
              border: '1px solid rgba(255,255,255,0.5)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            로그아웃
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;