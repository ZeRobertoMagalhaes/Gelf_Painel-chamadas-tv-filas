# Painel GELF — Cura Mediúnica (Bio)
## Instalação e uso no Linux Mint

Pacote de **teste e validação** do processo dos tratamentos bioenergéticos, preparado para o **Linux Mint** (20, 21 ou 22, 64 bits).
A instalação leva uns 5 minutos e **não precisa instalar nada nem de internet**: o programa que faz o sistema funcionar (Node.js) já vem
dentro do pacote.

## 1. O que vem no pacote

| Item | Para que serve |
|---|---|
| `iniciar-mint.sh` | **Liga o sistema** |
| `instalar-atalho-mint.sh` | Cria o ícone **Painel GELF** na Área de Trabalho e no menu, para ligar com duplo clique |
| `LEIA-ME-PRIMEIRO.txt` | Resumo de uma página |
| `documentos/` | Este guia, o roteiro de validação e o fluxo do Bio, em PDF |
| `node/` | O Node.js (já incluído; não precisa mexer) |
| `server`, `public`, `config`, `node_modules` | O sistema em si (não precisa mexer) |
| `dados/` | Onde o sistema guarda, só neste computador, os pacientes do dia |

## 2. O que você precisa

- Linux Mint **64 bits** (para conferir, abra o Terminal e digite `uname -m`: deve aparecer `x86_64`).
- O navegador que já vem no Mint (Firefox) ou o Chrome.
- Para usar também **celulares, tablets ou a TV Box**: todos na mesma rede Wi-Fi ou cabo.

## 3. Instalar (uma única vez)

1. Salve o arquivo **Painel-Gelf-Filas-Linux-Mint.zip** na pasta *Downloads*.
2. Clique com o botão direito no arquivo e escolha **Extrair aqui**.
3. **Mova a pasta extraída** (`Painel-Gelf-Filas`) para a sua **Pasta pessoal**, para ficar fácil de achar.
4. Abra a pasta, clique com o botão direito num espaço vazio e escolha **Abrir no terminal**.
5. No Terminal, digite as duas linhas abaixo (aperte **Enter** depois de cada uma):
   ```
   chmod +x iniciar-mint.sh instalar-atalho-mint.sh node/bin/node
   ./instalar-atalho-mint.sh
   ```
   O primeiro comando libera a execução (só é preciso se o Mint não preservar a permissão ao extrair). O segundo cria o ícone
   **Painel GELF** na Área de Trabalho e no menu *Aplicativos*.

> Não use o sistema de dentro do arquivo ZIP: extraia primeiro.

## 4. Ligar o sistema

**Pelo ícone:** dê dois cliques em **Painel GELF** (Área de Trabalho ou menu). Se o Mint perguntar, escolha **Executar** ou
**Confiar neste lançador**.

**Pelo Terminal:** dentro da pasta, digite `./iniciar-mint.sh`.

Abre uma **janela de terminal** com os endereços do sistema. **Não feche essa janela**: ela é o sistema funcionando. Em alguns segundos o
navegador abre sozinho na **página inicial do Painel GELF** (de lá você escolhe a tela, por exemplo o **Controle**). Pronto: o sistema está no ar.

## 5. As telas do sistema

No computador onde o sistema está ligado, use `localhost`:

| Tela | Endereço | Quem usa |
|---|---|---|
| **Página inicial** (links e QR code) | `http://localhost:3000/` | Qualquer pessoa: escolhe a tela e abre no celular pelo QR code |
| **Recepção do Bio** | `http://localhost:3000/bio/recepcao` | Quem cadastra os pacientes |
| **Controle do Bio** | `http://localhost:3000/bio/controle` (ou só `/controle`) | Quem faz o controle e a orquestração |
| **Painel da TV do Bio** | `http://localhost:3000/bio/painel` | A TV: abra em tela cheia (tecla **F11**) |
| **Painel da TV, versão simples** | `http://localhost:3000/bio/painel-simples` | A TV, se o painel normal não abrir na TV Box |
| **Diagnóstico da TV** | `http://localhost:3000/diagnostico` | Mostra o que o navegador da TV Box consegue fazer |
| **Relatório do atendimento** | `http://localhost:3000/bio/relatorio` | Registro completo do dia, para **salvar em PDF** antes de fechar o dia |

**Dica para testar sozinho:** abra as telas em **abas diferentes** do navegador. Você faz o papel da recepção e do controle e confere o painel
da TV, tudo no mesmo computador. Na TV, toque uma vez em **Ativar som**.

## 6. Usar em celulares, tablets e na TV Box

- **Celular ou tablet:** neste computador, abra a **página inicial** (`http://localhost:3000/`). No celular (mesma rede), aponte a câmera para o
  **QR code**. Se o endereço do computador mudar, abra a página inicial de novo e use o QR code novo.
