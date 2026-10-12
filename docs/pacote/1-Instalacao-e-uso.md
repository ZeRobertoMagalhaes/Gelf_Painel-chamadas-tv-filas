# Painel GELF — Cura Mediúnica (Bio)
## Como instalar e colocar o sistema no ar

Pacote de **teste e validação** do processo dos tratamentos bioenergéticos. Este guia leva uns 10 minutos
na primeira vez e nenhum conhecimento técnico.

## 1. O que vem no pacote

| Item | Para que serve |
|---|---|
| `INICIAR-SISTEMA.bat` | **Liga o sistema no Windows** (duplo clique). É o único arquivo que você precisa abrir |
| `iniciar-mac-linux.sh` | Liga o sistema no Linux ou no Mac (item 5B) |
| `LEIA-ME-PRIMEIRO.txt` | Resumo de uma página |
| `documentos/` | Este guia, o roteiro de validação e o fluxo do Bio em PDF |
| `server`, `public`, `config`, `node_modules` | O sistema em si (não precisa mexer) |
| `dados/` | Onde o sistema guarda, só neste computador, os pacientes do dia |

## 2. O que você precisa

- Um computador com **Windows 10 ou 11** (**Linux e Mac também funcionam**: veja o item 5B).
- O navegador **Google Chrome** (ou Edge).
- O programa **Node.js** (gratuito). Se ainda não tiver, o item 3 explica.
- Para usar também **celulares ou outro computador**: todos na mesma rede Wi-Fi.

Não precisa de internet para o sistema funcionar. Só para baixar o Node.js, uma única vez.

## 3. Instalar o Node.js (uma única vez)

1. Abra **https://nodejs.org** no navegador.
2. Clique no botão verde **"LTS"** (versão recomendada) para baixar.
3. Abra o arquivo baixado e vá clicando em **Next** até **Install**, sem mudar nada. Clique em **Finish**.

Se o Node.js já estiver instalado, pule este passo.

## 4. Colocar o sistema no computador

1. Salve o arquivo **Painel-GELF-Bio.zip** em uma pasta, por exemplo a Área de Trabalho.
2. Clique com o botão direito no arquivo e escolha **Extrair tudo…**, depois **Extrair**.
3. Para ficar fácil de achar, **mova a pasta extraída** para `C:\` (fica `C:\Painel-GELF-Bio`).

> Não abra o sistema de dentro do arquivo ZIP: extraia primeiro.

## 5. Ligar o sistema

1. Abra a pasta e dê **dois cliques em `INICIAR-SISTEMA.bat`**.
2. Se o Windows mostrar **"O Windows protegeu o computador"**, clique em **Mais informações** e depois em
   **Executar assim mesmo**.
3. Aparece uma **janela preta** com os endereços do sistema. **Não feche essa janela**: ela é o sistema
   funcionando. Para desligar o sistema, é só fechá-la.
4. Se o Windows perguntar sobre o **Firewall** ("Permitir que o Node.js se comunique…"), marque
   **Redes privadas** e clique em **Permitir acesso**. Isso é necessário para usar os celulares.
5. Em alguns segundos o navegador abre sozinho na tela do **Controle**. Pronto: o sistema está no ar.

## 5B. Se o computador for Linux ou Mac

Os passos 3, 4 e 5 mudam assim (o resto do guia vale igual):

1. **Node.js, versão 18 ou mais nova.** No Terminal, digite `node -v` para ver se já existe. Se não existir ou
   for antigo, instale a versão **LTS**:
   - Ubuntu/Debian: `sudo apt install nodejs` (se a versão ficar abaixo de 18, baixe o LTS em **https://nodejs.org**)
   - Fedora: `sudo dnf install nodejs`
   - Mac: baixe o instalador em **https://nodejs.org** (ou `brew install node`)
2. **Extraia o ZIP** (`unzip Painel-GELF-Bio.zip` ou pelo gerenciador de arquivos) em uma pasta, por exemplo na sua pasta pessoal.
3. **Ligue o sistema:** abra o Terminal dentro da pasta extraída e digite:
   ```
   chmod +x iniciar-mac-linux.sh
   ./iniciar-mac-linux.sh
   ```
   O `chmod` só é necessário na primeira vez. O navegador abre sozinho no Controle; se não abrir, entre em
   `http://localhost:3000/bio/controle`.
4. **Não feche o Terminal:** ele é o sistema funcionando. Para desligar, pressione **Ctrl+C** (ou feche a janela).
5. **Outros aparelhos (celular):** descubra o endereço do computador com `hostname -I` (Linux) ou
   `ipconfig getifaddr en0` (Mac) e use `http://ENDEREÇO:3000/bio/controle`. Se houver firewall ativo no Linux,
   libere a porta: `sudo ufw allow 3000/tcp`.

