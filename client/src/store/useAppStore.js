/**
 * @file        useAppStore.js
 * @description 애플리케이션의 전역 상태를 관리하는 Zustand 스토어입니다.
 * (사용자 인증, 다크모드 테마 설정, 사이드바 레이아웃 및 하드웨어 스캐너 상태를 통합 관리하며 영구 저장을 지원합니다.)
 */

import { create } from 'zustand';
import { 
  persist, 
  createJSONStorage 
} from 'zustand/middleware';
import apiClient from '../utils/apiClient';

const useAppStore = create(
  persist(
    (set, get) => ({

      /** [영역 분리: 인증 및 사용자 정보 관리] */

      // 현재 로그인 인증 여부
      isAuth: false,

      // 로그인된 사용자 정보 객체 (userId, userName, role, themeMode 등)
      user: null,

      // 새로고침 시 서버 세션 확인 절차 완료 여부 (F5 튕김 방지용)
      isInitialized: false,

      /**
       * 사용자 로그인 처리
       * @param {Object} userData - 서버로부터 전달받은 사용자 정보
       */
      setLogin: (userData) => {
        set({ 
          isAuth: true, 
          user: userData,
          isInitialized: true,
          // 사용자 DB 설정에 테마 값이 있다면 전역 상태에 반영
          isDarkMode: userData?.themeMode === 'DARK' 
        });
      },

      /**
       * 사용자 로그아웃 처리
       * @description 모든 인증 정보를 초기화하고 초기화 상태를 유지함
       */
      setLogout: () => {
        set({ 
          isAuth: false, 
          user: null,
          isInitialized: true 
        });
      },

      /**
       * 앱 초기화 상태 설정
       * @param {boolean} status - 초기화 완료 시 true
       */
      setInitialized: (status) => {
        set({ 
          isInitialized: status 
        });
      },


      /** [영역 분리: UI 테마 및 레이아웃 상태 관리] */

      // 다크모드 활성화 여부
      isDarkMode: false,

      // 사이드바 확장/축소 여부
      sidebarOpen: true,

      /**
       * 다크모드 토글 함수
       * @description 상태 변경 후 서버 DB에 해당 사용자의 테마 설정을 비동기로 저장합니다.
       */
      toggleDarkMode: async () => {
        const nextMode = !get().isDarkMode;
        set({ 
          isDarkMode: nextMode 
        });

        // 로그인된 사용자가 있을 경우 서버에 설정값 업데이트 요청
        const { user } = get();
        if (user) {
          try {
            await apiClient.post('/user/update-settings', {
              userId: user.userId,
              themeMode: nextMode ? 'DARK' : 'LIGHT'
            });
          } catch (error) {
            console.error('테마 설정 저장 실패:', error);
          }
        }
      },

      /**
       * 사이드바 토글 함수
       */
      toggleSidebar: () => {
        set((state) => ({ 
          sidebarOpen: !state.sidebarOpen 
        }));
      },


      /** [영역 분리: 하드웨어 스캐너 상태 관리] */

      // 시리얼 바코드 스캐너 장치 연결 상태
      isScannerConnected: false,

      // 마지막으로 읽어온 바코드 데이터 및 시점
      lastScan: { 
        barcode: '', 
        timestamp: 0 
      },

      /**
       * 스캐너 연결 상태 업데이트
       * @param {boolean} status - 연결 성공 시 true
       */
      setScannerConnected: (status) => {
        set({ 
          isScannerConnected: status 
        });
      },

      /**
       * 바코드 스캔 데이터 기록
       * @param {string} barcode - 스캐너로부터 수신한 문자열
       * @description KST 등 로컬 시간대와 연동된 Date.now()를 사용하여 정밀한 스캔 시점을 기록합니다.
       */
      setLastScan: (barcode) => {
        set({ 
          lastScan: { 
            barcode: barcode, 
            timestamp: Date.now() 
          } 
        });
      },

    }),
    {
      // 브라우저 로컬 스토리지에 저장될 키 명칭
      name: 'label-app-storage',
      // 저장소 타입 지정
      storage: createJSONStorage(() => localStorage),
      /**
       * 영구 저장 데이터 필터링
       * @description 보안을 위해 user 정보는 제외하고 UI 설정(다크모드, 사이드바)만 로컬에 저장합니다.
       * (인증 정보는 새로고침 시 App.jsx에서 서버 세션을 통해 복구합니다.)
       */
      partialize: (state) => ({ 
        isDarkMode: state.isDarkMode, 
        sidebarOpen: state.sidebarOpen 
      }),
    }
  )
);

export default useAppStore;