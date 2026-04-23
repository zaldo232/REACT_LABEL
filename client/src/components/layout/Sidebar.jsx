/**
 * @file        Sidebar.jsx
 * @description 애플리케이션 좌측 내비게이션 사이드바 컴포넌트 및 시리얼 바코드 스캐너 연결 관리
 */

import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Divider,
  Typography,
  Button,
  Chip
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import SearchIcon from '@mui/icons-material/Search';
import CableIcon from '@mui/icons-material/Cable';
import PrintIcon from '@mui/icons-material/Print';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import {
  useLocation,
  useNavigate
} from 'react-router-dom';
import { useSerialScanner } from '../../hooks/useSerialScanner';
import useAppStore from '../../store/useAppStore';

/** [상수] 사이드바 열림 상태일 때의 고정 가로 너비 (px) */
const drawerWidth = 260;

/**
 * [사이드바 컴포넌트]
 * @param {boolean} open - 사이드바 확장/축소 상태
 */
const Sidebar = ({ 
  open 
}) => {
  /** [영역 분리: 라우팅 관리] */
  const navigate = useNavigate();
  const location = useLocation();

  /** [영역 분리: 상태 관리] 
   * Zustand 스토어에서 스캐너 데이터 및 연결 상태 추출 
   */
  const {
    setLastScan,
    isScannerConnected,
    setScannerConnected
  } = useAppStore();

  /** [영역 분리: 커스텀 훅] 
   * 시리얼 스캐너 포트 연결 및 통신 제어
   * 바코드 스캔 시 전역 상태에 값을 업데이트하고 연결 상태를 실시간으로 반영
   */
  const {
    connect,
    disconnect
  } = useSerialScanner(
    (barcode) => setLastScan(barcode),
    (status) => setScannerConnected(status)
  );

  /** [영역 분리: 이벤트 핸들러] */

  /**
   * 스캐너 장치 연결/해제 토글 핸들러
   * @description 현재 연결 상태에 따라 비동기로 포트 제어 함수를 호출함
   */
  const handleToggleScanner = async () => {
    if (isScannerConnected) {
      await disconnect();
    } else {
      // 연결 시도 후 성공 여부를 전역 상태에 반영
      const isSuccess = await connect();
      setScannerConnected(!!isSuccess);
    }
  };

  /** [영역 분리: 데이터 - 메뉴 구성] */
  const menus = [
    {
      title: '대시보드',
      path: '/',
      icon: <DashboardIcon />
    },
    {
      title: '바코드 스캔',
      path: '/system/scan',
      icon: <DocumentScannerIcon />
    },
    {
      title: '라벨 발행/인쇄',
      path: '/system/label-print',
      icon: <PrintIcon />
    },
    {
      title: '스캔 이력 조회',
      path: '/system/history',
      icon: <SearchIcon />
    },
    {
      title: '라벨 양식 디자인',
      path: '/system/label-design',
      icon: <DesignServicesIcon />
    },
    {
      title: '사용자 관리',
      path: '/system/users',
      icon: <PeopleIcon />
    },
    {
      title: '공통코드 관리',
      path: '/system/codes',
      icon: <SettingsIcon />
    },
  ];

  /** [렌더링 영역] */
  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: open ? drawerWidth : 0,
        flexShrink: 0,
        transition: 'width 0.3s',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          // 사이드바는 테마와 무관하게 항상 어두운 배경이므로 고정 색상 적용
          backgroundColor: (theme) => theme.palette?.layout?.sidebar?.background || '#233044',
          color: (theme) => theme.palette?.layout?.sidebar?.font || '#eeeeee',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
        },
      }}
    >
      {/* 레이아웃 상단 헤더 공간 확보 */}
      <Toolbar />

      {/* 상단: 메뉴 내비게이션 리스트 */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          mt: 1
        }}
      >
        <List>
          {menus.map((menu, index) => {
            const isSelected = location.pathname === menu.path;
            
            return (
              <ListItem
                key={index}
                disablePadding
              >
                <ListItemButton
                  selected={isSelected}
                  onClick={() => navigate(menu.path)}
                  sx={{
                    py: 1.2,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderLeft: (theme) => `4px solid ${theme.palette.primary.main}`,
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.6)', // 아이콘 색상 대비 확보
                      minWidth: 40
                    }}
                  >
                    {menu.icon}
                  </ListItemIcon>

                  <ListItemText
                    primary={menu.title}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.85)' // 텍스트 색상 대비 확보
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* 하단 제어부 구분을 위한 Divider */}
      <Divider
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)'
        }}
      />

      {/* 하단: 장치 상태 및 스캐너 제어 패널 */}
      <Box
        sx={{
          p: 2,
          backgroundColor: 'rgba(0, 0, 0, 0.2)'
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.6)', 
            display: 'block',
            mb: 1,
            fontWeight: 'bold',
            letterSpacing: 1
          }}
        >
          DEVICE STATUS
        </Typography>

        {/* 현재 스캐너 상태 표시 칩 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1.5
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: '#ffffff', // ★ 명시적 흰색 적용
              fontSize: '0.85rem'
            }}
          >
            Serial Scanner
          </Typography>
          
          <Chip
            size="small"
            label={isScannerConnected ? "CONNECTED" : "DISCONNECTED"}
            color={isScannerConnected ? "success" : "default"}
            sx={{
              height: 20,
              fontSize: '0.6rem',
              fontWeight: 'bold',
              // 핵심 해결: DISCONNECTED (default) 일 때 까맣게 묻히지 않도록 반투명 흰색 바탕 강제 적용
              ...(!isScannerConnected && {
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              })
            }}
          />
        </Box>

        {/* 연결/해제 토글 버튼 */}
        <Button
          fullWidth
          size="small"
          startIcon={<CableIcon />}
          onClick={handleToggleScanner}
          variant={isScannerConnected ? "outlined" : "contained"}
          color={isScannerConnected ? "error" : "primary"}
          sx={{
            py: 1,
            fontWeight: 'bold',
            fontSize: '0.75rem'
          }}
        >
          {isScannerConnected ? "연결 해제" : "스캐너 연결"}
        </Button>
      </Box>
    </Drawer>
  );
};

export default Sidebar;