<# Remove a tarefa, as regras de firewall e o atalho do painel. Não apaga a pasta do projeto nem os dados. #>
$ErrorActionPreference = 'Continue'
Stop-ScheduledTask -TaskName 'Painel GELF - Servidor' -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName 'Painel GELF - Servidor' -Confirm:$false -ErrorAction SilentlyContinue
Get-NetFirewallRule -DisplayName 'Painel GELF*' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
Remove-Item (Join-Path ([Environment]::GetFolderPath('Startup')) 'Painel GELF - TV.lnk') -ErrorAction SilentlyContinue
Write-Host 'Painel GELF removido (tarefa, firewall e atalho). A pasta do projeto foi mantida.'
