@echo off
title Painel GELF - Cura Mediunica (Bio) - NAO FECHE ESTA JANELA
cd /d "%~dp0"
echo.
echo  ==========================================
echo   PAINEL GELF - Cura Mediunica (Bio)
echo  ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo  O programa Node.js ainda nao esta instalado neste computador.
  echo  Vou abrir o site para voce baixar. Instale a versao "LTS",
  echo  aceitando as opcoes padrao, e depois de um duplo clique
  echo  neste arquivo de novo.
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)
if not exist dados mkdir dados
echo  Enderecos para usar em OUTROS aparelhos (celular, tablet, outro computador)
echo  ligados na mesma rede / Wi-Fi:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do call echo     http://%%a:3000/bio/controle
echo  (se aparecer um espaco depois de http://, retire-o)
echo.
echo  PAGINA INICIAL (links de todas as telas e QR code para o celular):
echo     http://localhost:3000
echo.
echo  Abrindo o controle neste computador em instantes...
start "" /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000/bio/controle"
echo.
echo  PARA ENCERRAR O SISTEMA: feche esta janela.
echo  ------------------------------------------
echo.
node server\index.js
echo.
echo  O sistema parou. Se apareceu uma mensagem de erro acima,
echo  tire uma foto da tela e envie junto com os seus comentarios.
echo.
pause
