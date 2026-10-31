# Painel GELF — Cura Mediúnica (Bio)
## Instalação e uso: Windows e Linux

Pacote de **teste e validação** do processo dos tratamentos bioenergéticos. Este guia tem uma parte para cada sistema:
**Parte A — Windows** e **Parte B — Linux** (no Mac, siga a Parte B). Depois vem a **Parte C — Como usar**, igual para todos.
A instalação leva uns 10 minutos na primeira vez e não exige conhecimento técnico.

## 1. O que vem no pacote

| Item | Para que serve |
|---|---|
| `INICIAR-SISTEMA.bat` | **Liga o sistema no Windows** (duplo clique) |
| `iniciar-mac-linux.sh` | **Liga o sistema no Linux ou no Mac** (no Terminal) |
| `LEIA-ME-PRIMEIRO.txt` | Resumo de uma página |
| `documentos/` | Este guia, o roteiro de validação e o fluxo do Bio, em PDF |
| `server`, `public`, `config`, `node_modules` | O sistema em si (não precisa mexer) |
| `dados/` | Onde o sistema guarda, só neste computador, os pacientes do dia |

## 2. O que você precisa

| | Windows | Linux |
|---|---|---|
| Sistema | Windows 10 ou 11 | Qualquer distribuição recente (Ubuntu, Debian, Fedora, Mint, Arch…) |
| Programa | **Node.js 18 ou mais novo** (gratuito) | **Node.js 18 ou mais novo** (gratuito) |
| Navegador | Chrome ou Edge | Chrome, Chromium ou Firefox |
| Outros aparelhos (opcional) | Celular, tablet ou outro computador na **mesma rede Wi-Fi** | O mesmo |

O sistema **não precisa de internet** para funcionar. A internet é usada só para baixar o Node.js, uma única vez.

---

# Parte A — Windows

## A1. Instalar o Node.js (uma única vez)

1. Abra **https://nodejs.org** no navegador.
2. Clique no botão verde **"LTS"** (versão recomendada) para baixar.
3. Abra o arquivo baixado e vá clicando em **Next** até **Install**, sem mudar nada. Clique em **Finish**.

Se o Node.js já estiver instalado, pule este passo.

## A2. Colocar o sistema no computador

1. Salve o arquivo **Painel-Gelf-Filas-Windows.zip** em uma pasta, por exemplo a Área de Trabalho.
2. Clique com o botão direito no arquivo e escolha **Extrair tudo…**, depois **Extrair**.
3. **Mova a pasta extraída** para `C:\` (fica `C:\Painel-Gelf-Filas`), para ficar fácil de achar.

> Não abra o sistema de dentro do arquivo ZIP: extraia primeiro.

## A3. Ligar o sistema

1. Abra a pasta e dê **dois cliques em `INICIAR-SISTEMA.bat`**.
2. Se o Windows mostrar **"O Windows protegeu o computador"**, clique em **Mais informações** e depois em
   **Executar assim mesmo**. É normal para arquivos novos.
3. Aparece uma **janela preta** com os endereços do sistema. **Não feche essa janela**: ela é o sistema funcionando.
4. Se o Windows perguntar sobre o **Firewall** ("Permitir que o Node.js se comunique…"), marque **Redes privadas** e
   clique em **Permitir acesso**. Isso é necessário para usar os celulares.
5. Em alguns segundos o navegador abre sozinho na **página inicial do Painel GELF** (de lá você escolhe a tela, por exemplo o **Controle**). Pronto: o sistema está no ar.

## A4. Desligar e ligar de novo

- **Desligar:** feche a janela preta.
- **Ligar de novo:** dois cliques em `INICIAR-SISTEMA.bat`. Se o sistema foi desligado no meio do dia, os pacientes cadastrados continuam lá.

## A5. Se algo não funcionar (Windows)

| O que aconteceu | O que fazer |
|---|---|
| A janela preta abre e fecha na hora | O Node.js não está instalado ou foi instalado há pouco. Instale (A1), **reinicie o computador** e tente de novo |
| Mensagem de erro com **EADDRINUSE** | O sistema já está ligado em outra janela, ou outro programa usa a porta 3000. Feche todas as janelas pretas e ligue de novo. Se persistir, reinicie o computador |
| O navegador não abriu sozinho | Abra você mesmo `http://localhost:3000` |
| Celular não abre o endereço | Mesma rede Wi-Fi? Firewall liberado para **Redes privadas** (A3, passo 4)? Use o QR code da página inicial (Parte C) |
| Desconfia que o firewall bloqueou | Painel de Controle › Firewall do Windows › *Permitir um aplicativo* › marque **Node.js** em **Privada** |

---

# Parte B — Linux (e Mac)

Os comandos abaixo são digitados no **Terminal** (no Linux, procure por "Terminal"; no Mac, "Terminal" em Utilitários).
Digite cada linha e aperte **Enter**.

## B1. Conferir e instalar o Node.js (uma única vez)

1. Veja se já existe, e a versão: `node -v`. Precisa mostrar **v18** ou maior (por exemplo `v20.11.0`).
2. Se não existir, ou for mais antigo, instale a versão **LTS**:

