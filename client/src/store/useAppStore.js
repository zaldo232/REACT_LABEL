/**
 * @file        useAppStore.js
 * @description 전역 상태 관리 및 로컬 스토리지를 통한 인증 상태 유지 스토어
 */

import { create } from 'zustand';
import { 
  persist, 
  createJSONStorage 
} from 'zustand/middleware';

const useAppStore = create(
  persist(
    (set) => ({
      /** [영역 분리: 인증 상태] */
      isAuth:        false,
      user:          null,
      isInitialized: false,

      /** [영역 분리: UI 상태] */
      isDarkMode:    false,
      sidebarOpen:   true,

      /** ★ [영역 분리: 하드웨어 스캐너 상태 복구] ★ */
      isScannerConnected: false,
      lastScan: { 
        barcode: '', 
        timestamp: 0 
      },

      /** [영역 분리: 인증 관련 메소드] */
      setLogin: (userData) => set({ 
        isAuth:        true, 
        user:          userData, 
        isInitialized: true,
        isDarkMode:    userData?.themeMode === 'DARK'
      }),

      setLogout: () => set({ 
        isAuth:        false, 
        user:          null, 
        isInitialized: true 
      }),

      setUser: (userData) => set({
        isAuth: true,
        user:   userData
      }),

      setInitialized: (status) => set({ 
        isInitialized: status 
      }),

      /** [영역 분리: UI 관련 메소드] */
      toggleDarkMode: () => set((state) => ({ 
        isDarkMode: !state.isDarkMode 
      })),

      toggleSidebar: () => set((state) => ({ 
        sidebarOpen: !state.sidebarOpen 
      })),

      /** ★ [영역 분리: 하드웨어 스캐너 관련 메소드 복구] ★ */
      setScannerConnected: (status) => set({ 
        isScannerConnected: status 
      }),

      setLastScan: (barcode) => set({ 
        lastScan: { 
          barcode: barcode, 
          timestamp: Date.now() 
        } 
      }),
    }),
    {
      name:    'label-app-storage',
      storage: createJSONStorage(() => localStorage),
      /** * [영구 저장 필터링 (중요)] 
       * F5 새로고침 시 인증 정보(isAuth, user)와 UI 설정만 로컬스토리지에 저장합니다.
       * ★ 스캐너 상태는 무조건 제외해야 합니다! 
       * (브라우저를 새로고침하면 물리적인 USB 통신이 끊어지므로, 화면에서도 초기값인 false로 돌아가야 정상입니다.)
       */
      partialize: (state) => ({ 
        isAuth:      state.isAuth,
        user:        state.user,
        isDarkMode:  state.isDarkMode, 
        sidebarOpen: state.sidebarOpen 
      }),
    }
  )
);

export default useAppStore;