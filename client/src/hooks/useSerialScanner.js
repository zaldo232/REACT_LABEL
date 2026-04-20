/**
 * @file        useSerialScanner.js
 * @description 웹 시리얼 API(Web Serial API)를 활용하여 하드웨어 바코드 스캐너와 통신하는 훅
 */

import { useState, useRef, useEffect, useCallback } from 'react';

export const useSerialScanner = (onScanSuccess, onStatusChange) => {
  /** [상태 관리] */
  
  // 스캐너 연결 상태 여부
  const [isConnected, setIsConnected] = useState(false);

  /** [Ref 관리] 웹 시리얼 API 객체 및 제어 플래그 */
  
  const portRef = useRef(null);         // 연결된 시리얼 포트 객체 유지
  const readerRef = useRef(null);       // 데이터 스트림 리더 객체 유지
  const keepReadingRef = useRef(true);  // 데이터 읽기 루프(while) 유지 플래그

  // 콜백 함수 최신화 유지를 위한 Ref (클로저에서 과거 상태를 참조하는 문제 방지)
  const onScanRef = useRef(onScanSuccess);
  
  /** [Effect] 외부에서 주입된 콜백 함수가 변경될 때마다 Ref 업데이트 */
  useEffect(() => { 
    onScanRef.current = onScanSuccess; 
  }, [onScanSuccess]);

  /** [로직] 하드웨어 제어 및 스트림 처리 */

  /**
   * 강제 연결 해제 및 UI 상태 동기화
   * @description 포트와 리더의 잠금을 강제로 해제하고 안전하게 닫아 메모리 누수를 방지
   */
  const forceDisconnect = useCallback(async () => {
    console.warn("🔌 스캐너 연결 종료 및 상태 초기화");
    
    // 1. 스트림 읽기 무한 루프 중단 신호 전달
    keepReadingRef.current = false; 
    
    // 2. 스트림 리더(Reader) 잠금 해제 및 취소
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
      } catch (e) {
        // 해제 중 발생하는 에러는 이미 끊어진 상태이므로 무시
      }
      readerRef.current = null;
    }

    // 3. 물리적 시리얼 포트 닫기
    if (portRef.current) {
      try {
        // 포트가 완전히 닫힐 수 있도록 비동기 지연 시간(Delay) 부여
        await new Promise((resolve) => setTimeout(resolve, 100));
        await portRef.current.close();
      } catch (e) {
        // 닫기 중 에러 무시
      }
      portRef.current = null;
    }

    // 4. 상태 초기화 및 부모 컴포넌트에 연결 해제 이벤트 알림
    setIsConnected(false);
    if (onStatusChange) {
      onStatusChange(false);
    }
  }, [onStatusChange]);

  /**
   * [Effect] USB 물리적 탈착(Disconnect) 감시 이벤트 바인딩
   * @description 사용자가 케이블을 무단으로 뽑았을 때 즉각적으로 예외 처리를 수행
   */
  useEffect(() => {
    const handleDisconnect = (event) => {
      // 현재 연결된 포트와 운영체제에서 뽑힌 포트가 일치할 경우 강제 해제 실행
      if (portRef.current && event.port === portRef.current) {
        forceDisconnect();
      }
    };

    navigator.serial.addEventListener('disconnect', handleDisconnect);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => {
      navigator.serial.removeEventListener('disconnect', handleDisconnect);
    };
  }, [forceDisconnect]);

  /**
   * 스캐너(시리얼 포트) 연결 요청
   * @returns {Promise<boolean>} 연결 성공 여부
   */
  const connect = async () => {
    try {
      let port;
      
      // 1. 브라우저에 이미 권한이 부여된 포트 목록 확인
      const savedPorts = await navigator.serial.getPorts();
      
      // 2. 권한이 있는 포트가 존재하면 첫 번째 포트 재사용, 없다면 권한 요청 팝업 호출
      port = savedPorts.length > 0 
        ? savedPorts[0] 
        : await navigator.serial.requestPort();

      // 3. 포트가 닫혀있다면 바코드 스캐너의 기본 보드레이트(9600)로 개방
      if (!port.readable) {
        await port.open({ baudRate: 9600 }); 
      }

      // 4. 연결 상태 및 플래그 갱신
      portRef.current = port;
      setIsConnected(true);
      keepReadingRef.current = true;
      
      console.log("스캐너 하드웨어 연결 성공");
      
      // 5. 데이터 스트림 읽기 백그라운드 루프 시작
      readLoop(); 
      return true;

    } catch (error) {
      // 이미 포트가 열려있는 상태(InvalidStateError)라면 정상으로 간주하고 루프 재실행
      if (error.name === 'InvalidStateError') {
        setIsConnected(true);
        readLoop();
        return true;
      }
      return false;
    }
  };

  /**
   * 스캐너 수동 연결 해제 요청
   */
  const disconnect = async () => {
    await forceDisconnect();
  };

  /**
   * 데이터 스트림 읽기 무한 루프
   * @description 스캐너에서 연속적으로 들어오는 데이터를 버퍼에 모으고 완성된 문자열을 추출
   */
  const readLoop = useCallback(async () => {
    // 연결 시점 타임스탬프 기록 (과거에 쌓여있던 버퍼 홍수 데이터를 무시하기 위함)
    const connectionTime = Date.now();

    while (portRef.current && portRef.current.readable && keepReadingRef.current) {
      let readableStreamClosed; // try/finally 블록 밖에서 선언하여 에러 방지

      try {
        const textDecoder = new TextDecoderStream();
        readableStreamClosed = portRef.current.readable.pipeTo(textDecoder.writable);
        
        readerRef.current = textDecoder.readable.getReader();
        let buffer = ''; 

        try {
          while (keepReadingRef.current) {
            const { value, done } = await readerRef.current.read();
            
            // 스트림이 정상 종료되었거나, 루프 중단 신호를 받으면 즉시 탈출 (좀비 루프 방지)
            if (done || !keepReadingRef.current) {
              break;
            }

            // 브라우저 탭이 포커스를 잃은 상태라면 입력을 무시하고 버퍼 초기화 (보안 및 오작동 방지)
            if (!document.hasFocus()) { 
              buffer = ''; 
              continue; 
            }

            // 연결 직후 1초 동안 들어오는 데이터는 '이전 버퍼 찌꺼기'로 간주하고 무시
            if (Date.now() - connectionTime < 1000) {
              console.log("과거 버퍼 데이터 무시:", value);
              continue;
            }

            // 텍스트 데이터를 버퍼에 누적
            buffer += value;
            
            // 개행 문자(엔터키, \n 또는 \r)를 기준으로 바코드 한 줄의 입력을 완성으로 판단
            if (buffer.includes('\n') || buffer.includes('\r')) {
              // 개행 문자 및 공백 제거
              const scannedData = buffer.replace(/[\r\n]/g, '').trim();
              
              // 연결이 정상적으로 유지되고 유효한 데이터가 있을 때만 콜백 실행
              if (scannedData && keepReadingRef.current) {
                onScanRef.current(scannedData);
              }
              
              // 다음 스캔을 위해 버퍼 비우기
              buffer = ''; 
            }
          }
        } catch (error) {
          // 읽기 도중 물리적 에러 발생 시 즉시 연결 해제 처리
          forceDisconnect();
          break; 
        } finally {
          // 단일 읽기 세션 정리 (잠금 해제)
          if (readerRef.current) {
            try { 
              readerRef.current.releaseLock(); 
            } catch (e) {
              // 잠금 해제 에러 무시
            }
          }
          // 파이프 닫기 대기
          if (readableStreamClosed) {
            await readableStreamClosed.catch(() => {});
          }
        }
      } catch (e) {
        // 스트림 파이프라인 구성 오류 발생 시 전체 루프 탈출
        break;
      }
    }
  }, [forceDisconnect]);

  /** [반환 영역] 훅 사용 컴포넌트에 노출할 상태 및 메서드 (가독성을 위한 수직 정렬) */
  return { 
    isConnected, 
    connect, 
    disconnect 
  };
};