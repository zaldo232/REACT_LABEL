/**
 * @file        swal.js
 * @description SweetAlert2를 기반으로 한 공통 알림(Alert) 및 확인(Confirm) 유틸리티 함수
 * (시스템 전역 다크모드 상태와 연동되어 배경색 및 버튼 색상이 자동으로 전환됩니다.)
 */

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import useAppStore from '../store/useAppStore';

/** [초기 설정] SweetAlert2와 React 컴포넌트 결합 */
const MySwal = withReactContent(Swal);

/** [영역 분리: 공통 유틸리티 로직] */

/**
 * 팝업 레이어 최상단 고정 및 스타일 강제 조정
 * @description MUI Drawer(1200) 및 AppBar보다 상단에 위치시키기 위해 z-index를 조정합니다.
 */
const setSwalCustomStyle = () => {
  const container = document.querySelector('.swal2-container');
  if (container) {
    container.style.zIndex = '3000';
  }
};

/** [영역 분리: 알림창(Alert) 함수] */

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
  // Zustand 스토어의 현재 상태에서 다크모드 여부를 즉시 가져옴
  const { isDarkMode } = useAppStore.getState();

  return MySwal.fire({
    title: title,
    text: text,
    icon: icon,
    
    // [다크모드 대응] 테마에 따른 배경 및 글자색 설정
    background: isDarkMode ? '#1e1e1e' : '#ffffff',
    color: isDarkMode ? '#ffffff' : '#545454',

    // UI 버튼 설정 (수직 정렬 적용)
    confirmButtonText: '확인',
    confirmButtonColor: isDarkMode ? '#90caf9' : '#1e40af',
    
    // 레이아웃 및 UX 설정
    scrollbarPadding: false,
    heightAuto: false, // 인쇄 및 스크롤 튐 현상 방지
    target: 'body',
    
    // 오픈 시 실행 로직
    didOpen: () => {
      setSwalCustomStyle();
    }
  });
};

/** [영역 분리: 확인창(Confirm) 함수] */

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
  // Zustand 스토어의 현재 상태에서 다크모드 여부를 즉시 가져옴
  const { isDarkMode } = useAppStore.getState();

  const result = await MySwal.fire({
    title: title,
    text: text,
    icon: 'question',
    
    // [다크모드 대응] 테마에 따른 배경 및 글자색 설정
    background: isDarkMode ? '#1e1e1e' : '#ffffff',
    color: isDarkMode ? '#ffffff' : '#545454',

    // 버튼 구성 및 색상 설정 (속성 수직 정렬)
    showCancelButton: true,
    confirmButtonText: '실행',
    cancelButtonText: '취소',
    confirmButtonColor: isDarkMode ? '#90caf9' : '#1e40af',
    cancelButtonColor: isDarkMode ? '#444444' : '#d33',
    
    // 레이아웃 설정
    scrollbarPadding: false,
    heightAuto: false,
    target: 'body',
    
    // 오픈 시 실행 로직
    didOpen: () => {
      setSwalCustomStyle();
    }
  });

  // 사용자가 '확인(confirm)' 버튼을 눌렀는지 여부만 불리언으로 반환
  return result.isConfirmed;
};