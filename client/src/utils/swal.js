/**
 * @file        swal.js
 * @description SweetAlert2를 기반으로 한 공통 알림(Alert) 및 확인(Confirm) 유틸리티 함수
 */

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

/** [초기 설정] SweetAlert2와 React 컴포넌트 결합 */
const MySwal = withReactContent(Swal);

/** [공통 로직] 팝업 레이어 최상단 고정 설정 */
const setSwalTopLayer = () => {
  // MUI Drawer(1200) 및 Appbar 등보다 상단에 위치시키기 위해 z-index 강제 조정
  const container = document.querySelector('.swal2-container');
  if (container) {
    container.style.zIndex = '2000';
  }
};

/** [알림창 함수] */

/**
 * 단순 알림창 호출 함수
 * @param {string} title - 팝업 상단 제목
 * @param {string} icon  - 아이콘 타입 ('success', 'error', 'warning', 'info', 'question')
 * @param {string} text  - 하단 상세 설명 문구
 */
export const showAlert = (
  title, 
  icon = 'success', 
  text = ''
) => {
  return MySwal.fire({
    title: title,
    text: text,
    icon: icon,
    
    // UI 버튼 설정
    confirmButtonText: '확인',
    confirmButtonColor: '#1976d2',
    
    // 레이아웃 및 UX 설정
    scrollbarPadding: false,
    target: 'body', // 사이드바 클릭 방지 및 최상단 표시를 위한 기준점
    
    // 오픈 시 실행 로직
    didOpen: () => {
      setSwalTopLayer();
    }
  });
};

/** [확인창 함수] */

/**
 * 확인/취소 선택이 필요한 Confirm창 호출 함수
 * @param {string} title - 팝업 상단 제목
 * @param {string} text  - 하단 상세 설명 문구
 * @returns {Promise<boolean>} - 확인 클릭 시 true, 취소/닫기 시 false 반환
 */
export const showConfirm = async (
  title, 
  text = ''
) => {
  const result = await MySwal.fire({
    title: title,
    text: text,
    icon: 'question',
    
    // 취소 버튼 활성화 및 텍스트 설정
    showCancelButton: true,
    confirmButtonText: '실행',
    cancelButtonText: '취소',
    
    // 버튼 색상 테마
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    
    // 레이아웃 설정
    scrollbarPadding: false,
    target: 'body',
    
    // 오픈 시 실행 로직
    didOpen: () => {
      setSwalTopLayer();
    }
  });

  // 사용자가 '확인(confirm)' 버튼을 눌렀는지 여부만 추출하여 반환
  return result.isConfirmed;
};