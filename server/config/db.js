/**
 * @file        db.js
 * @description MS SQL Server 데이터베이스 연결 및 프로시저 실행 공통 모듈
 */

/** [의존성 정의] */
const sql = require('mssql');
require('dotenv').config();

/** * [환경 설정] 
 * 데이터베이스 연결을 위한 설정 객체
 */
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  
  // 포트 번호가 없을 경우 기본값 1433을 사용
  port: parseInt(process.env.DB_PORT) || 1433,
  
  // 커넥션 풀(Connection Pool) 설정
  pool: { 
    max: 10, 
    min: 0, 
    idleTimeoutMillis: 30000 
  },
  
  // 보안 및 인증 옵션
  options: {
    encrypt: true,                  // Azure 등 암호화가 필수인 환경 대응
    trustServerCertificate: true    // 로컬/사설 인증서 사용 시 연결 허용
  }
};

/** * [상태 관리] 
 * 데이터베이스 커넥션 풀을 생성하고 연결을 시도하는 Promise 객체
 * 애플리케이션 전역에서 이 단일 Pool을 재사용하여 과부하를 방지
 */
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log('MSSQL Connected: 데이터베이스 연결이 성공적으로 완료되었습니다.');
    return pool;
  })
  .catch((err) => {
    console.error('Database Connection Failed: 데이터베이스 연결에 실패했습니다.', err);
    // 데이터베이스 연결 실패 시 애플리케이션의 정상 동작이 불가능하므로 프로세스를 종료
    process.exit(1);
  });

/** [로직] */

/**
 * 저장 프로시저(Stored Procedure) 실행 공통 함수
 * @param {string} procName - 실행할 데이터베이스 프로시저 이름
 * @param {Object} params - 프로시저에 전달할 파라미터 객체 ({ key: value } 형태)
 * @returns {Promise<Array>} 프로시저 실행 결과 레코드셋(Recordset) 배열
 */
const executeProcedure = async (procName, params = {}) => {
  // 1. 초기화된 커넥션 풀을 가져옴
  const pool = await poolPromise;
  const request = pool.request();
  
  // 2. 전달받은 파라미터 객체를 순회하며 Request 객체에 동적으로 바인딩
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  
  // 3. 프로시저를 실행하고 결과를 반환
  const result = await request.execute(procName);
  return result.recordset;
};

/** * [모듈 내보내기] 
 * 외부에서 필요한 객체와 함수를 명확하게 구조화
 */
module.exports = { 
  sql, 
  poolPromise, 
  dbConfig: config, 
  executeProcedure 
};