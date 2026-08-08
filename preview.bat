@echo off
setlocal
REM ============================================================
REM  WaveGuid-Invoices - Live Preview Server
REM  ----------------------------------------------------------
REM  The project lives under a path containing '#', which breaks
REM  Next.js React Server Components module resolution (the '#'
REM  is used as a delimiter in the React Client Manifest). This
REM  script maps the project to a virtual W: drive (no '#') and
REM  runs the dev server from there.
REM  All server output is streamed to preview.log.
REM ============================================================

if not "%~1"=="" (
  set "PORT=%~1"
) else if not defined PORT (
  set "PORT=3000"
)

REM Map the project folder onto a virtual W: drive
subst W: /D >nul 2>&1
subst W: "%~dp0."

REM Switch to the virtual drive and start Next.js
W:
cd /d W:\

echo [preview] %date% %time% - starting Next.js dev server >> "%~dp0preview.log"
echo [preview] URL: http://localhost:%PORT% >> "%~dp0preview.log"
echo [preview] Log:  %~dp0preview.log >> "%~dp0preview.log"
echo [preview] (Ctrl+C to stop, then run:  subst W: /D) >> "%~dp0preview.log"
echo. >> "%~dp0preview.log"

call npm run dev -- --hostname 0.0.0.0 --port %PORT% >> "%~dp0preview.log" 2>&1

REM Clean up the virtual drive when the server stops
subst W: /D >nul 2>&1
