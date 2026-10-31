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
| 1 | **Controle:** em *Abertura dos trabalhos*, confira as salas e capacidades, **informe em *sala/local* onde cada tratamento acontece hoje** (ex.: *Sala 03 (térreo)*) e toque em **Abrir o dia** (menu da esquerda, abaixo de **Registrar chegada**). Se quiser, cole uma lista de pré-inscritos | O indicador vira **Dia aberto**; aparecem as colunas por etapa, com o local de cada sala; a TV mostra *Aguardando próxima chamada* | | |
| 2 | **Recepção:** cadastre 4 pacientes de teste (Nome e Sobrenome ou toque em um pré-inscrito) | Cada um entra na lista *Aguardando o início dos tratamentos* | | |
| 3 | **Recepção:** leia a mensagem após cada cadastro | A tela orienta *aguardar na Sala de Evangelhoterapia (térreo)* | | |
| 4 | **Controle:** confira as filas | Os 4 pacientes estão em **Aguardando**, na coluna **Captação/Apometria** | | |
| 5 | **Controle:** toque em **Chamar próximo** na *Captação 1* | A TV mostra a etapa, o nome, a sala e toca o sinal. O cartão mostra **Chamado** | | |
| 6 | **Controle:** veja o campo *Sala para onde o paciente deve ir* no cartão do chamado; depois mude o *Sala/local* da Captação 1 | O campo já vem com o local da sala; na TV e na Recepção aparece essa sala, e ao mudar o local da sala o paciente chamado acompanha | | |
| 7 | **Controle:** no cartão do paciente chamado, digite a **Sala para onde o paciente deve ir** (ex.: *Sala 02*) e aperte Enter | A sala aparece na **TV** (no lugar do nome da sala chamada) e, na Recepção, o cartão mostra *➜ Ir para: Sala 02* | | |
| 8 | **Recepção:** olhe a barra abaixo do nome de cada paciente | Uma bolinha por etapa: ✓ verde = concluída; cor da etapa = em atendimento; contorno pulsando = chamado; tracejada = aguardando; cinza = a fazer. A TV não mostra a barra | | |
| 9 | **Controle:** toque em **Iniciar** | A TV muda para **Em atendimento** (sem som) | | |
| 10 | **Controle:** toque em **Concluir etapa** | A TV diz *Etapa concluída — aguarde: Sala de espera do 1º andar*. A vaga da sala volta na hora | | |
| 11 | **Controle:** chame outro paciente para a **Captação 2** e confira que **cada etapa tem duas salas**, atendendo 2 pacientes ao mesmo tempo | Captação 1 e 2 funcionam ao mesmo tempo; o mesmo vale para Doutores e Reiki | | |
| 12 | **Controle:** na coluna **Doutores**, chame o paciente (**Chamar próximo** em *Doutor 1* ou *Doutor 2*, ou **→ Doutor 1** no cartão para escolher quem entra) | A TV chama para *Doutor 1* (ou *Doutor 2*) | | |
| 13 | **Controle:** toque em **Iniciar**, depois em **Prontuário recebido** | O cartão mostra *📋 Prontuário com o paciente* | | |
| 14 | **Controle:** toque em **Concluir etapa** (a acupuntura, quando indicada, é feita **dentro** do atendimento dos Doutores; não há etapa separada) | O paciente vai direto para a espera do **Reiki/Cromoterapia**; a TV orienta o 1º andar | | |
| 15 | **Controle:** chame para o **Reiki/Cromoterapia** e toque em **Iniciar** | O cartão lembra que o paciente deve entregar o prontuário; o botão de concluir vira **Concluir e guardar prontuário** | | |
| 16 | **Controle:** toque em **Concluir e guardar prontuário** | O paciente fica **Concluído**; a TV mostra *Atendimento concluído*; o aviso de prontuário pendente some | | |

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
| 29 | Toque na ★ de um paciente que aguarda (na Recepção ou no Controle) | Ele sobe para o início da fila, o cartão fica destacado, aparece **prioridade** e o aviso: *tratamentos em sala do térreo; aguardar na Sala de Evangelhoterapia (térreo) até ser chamado* | | |
| 30 | Com dois pacientes prioritários, olhe a ordem; depois toque em **Chamar próximo** | Vale a ordem em que foram marcados; o prioritário é chamado primeiro | | |
| 31 | Conclua a etapa de um prioritário e veja a próxima espera | Ele continua com a prioridade e passa na frente nas esperas seguintes; a TV diz *aguarde: Sala de Evangelhoterapia (térreo)* (os demais, *Sala de espera do 1º andar*) | | |
| 32 | Toque de novo na ★ | A prioridade é retirada | | |

