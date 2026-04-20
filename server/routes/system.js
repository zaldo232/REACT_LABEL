/**
 * @file        system.js
 * @description 시스템 공통 기능 및 하드웨어(바코드 스캐너) 통신 데이터 처리를 위한 라우팅 설정 파일
 */

/** [의존성 정의] */
const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

/** [시스템 및 스캔 기능 라우트] */

/**
 * 바코드 스캔 데이터 일괄 저장
 * (POST /api/system/scans)
 * @description 시리얼 스캐너를 통해 수집된 목록을 서버 데이터베이스에 기록
 */
router.post(
  '/scans', 
  systemController.saveScans
);

/**
 * 바코드 스캔 이력 조회
 * (GET /api/system/history)
 * @description 과거에 저장된 스캔 데이터 기록을 기간 및 키워드 조건으로 검색
 */
router.get(
  '/history', 
  systemController.getScanHistory
);

/** [모듈 내보내기] */
module.exports = router;