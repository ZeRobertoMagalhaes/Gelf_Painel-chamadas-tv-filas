# Painel GELF — Cura Mediúnica (Bio)
## Roteiro de validação do processo

Para quem faz o **controle e a orquestração** dos tratamentos bioenergéticos. Siga o roteiro com o sistema ligado
(veja o guia de instalação) e **anote o que achar**: o que funcionou, o que confundiu, o que faltou, o que está
diferente do jeito que o trabalho acontece de verdade. Não existe resposta errada: o objetivo é ajustar o sistema ao processo.

**Como marcar:** na coluna **OK?** escreva ✔ (funcionou como esperado) ou ✘ (não funcionou / ficou diferente), e
use **Observações** para explicar. Pode imprimir o roteiro ou anotar à parte, usando os números dos itens.

## Antes de começar

- Abra as três telas, em abas ou janelas separadas: **Recepção** (`/bio/recepcao`), **Controle** (`/bio/controle`)
  e **Painel da TV** (`/bio/painel`, tecla **F11** para tela cheia; toque em **Ativar som**).
- Para usar celular ou tablet: abra a **página inicial** (`http://localhost:3000/`) no computador e aponte a câmera do aparelho para o **QR code**.
- Se puder, peça a uma pessoa para fazer o papel da **recepção** enquanto você faz o **controle**.
- Use nomes de teste. Ao final, **Fechar o dia** apaga tudo.

## Parte 1 — O processo, do começo ao fim

Cada linha segue um passo do processo oficial.

| # | O que fazer | O que deve acontecer | OK? | Observações |
|---|---|---|---|---|
| 1 | **Controle:** em *Abertura dos trabalhos*, confira as salas e capacidades e toque em **Abrir o dia**. Se quiser, cole uma lista de pré-inscritos | O indicador vira **Dia aberto**; aparecem as colunas por etapa; a TV mostra *Aguardando próxima chamada* | | |
| 2 | **Recepção:** cadastre 4 pacientes de teste (nome e sobrenome ou toque em um pré-inscrito) | Cada um entra na lista *Aguardando o início dos tratamentos* | | |
| 3 | **Recepção:** leia a mensagem após cada cadastro | A tela orienta *aguardar na Sala de Evangelhoterapia (térreo)* | | |
| 4 | **Controle:** confira as filas | Os 4 pacientes estão em **Aguardando**, na coluna **Captação/Apometria** | | |
| 5 | **Controle:** toque em **Chamar próximo** na *Captação 1* | A TV mostra a etapa, o nome, a sala e toca o sinal. O cartão mostra **Chamado** | | |
| 6 | **Controle:** toque em **Iniciar** | A TV muda para **Em atendimento** (sem som) | | |
| 7 | **Controle:** toque em **Concluir etapa** | A TV diz *Etapa concluída — aguarde: Sala de espera do 1º andar*. A vaga da sala volta na hora | | |
| 8 | **Controle:** chame outro paciente para a **Captação 2** e confira que **cada etapa tem duas salas**, atendendo 2 pacientes ao mesmo tempo | Captação 1 e 2 funcionam ao mesmo tempo; o mesmo vale para Doutores, Acupuntura e Reiki | | |
| 9 | **Controle:** na coluna **Doutores**, chame o paciente (**Chamar próximo** em *Doutores 1* ou *Doutores 2*, ou **→ Doutores 1** no cartão para escolher quem entra) | A TV chama para *Doutores 1* (ou *Doutores 2*) | | |
| 10 | **Controle:** toque em **Iniciar**, depois em **Prontuário recebido** | O cartão mostra *📋 Prontuário com o paciente* | | |
| 11 | **Controle, Doutores pediram Acupuntura:** toque em **Incluir Acupuntura** | O cartão passa a mostrar *depois: Acupuntura › Reiki/Cromoterapia* | | |
| 12 | **Controle:** toque em **Concluir etapa** | O paciente vai para a espera da **Acupuntura**; a TV orienta o 1º andar | | |
| 13 | **Controle:** chame para a **Acupuntura**, **Iniciar**, **Concluir etapa** | O cartão lembra que o paciente deve entregar o prontuário na sala | | |
| 14 | **Controle:** chame para **Reiki/Cromoterapia** e toque em **Iniciar** | O botão de concluir vira **Concluir e guardar prontuário** | | |
| 15 | **Controle:** toque em **Concluir e guardar prontuário** | O paciente fica **Concluído**; a TV mostra *Atendimento concluído*; o aviso de prontuário pendente some | | |
| 16 | **Repita com outro paciente, SEM Acupuntura:** Captação → Doutores → (não inclua a Acupuntura) → Concluir | O paciente vai **direto** dos Doutores à espera do **Reiki/Cromoterapia** | | |

## Parte 2 — Situações do dia a dia