## 6. As telas do sistema

Todas abrem no navegador. No computador onde o sistema está ligado, use `localhost`:

| Tela | Endereço | Quem usa |
|---|---|---|
| **Página inicial** (links de todas as telas e QR code) | `http://localhost:3000/` | Qualquer pessoa: escolhe a tela e abre no celular pelo QR code |
| **Recepção do Bio** | `http://localhost:3000/bio/recepcao` | Quem cadastra os pacientes |
| **Controle do Bio** | `http://localhost:3000/bio/controle` (ou só `/controle`) | Quem faz o controle e a orquestração (você) |
| **Painel da TV do Bio** | `http://localhost:3000/bio/painel` | A TV: abra em tela cheia (tecla **F11**) |

Na **TV**, toque uma vez em **Ativar som** (o navegador só libera o áudio depois de um clique).

**Dica para testar sozinho:** abra as três telas em **abas ou janelas diferentes** do navegador. Você faz o papel
da recepção, do controle e confere o painel da TV, tudo no mesmo computador.

## 7. Usar em outros aparelhos (opcional)

**O jeito mais fácil:** neste computador, abra a **página inicial** (`http://localhost:3000/`). Ela mostra os links das telas e
um **QR code**. No celular (ligado na **mesma rede Wi-Fi**), abra a câmera e aponte para o QR code: a página inicial abre no
celular, e é só tocar na tela que quiser. Isso funciona mesmo que o endereço do computador mude.

Se preferir digitar, na janela preta aparecem endereços parecidos com `http://192.168.0.15:3000/bio/controle`: digite-os
no navegador do celular, trocando o final pela tela que quer (`/bio/recepcao`, `/bio/controle` ou `/bio/painel`).

Se não abrir: confira o Wi-Fi do aparelho e se, ao ligar o sistema, você marcou **Redes privadas** no aviso do Firewall.

## 8. Primeiros passos em 2 minutos

1. No **Controle**, em **Abertura dos trabalhos**, toque em **Abrir o dia**.
2. Na **Recepção**, digite nome e sobrenome de um paciente de teste e toque em **Cadastrar**.
3. No **Controle**, na coluna **Captação/Apometria**, toque em **Chamar próximo**.
4. Olhe o **Painel da TV**: aparece o nome e a sala.

Para testar o processo inteiro, siga o **Roteiro de validação** (documento 2 deste pacote).

## 9. Desligar, recomeçar e apagar os dados de teste

- **Desligar o sistema:** feche a janela preta.
- **Ligar de novo:** dois cliques em `INICIAR-SISTEMA.bat`. Se o sistema foi desligado no meio do dia, os
  pacientes cadastrados continuam lá.
- **Recomeçar do zero:** no Controle, toque em **Fechar o dia** e confirme em **Confirmar: apagar tudo**. Isso apaga
  pacientes e pré-inscritos e guarda apenas o relatório do dia, **sem nomes**.
- **Mac ou Linux:** veja o item 5B (arquivo `iniciar-mac-linux.sh`).

## 10. Se algo não funcionar

| O que aconteceu | O que fazer |
|---|---|
| Janela preta abre e fecha na hora | O Node.js não está instalado ou foi instalado há pouco. Instale (item 3), **reinicie o computador** e tente de novo |
| "Mais informações / Executar assim mesmo" | É normal para arquivos novos. Clique nessas opções (item 5) |
| Aparece uma mensagem de erro com **EADDRINUSE** | O sistema já está ligado em outra janela. Feche todas as janelas pretas e ligue de novo |
| O navegador não abriu sozinho | Abra você mesmo `http://localhost:3000/bio/controle` |
| Celular não abre o endereço | Mesma rede Wi-Fi? Firewall liberado para **Redes privadas** (item 5)? Use o QR code da página inicial ou o endereço numérico mostrado na janela preta |
| Sem som na TV | Toque em **Ativar som** e confira o volume do computador |
| Aviso **sem conexão** no topo da tela | A janela preta foi fechada ou o computador dormiu. Ligue de novo; a tela reconecta sozinha |
| A tela não atualiza | Aperte **F5** no navegador |

Se nada resolver, tire uma **foto da tela** (incluindo a janela preta) e envie junto com os seus comentários.

## 11. Privacidade

Os nomes dos pacientes ficam **só neste computador**, na pasta `dados`, e são apagados ao **Fechar o dia** (ou na
virada do dia). Nada é enviado para a internet. Os relatórios do dia, sem nomes, ficam em `dados\relatorios`.

## 12. Instalação definitiva (somente equipe técnica)

Para o uso real no notebook da sala da TV (início automático com o Windows, IP fixo, tela cheia), siga o
procedimento da equipe técnica em `instalacao\instalar.ps1`. **Não é necessário para este teste.**
