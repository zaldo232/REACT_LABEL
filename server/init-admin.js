/**
 * @file        init-admin.js
 * @description 라벨 시스템 초기 관리자 계정 생성을 위한 독립 실행형 시딩 스크립트
 * (비밀번호 암호화 로직을 포함하며, 중복 생성을 방지합니다.)
 */

const { poolPromise, sql } = require('./config/db'); // 설정된 DB 연결 객체 호출
const bcrypt = require('bcrypt');

/** [설정] 초기 계정 정보 */
const ADMIN_CONFIG = {
    userId:   'ADMIN',
    userPw:   'ADMIN',      // 초기 접속 후 변경 권장
    userName: '관리자',
    role:     'ADMIN'      // TB_USER 테이블의 권한 코드
};

const saltRounds = 10;

const seedAdmin = async () => {
    try {
        console.log('------------------------------------------');
        console.log('라벨 시스템 관리자 계정 생성을 시작합니다.');
        console.log('------------------------------------------');

        // 1. 비밀번호 해싱 (bcrypt 사용)
        const hashedPassword = await bcrypt.hash(ADMIN_CONFIG.userPw, saltRounds);

        const pool = await poolPromise;
        
        // 2. TB_USER 테이블에 삽입 (UserId 중복 체크 포함)
        const result = await pool.request()
            .input('UserId',   sql.VarChar,  ADMIN_CONFIG.userId)
            .input('UserPwd',  sql.VarChar,  hashedPassword)
            .input('UserName', sql.NVarChar, ADMIN_CONFIG.userName)
            .input('Role',     sql.VarChar,  ADMIN_CONFIG.role)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM TB_USER WHERE UserId = @UserId)
                BEGIN
                    INSERT INTO TB_USER (UserId, UserPwd, UserName, Role, IsActive, CreatedAt)
                    VALUES (@UserId, @UserPwd, @UserName, @Role, 'Y', GETDATE());
                    SELECT 'SUCCESS' AS STATUS;
                END
                ELSE
                BEGIN
                    SELECT 'EXISTS' AS STATUS;
                END
            `);

        const status = result.recordset[0].STATUS;

        if (status === 'SUCCESS') {
            console.log('성공: 관리자 계정이 생성되었습니다.');
            console.log(`ID: ${ADMIN_CONFIG.userId}`);
            console.log(` PW: ${ADMIN_CONFIG.userPw}`);
        } else {
            console.log('알림: 이미 관리자 계정(' + ADMIN_CONFIG.userId + ')이 DB에 존재합니다.');
        }

    } catch (err) {
        console.error('에러 발생:', err.message);
    } finally {
        console.log('------------------------------------------');
        // 스크립트 종료
        process.exit();
    }
};

seedAdmin();