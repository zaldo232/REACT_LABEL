/**
 * @file        LoginPage.jsx
 * @description 사용자 로그인 인증을 처리하는 페이지 컴포넌트
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Alert,
  Avatar,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import apiClient from '../../utils/apiClient';
import useAppStore from '../../store/useAppStore';

const LoginPage = () => {
  /** [상태 관리] */
  const navigate = useNavigate();
  // Zustand 스토어에서 로그인 처리 함수 추출
  const setLogin = useAppStore((state) => state.setLogin);

  // 입력 폼 상태 데이터
  const [formData, setFormData] = useState({
    memberId: '',
    password: '',
  });

  // 로그인 상태 유지 체크박스 상태
  const [rememberMe, setRememberMe] = useState(false);

  // 서버 통신 중 발생하는 에러 메시지 관리
  const [errorMsg, setErrorMsg] = useState('');

  /** [이벤트 핸들러] */

  /**
   * 입력 필드 변경 핸들러
   * @description 모든 입력을 대문자로 변환하여 일관된 데이터 형식을 유지
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    // 소문자 입력을 방지하기 위해 상시 대문자로 변환
    const finalValue = value.toUpperCase();

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
  };

  /**
   * 로그인 요청 처리 핸들러
   * @description 서버 API를 호출하여 인증을 수행하고 결과에 따라 페이지를 이동
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(''); // 새로운 요청 전 에러 메시지 초기화

    try {
      // API 통신을 통한 인증 요청
      const response = await apiClient.post('/auth/login', {
        userId: formData.memberId,
        userPwd: formData.password,
        rememberMe: rememberMe,
      });

      if (response.data.success) {
        // 성공 시 전역 상태에 유저 정보 저장 및 메인 페이지 이동
        setLogin(response.data.user);
        navigate('/');
      }
    } catch (error) {
      // 에러 응답에서 메시지 추출 (서버 메시지가 없을 경우 기본 문구 출력)
      const message = error.response?.data?.message || '로그인 중 오류가 발생했습니다.';
      setErrorMsg(message);
    }
  };

  /** [렌더링 영역] */
  return (
    <Container
      component="main"
      maxWidth="xs"
    >
      <Box
        sx={{
          marginTop: 12, // 화면 상단으로부터의 간격 확보
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
            width: '100%',
          }}
        >
          {/* 상단 락 아이콘 아바타 */}
          <Avatar
            sx={{
              m: 1,
              bgcolor: 'primary.main',
            }}
          >
            <LockOutlinedIcon />
          </Avatar>

          <Typography
            component="h1"
            variant="h5"
            sx={{
              mb: 2,
              fontWeight: 'bold',
            }}
          >
            로그인
          </Typography>

          {/* 에러 발생 시 노출되는 경고창 */}
          {errorMsg && (
            <Alert
              severity="error"
              sx={{
                width: '100%',
                mb: 2,
              }}
            >
              {errorMsg}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleLogin}
            sx={{
              mt: 1,
              width: '100%',
            }}
          >
            {/* 아이디 입력 필드 */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="memberId"
              label="아이디"
              name="memberId"
              autoComplete="username"
              autoFocus
              value={formData.memberId}
              onChange={handleChange}
            />

            {/* 비밀번호 입력 필드 */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="비밀번호"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
            />

            {/* 로그인 설정 체크박스 */}
            <FormControlLabel
              control={
                <Checkbox
                  value="remember"
                  color="primary"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
              }
              label="로그인 상태 유지"
              sx={{ mt: 1 }}
            />

            {/* 로그인 실행 버튼 */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 3,
                mb: 2,
                height: 55,
                fontWeight: 'bold',
                fontSize: '1.1rem',
              }}
            >
              로그인
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;