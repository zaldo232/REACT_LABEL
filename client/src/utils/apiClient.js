/**
 * @file        apiClient.js
 * @description Axios 인스턴스 설정 및 공통 응답 인터셉터 정의 파일
 * (서버와의 통신을 담당하며 세션 만료 시 전역 상태 초기화 및 리다이렉트를 처리합니다.)
 */

import axios from 'axios';
import useAppStore from '../store/useAppStore';

/** [영역 분리: 환경 설정] 
 * API 서버 주소 설정 (Vite 환경 변수가 없을 경우 로컬 5000 포트 기본 사용) 
 */
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/** [영역 분리: 인스턴스 생성] 
 * 공통 Axios 클라이언트 초기화 
 */
const apiClient = axios.create({
  baseURL,
  
  // 클라이언트와 서버 간 쿠키(Session ID) 공유를 위한 설정
  withCredentials: true,
  
  // 요청 제한 시간 설정 (10초)
  timeout: 10000,
  
  // 기본 요청 헤더
  headers: {
    'Content-Type': 'application/json',
  },
});

/** [영역 분리: 인터셉터 설정] 
 * 서버 응답에 대한 전처리를 수행하는 인터셉터 
 */
apiClient.interceptors.response.use(
  (response) => {
    /** [로직] 정상 응답 처리 (2xx)
     * 서버로부터 전달받은 응답 데이터를 그대로 반환합니다.
     */
    return response;
  },
  (error) => {
    /** [로직] 에러 응답 처리 
     * HTTP 상태 코드별 공통 에러 핸들링을 수행합니다.
     */
    if (error.response) {
      const { status } = error.response;

      /**
       * 401 Unauthorized 처리 (세션 만료 등)
       * @description 사용자가 로그인하지 않았거나 세션이 만료된 경우 
       * 전역 상태를 로그아웃 상태로 변경하고 로그인 페이지로 리다이렉트합니다.
       */
      if (status === 401) {
        // 1. Zustand 스토어의 인증 정보 및 사용자 정보 초기화
        const { setLogout } = useAppStore.getState();
        setLogout();

        // 2. 로그인 페이지로 강제 리다이렉트
        // (React Router의 context 밖이므로 window.location을 사용합니다.)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    // 에러 객체를 Promise reject로 반환하여 호출 측에서 catch 가능하도록 함
    return Promise.reject(error);
  }
);

export default apiClient;