/**
 * @file        useDesignFileIO.js
 * @description 라벨 디자인 페이지의 외부 데이터 입출력(File I/O) 및 서버 API 통신을 전담하는 커스텀 훅
 * - [포맷팅] 프로젝트 규칙에 따른 Object 내부 속성, 파라미터, 반환(Return) 객체의 완벽한 수직 정렬 및 줄바꿈 적용
 * - [기능] 엑셀(.xlsx) 파싱 및 표 자동 생성, JSON/PNG 파일 로컬 내보내기/불러오기, 이미지 파일 첨부
 * - [API] 서버 DB 템플릿 목록 조회, 저장, 삭제 기능
 */

import { 
  useState, 
  useRef 
} from 'react';

// 외부 의존성 라이브러리
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

// 공통 API 클라이언트 및 알림 모듈
import apiClient from '../../../../utils/apiClient';
import { 
  showAlert, 
  showConfirm 
} from '../../../../utils/swal';

// =========================================================================
// [커스텀 훅] useDesignFileIO
// =========================================================================
const useDesignFileIO = ({
  templateId,
  setTemplateId,
  templateName,
  setTemplateName,
  layout,
  setLayout,
  items,
  initItems,
  updateItem,
  selectedIds,
  canvasRef
}) => {

  // -------------------------------------------------------------------------
  // 1. 상태 및 Ref 선언
  // -------------------------------------------------------------------------
  const [openDbDialog, setOpenDbDialog] = useState(false);
  const [dbList, setDbList]             = useState([]);
  
  // 파일 입력을 위한 DOM Refs
  const excelLayoutInputRef = useRef(null);
  const fileInputRef        = useRef(null);
  const imageInputRef       = useRef(null);

  // -------------------------------------------------------------------------
  // 2. 엑셀 템플릿 파싱 로직 (.xlsx -> Table 개체 변환)
  // -------------------------------------------------------------------------
  const handleExcelLayoutParse = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data           = new Uint8Array(event.target.result);
        const workbook       = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet      = workbook.Sheets[firstSheetName];

        const matrix = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '' 
        });
        
        if (matrix.length === 0) {
          return showAlert("오류", "error", "빈 엑셀 파일입니다.");
        }

        // 유효한 데이터가 있는 최대 행/열 인덱스 탐색
        let maxR = -1;
        let maxC = -1;
        
        for (let r = 0; r < matrix.length; r++) {
          for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] !== undefined && matrix[r][c] !== null && String(matrix[r][c]).trim() !== '') {
              if (r > maxR) maxR = r;
              if (c > maxC) maxC = c;
            }
          }
        }

        // 병합된 셀(Merges) 정보 확인하여 최대 행/열 범위 확장
        const merges = worksheet['!merges'] || [];
        merges.forEach((m) => {
          if (m.s.r <= maxR && m.s.c <= maxC) {
            if (m.e.r > maxR) maxR = m.e.r;
            if (m.e.c > maxC) maxC = m.e.c;
          }
        });

        if (maxR === -1 || maxC === -1) {
          return showAlert("오류", "error", "텍스트가 있는 유효한 영역이 없습니다.");
        }

        const numRows   = maxR + 1;
        const numCols   = maxC + 1;
        const skipCells = new Set(); 
        const newCells  = [];
        
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < numCols; c++) {
            if (skipCells.has(`${r},${c}`)) continue;

            let cellText = matrix[r][c] !== undefined && matrix[r][c] !== null ? String(matrix[r][c]).trim() : '';
            let cellType = 'text';
            let dataId   = '';
            let rowSpan  = 1;
            let colSpan  = 1;

            // 병합된 셀인지 확인 및 Span 계산
            const mergeInfo = merges.find(m => m.s.r === r && m.s.c === c);
            if (mergeInfo) {
              rowSpan = mergeInfo.e.r - mergeInfo.s.r + 1;
              colSpan = mergeInfo.e.c - mergeInfo.s.c + 1;
              
              for(let i = r; i <= mergeInfo.e.r; i++) {
                for(let j = c; j <= mergeInfo.e.c; j++) {
                  if (i === r && j === c) continue;
                  skipCells.add(`${i},${j}`);
                }
              }
            }

            // 가변 데이터 및 특수 바코드 문법 파싱 (#변수# 또는 [변수])
            let dataMatch = cellText.match(/#([^#]+)#/);
            if (!dataMatch) {
               dataMatch = cellText.match(/\[([^\]]+)\]/);
            }
            
            if (dataMatch) {
              cellType = 'data';
              dataId   = dataMatch[1] === 'DATA' ? '' : dataMatch[1]; 
              cellText = '';         
            } else if (cellText.includes('*BARCODE*')) {
              cellType = 'barcode';
              cellText = '';
            } else if (cellText.includes('*QRCODE*')) {
              cellType = 'qrcode';
              cellText = '';
            }

            newCells.push({
              row:                     r,
              col:                     c,
              rowSpan:                 rowSpan,
              colSpan:                 colSpan,
              cellType:                cellType,
              content:                 cellText,
              dataId:                  dataId,
              prefix:                  '',
              suffix:                  '',
              barcodeType:             'CODE128',
              qrErrorLevel:            'M',
              displayValue:            true,
              showPrefixSuffixOnLabel: true,
              cellName:                '',
              fontSize:                ''
            });
          }
        }

        // 여백을 고려한 표 기본 사이즈 계산
        const maxW   = parseFloat(layout.labelW) || 100;
        const maxH   = parseFloat(layout.labelH) || 50;
        const margin = 2; 
        const tableW = Math.max(10, maxW - (margin * 2));
        const tableH = Math.max(10, maxH - (margin * 2));

        const newTableItem = {
          id:           `excel-table-${Date.now()}`,
          type:         'table',
          label:        `엑셀 연동 표`,
          x:            margin,
          y:            margin,
          width:        tableW,
          height:       tableH,
          rotate:       0,
          fontSize:     9, 
          fontWeight:   'normal',
          fontStyle:    'normal',
          borderWidth:  0.5,
          transparent:  true,
          fill:         '#ffffff',
          stroke:       '#000000',
          visible:      true,
          useSnap:      true,
          showBorder:   true,
          rows:         numRows,
          cols:         numCols,
          rowRatios:    Array(numRows).fill(100 / numRows), 
          colRatios:    Array(numCols).fill(100 / numCols),
          cells:        newCells
        };

        // 기존 내용을 덮어씌우고 새 표 삽입
        initItems([newTableItem]); 
        setTemplateName(file.name.replace(/\.[^/.]+$/, "")); // 확장자 제거
        
        showAlert("파싱 완료", "success", "엑셀의 데이터 영역만 추출하여 표를 생성했습니다.");

      } catch (error) {
        showAlert("오류", "error", "엑셀 파싱 중 오류가 발생했습니다. (.xlsx 권장)");
      }
    };
    
    reader.readAsArrayBuffer(file); 
    excelLayoutInputRef.current.value = null; 
  };

  // -------------------------------------------------------------------------
  // 3. 로컬 파일 입출력 로직 (JSON, PNG, 이미지 삽입)
  // -------------------------------------------------------------------------

  /**
   * [함수] 캔버스를 이미지(PNG)와 양식(JSON)으로 내보내기
   */
  const handleExport = async () => {
    if (!templateName) {
      return showAlert("확인", "warning", "내보낼 양식 이름을 먼저 입력하세요.");
    }
    
    const el = canvasRef?.current;
    if (!el) return;

    // 캡처 전 캔버스 스타일 초기화 및 개체 선택 해제
    const originalBg        = el.style.backgroundImage;
    const originalBoxShadow = el.style.boxShadow;
    
    el.style.backgroundImage = 'none';
    el.style.boxShadow       = 'none';

    let canvas;
    try {
      canvas = await html2canvas(el, { 
        scale:           3, 
        useCORS:         true, 
        backgroundColor: '#ffffff' 
      });
    } catch(err) {
      el.style.backgroundImage = originalBg;
      el.style.boxShadow       = originalBoxShadow;
      return showAlert("오류", "error", "미리보기 이미지 생성 중 문제가 발생했습니다.");
    }

    // 캡처 후 스타일 원복
    el.style.backgroundImage = originalBg;
    el.style.boxShadow       = originalBoxShadow;

    // JSON 데이터 생성
    const data = { 
      templateName, 
      layout, 
      items 
    };
    const jsonString = JSON.stringify(data, null, 2);

    // File System Access API 지원 브라우저 (Chrome, Edge 등)
    if (window.showDirectoryPicker) {
      try {
        const dirHandle      = await window.showDirectoryPicker({ mode: 'readwrite' });
        
        // 1. JSON 파일 저장
        const jsonFileHandle = await dirHandle.getFileHandle(`${templateName}.json`, { create: true });
        const jsonWritable   = await jsonFileHandle.createWritable();
        await jsonWritable.write(new Blob([jsonString], { type: 'application/json' }));
        await jsonWritable.close();

        // 2. PNG 이미지 파일 저장
        canvas.toBlob(async (blob) => {
          const imgFileHandle = await dirHandle.getFileHandle(`${templateName}.png`, { create: true });
          const imgWritable   = await imgFileHandle.createWritable();
          await imgWritable.write(blob);
          await imgWritable.close();
          showAlert("성공", "success", "선택하신 폴더에 JSON 양식과 라벨 미리보기(PNG) 이미지가 함께 저장되었습니다.");
        }, 'image/png');
        
        return; 
      } catch (pickerErr) {
        if (pickerErr.name === 'AbortError') return; 
        console.warn("폴더 지정 권한 오류, 브라우저 기본 다운로드로 Fallback합니다.", pickerErr);
      }
    }

    // 미지원 브라우저 <a> 태그 다운로드 폴백(Fallback) 처리
    const downloadFile = (url, filename) => {
      const link    = document.createElement('a');
      link.href     = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const jsonBlob = new Blob([jsonString], { type: 'application/json' });
    const jsonUrl  = URL.createObjectURL(jsonBlob);
    
    downloadFile(jsonUrl, `${templateName}.json`);
    URL.revokeObjectURL(jsonUrl);

    const imgUrl = canvas.toDataURL('image/png');
    downloadFile(imgUrl, `${templateName}.png`);

    showAlert("성공", "success", "JSON 양식과 미리보기(PNG)가 기본 다운로드 폴더에 저장되었습니다.");
  };

  /**
   * [함수] 로컬 JSON 파일을 읽어 캔버스에 복원
   */
  const handleImportJson = (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        
        setTemplateId(null); 
        setTemplateName(json.templateName || 'Imported');
        setLayout(json.layout || { 
          labelW:       '100', 
          labelH:       '50', 
          delimiter:    '', 
          excelMapping: {} 
        }); 
        initItems(json.items || []);
        
        showAlert("성공", "success", "파일을 불러왔습니다.");
      } catch (err) { 
        showAlert("오류", "error", "올바른 JSON 파일이 아닙니다."); 
      }
    };
    
    reader.readAsText(file); 
    e.target.value = null;
  };

  /**
   * [함수] 사용자 PC의 이미지를 읽어 Base64로 캔버스 개체에 삽입
   */
  const handleImageUpload = (e) => {
    const file = e.target.files[0]; 
    if (!file || selectedIds.length !== 1) return;
    
    const reader = new FileReader();
    
    reader.onload = (ev) => {
      updateItem(selectedIds[0], 'src', ev.target.result, false);
    };
    
    reader.readAsDataURL(file); 
    e.target.value = null;
  };

  // -------------------------------------------------------------------------
  // 4. API 서버 통신 로직 (DB 저장/불러오기/삭제)
  // -------------------------------------------------------------------------
  
  /**
   * [API] 서버에 저장된 디자인 템플릿 목록 조회
   */
  const handleFetchDbList = () => {
    apiClient.get('/label/template/list')
      .then(res => { 
        setDbList(res.data.data || []); 
        setOpenDbDialog(true); 
      })
      .catch(err => {
        showAlert("조회 실패", "error", "템플릿 목록을 가져오지 못했습니다.");
      });
  };

  /**
   * [API] 현재 디자인 캔버스를 서버 DB에 저장
   */
  const requestSave = async () => {
    if (!templateName) {
      return showAlert("확인", "warning", "양식 이름을 입력하세요.");
    }
    
    try {
      const payload = {
        templateId:   templateId, 
        templateName: templateName, 
        labelW:       layout.labelW, 
        labelH:       layout.labelH,
        // Layout 메타데이터를 배열 첫 번째 요소로 포함하여 전송
        designJson:   JSON.stringify([{ type: 'meta', layout }, ...items])
      };
      
      const res = await apiClient.post('/label/template/save', payload);
      setTemplateId(res.data.resultId); 
      showAlert("성공", "success", "서버에 성공적으로 저장되었습니다.");
      
    } catch (e) { 
      showAlert("실패", "error", "저장 중 서버 오류가 발생했습니다."); 
    }
  };

  /**
   * [API] 서버 DB에 저장된 특정 템플릿 삭제
   */
  const handleDeleteTemplate = async (e, id, name) => {
    e.stopPropagation();
    
    const confirmed = await showConfirm("삭제", `[${name}] 양식을 완전히 삭제할까요?`);
    if (!confirmed) return;
    
    try {
      await apiClient.delete(`/label/template/${id}`);
      
      // 삭제 성공 시 리스트 재조회
      const res = await apiClient.get('/label/template/list');
      setDbList(res.data.data || []);
      
      showAlert("성공", "success", "삭제가 완료되었습니다.");
      
    } catch (e) { 
      showAlert("실패", "error", "삭제에 실패했습니다."); 
    }
  };

  // -------------------------------------------------------------------------
  // 5. 리턴 객체 (UI 컴포넌트로 전달)
  // -------------------------------------------------------------------------
  return {
    openDbDialog, 
    setOpenDbDialog, 
    dbList,
    excelLayoutInputRef, 
    fileInputRef, 
    imageInputRef,
    handleExcelLayoutParse, 
    handleExport, 
    handleImportJson, 
    handleImageUpload,
    handleFetchDbList, 
    requestSave, 
    handleDeleteTemplate
  };
};

export default useDesignFileIO;