## Parte 3 — Relatório e fim do dia

| # | O que fazer | O que deve acontecer | OK? | Observações |
|---|---|---|---|---|
| 33 | **Relatório do dia → Mostrar** (resumo rápido, sem nomes) | Mostra chegadas, concluídos, tempos médios e, por etapa, atendidos e espera | | |
| 34 | **Relatório do atendimento (PDF)** (botão no menu da esquerda): confira os dados e toque em **Salvar em PDF / Imprimir** → *Salvar como PDF* | Abre o relatório completo: resumo geral e, por paciente, etapa, sala, **início, fim e duração**; o PDF é salvo | | |
| 35 | Deixe um prontuário recebido sem guardar e olhe perto de **Fechar o dia** | Aparece *N prontuário(s) ainda não guardado(s)* | | |
| 36 | Toque em **Fechar o dia** | A tela lembra de **salvar o relatório completo em PDF antes**, pois os nomes serão apagados | | |
| 37 | Confirme em **Confirmar: apagar tudo** | Os nomes somem; o relatório do dia fica na tela de abertura, sem nomes | | |

## Parte 4 — Perguntas para você

Responda com o que vê no dia a dia. Pode escrever à vontade.

1. **Etapas e nomes:** os nomes *Captação/Apometria*, *Doutores* e *Reiki/Cromoterapia* estão como vocês falam? As salas (Captação 1 e 2, Doutor 1 e 2, Reiki 1 e 2) estão com os nomes certos?
2. **Atendimentos simultâneos:** duas salas por etapa, cada uma com 1 paciente, está certo? Algum dia precisa de mais ou de menos? (O **+** e o **−** de cada sala ajustam na hora.)
3. **Prontuário:** os doutores pedem prontuário em **todos** os casos ou só às vezes? O botão **Prontuário recebido** deveria ser obrigatório?
4. **Acupuntura:** hoje ela é feita dentro do atendimento dos Doutores, sem etapa nem sala próprias. Precisa ser registrada de algum modo (por exemplo, uma marca no cartão e no relatório)?
5. **Prioritários:** quais salas de Doutores e de Reiki ficam no térreo? O sistema hoje só avisa (recepção, controle e TV); indicar a sala certa na chamada ajudaria?
6. **Texto da TV e barra da recepção:** as frases da TV (*Chamado*, *Em atendimento*, *Etapa concluída — aguarde: Sala de espera do 1º andar*) são claras para o paciente? A **barra de progresso por etapas** da recepção ajuda? Falta algum dado na TV ou na recepção? Letras e som estão bons para o salão?
7. **Troca de paciente na sala:** ao concluir uma etapa a vaga volta na hora. Isso combina com o tempo que a sala leva para receber o próximo paciente? Falta alguma pausa ou aviso?
8. **Quem faz o quê:** a recepção só cadastra, e o controle chama e conclui. Está de acordo? Quem opera o controle, e em qual aparelho (computador, tablet, celular)?
9. **Prioridade:** quem decide e quando marcar? A prioridade deve valer em todas as etapas, como está? Deve aparecer na TV?
10. **O que está faltando:** o que você faz no dia que o sistema ainda não permite? O que sobrou ou atrapalha?
11. **Locais das salas:** informar o sala/local de cada tratamento na abertura do dia, com a possibilidade de mudar depois, atende? O nome da sala chamada (Doutor 1…) ainda precisa aparecer na TV junto com o local?
12. **Relatório do atendimento (PDF):** traz o que vocês precisam (dados dos pacientes, horários de início e fim, resumo geral)? Falta alguma coluna ou número? Quem guarda o PDF e onde?

## Como enviar seus comentários

- Devolva o **roteiro preenchido** (ou suas anotações com os números dos itens) para quem lhe enviou o pacote.
- Se algum erro aparecer, inclua uma **foto ou print da tela** e, se possível, da **janela preta** do sistema.
- Se encontrar algo que não funcionou, diga **em que item** estava (por exemplo, "item 12") e o que esperava ver.

Obrigado por validar o processo.
