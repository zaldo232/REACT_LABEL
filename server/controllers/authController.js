/**
 * @file        authController.js
 * @description 사용자 인증 및 세션 관리를 담당하는 컨트롤러
 */

/** [의존성 정의] */
const { executeProcedure } = require('../config/db');

/** [인증 컨트롤러 객체 정의] */
const authController = {

  /**
   * [메소드] 로그인 처리 (login)
   * @description 아이디와 비밀번호를 검증하고 성공 시 세션에 사용자 정보를 저장
   */
  login: async (req, res) => {
    try {
      /** [로직] 클라이언트 요청 데이터 추출 */
      const { 
        userId, 
        userPwd 
      } = req.body;
      
      /** [로직] DB 프로시저 호출을 통한 사용자 정보 조회 */
      const users = await executeProcedure('UP_USER_LOGIN', { 
        UserId: userId 
      });

      // 1. 사용자 존재 여부 및 비밀번호 일치 확인 (단순 비교 방식)
      if (users.length === 0 || users[0].UserPwd !== userPwd) {
        return res.status(401).json({ 
          success: false, 
          message: 'ID 또는 비밀번호가 일치하지 않습니다.' 
        });
      }

      const user = users[0];

      /** [로직] Express Session 생성 및 정보 저장 */
      // 속성이 3개 이상이므로 가독성을 위해 줄바꿈 정렬 적용
      req.session.user = {
        userId: user.UserId,
        userName: user.UserName,
        role: user.Role
      };

      /** [응답 응답 반환] */
      res.json({ 
        success: true, 
        user: req.session.user 
      });

    } catch (error) {
      /** [에러 처리] 서버 내부 오류 발생 시 */
      console.error('Login Error:', error);
      res.status(500).json({ 
        success: false, 
        message: '서버 오류가 발생했습니다.' 
      });
    }
  },

  /**
   * [메소드] 세션 상태 확인 (checkSession)
   * @description 현재 브라우저의 쿠키를 통해 서버 세션이 유효한지 확인
   */
  checkSession: (req, res) => {
    // 세션 객체와 사용자 정보 존재 여부 체크
    if (req.session && req.session.user) {
      res.json({ 
        success: true, 
        isAuth: true, 
        user: req.session.user 
      });
    } else {
      res.json({ 
        success: true, 
        isAuth: false 
      });
    }
  },

  /**
   * [메소드] 로그아웃 처리 (logout)
   * @description 서버 세션을 파괴하고 클라이언트의 세션 쿠키를 삭제
   */
  logout: (req, res) => {
    /** [로직] 세션 파괴 실행 */
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: '로그아웃 중 오류가 발생했습니다.' 
        });
      }

      // 브라우저 측 세션 쿠키 강제 초기화
      res.clearCookie('connect.sid'); 
      
      res.json({ 
        success: true 
      });
    });
  }
};

/** [모듈 내보내기] */
module.exports = authController;