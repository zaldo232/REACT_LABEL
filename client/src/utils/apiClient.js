/**
 * @file        apiClient.js
 * @description Axios 인스턴스 설정 및 공통 응답 인터셉터 정의
 * (401 에러 발생 시 세션 만료 알림을 띄우고 로그아웃 처리합니다.)
 */

import axios from 'axios';
import useAppStore from '../store/useAppStore';
import { showAlert } from './swal';

/** [영역 분리: 환경 설정] */
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout:         10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** [영역 분리: 인터셉터 설정] */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response) {
      const { status } = error.response;
      const { isAuth, setLogout } = useAppStore.getState();

      /** [로직] 401 Unauthorized 처리 (세션 만료)
       * 인증된 상태(isAuth: true)에서 401 에러를 받으면 세션이 끝난 것입니다.
       */
      if (status === 401 && isAuth) {
        // 1. 전역 상태 즉시 로그아웃 처리
        setLogout();

        // 2. SweetAlert2 알림창 호출
        await showAlert(
          '세션 만료',
          'warning',
          '세션이 만료되어 자동으로 로그아웃되었습니다. 다시 로그인해주세요.'
        );

        // 3. 로그인 페이지로 강제 리다이렉트
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;