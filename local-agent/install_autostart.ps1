# Adds a shortcut to ILeadsOutlookAgent.exe in the Windows Startup folder,
# so the agent launches automatically every time you log in. Works whether
# this script sits next to the .exe directly (the usual case when someone
# just received the .exe by email) or in the local-agent/ source folder
# with the .exe still inside dist\ (the build machine's layout).

$candidates = @(
    (Join-Path $PSScriptRoot "ILeadsOutlookAgent.exe"),
    (Join-Path $PSScriptRoot "dist\ILeadsOutlookAgent.exe")
)
$exePath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $exePath) {
    Write-Host "No se encuentra ILeadsOutlookAgent.exe junto a este script."
    Write-Host "Coloca install_autostart.ps1 en la misma carpeta que el .exe, o genera el .exe primero con build_exe.bat."
    exit 1
}

$exe = (Resolve-Path $exePath).Path
$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "ILeadsOutlookAgent.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exe
$shortcut.WorkingDirectory = Split-Path $exe
$shortcut.Description = "Agente local de Outlook para ILEADS"
$shortcut.Save()

Write-Host "Acceso directo creado en: $shortcutPath"
Write-Host "El agente se abrira automaticamente la proxima vez que inicies sesion en Windows."
Write-Host "Para desactivarlo, borra ese acceso directo (Win+R, escribe: shell:startup)"
