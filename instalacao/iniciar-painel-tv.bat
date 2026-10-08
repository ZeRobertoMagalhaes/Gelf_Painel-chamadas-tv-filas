@echo off
rem Abre o Painel de TV em tela cheia (e reabre se o navegador fechar).
rem Fica na inicializacao do usuario que permanece logado no notebook da TV
rem (criado por instalar.ps1 -Kiosk, ou: Win+R > shell:startup).
cd /d "%~dp0"
node painel-kiosk.js
pause
