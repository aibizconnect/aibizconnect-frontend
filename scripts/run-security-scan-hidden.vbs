' Launches the daily domain security scan with no visible console window.
' Task Scheduler must call this via wscript.exe -- calling the .cmd directly
' flashes a console every run.
Dim shell
Set shell = CreateObject("WScript.Shell")
shell.Run """C:\server\projects\aibizconnect-app-workspace\aibizconnect-frontend\scripts\run-security-scan.cmd""", 0, False
