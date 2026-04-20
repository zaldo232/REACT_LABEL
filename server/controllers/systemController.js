/**
 * @file        systemController.js
 * @description 시스템 공통 기능(바코드 스캔 데이터 저장 및 이력 조회)을 담당하는 컨트롤러
 */

/** [의존성 정의] */
const { executeProcedure } = require('../config/db');

/** [시스템 컨트롤러 객체 정의] */
const systemController = {

  /**
   * [메소드] 바코드 스캔 데이터 일괄 저장 (saveScans)
   * @description 프론트엔드에서 수집된 바코드 리스트를 JSON 형태로 변환하여 DB에 일괄 기록
   */
  saveScans: async (req, res) => {
    try {
      /** [로직] 요청 데이터 및 세션 정보 추출 */
      const { 
        scanData 
      } = req.body;

      const userId = req.session.user?.userId;

      // 1. 세션 유효성 검증
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: '로그인이 필요하거나 세션이 만료되었습니다.' 
        });
      }

      // 2. 입력 데이터 존재 여부 및 형식 검증
      if (!scanData || !Array.isArray(scanData) || scanData.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: '저장할 바코드 데이터가 없습니다.' 
        });
      }

      /** [로직] DB 저장용 JSON 문자열 변환 */
      const jsonDataString = JSON.stringify(scanData);

      /** [로직] DB 프로시저 실행 (UP_INSERT_BARCODE_SCANS) */
      const result = await executeProcedure('UP_INSERT_BARCODE_SCANS', {
        UserId: userId,
        JsonData: jsonDataString
      });

      const generatedBatchNo = result[0]?.GeneratedBatchNo;

      /** [응답 반환] */
      res.json({ 
        success: true, 
        message: '성공적으로 저장되었습니다.',
        batchNo: generatedBatchNo 
      });

    } catch (error) {
      /** [에러 처리] */
      console.error('스캔 데이터 저장 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: 'DB 저장 중 오류가 발생했습니다.' 
      });
    }
  },

  /**
   * [메소드] 바코드 스캔 이력 조회 (getScanHistory)
   * @description 특정 기간 내의 바코드 스캔 기록을 조건별로 조회
   */
  getScanHistory: async (req, res) => {
    try {
      /** [로직] 쿼리 스트링 파라미터 추출 */
      const { 
        startDate, 
        endDate, 
        barcode, 
        userId 
      } = req.query;

      // 1. 필수 조회 조건(기간) 체크
      if (!startDate || !endDate) {
        return res.status(400).json({ 
          success: false, 
          message: '조회 기간을 선택해주세요.' 
        });
      }

      /** [로직] DB 프로시저 실행 (UP_SELECT_BARCODE_HISTORY) */
      const result = await executeProcedure('UP_SELECT_BARCODE_HISTORY', {
        // 날짜 포맷 보정: '2026-03-31' -> '20260331' (KST 타임존 고려 데이터 포맷)
        StartDate: startDate.replace(/-/g, ''),
        EndDate: endDate.replace(/-/g, ''),
        
        // 검색 조건이 없을 경우 NULL 처리를 통해 DB 기본 로직 유도
        Barcode: barcode || null,
        UserId: userId || null
      });

      /** [응답 반환] */
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      /** [에러 처리] */
      console.error('스캔 이력 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '데이터 조회 중 오류가 발생했습니다.' 
      });
    }
  }
};

/** [모듈 내보내기] */
module.exports = systemController;