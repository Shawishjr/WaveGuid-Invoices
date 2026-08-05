@echo off
REM ============================================================
REM  WaveGuid-Invoices - Dev Server Launcher
REM  ----------------------------------------------------------
REM  This project lives in a path containing '#' which breaks
REM  Next.js React Server Components module resolution.
REM  We map the project to a virtual drive (W:) without '#'
REM  and run the dev server from there.
REM ============================================================

REM Create virtual drive W: pointing to this project folder
subst W: /D >nul 2>&1
subst W: "%~dp0."

REM Switch to the virtual drive and start the dev server
W:
echo Starting Next.js dev server from W: (mapped to %~dp0)
call npm run dev

REM Clean up the virtual drive when the server stops
subst W: /D >nul 2>&1