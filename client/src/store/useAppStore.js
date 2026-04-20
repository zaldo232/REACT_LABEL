/**
 * @file        useAppStore.js
 * @description 애플리케이션의 전역 상태를 관리하는 Zustand 스토어
 */

import { create } from 'zustand';

const useAppStore = create((set) => ({

  /** [인증 및 사용자 정보 관리] */

  // 로그인 여부 (기본값: false)
  isAuth: false,

  // 로그인된 사용자 정보 객체
  user: null,

  /**
   * 로그인 처리
   * @param {Object} userData - 서버로부터 전달받은 사용자 정보
   */
  setLogin: (userData) => set({ 
    isAuth: true, 
    user: userData 
  }),

  /**
   * 로그아웃 처리
   * (모든 인증 정보를 초기화하고 세션을 종료)
   */
  setLogout: () => set({ 
    isAuth: false, 
    user: null 
  }),


  /** [UI 레이아웃 상태 관리] */

  // 사이드바 개폐 여부 (기본값: open)
  sidebarOpen: true,

  /**
   * 사이드바 토글 함수
   */
  toggleSidebar: () => set((state) => ({ 
    sidebarOpen: !state.sidebarOpen 
  })),


  /** [하드웨어 스캐너 상태 관리] */

  // 시리얼 스캐너 장치 연결 상태
  isScannerConnected: false,

  /**
   * 스캐너 연결 상태 업데이트
   * @param {Boolean} status - 연결 성공 시 true, 해제 시 false
   */
  setScannerConnected: (status) => set({ 
    isScannerConnected: status 
  }),

  // 마지막으로 스캔된 바코드 데이터
  // (동일 바코드를 연속 스캔할 경우의 변화를 감지하기 위해 타임스탬프를 함께 저장)
  lastScan: { 
    barcode: '', 
    timestamp: 0 
  },

  /**
   * 바코드 스캔 데이터 기록
   * @param {string} barcode - 스캐너로부터 읽어온 문자열 데이터
   * @description 시간 기록 시 Date.now()를 사용하여 KST 등 로컬 타임존 기반의 비교
   */
  setLastScan: (barcode) => set({ 
    lastScan: { 
      barcode: barcode, 
      timestamp: Date.now() 
    } 
  }),

}));

export default useAppStore;