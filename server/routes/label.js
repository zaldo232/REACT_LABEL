/**
 * @file        label.js
 * @description 라벨 디자인 템플릿, 인쇄 프리셋, 그리고 출력 이력 관리를 위한 API 라우팅 설정 파일
 */

/** [의존성 정의] */
const express = require('express');
const router = express.Router();
const labelController = require('../controllers/labelController');

/** [디자인 템플릿(원본) 관리] */

/**
 * 라벨 디자인 양식 저장 및 수정
 * (POST /api/label/template/save)
 */
router.post(
  '/template/save', 
  labelController.saveTemplate
);

/**
 * 등록된 라벨 디자인 양식 전체 목록 조회
 * (GET /api/label/template/list)
 */
router.get(
  '/template/list', 
  labelController.getTemplateList
);

/** [인쇄 프리셋(설정) 관리] */

/**
 * 특정 양식에 가변 데이터를 매핑한 인쇄 프리셋 저장
 * (POST /api/label/preset/save)
 */
router.post(
  '/preset/save', 
  labelController.savePrintPreset
);

/**
 * 저장된 인쇄 프리셋 목록 조회
 * (GET /api/label/preset/list)
 */
router.get(
  '/preset/list', 
  labelController.getPrintPresetList
);

/** [데이터 삭제 (Soft Delete)] */
/**
 * 라벨 관련 데이터 삭제 처리
 * @param {string} type - 'template' 또는 'preset' 구분
 * @param {number} id - 삭제할 항목의 고유 ID
 * (DELETE /api/label/:type/:id)
 */
router.delete(
  '/:type/:id', 
  labelController.deleteLabelData
);

/** [출력 이력 관리] */

/**
 * 라벨 출력 데이터 이력 저장
 * (POST /api/label/save)
 */
router.post(
  '/save', 
  labelController.saveLabelData
);

/**
 * 라벨 발행 이력 동적 조회 (양식별 가변 컬럼 반영)
 * (GET /api/label/history)
 */
router.get(
  '/history', 
  labelController.getHistory
);

/** [모듈 내보내기] */
module.exports = router;