| # | O que fazer | O que deve acontecer | OK? | Observações |
|---|---|---|---|---|
| 17 | Chame um paciente e toque em **Chamar novamente** | A TV repete o aviso e o som | | |
| 18 | Chame um paciente e toque em **Não compareceu** | Ele sai da TV e vai para *Finalizados hoje* | | |
| 19 | Em *Finalizados hoje*, toque em **Voltar à espera** | Ele volta ao **fim** da fila da mesma etapa | | |
| 20 | Chame um paciente e toque em **Voltar à espera** | Ele volta ao fim da fila da etapa | | |
| 21 | Em um paciente que aguarda, use **⏭ Pular esta etapa** | Ele segue para a próxima etapa | | |
| 22 | Em um paciente que aguarda, use **⇄ Alterar rota** | Dá para escolher as etapas que faltam, sempre na ordem do fluxo | | |
| 23 | Na recepção, cadastre um nome que já existe | Aparece o aviso de nome repetido, com a opção de cadastrar mesmo assim | | |
| 24 | Na recepção, corrija um nome (✎) e remova um paciente (✕) | A correção e a remoção funcionam | | |
| 25 | No Controle, use **−** / **+** e **⏻** em uma sala | A vaga muda; a sala sai e volta de uso | | |
| 26 | **Ver histórico** em um cartão | Mostra cada movimento com a hora | | |
| 27 | Feche e abra o navegador (ou aperte F5) no meio do teste | Tudo continua como estava | | |
| 28 | Cadastre vários pacientes seguidos e chame dois ao mesmo tempo | A TV mostra um de cada vez, sem cortar o som | | |
| 29 | Toque na ★ de um paciente que aguarda (na Recepção ou no Controle) | Ele sobe para o início da fila, o cartão fica destacado e aparece **prioridade** | | |
| 30 | Com dois pacientes prioritários, olhe a ordem; depois toque em **Chamar próximo** | Vale a ordem em que foram marcados; o prioritário é chamado primeiro | | |
| 31 | Conclua a etapa de um prioritário e veja a próxima espera | Ele continua com a prioridade e passa na frente nas esperas seguintes | | |
| 32 | Toque de novo na ★ | A prioridade é retirada | | |

## Parte 3 — Relatório e fim do dia

| # | O que fazer | O que deve acontecer | OK? | Observações |
|---|---|---|---|---|
| 33 | **Relatório do dia → Mostrar** | Mostra chegadas, concluídos, tempos médios e, por etapa, atendidos e espera | | |
| 34 | Deixe um prontuário recebido sem guardar e olhe perto de **Fechar o dia** | Aparece *N prontuário(s) ainda não guardado(s)* | | |
| 35 | **Fechar o dia** e confirme em **Confirmar: apagar tudo** | Os nomes somem; o relatório do dia fica na tela de abertura, sem nomes | | |

## Parte 4 — Perguntas para você

Responda com o que vê no dia a dia. Pode escrever à vontade.

1. **Etapas e nomes:** os nomes *Captação/Apometria*, *Doutores*, *Acupuntura* e *Reiki/Cromoterapia* estão como vocês falam? As salas (Captação 1 e 2, Doutores 1 e 2, Acupuntura 1 e 2, Reiki 1 e 2) estão com os nomes certos?
2. **Atendimentos simultâneos:** duas salas por etapa, cada uma com 1 paciente, está certo? Algum dia precisa de mais ou de menos? (O **+** e o **−** de cada sala ajustam na hora.)
3. **Prontuário:** os doutores pedem prontuário em **todos** os casos ou só às vezes? O botão **Prontuário recebido** deveria ser obrigatório?
4. **Acupuntura:** quem decide e quando? Incluir pelo cartão, no momento em que o paciente está com os doutores, funciona bem?
5. **Aviso ao paciente:** como o paciente fica sabendo que vai para a Acupuntura? Precisa aparecer na TV?
6. **Texto da TV:** as frases (*Chamado*, *Em atendimento*, *Etapa concluída — aguarde: Sala de espera do 1º andar*) são claras para o paciente? Letras e som estão bons para o salão?
7. **Troca de paciente na sala:** ao concluir uma etapa a vaga volta na hora. Isso combina com o tempo que a sala leva para receber o próximo paciente? Falta alguma pausa ou aviso?
8. **Quem faz o quê:** a recepção só cadastra, e o controle chama e conclui. Está de acordo? Quem opera o controle, e em qual aparelho (computador, tablet, celular)?
9. **Prioridade:** quem decide e quando marcar? A prioridade deve valer em todas as etapas, como está? Deve aparecer na TV?
10. **O que está faltando:** o que você faz no dia que o sistema ainda não permite? O que sobrou ou atrapalha?
11. **Fim do dia:** o relatório traz o que vocês precisam? Falta algum número?

## Como enviar seus comentários

- Devolva o **roteiro preenchido** (ou suas anotações com os números dos itens) para quem lhe enviou o pacote.
- Se algum erro aparecer, inclua uma **foto ou print da tela** e, se possível, da **janela preta** do sistema.
- Se encontrar algo que não funcionou, diga **em que item** estava (por exemplo, "item 12") e o que esperava ver.

Obrigado por validar o processo.
