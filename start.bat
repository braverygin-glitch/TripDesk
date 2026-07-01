@echo off
title Trip Desk

cd /d "%~dp0"

echo ===================================
echo         Trip Desk 실행
echo ===================================
echo.

REM Python 설치 확인
py --version >nul 2>&1
if errorlevel 1 (
    echo [오류] Python이 설치되어 있지 않습니다.
    pause
    exit
)

REM src 폴더 확인
if not exist "src" (
    echo [오류] src 폴더를 찾을 수 없습니다.
    pause
    exit
)

REM 서버 실행 (새 창)
start "Trip Desk Server" cmd /k "py -m http.server 8000 -d src"

REM 서버가 뜰 때까지 잠시 대기
timeout /t 2 /nobreak >nul

REM 브라우저 실행
start http://localhost:8000

exit