| Distribuição | Comando |
|---|---|
| Ubuntu, Debian, Mint | `sudo apt update && sudo apt install nodejs npm` |
| Fedora | `sudo dnf install nodejs` |
| Arch, Manjaro | `sudo pacman -S nodejs npm` |
| openSUSE | `sudo zypper install nodejs` |
| Mac | baixe o instalador em **https://nodejs.org** (ou `brew install node`) |

3. Se a versão instalada continuar abaixo de 18 (algumas distribuições trazem uma muito antiga), baixe o **LTS** em
   **https://nodejs.org**. Depois, confira de novo com `node -v`.

## B2. Colocar o sistema no computador

1. Salve o arquivo **Painel-Gelf-Filas-Windows.zip** na sua pasta pessoal (por exemplo em *Downloads*).
2. Extraia: pelo gerenciador de arquivos (botão direito › *Extrair aqui*) ou no Terminal:
   ```
   cd ~/Downloads
   unzip Painel-Gelf-Filas-Windows.zip
   ```
   (se faltar o comando `unzip`: `sudo apt install unzip`, ou o equivalente da sua distribuição).
3. Opcional: mova a pasta para a sua pasta pessoal: `mv Painel-Gelf-Filas ~/`.

## B3. Ligar o sistema

No Terminal, entre na pasta e execute o script:

```
cd ~/Painel-Gelf-Filas
chmod +x iniciar-mac-linux.sh
./iniciar-mac-linux.sh
```

- O `chmod +x` só é necessário na primeira vez.
- O Terminal mostra os endereços do sistema. **Não feche o Terminal**: ele é o sistema funcionando.
- Em alguns segundos o navegador abre sozinho na **página inicial do Painel GELF**. Se não abrir, entre em `http://localhost:3000`.
- Se aparecer "O Node.js é muito antigo", volte ao passo B1.

## B4. Liberar o acesso dos celulares (se houver firewall)

Se o computador tem firewall ativo e os celulares não conseguem abrir o sistema, libere a porta **3000**:

| Firewall | Comando |
|---|---|
| UFW (Ubuntu, Mint) | `sudo ufw allow 3000/tcp` |
| firewalld (Fedora, openSUSE) | `sudo firewall-cmd --add-port=3000/tcp --permanent && sudo firewall-cmd --reload` |

Para descobrir o endereço do computador na rede: `hostname -I` (Linux) ou `ipconfig getifaddr en0` (Mac). O endereço do
sistema fica `http://ENDEREÇO:3000`. A página inicial (Parte C) mostra isso também, com QR code.

## B5. Desligar e ligar de novo

- **Desligar:** no Terminal onde o sistema roda, pressione **Ctrl+C** (ou feche a janela).
- **Ligar de novo:** repita `./iniciar-mac-linux.sh` dentro da pasta. Se o sistema foi desligado no meio do dia, os pacientes cadastrados continuam lá.

## B6. Se algo não funcionar (Linux e Mac)

| O que aconteceu | O que fazer |
|---|---|
| `Permission denied` ao rodar o script | Rode `chmod +x iniciar-mac-linux.sh` e tente de novo |
| `node: command not found` | O Node.js não está instalado (B1) |
| "O Node.js é muito antigo" | Instale o LTS em https://nodejs.org (B1, passo 3) |
| Erro com **EADDRINUSE** | Algo já usa a porta 3000. Veja o quê: `ss -ltnp \| grep 3000` (Linux). Se for o próprio sistema em outro Terminal, feche-o (Ctrl+C) |
| O navegador não abriu sozinho | Abra você mesmo `http://localhost:3000` |
| Celular não abre o endereço | Mesma rede Wi-Fi? Porta 3000 liberada no firewall (B4)? Use o QR code da página inicial |
| O Terminal fechou e o sistema parou | É assim mesmo: o sistema roda dentro do Terminal. Abra de novo e ligue (B3) |

---

# Parte C — Como usar (Windows e Linux)

## C1. As telas do sistema

Todas abrem no navegador. No computador onde o sistema está ligado, use `localhost`:

| Tela | Endereço | Quem usa |
|---|---|---|
| **Página inicial** (links e QR code) | `http://localhost:3000/` | Qualquer pessoa: escolhe a tela e abre no celular pelo QR code |
| **Recepção do Bio** | `http://localhost:3000/bio/recepcao` | Quem cadastra os pacientes |
| **Controle do Bio** | `http://localhost:3000/bio/controle` (ou só `/controle`) | Quem faz o controle e a orquestração |
| **Painel da TV do Bio** | `http://localhost:3000/bio/painel` | A TV: abra em tela cheia (tecla **F11**) |
| **Painel da TV, versão simples** (TV Box e navegadores antigos) | `http://localhost:3000/bio/painel-simples` (diagnóstico: `/diagnostico`) | A TV, se o painel normal não abrir na caixinha |
| **Relatório do atendimento** | `http://localhost:3000/bio/relatorio` (ou pelo botão no Controle) | Registro completo do dia, para **salvar em PDF** antes de fechar o dia |

