@echo off
setlocal
REM Daily security run -- invoked by Task Scheduler at 06:00.
REM Two independent checks, both appended to the log:
REM   1. security-scan.mjs        -- injected/deceptive markup on owned domains
REM   2. traffic-anomaly-scan.mjs -- volume floods / single-country surges (added 2026-08-19
REM      after a 6-day, 804k-request surge from SG went unnoticed because markup never changed)
REM On any flag/error it writes an ALERT file so a failure is impossible to miss.

set "REPO=C:\server\projects\aibizconnect-app-workspace\aibizconnect-frontend"
set "LOGDIR=C:\server\logs"
set "LOG=%LOGDIR%\domain-security-scan.log"
set "ALERT=%LOGDIR%\DOMAIN-SCAN-ALERT.txt"
set "NODE=C:\Program Files\nodejs\node.exe"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

cd /d "%REPO%" || (
  echo [%date% %time%] FATAL: repo not found at %REPO% >> "%LOG%"
  echo Repo not found at %REPO% > "%ALERT%"
  exit /b 2
)

echo. >> "%LOG%"
echo ======================================================== >> "%LOG%"
echo [%date% %time%] starting domain security scan >> "%LOG%"

"%NODE%" scripts\security-scan.mjs >> "%LOG%" 2>&1
set "RC_MARKUP=%ERRORLEVEL%"

echo. >> "%LOG%"
echo [%date% %time%] starting traffic anomaly scan >> "%LOG%"

"%NODE%" scripts\traffic-anomaly-scan.mjs >> "%LOG%" 2>&1
set "RC_TRAFFIC=%ERRORLEVEL%"

set "RC=0"
if not "%RC_MARKUP%"=="0" set "RC=%RC_MARKUP%"
if not "%RC_TRAFFIC%"=="0" set "RC=%RC_TRAFFIC%"

if "%RC%"=="0" (
  echo [%date% %time%] RESULT: all clean ^(markup 0, traffic 0^) >> "%LOG%"
  if exist "%ALERT%" del "%ALERT%"
) else (
  echo [%date% %time%] RESULT: FLAGGED or ERROR ^(markup %RC_MARKUP%, traffic %RC_TRAFFIC%^) >> "%LOG%"
  echo Daily security run FLAGGED something on %date% %time%. > "%ALERT%"
  echo   markup scan  exit %RC_MARKUP%  ^(1 = injected/deceptive markup found^) >> "%ALERT%"
  echo   traffic scan exit %RC_TRAFFIC%  ^(1 = volume flood or single-country surge^) >> "%ALERT%"
  echo. >> "%ALERT%"
  echo See %LOG% for the detail. >> "%ALERT%"
  echo Do NOT auto-fix -- review the finding first. >> "%ALERT%"
  echo A low threat count does NOT mean benign: the Aug 2026 surge was 804k requests >> "%ALERT%"
  echo with only 14 classified threats. That was scraping, not intrusion. >> "%ALERT%"
)

exit /b %RC%
