<#
.SYNOPSIS
  Instala o Painel GELF (filas) no notebook-servidor da sala da TV.
.DESCRIPTION
  Execute no PowerShell COMO ADMINISTRADOR, dentro da pasta do projeto:
      powershell -ExecutionPolicy Bypass -File .\instalacao\instalar.ps1
  O que faz:
    1. confere o Node.js e instala as dependências (sem as de desenvolvimento);
    2. libera a porta 3000/TCP e a 5353/UDP (nome painel-gelf.local) só em redes PRIVADAS;
    3. cria a tarefa "Painel GELF - Servidor": inicia com o Windows (mesmo sem ninguém
       logado) e reinicia sozinha se o servidor cair;
    4. desliga suspensão, hibernação e o desligar da tela na tomada, e a ação de fechar a tampa;
    5. (opcional, -Kiosk) cria o atalho do painel em tela cheia na inicialização do usuário atual.
#>
param(
    [switch]$Kiosk,
    [int]$Porta = 3000
)

$ErrorActionPreference = 'Stop'
$nomeTarefa = 'Painel GELF - Servidor'
$raiz = Split-Path -Parent $PSScriptRoot

function Etapa($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw 'Abra o PowerShell como Administrador e rode de novo.' }

Etapa 'Conferindo o Node.js'
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { throw 'Node.js não encontrado. Instale a versão LTS em https://nodejs.org e rode de novo.' }
Write-Host "Node: $node ($(& $node --version))"

Etapa 'Instalando dependências'
Push-Location $raiz
try {
    & npm install --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm install falhou.' }
} finally { Pop-Location }
if (-not (Test-Path (Join-Path $raiz 'public\painel.html'))) {
    throw 'Pasta public\ sem o painel compilado. Rode "npm run build" em web\ na máquina de desenvolvimento e copie a pasta public.'
}

Etapa 'Liberando o firewall (somente redes privadas)'
foreach ($regra in @(
    @{ Nome = 'Painel GELF (site)'; Protocolo = 'TCP'; Porta = $Porta },
    @{ Nome = 'Painel GELF (mDNS)'; Protocolo = 'UDP'; Porta = 5353 })) {
    Get-NetFirewallRule -DisplayName $regra.Nome -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule -DisplayName $regra.Nome -Direction Inbound -Action Allow `
        -Protocol $regra.Protocolo -LocalPort $regra.Porta -Profile Private | Out-Null
    Write-Host "Liberado $($regra.Protocolo) $($regra.Porta)"
}
$publicas = Get-NetConnectionProfile | Where-Object NetworkCategory -eq 'Public'
if ($publicas) {
    Write-Warning ("A rede '{0}' está como PÚBLICA: o firewall vai bloquear as outras telas. " +
        "Mude para Privada em Configurações > Rede e Internet > (a rede) > Tipo de perfil de rede." -f ($publicas.Name -join ', '))
}

Etapa 'Criando a tarefa de inicialização automática'
New-Item -ItemType Directory -Force -Path (Join-Path $raiz 'logs') | Out-Null
$comando = "/c `"`"$node`" server\index.js >> logs\servidor.log 2>&1`""
$acao = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $comando -WorkingDirectory $raiz
$gatilho = New-ScheduledTaskTrigger -AtStartup
$config = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Unregister-ScheduledTask -TaskName $nomeTarefa -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $nomeTarefa -Action $acao -Trigger $gatilho -Settings $config -Principal $principal `
    -Description 'Servidor do Painel de Chamadas GELF (filas por tratamento)' | Out-Null
Start-ScheduledTask -TaskName $nomeTarefa
Write-Host 'Tarefa criada e iniciada.'

Etapa 'Ajustando energia (notebook sempre ligado na tomada)'
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0   # fechar a tampa não faz nada na tomada
powercfg /setactive SCHEME_CURRENT
Write-Host 'Suspensão, hibernação e desligar de tela desativados na tomada.'

if ($Kiosk) {
    Etapa 'Criando atalho do painel em tela cheia na inicialização'
    $inicializacao = [Environment]::GetFolderPath('Startup')
    $atalho = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $inicializacao 'Painel GELF - TV.lnk'))
    $atalho.TargetPath = Join-Path $PSScriptRoot 'iniciar-painel-tv.bat'
    $atalho.WorkingDirectory = $PSScriptRoot
    $atalho.WindowStyle = 7
    $atalho.Save()
    Write-Host "Atalho criado em $inicializacao (vale para este usuário do Windows)."
}

Etapa 'Conferindo o servidor'
$ok = $false
foreach ($i in 1..15) {
    try {
        $resp = Invoke-RestMethod "http://localhost:$Porta/status" -TimeoutSec 2
        if ($resp.servico -eq 'painel-gelf-filas') { $ok = $true; break }
    } catch { Start-Sleep -Seconds 1 }
}
if (-not $ok) { Write-Warning "O servidor não respondeu. Veja $raiz\logs\servidor.log" }
else {
    $ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress
    Write-Host "`nServidor no ar. Endereços (use o IP numérico se .local não abrir no aparelho):" -ForegroundColor Green
    foreach ($tela in 'recepcao', 'atendimento', 'painel') {
        Write-Host ("  {0,-12} http://painel-gelf.local:{1}/{0}   |   http://{2}:{1}/{0}" -f $tela, $Porta, ($ips | Select-Object -First 1))
    }
}
Write-Host "`nLembrete: reserve/fixe o IP do notebook (veja docs/guias/instalacao.md) e pause o Windows Update nos dias de atendimento."
