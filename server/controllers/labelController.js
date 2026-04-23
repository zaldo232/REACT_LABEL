/**
 * @file        labelController.js
 * @description 라벨 템플릿 디자인, 인쇄 프리셋 관리 및 발행 이력 조회를 담당하는 컨트롤러
 */

/** [의존성 정의] */
const { executeProcedure } = require('../config/db');

/** [라벨 컨트롤러 객체 정의] */
const labelController = {

  /**
   * [메소드] 라벨 디자인 템플릿 저장 및 수정
   * @description 디자인 툴에서 생성된 레이아웃 및 항목(JSON)을 DB에 저장
   */
  saveTemplate: async (req, res) => {
    try {
      /** [로직] 클라이언트 요청 데이터 추출 */
      const { 
        templateId, 
        templateName, 
        pageW, 
        pageH, 
        labelW, 
        labelH, 
        cols, 
        rows, 
        marginTop, 
        marginLeft, 
        gap, 
        designJson 
      } = req.body;

      // 세션에서 현재 로그인된 사용자 ID 추출 (없을 경우 SYSTEM)
      const userId = req.session.user?.userId || 'SYSTEM';

      /** [로직] DB 프로시저 호출 (UP_SAVE_LABEL_TEMPLATE) */
      const result = await executeProcedure('UP_SAVE_LABEL_TEMPLATE', {
        TemplateId: templateId || null,
        TemplateName: templateName,
        PageW: parseFloat(pageW) || 0,
        PageH: parseFloat(pageH) || 0,
        LabelW: parseFloat(labelW) || 0,
        LabelH: parseFloat(labelH) || 0,
        Cols: parseInt(cols) || 1,
        Rows: parseInt(rows) || 1,
        MarginTop: parseFloat(marginTop) || 0,
        MarginLeft: parseFloat(marginLeft) || 0,
        Gap: parseFloat(gap) || 0,
        DesignJson: designJson,
        UserId: userId
      });

      /** [응답 반환] */
      res.json({ 
        success: true, 
        message: '템플릿이 성공적으로 저장되었습니다.',
        resultId: result[0]?.ResultId,
        action: result[0]?.Action 
      });

    } catch (error) {
      console.error('템플릿 저장 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '데이터베이스 저장 중 오류가 발생했습니다.' 
      });
    }
  },

  /**
   * [메소드] 라벨 디자인 템플릿 목록 조회
   * @description 사용 가능한 모든 라벨 템플릿 리스트를 가져옴
   */
  getTemplateList: async (req, res) => {
    try {
      const result = await executeProcedure('UP_SELECT_LABEL_TEMPLATE_LIST', {}); 
      
      res.json({ 
        success: true, 
        data: result 
      });
    } catch (error) {
      console.error('템플릿 목록 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '목록을 불러오는 데 실패했습니다.' 
      });
    }
  },

  /**
   * [메소드] 인쇄 프리셋(설정) 저장 및 수정
   * @description 특정 양식에 가변 데이터를 미리 입력해둔 상태를 프리셋으로 저장
   */
  savePrintPreset: async (req, res) => {
    try {
      const { 
        presetId, 
        presetName, 
        templateId, 
        dynamicDataJson, 
        layoutJson, 
        copyCount 
      } = req.body;

      const userId = req.session.user?.userId || 'SYSTEM';
      
      /** [로직] DB 프로시저 호출 (UP_SAVE_PRINT_PRESET) */
      const result = await executeProcedure('UP_SAVE_PRINT_PRESET', {
        PresetId: presetId || null,
        PresetName: presetName,
        TemplateId: templateId,
        DynamicDataJson: dynamicDataJson,
        LayoutJson: layoutJson,
        CopyCount: parseInt(copyCount) || 1,
        UserId: userId
      });

      res.json({ 
        success: true, 
        message: '인쇄 프리셋이 저장되었습니다.',
        resultId: result[0]?.ResultId, 
        action: result[0]?.Action 
      });

    } catch (error) {
      console.error('프리셋 저장 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '프리셋 저장 처리 중 오류가 발생했습니다.' 
      });
    }
  },

  /**
   * [메소드] 인쇄 프리셋 목록 조회
   * @description 저장된 인쇄 프리셋과 연결된 템플릿 정보를 함께 조회
   */
  getPrintPresetList: async (req, res) => {
    try {
      const result = await executeProcedure('UP_SELECT_PRINT_PRESET_LIST', {});
      
      res.json({ 
        success: true, 
        data: result 
      });
    } catch (error) {
      console.error('프리셋 목록 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '프리셋 목록 조회 실패' 
      });
    }
  },

  /**
   * [메소드] 라벨 데이터 삭제 (Soft Delete)
   * @description 템플릿 또는 프리셋을 삭제 플래그(DelYn) 처리
   */
  deleteLabelData: async (req, res) => {
    try {
      const { 
        type, 
        id 
      } = req.params; // type: 'template' 또는 'preset'

      await executeProcedure('UP_DELETE_LABEL_DATA', {
        Type: type.toUpperCase(), 
        Id: id
      });

      res.json({ 
        success: true, 
        message: '정상적으로 삭제되었습니다.' 
      });

    } catch (error) {
      console.error('데이터 삭제 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '삭제 처리 중 서버 오류가 발생했습니다.' 
      });
    }
  },

  /**
   * [메소드] 통합 데이터 저장 (발행 이력 데이터 저장)
   * @description 실제 라벨을 인쇄할 때 호출되어 출력 이력을 기록
   */
  saveLabelData: async (req, res) => {
    try {
      const { 
        labelData, 
        templateId 
      } = req.body;

      const userId = req.session.user?.userId || 'SYSTEM';

      /** [로직] DB 프로시저 호출 (UP_INSERT_LABEL_PRINT) */
      const result = await executeProcedure('UP_INSERT_LABEL_PRINT', {
        UserId: userId,
        TemplateId: parseInt(templateId), 
        JsonData: JSON.stringify(labelData) // 데이터를 JSON 문자열로 변환하여 전달
      });

      res.json({ 
        success: true, 
        message: '발행 정보가 저장되었습니다.', 
        batchNo: result[0]?.GeneratedBatchNo 
      });

    } catch (error) {
      console.error('라벨 이력 저장 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '이력 저장 중 서버 에러가 발생했습니다.' 
      });
    }
  },

  /**
   * [메소드] 발행 이력 동적 조회
   * @description 선택한 양식의 구조에 따라 동적으로 가변 컬럼을 생성하여 조회 결과를 반환
   */
  getHistory: async (req, res) => {
    try {
      const { 
        startDate, 
        endDate, 
        barcode, 
        templateId 
      } = req.query;

      // 1. 필수 선택값 검증
      if (!templateId) {
        return res.json({ 
          success: true, 
          data: [], 
          message: '조회할 양식을 먼저 선택해 주세요.' 
        });
      }

      /** [로직] DB 프로시저 호출 (UP_SELECT_LABEL_HISTORY_DYNAMIC) */
      const result = await executeProcedure('UP_SELECT_LABEL_HISTORY_DYNAMIC', {
        TemplateId: parseInt(templateId),
        // 날짜 포맷에서 하이픈 제거 (YYYY-MM-DD -> YYYYMMDD)
        StartDate: startDate?.replace(/-/g, '') || '',
        EndDate: endDate?.replace(/-/g, '') || '',
        Barcode: barcode || null
      });

      res.json({ 
        success: true, 
        data: result 
      });

    } catch (error) {
      console.error('이력 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '이력 데이터를 불러오는 데 실패했습니다.' 
      });
    }
  }
};

/** [모듈 내보내기] */
module.exports = labelController;