/**
 * @file        Header.jsx
 * @description 애플리케이션 상단 내비게이션 바(Header) 컴포넌트
 */

import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box, 
  Button 
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import useAppStore from '../../store/useAppStore';

const Header = ({ onDrawerToggle }) => {
  /** [라우팅 관리] 페이지 이동 훅 */
  const navigate = useNavigate();
  
  /** [전역 상태 관리] Zustand 스토어 참조 */
  const setLogout = useAppStore((state) => state.setLogout);
  const user = useAppStore((state) => state.user); 

  /** [이벤트 핸들러] */

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

  /** [렌더링 영역] */
  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1, 
        backgroundColor: '#1e40af' // 시스템 메인 컬러
      }}
    >
      <Toolbar>
        
        {/* 좌측: 사이드바 개폐 토글 버튼 */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{ mr: 2 }}
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
        
        {/* 우측: 사용자 정보 및 제어(로그아웃) 영역 */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1 
          }}
        >
          <AccountCircleIcon />
          
          <Typography 
            variant="body2" 
            sx={{ mr: 2 }}
          >
            {/* 전역 상태에 저장된 로그인 유저 이름 확인 후 분기 처리 */}
            {user && user.userName ? `${user.userName}님` : '관리자님'}
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