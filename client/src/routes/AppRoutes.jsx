/**
 * @file        AppRoutes.jsx
 * @description 애플리케이션의 전체 라우팅 및 페이지 접근 권한을 관리하는 컴포넌트입니다.
 * (인증 상태에 따른 보호된 경로 설정 및 공통 레이아웃 배치를 담당합니다.)
 */

import React from 'react';
import { 
  Routes, 
  Route, 
  Navigate 
} from 'react-router-dom';
import { 
  Box, 
  Typography 
} from '@mui/material';

// 공통 레이아웃 및 인증 페이지
import MainLayout from '../components/layout/MainLayout';
import LoginPage from '../pages/auth/LoginPage';

// 시스템 페이지 컴포넌트 임포트 (이력 조회 페이지 2개 분리 적용)
import BarcodeScanPage from '../pages/system/BarcodeScanPage';
import BarcodeScanHistoryPage from '../pages/system/BarcodeScanHistoryPage'; // 신규: 스캔 이력
import LabelPrintPage from '../pages/system/LabelPrintPage'; 
import LabelPrintHistoryPage from '../pages/system/LabelPrintHistoryPage';   // 변경: 발행 이력
import LabelDesignPage from '../pages/system/LabelDesignPage';

import useAppStore from '../store/useAppStore';

const AppRoutes = () => {
  /** [영역 분리: 상태 관리]
   * Zustand 스토어에서 인증 상태 및 초기화 완료 여부를 추출합니다.
   */
  const { 
    isAuth, 
    isInitialized 
  } = useAppStore();

  /** [영역 분리: 비즈니스 로직]
   * 앱이 서버로부터 세션 정보를 아직 받아오는 중(초기화 전)이라면
   * 라우팅을 수행하지 않고 빈 화면을 유지하여 로그인 페이지로의 잘못된 튕김을 방지합니다.
   */
  if (!isInitialized) {
    return null; 
  }

  /** [영역 분리: 렌더링 영역] */
  return (
    <Routes>
      
      {/* 1. 인증이 필요한 보호된 경로 (MainLayout 그룹) */}
      <Route 
        path="/" 
        element={
          isAuth 
            ? <MainLayout /> 
            : <Navigate 
                to="/login" 
                replace 
              />
        }
      >
        
        {/* 시스템 대시보드 메인 */}
        <Route 
          index 
          element={
            <Box 
              sx={{ 
                p: 3,
                color: 'text.primary' 
              }}
            >
              <Typography variant="h5">대시보드 메인 화면</Typography>
            </Box>
          } 
        />
        
        {/* --- 시스템 관리 메뉴 영역 --- */}
        
        {/* 1) 실시간 바코드 스캔 페이지 */}
        <Route 
          path="system/scan" 
          element={<BarcodeScanPage />} 
        />

        {/* 2) 라벨 발행/인쇄 페이지 */}
        <Route 
          path="system/label-print" 
          element={<LabelPrintPage />} 
        />
        
        {/* 3) 바코드 스캔 이력 조회 페이지 (분리됨) */}
        <Route 
          path="system/scan-history" 
          element={<BarcodeScanHistoryPage />} 
        />
        
        {/* 4) 라벨 발행 이력 조회 페이지 (분리됨) */}
        <Route 
          path="system/print-history" 
          element={<LabelPrintHistoryPage />} 
        />
        
        {/* 5) 라벨 디자인 도구 페이지 */}
        <Route 
          path="system/label-design" 
          element={<LabelDesignPage />} 
        />
        
        {/* 사용자 관리 (준비 중) */}
        <Route 
          path="system/users" 
          element={
            <Box 
              sx={{ 
                p: 3,
                color: 'text.secondary' 
              }}
            >
              사용자 관리 (준비 중)
            </Box>
          } 
        />
        
        {/* 시스템 공통코드 관리 (준비 중) */}
        <Route 
          path="system/codes" 
          element={
            <Box 
              sx={{ 
                p: 3,
                color: 'text.secondary' 
              }}
            >
              공통코드 관리 (준비 중)
            </Box>
          } 
        />
        
      </Route>
      
      {/* 2. 비인증 경로 (로그인 페이지) 
          - 이미 로그인된 경우 메인("/")으로 리다이렉트
      */}
      <Route 
        path="/login" 
        element={
          !isAuth 
            ? <LoginPage /> 
            : <Navigate 
                to="/" 
                replace 
              />
        } 
      />

      {/* 3. 예외 경로 처리 (404 대응) */}
      <Route 
        path="*" 
        element={
          <Navigate 
            to="/" 
            replace 
          />
        } 
      />

    </Routes>
  );
};

export default AppRoutes;