# Mirror the local working copy back to the OneDrive duplicate.
# Runs from the git post-commit hook so OneDrive always holds a current backup.
# Mirrors source + .git history; excludes node_modules/.next (huge, rebuildable via npm install).
# robocopy exit codes 0-7 = success; we always exit 0 so a commit is never blocked.

$src = "C:\server\aibizconnect-frontend"
$dst = "C:\Users\User\OneDrive\AIBizConnect\AI Biz Connect App\aibizconnect-frontend"

if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Force -Path $dst | Out-Null }

robocopy $src $dst /MIR /XD node_modules .next /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null
exit 0
