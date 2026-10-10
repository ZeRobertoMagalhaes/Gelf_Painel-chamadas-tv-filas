# Guia da Cura Mediúnica (Controle e TVs)

Controle: `/bio/controle` (ex.: http://painel-gelf.local:3000/bio/controle)
TVs: `/bio/painel` (as duas TVs, térreo e 1º andar, mostram a mesma tela)

O paciente percorre uma **rota de etapas**: Captação › Doutores › Reiki. A **Acupuntura** (1 vaga) não faz parte da rota padrão: os doutores
decidem, paciente a paciente, quem passa por ela. Quem usa o controle
acompanha cada um da chegada à saída.

## Abrir o dia
1. Em **Abertura dos trabalhos**, deixe marcadas as salas que funcionam hoje.
2. Ajuste a **capacidade** de cada sala (ex.: número de macas do reiki).
3. Se houver lista de pré-inscritos, cole no campo, **um por linha**: `Nome Sobrenome ; dia ; descrição`
   (ex.: `Maria Souza ; 10/10 ; dor nas costas`).
4. Toque em **Abrir o dia**. O indicador no canto esquerdo passa a **Dia aberto**.

## Registrar a chegada
- Paciente sem inscrição: digite **nome** e **sobrenome** e toque em **Registrar chegada**.
- Pré-inscrito: toque no nome dele na lista **Pré-inscritos**.
- Se aparecer **"Já existe um paciente com este nome no fluxo"**, confira: se for outra pessoa, toque em
  *Registrar mesmo assim*; se for a mesma, toque em *Cancelar*.

O paciente entra no fim da fila de **Aguardando** da primeira etapa.

## Chamar para uma sala
Cada etapa é uma coluna, com suas salas e a lista de **Aguardando**. Cada sala mostra as vagas (ex.: `1/2 vagas`).

- **Chamar o próximo da fila:** na sala, toque em **Chamar próximo**.
- **Escolher quem entra** (os doutores definem a ordem): no cartão do paciente, toque em **→ nome da sala**.
- Só chama se a sala tem vaga. Sem vaga, o botão fica desativado.

A TV mostra o nome, a sala e toca o sinal.

## Acompanhar cada paciente
Paciente **Chamado** (a caminho):
- **Iniciar**: chegou à sala.
- **Chamar novamente**: repete aviso e som.
- **Voltar à espera**: devolve ao fim da fila da etapa.
- **Não compareceu**: encerra o paciente.

Paciente **Em atendimento**:
- **Concluir etapa**: libera a vaga e leva o paciente para a espera da próxima etapa da rota.

Quem foi marcado **Não compareceu** aparece em **Finalizados hoje**. Se chegar atrasado, toque em
**Voltar à espera**: ele entra no fim da fila da mesma etapa.

**Captação:** depois de concluir, a sala fica **Em preparo** (fechamento das energias). Ela só volta a
ter vaga quando você toca em **Sala pronta**.

## Mudar a rota de um paciente
No cartão de quem aguarda:
- **⇄ Alterar rota**: toque nas etapas que faltam, na ordem desejada (os números mostram a sequência), e em **Salvar rota**.
- **⏭ Pular esta etapa**: segue direto para a próxima.
- **✕ Remover do fluxo**: tira o paciente do fluxo.

**Incluir a acupuntura (ou outra etapa) enquanto o paciente está com os doutores:** no cartão dele na sala,
toque em **Alterar rota**, toque em **Acupuntura** (o Reiki já aparece marcado) e em **Salvar rota**.
Ao concluir a etapa dos doutores, ele segue por Reiki e depois Acupuntura.

**Ver histórico** (em cada cartão) lista todos os movimentos do paciente, com a hora.

## Ajustes durante o dia
Em cada sala:
- **−** / **+**: tira ou acrescenta uma vaga (macas).
- **⏻ / ▶**: tira a sala de uso ou a recoloca. Sala fora de uso mostra "fora de uso".

## Relatório e fechar o dia
- **Relatório do dia** (embaixo, **Mostrar / Ocultar**): chegadas, concluídos, não compareceram, em andamento,
  tempo médio total e, por etapa, atendidos, espera média, duração média e quem aguarda agora. Não traz nomes.
- Ao final, toque em **Fechar o dia** e confirme em **Confirmar: apagar tudo**. Isso apaga pacientes e
  pré-inscritos; só o relatório fica salvo (`dados/relatorios/bio-AAAA-MM-DD.json`).
- O relatório do último dia fechado aparece na tela de abertura do dia seguinte.

## Boas práticas
- Feche o dia sempre ao terminar; os nomes não devem ficar guardados.
- Se o aviso ficar vermelho ou a tela não atualizar, veja o indicador **conectado / sem conexão** no topo.
- Para mudar etapas, salas ou capacidades padrão, edite `config/bio.json` e reinicie o servidor.
