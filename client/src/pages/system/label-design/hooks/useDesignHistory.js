/**
 * @file        useDesignHistory.js
 * @description 라벨 디자인 페이지의 실행 취소(Undo)/다시 실행(Redo) 및 캔버스 상태 관리 커스텀 훅
 * - [포맷팅] 프로젝트 규칙에 따른 Object 내부 속성 및 파라미터 수직 정렬 완벽 적용
 * - [역할분리] 컴포넌트(UI)에서 복잡한 배열 조작 및 스냅샷 저장 로직을 완벽히 분리
 * - [성능최적화] useCallback을 통해 불필요한 함수 재생성 방지
 */

import { 
  useState, 
  useRef, 
  useCallback 
} from 'react';

// =========================================================================
// [커스텀 훅] useDesignHistory
// =========================================================================
const useDesignHistory = () => {
  
  // -------------------------------------------------------------------------
  // 1. 핵심 상태 (State) 선언
  // -------------------------------------------------------------------------
  const [items, setItems]                 = useState([]);            
  const [selectedIds, setSelectedIds]     = useState([]);
  const [selectedCells, setSelectedCells] = useState([]); 

  // -------------------------------------------------------------------------
  // 2. 히스토리(시간) 기록용 Ref 및 UI 상태
  // -------------------------------------------------------------------------
  const historyRef     = useRef([[]]); 
  const historyPointer = useRef(0);
  
  const [historyUIState, setHistoryUIState] = useState({ 
    step:   0, 
    length: 1 
  });

  // -------------------------------------------------------------------------
  // 3. 상태 관리 및 히스토리 제어 함수 (Actions)
  // -------------------------------------------------------------------------

  /**
   * [함수] 데이터 완전 초기화 (새 템플릿 로드 시)
   */
  const initItems = useCallback((newItems) => {
    setItems(newItems);
    historyRef.current     = [newItems];
    historyPointer.current = 0;
    
    setHistoryUIState({ 
      step:   0, 
      length: 1 
    });
  }, []);

  /**
   * [함수] 현재 상태 스냅샷 저장 (마우스 드래그 종료 등 이벤트 끝날 때 호출)
   */
  const takeSnapshot = useCallback(() => {
    setItems((prev) => {
      const hist = historyRef.current;
      const ptr  = historyPointer.current;
      const last = hist[ptr];
      
      // 이전 스냅샷과 현재 상태가 다를 때만 새로운 역사 기록 (딥 카피 비교)
      if (JSON.stringify(last) !== JSON.stringify(prev)) {
        const newHist = hist.slice(0, ptr + 1);
        newHist.push(prev);
        
        // 메모리 최적화를 위해 최근 50개까지만 히스토리 유지
        if (newHist.length > 50) {
          newHist.shift(); 
        }
        
        historyRef.current     = newHist;
        historyPointer.current = newHist.length - 1;
        
        setHistoryUIState({ 
          step:   historyPointer.current, 
          length: newHist.length 
        });
      }
      
      return prev;
    });
  }, []);

  /**
   * [함수] 아이템 상태 변경 및 자동 스냅샷 저장
   */
  const updateItems = useCallback((action, saveSnapshot = true) => {
    setItems((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      if (saveSnapshot) {
        const hist = historyRef.current;
        const ptr  = historyPointer.current;
        const last = hist[ptr];
        
        if (JSON.stringify(last) !== JSON.stringify(next)) {
          const newHist = hist.slice(0, ptr + 1);
          newHist.push(next);
          
          if (newHist.length > 50) {
            newHist.shift();
          }
          
          historyRef.current     = newHist;
          historyPointer.current = newHist.length - 1;
          
          setHistoryUIState({ 
            step:   historyPointer.current, 
            length: newHist.length 
          });
        }
      }
      
      return next;
    });
  }, []);

  /**
   * [함수] 실행 취소 (Undo / Ctrl + Z)
   */
  const handleUndo = useCallback(() => {
    if (historyPointer.current > 0) {
      historyPointer.current -= 1;
      
      setItems(historyRef.current[historyPointer.current]);
      setSelectedIds([]);
      setSelectedCells([]);
      
      setHistoryUIState({ 
        step:   historyPointer.current, 
        length: historyRef.current.length 
      });
    }
  }, []);

  /**
   * [함수] 다시 실행 (Redo / Ctrl + Y)
   */
  const handleRedo = useCallback(() => {
    if (historyPointer.current < historyRef.current.length - 1) {
      historyPointer.current += 1;
      
      setItems(historyRef.current[historyPointer.current]);
      setSelectedIds([]);
      setSelectedCells([]);
      
      setHistoryUIState({ 
        step:   historyPointer.current, 
        length: historyRef.current.length 
      });
    }
  }, []);

  // -------------------------------------------------------------------------
  // 4. 외부(UI 및 타 Hook) 반환용 객체 세팅
  // -------------------------------------------------------------------------
  return {
    items,
    setItems,
    selectedIds,
    setSelectedIds,
    selectedCells,
    setSelectedCells,
    historyUIState,
    initItems,
    takeSnapshot,
    updateItems,
    handleUndo,
    handleRedo
  };
};

export default useDesignHistory;