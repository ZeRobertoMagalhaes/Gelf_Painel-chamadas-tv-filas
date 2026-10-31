# Painel GELF — Roteiro rápido

O passo a passo de um dia de atendimento, desde o clique no atalho até o fim do dia.

## 1. Ligar o sistema

| Computador | Como ligar |
|---|---|
| **Linux Mint** | Duplo clique no ícone **Painel GELF** (Área de Trabalho ou menu). Se o ícone mostrar um aviso, clique com o botão direito e escolha *Permitir execução*. |
| **Windows** | Duplo clique em **INICIAR-SISTEMA.bat** (dentro da pasta do sistema). |

1. Abre uma **janela escura** (o terminal) com os endereços do sistema. **Não feche essa janela**: ela é o sistema funcionando.
2. Em poucos segundos o **navegador abre sozinho** na página inicial, a **Painel GELF**.

## 2. A página inicial

Há duas seções, uma para cada tipo de tratamento: **Tratamentos - Evangelho Terapia** e **Tratamentos - Bio Energia**.

- Cada seção tem os **links das telas** e **dois QR codes** da tela que a equipe usa no celular
  (*Atendimento* no Evangelho Terapia, *Controle* no Bio Energia).
- **QR code "Pelo nome"**: use primeiro. **QR code "Pelo IP"**: use se o primeiro não abrir no seu aparelho (acontece em alguns Android e em redes de visitantes).
- O celular precisa estar na **mesma rede Wi-Fi** do computador.
- **TV:** abra o **Painel da TV** no navegador da TV, aperte **F11** (tela cheia) e toque em **Ativar som** uma vez.

## 3. Tratamentos - Evangelho Terapia (filas)

1. **Recepção** (`/recepcao`): toque em **Abrir atendimento**.
2. **Cadastrar:** digite **Nome e Sobrenome**, toque no **tratamento** e em **Cadastrar**. Use ★ para dar prioridade.
3. **Equipe, no celular** (QR code *Atendimento*): na primeira vez, escolha o **seu tratamento**. Toque na **sala** e em **Chamar próximo**.
   O nome, a sala e o sinal sonoro aparecem na **TV**.
4. Paciente chegou: **Iniciar atendimento**. Terminou: **Concluir atendimento**. Depois, **Chamar próximo**.
   Se não apareceu: **Chamar novamente** e, se ainda assim não vier, **Não compareceu**.
5. **Fim do dia:** na Recepção, **Relatório do dia (PDF)** › **Salvar em PDF / Imprimir** › escolha *Salvar como PDF*.
   Só depois toque em **Fechar atendimento** (confirme): os nomes são apagados.

## 4. Tratamentos - Bio Energia

1. **Controle** (`/bio/controle`): marque as salas do dia, ajuste as vagas, cole os pré-inscritos (se houver) e toque em **Abrir o dia**.
2. **Recepção do Bio** (`/bio/recepcao`): cadastre cada paciente com **Nome e Sobrenome** (ou toque no pré-inscrito) e oriente-o a aguardar na
   **Sala de Evangelhoterapia (térreo)**.
3. **Controle:** **Chamar próximo** (ou **→ sala**, para escolher quem entra). A TV mostra nome, sala e toca o sinal.
4. **Iniciar** quando o paciente chegar à sala e **Concluir etapa** ao terminar; ele passa para a espera da próxima etapa.
   Nos **Doutores**, marque **Prontuário recebido**; no **Reiki**, use **Concluir e guardar prontuário**.
5. **Fim do dia:** **Relatório do atendimento (PDF)** › **Salvar em PDF / Imprimir**. Só depois **Fechar o dia** (confirme): os nomes são apagados.

## 5. Desligar

Feche a **janela escura**. Os nomes dos pacientes ficam só neste computador (pasta `dados`) e são apagados ao fechar o dia.

## Se algo falhar

| Sintoma | O que fazer |
|---|---|
| O navegador não abriu | Abra você mesmo `http://localhost:3000` |
| A tela do celular diz **sem conexão** | Confira o Wi-Fi e use o QR code **Pelo IP** |
| Sem som na TV | Toque em **Ativar som** e confira o volume |
| A janela escura fechou | Dê duplo clique no atalho de novo: o dia é recuperado |
