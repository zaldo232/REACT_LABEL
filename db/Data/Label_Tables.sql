USE REACT_BASE
GO

-- 1. 라벨 디자인 템플릿 테이블 (원본 양식 저장)
CREATE TABLE TB_LABEL_TEMPLATE (
    TemplateId      INT IDENTITY(1,1) PRIMARY KEY,
    TemplateName    NVARCHAR(100) NOT NULL, -- 양식 명칭 (예: 부품식별표, 제품라벨)
    
    -- 기본 규격 정보 (디자이너 툴 초기 설정값)
    PageW           FLOAT NOT NULL,         -- 기본 용지 가로 mm (예: 210)
    PageH           FLOAT NOT NULL,         -- 기본 용지 세로 mm (예: 297)
    LabelW          FLOAT NOT NULL,         -- 라벨 개별 가로 mm
    LabelH          FLOAT NOT NULL,         -- 라벨 개별 세로 mm
    Cols            INT DEFAULT 1,          -- 가로 개수
    Rows            INT DEFAULT 1,          -- 세로 개수
    MarginTop       FLOAT DEFAULT 0,        -- 상단 여백
    MarginLeft      FLOAT DEFAULT 0,        -- 좌측 여백
    Gap             FLOAT DEFAULT 0,        -- 라벨 간격
    
    -- 디자인 핵심 정보
    DesignJson      NVARCHAR(MAX) NOT NULL, -- 텍스트, 바코드, 선 등 레이어 정보 (JSON)
    
    -- 상태 및 관리 정보
    IsDefault       CHAR(1) DEFAULT 'N',    -- 기본 양식 여부 (Y/N)
    DelYn           CHAR(1) DEFAULT 'N',    -- 삭제 여부 플래그 (N: 사용, Y: 삭제됨)
    CreatedAt       DATETIME DEFAULT GETDATE(),
    CreatedBy       VARCHAR(50),            -- 작성자 ID
    UpdatedAt       DATETIME DEFAULT GETDATE()
);
GO

-- 2. 인쇄 프리셋 저장 테이블 (사용자가 설정한 인쇄 옵션 및 데이터 스냅샷)
CREATE TABLE TB_LABEL_PRINT_PRESET (
    PresetId        INT IDENTITY(1,1) PRIMARY KEY,
    PresetName      NVARCHAR(100) NOT NULL, -- 프리셋 명칭 (예: A라인 1번기 전용)
    TemplateId      INT NOT NULL,           -- 연결된 원본 디자인 ID (논리적 FK)
    
    -- 입력 데이터 및 레이아웃 스냅샷
    DynamicDataJson NVARCHAR(MAX),          -- 사용자가 입력한 가변 데이터 (Key-Value JSON)
    LayoutJson      NVARCHAR(MAX),          -- 인쇄 시점에 변경한 배치/여백 설정 (JSON)
    CopyCount       INT DEFAULT 1,          -- 기본 인쇄 쪽수
    
    -- 상태 및 관리 정보
    DelYn           CHAR(1) DEFAULT 'N',    --   삭제 여부 플래그 (N: 사용, Y: 삭제됨)
    CreatedAt       DATETIME DEFAULT GETDATE(),
    CreatedBy       VARCHAR(50),            -- 작성자 ID
    UpdatedAt       DATETIME DEFAULT GETDATE()
);
GO

-- 3. 라벨 발행 이력 테이블 (실제 출력 기록)
CREATE TABLE TB_LABEL_PRINT_HISTORY (
    PrintSeq        INT IDENTITY(1,1) PRIMARY KEY,
    BatchNo         VARCHAR(50) NOT NULL,   -- 발행 묶음 번호 (예: B001_20260403_ADMIN)
    Barcode         VARCHAR(100) NOT NULL,  -- 생성된 바코드 문자열
    
    -- 발행 시점의 모든 정보 저장 (원본 양식이 바뀌어도 이력은 보존되어야 함)
    JsonData        NVARCHAR(MAX),          -- 발행 당시 입력된 모든 동적 데이터 (JSON)
    TemplateId      INT,                    -- 발행 시 사용했던 원본 양식 ID (논리적 FK)
    
    -- 발행 정보
    UserId          VARCHAR(50) NOT NULL,   -- 발행자 ID
    CreatedAt       DATETIME DEFAULT GETDATE() -- 발행 일시
);
GO