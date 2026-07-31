# Adds a shortcut to ILeadsOutlookAgent.exe in the Windows Startup folder,
# so the agent launches automatically every time you log in.

$exePath = Join-Path $PSScriptRoot "dist\ILeadsOutlookAgent.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "No se encuentra $exePath"
    Write-Host "Ejecuta primero build_exe.bat para generarlo."
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
