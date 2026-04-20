/**
 * @file        apiClient.js
 * @description Axios 인스턴스 및 인터셉터 설정 파일
 */

import axios from 'axios';
import useAppStore from '../store/useAppStore';

/** [환경 설정] API 서버 기본 주소 설정 (Vite 환경 변수 우선 적용) */
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/** [인스턴스 생성] 공통 Axios 클라이언트 객체 초기화 */
const apiClient = axios.create({
  baseURL,
  
  // 클라이언트와 서버 간 쿠키(세션) 정보를 공유하도록 허용 (CORS 환경에서 필수)
  withCredentials: true,
  
  // 기본 요청 헤더 설정
  headers: {
    'Content-Type': 'application/json',
  },
});

/** [인터셉터] 응답(Response) 인터셉터 설정 */
apiClient.interceptors.response.use(
  (response) => {
    /** [정상 처리] 2xx 범위의 상태 코드는 데이터를 그대로 반환 */
    return response;
  },
  (error) => {
    /** [에러 처리] 서버 응답 에러 발생 시 공통 로직을 수행 */
    if (error.response) {
      
      /** * 401 Unauthorized 처리
       * - 세션이 만료되었거나 로그인하지 않은 상태에서 보호된 API에 접근할 경우 발생
       */
      if (error.response.status === 401) {
        // Zustand 전역 스토어의 인증 정보를 초기화(로그아웃 처리)
        useAppStore.getState().setLogout();

        // 로그인 페이지로 사용자를 강제 리다이렉트
        // (React Router의 navigate 대신 window.location을 사용하여 브라우저 상태를 새로고침)
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;