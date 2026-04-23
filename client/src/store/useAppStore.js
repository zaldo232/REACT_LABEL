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
      /** [인증 상태] */
      isAuth:        false,
      user:          null,
      isInitialized: false,

      /** [UI 상태] */
      isDarkMode:    false,
      sidebarOpen:   true,

      /** [메소드] 로그인/로그아웃 처리 */
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

      toggleDarkMode: () => set((state) => ({ 
        isDarkMode: !state.isDarkMode 
      })),

      toggleSidebar: () => set((state) => ({ 
        sidebarOpen: !state.sidebarOpen 
      })),
    }),
    {
      name:    'label-app-storage',
      storage: createJSONStorage(() => localStorage),
      /** * [영구 저장 필터링] 
       * F5 새로고침 시 튕김을 방지하기 위해 isAuth와 user 정보를 포함시킵니다.
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