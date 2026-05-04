@echo off
REM Run PostgreSQL migration for confessions table
setlocal enabledelayedexpansion

set "PGPASSWORD=omkar9221"
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d crush_detector_db -f backend/migrations/add_confessions_table.sql

echo.
echo Migration complete!
pause
