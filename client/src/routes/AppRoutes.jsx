/**
 * @file        AppRoutes.jsx
 * @description 애플리케이션의 전체 라우팅 설정 파일
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import MainLayout from '../components/layout/MainLayout';
import LoginPage from '../pages/auth/LoginPage';
import BarcodeScanPage from '../pages/system/BarcodeScanPage';
import BarcodeHistoryPage from '../pages/system/BarcodeHistoryPage';
import LabelPrintPage from '../pages/system/LabelPrintPage'; 
import LabelDesignPage from '../pages/system/LabelDesignPage';
import useAppStore from '../store/useAppStore';

const AppRoutes = () => {
  /** [전역 상태] 사용자 로그인 인증 여부 확인 (Zustand Store) */
  const isAuth = useAppStore((state) => state.isAuth);

  /** [렌더링 영역] */
  return (
    <Routes>
      
      {/* [메인 레이아웃 그룹] 
        - 로그인된 사용자만 접근 가능 (isAuth === true)
        - 인증되지 않은 경우 로그인 페이지로 강제 이동 (Redirect)
      */}
      <Route 
        path="/" 
        element={
          isAuth ? <MainLayout /> : <Navigate to="/login" replace />
        }
      >
        
        {/* 대시보드 메인 홈 */}
        <Route 
          index 
          element={<Box sx={{ p: 3 }}>대시보드 메인 화면</Box>} 
        />
        
        {/* --- 시스템 관리 메뉴 --- */}
        
        {/* 실시간 바코드 스캔 및 등록 페이지 */}
        <Route 
          path="system/scan" 
          element={<BarcodeScanPage />} 
        />
        
        {/* 발행 및 스캔 이력 조회 페이지 */}
        <Route 
          path="system/history" 
          element={<BarcodeHistoryPage />} 
        />
        
        {/* 라벨 발행 및 인쇄 관리 페이지 */}
        <Route 
          path="system/label-print" 
          element={<LabelPrintPage />} 
        />
        
        {/* 라벨 템플릿 디자인 및 설계 도구 페이지 */}
        <Route 
          path="system/label-design" 
          element={<LabelDesignPage />} 
        />
        
        {/* 사용자 관리 (준비 중) */}
        <Route 
          path="system/users" 
          element={<Box sx={{ p: 3 }}>사용자 관리 (준비중)</Box>} 
        />
        
        {/* 시스템 공통코드 관리 (준비 중) */}
        <Route 
          path="system/codes" 
          element={<Box sx={{ p: 3 }}>공통코드 관리 (준비중)</Box>} 
        />
        
      </Route>
      
      {/* [인증 페이지] 
        - 이미 로그인된 사용자가 접근 시 메인 페이지로 이동
      */}
      <Route 
        path="/login" 
        element={
          !isAuth ? <LoginPage /> : <Navigate to="/" replace />
        } 
      />

      {/* [예외 처리] 
        - 정의되지 않은 모든 경로는 메인 페이지로 리다이렉트 
      */}
      <Route 
        path="*" 
        element={<Navigate to="/" replace />} 
      />

    </Routes>
  );
};

export default AppRoutes;