- **Endereço numérico:** o Terminal mostra algo como `http://192.168.0.15:3000`. Para ver de novo: abra o Terminal e digite `hostname -I`.
- **TV Box:** na caixinha, abra primeiro `http://ENDEREÇO:3000/diagnostico` (use o endereço numérico, não o nome `.local`). Ela dá um veredito:
  se o navegador for antigo, use o **painel simples**. Deixe nos favoritos `http://ENDEREÇO:3000/bio/painel` (ou o `-simples`) e aperte **OK**
  em **Ativar som** na primeira vez. Se as bordas da TV forem cortadas, use **"Ajuste à tela"** ou **16:9** no menu de imagem dela.
- Para o endereço não mudar, reserve o IP do computador no roteador.

## 7. Firewall do Mint

O firewall do Linux Mint vem **desligado** por padrão, então normalmente os celulares já funcionam. Se alguém o ligou e os celulares não abrem o
endereço, libere a porta **3000**:

- Pelo menu: **Menu › Configuração de Firewall** (Gufw): ligue, clique em **Regras › +**, aba **Simples**, porta `3000`, **Permitir**.
- Ou no Terminal: `sudo ufw allow 3000/tcp`

## 8. Primeiros passos em 2 minutos

1. No **Controle**, confira as salas, informe em **sala/local** onde cada tratamento acontece hoje e toque em **Abrir o dia** (menu da esquerda, abaixo de **Registrar chegada**).
2. Na **Recepção**, cadastre um paciente de teste.
3. No **Controle**, em **Captação/Apometria**, toque em **Chamar próximo**.
4. Olhe o **Painel da TV**: aparece o nome e a sala.

Para testar o processo inteiro, siga o **Roteiro de validação** (documento 2 deste pacote).

## 9. Desligar, recomeçar e apagar os dados de teste

- **Desligar:** feche a janela do terminal (ou pressione **Ctrl+C** nela).
- **Ligar de novo:** pelo ícone ou por `./iniciar-mint.sh`. Se foi desligado no meio do dia, os pacientes cadastrados continuam lá.
- **Recomeçar do zero:** no Controle, **salve antes o relatório completo em PDF** (botão **Relatório do atendimento (PDF)**, depois **Salvar em PDF / Imprimir**
  e **Salvar como PDF**). Em seguida toque em **Fechar o dia** e confirme em **Confirmar: apagar tudo**. Isso apaga pacientes e pré-inscritos e
  guarda apenas o relatório do dia, **sem nomes**.
- **Receber uma versão nova do pacote:** feche o dia, desligue o sistema, extraia o novo ZIP **em uma pasta nova** e use o ícone ou
  o `iniciar-mint.sh` da pasta nova (rode `./instalar-atalho-mint.sh` de novo para o ícone apontar para ela).

## 10. Se algo não funcionar

| O que aconteceu | O que fazer |
|---|---|
| `Permissão negada` ao ligar | Na pasta, digite `chmod +x iniciar-mint.sh node/bin/node` e tente de novo |
| "O Node.js não foi encontrado" | Confira se a pasta `node` está ao lado do `iniciar-mint.sh` e se `uname -m` mostra `x86_64` (64 bits). Em computador de 32 bits ou ARM, este pacote não serve |
| "A porta 3000 já está em uso" | O sistema já está ligado em outra janela: use-a, ou feche-a. Para ver quem usa: `ss -ltnp \| grep 3000` |
| O ícone da Área de Trabalho não liga | Clique nele com o botão direito e escolha **Permitir execução** / **Confiar neste lançador**; ou use `./iniciar-mint.sh` no Terminal |
| O navegador não abriu sozinho | Abra você mesmo `http://localhost:3000` |
| Celular ou TV Box não abre o endereço | Mesma rede? Firewall (item 7)? Use o endereço numérico e o QR code da página inicial |
| Sem som na TV | Toque em **Ativar som** e confira o volume do Mint e da TV |
| Aviso **sem conexão** no topo da tela | O sistema foi desligado ou o computador entrou em repouso. Ligue de novo; a tela reconecta sozinha |
| O computador entra em repouso e o sistema para | **Menu › Configurações › Gerenciamento de energia**: desative a suspensão enquanto o sistema estiver em uso |

Se nada resolver, tire uma **foto da tela** (incluindo o terminal) e envie junto com os seus comentários.

## 11. Ligar sozinho quando o Mint iniciar (opcional)

**Menu › Aplicativos de sessão › +  › Escolher aplicativo** e selecione **Painel GELF** (o ícone criado no passo 3). Assim, o sistema liga quando o
usuário entra no computador.

## 12. Privacidade

Os nomes dos pacientes ficam **só neste computador**, na pasta `dados`, e são apagados ao **Fechar o dia** (ou na virada do dia). Nada é enviado para a
internet. Os relatórios do dia, sem nomes, ficam em `dados/relatorios`.