Na **TV**, toque uma vez em **Ativar som** (o navegador só libera o áudio depois de um clique).

**Dica para testar sozinho:** abra as três telas em **abas ou janelas diferentes** do navegador. Você faz o papel da
recepção e do controle e confere o painel da TV, tudo no mesmo computador.

## C2. Usar em outros aparelhos (opcional)

**O jeito mais fácil:** neste computador, abra a **página inicial** (`http://localhost:3000/`). Ela mostra os links das telas e um
**QR code**. No celular (ligado na **mesma rede Wi-Fi**), abra a câmera e aponte para o QR code: a página inicial abre no
celular, e é só tocar na tela que quiser. A página sempre mostra o endereço atual do computador: se o endereço mudar, abra a
página inicial de novo neste computador e use o QR code novo.

Se preferir digitar, use o endereço numérico mostrado na página inicial (algo como `http://192.168.0.15:3000/bio/controle`).

## C2B. Mostrar o painel na TV (inclusive com TV Box)

Em uma TV ligada por um computador, abra `http://localhost:3000/bio/painel` em tela cheia (tecla **F11**). Se a TV usa uma **TV Box**
(caixinha Android), faça assim:

1. A caixinha e o computador precisam estar na **mesma rede**. Na caixinha, abra o navegador e digite o **endereço numérico** do
   computador (aparece na página inicial, algo como `http://192.168.0.15:3000/diagnostico`). Evite o nome `.local`: muitas caixinhas não o entendem.
2. Abra primeiro **`/diagnostico`**. Essa página funciona até em navegador muito antigo e mostra um veredito:
   - *"NÃO alcançou o servidor"*: é rede ou endereço. Confira se o computador está ligado com o sistema no ar, o Wi-Fi (ou use cabo) e o endereço.
   - *"Navegador antigo"*: use o **painel simples**, que mostra o mesmo conteúdo e toca o mesmo sinal.
   - *"Tudo certo"*: o painel normal abre.
3. Deixe nos favoritos da caixinha `http://ENDEREÇO:3000/bio/painel` (ou, se o diagnóstico mandar, `http://ENDEREÇO:3000/bio/painel-simples`).
4. Na primeira vez, aperte **OK** em **Ativar som**.
5. Se as bordas da TV forem cortadas, escolha **"Ajuste à tela"** ou **16:9** no menu de imagem da TV.

O endereço do computador pode mudar; para fixá-lo, reserve o IP dele no roteador.

## C3. Primeiros passos em 2 minutos

1. No **Controle**, confira as salas em **Abertura dos trabalhos** e toque em **Abrir o dia** (no menu da esquerda, abaixo de **Registrar chegada**).
2. Na **Recepção**, digite Nome e Sobrenome de um paciente de teste e toque em **Cadastrar**.
3. No **Controle**, na coluna **Captação/Apometria**, toque em **Chamar próximo**.
4. Olhe o **Painel da TV**: aparece o nome e a sala.

Para testar o processo inteiro, siga o **Roteiro de validação** (documento 2 deste pacote).

## C4. Apagar os dados de teste e recomeçar

No Controle, **salve antes o relatório completo em PDF** (botão **Relatório do atendimento (PDF)**, depois **Salvar em PDF / Imprimir** e **Salvar como PDF**). Em seguida, toque em **Fechar o dia** e confirme em **Confirmar: apagar tudo**. Isso apaga pacientes e pré-inscritos e guarda
apenas o relatório do dia, **sem nomes**.

## C5. Receber uma versão nova do pacote

1. No Controle, **Fechar o dia** (para não perder o relatório).
2. Desligue o sistema (Windows: feche a janela preta; Linux: Ctrl+C).
3. Extraia o novo ZIP **em uma pasta nova** (não por cima da antiga) e ligue por ela.
4. Se quiser guardar os relatórios antigos, copie a pasta `dados\relatorios` da versão antiga para a nova.

## C6. Se a tela mostrar "sem conexão"

| O que aconteceu | O que fazer |
|---|---|
| Aviso **sem conexão** no topo | O sistema foi desligado ou o computador dormiu. Ligue de novo; a tela reconecta sozinha |
| A tela não atualiza | Aperte **F5** no navegador |
| Sem som na TV | Toque em **Ativar som** e confira o volume do computador |
| O computador entra em repouso e o sistema para | Desative a suspensão enquanto o sistema estiver em uso (Windows: Configurações › Sistema › Energia; Linux: Configurações › Energia) |

Se nada resolver, tire uma **foto da tela** (incluindo a janela preta ou o Terminal) e envie junto com os seus comentários.

## C7. Privacidade

Os nomes dos pacientes ficam **só neste computador**, na pasta `dados`, e são apagados ao **Fechar o dia** (ou na virada do dia).
Nada é enviado para a internet. Os relatórios do dia, sem nomes, ficam em `dados/relatorios`.

## C8. Instalação definitiva (somente equipe técnica)

Para o uso real no notebook da sala da TV (início automático com o Windows, IP fixo, tela cheia), siga o procedimento da equipe
técnica em `instalacao\instalar.ps1`. **Não é necessário para este teste.**
