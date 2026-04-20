/**
 * @file        MssqlStore.js
 * @description express-session의 세션 데이터를 MSSQL DB에 저장하고 관리하는 저장소 클래스
 */

const session = require('express-session');
const { sql } = require('../config/db');                    // DB 설정 및 라이브러리 로드

class MssqlStore extends session.Store {
    /**
     * @param {Object} options - 저장소 설정 옵션
     */
    constructor(options = {}) {
        super(options);
        this.poolPromise = options.poolPromise;             // DB 커넥션 풀
        this.tableName = options.table || 'TB_SESSIONS';    // 세션 저장 테이블명
    }

    /**
     * 세션 데이터 조회
     * @param {string} sid - 세션 ID
     */
    async get(sid, callback) {
        try {
            const pool = await this.poolPromise;
            const result = await pool.request()
                .input('sid', sql.VarChar(255), sid)
                // 만료되지 않은 세션만 조회
                .query(`SELECT session FROM ${this.tableName} WHERE sid = @sid AND expires > GETDATE()`);

            if (result.recordset.length > 0) {
                const sessionData = JSON.parse(result.recordset[0].session);
                return callback(null, sessionData);
            }
            callback(null, null);
        } catch (err) {
            console.error('Session Get Error:', err);
            callback(err);
        }
    }

    /**
     * 세션 데이터 저장 및 업데이트 (Upsert)
     * @param {string} sid - 세션 ID
     * @param {Object} sessionData - 저장할 세션 정보
     */
    async set(sid, sessionData, callback) {
        try {
            const pool = await this.poolPromise;
            
            // 만료 시간 계산 (쿠키 설정 기반 또는 기본 1일)
            let expires;
            if (sessionData.cookie && sessionData.cookie.expires) {
                expires = new Date(sessionData.cookie.expires);
            } else {
                expires = new Date(Date.now() + 86400000); 
            }

            const sessionString = JSON.stringify(sessionData);

            // MERGE 문을 사용하여 데이터가 있으면 UPDATE, 없으면 INSERT 수행
            await pool.request()
                .input('sid', sql.VarChar(255), sid)
                .input('session', sql.NVarChar(sql.MAX), sessionString)
                .input('expires', sql.DateTime, expires)
                .query(`
                    MERGE ${this.tableName} AS target
                    USING (SELECT @sid AS sid) AS source
                    ON (target.sid = source.sid)
                    WHEN MATCHED THEN UPDATE SET session = @session, expires = @expires
                    WHEN NOT MATCHED THEN INSERT (sid, session, expires) VALUES (@sid, @session, @expires);
                `);
            callback(null);
        } catch (err) {
            console.error('Session Set Error:', err);
            callback(err);
        }
    }

    /**
     * 세션 삭제 (로그아웃 등)
     * @param {string} sid - 세션 ID
     */
    async destroy(sid, callback) {
        try {
            const pool = await this.poolPromise;
            await pool.request()
                .input('sid', sql.VarChar(255), sid)
                .query(`DELETE FROM ${this.tableName} WHERE sid = @sid`);
            callback(null);
        } catch (err) {
            console.error('Session Destroy Error:', err);
            callback(err);
        }
    }
}

module.exports = MssqlStore;