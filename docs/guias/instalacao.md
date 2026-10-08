# Instalação no notebook da sala da TV (equipe técnica)

Faça uma vez, com o notebook ligado ao roteador do local.

1. **Node.js:** instale a versão LTS (https://nodejs.org).
2. **Copie a pasta do projeto** (com `public/` já compilada) para, por exemplo, `C:\painel-gelf`.
3. **Rede privada:** em Configurações > Rede e Internet, a rede do local deve estar como *Privada*
   (o firewall só libera as portas nesse perfil).
4. **IP fixo:** reserve o IP do notebook no roteador (ex.: 192.168.0.10). Se o roteador não permitir,
   fixe no Windows, fora da faixa do DHCP do roteador (passo a passo em
   `Gelf_Painel-chamadas-tv/deploy/TUTORIAL-PRODUCAO.md`, itens 1.1 e 1.2).
5. **Instalar:** PowerShell como Administrador, na pasta do projeto:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\instalacao\instalar.ps1 -Kiosk
   ```
   Isso instala as dependências, libera as portas 3000/TCP e 5353/UDP, cria a tarefa que inicia o servidor
   com o Windows (e o reinicia se cair), desativa a suspensão e cria o atalho do painel em tela cheia.
6. **TV:** HDMI ligado; no Windows (Win+P) use "Duplicar" ou "Somente segunda tela"; volume da TV e do
   notebook em nível audível.
7. **Windows Update:** pause as atualizações nos dias de atendimento (Configurações > Windows Update >
   Pausar) ou defina o horário de uso fora do atendimento.
8. **Conferir:** reinicie o notebook e confirme que, sem abrir nada, `http://painel-gelf.local:3000/painel`
   responde (ou o IP numérico, se o aparelho não resolver `.local`).

Para remover: `instalacao\desinstalar.ps1` (mantém a pasta e os dados).

Logs do servidor: `logs\servidor.log`. Para trocar tratamentos, cores ou o intervalo do som, edite
`config\configuracao.json` e reinicie a tarefa "Painel GELF - Servidor" (ou o notebook).
