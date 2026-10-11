# Guia da Cura Mediúnica (Recepção, Controle e TVs)

Recepção: `/bio/recepcao` (ex.: http://painel-gelf.local:3000/bio/recepcao)
Controle: `/bio/controle`
TVs: `/bio/painel` (as duas TVs, térreo e 1º andar, mostram a mesma tela)

O paciente percorre uma **rota de etapas**: Captação/Apometria › Doutores › Reiki/Cromoterapia. A **Acupuntura**
não faz parte da rota padrão: os doutores decidem, paciente a paciente, quem passa por ela, e ela
sempre vem **antes** do Reiki/Cromoterapia. O processo oficial completo está em
[docs/fluxos/fluxo-operacional-bio.md](../fluxos/fluxo-operacional-bio.md).

## Quem faz o quê
- **Responsável pelo início:** abre o dia no controle (**Abrir o dia**).
- **Recepção:** cadastra todos os pacientes em `/bio/recepcao` e orienta cada um a aguardar na
  **Sala de Evangelhoterapia (térreo)**.
- **Controle e orquestração:** chama, conclui as etapas, recebe e guarda o prontuário, e fecha o dia.

## Abrir o dia (controle)
1. Em **Abertura dos trabalhos**, deixe marcadas as salas que funcionam hoje.
2. Ajuste a **capacidade** de cada sala (ex.: número de macas do reiki).
3. Se houver lista de pré-inscritos, cole no campo, **um por linha**: `Nome Sobrenome ; dia ; descrição`
   (ex.: `Maria Souza ; 10/10 ; dor nas costas`).
4. Toque em **Abrir o dia**. O indicador no canto esquerdo passa a **Dia aberto**.

## Cadastrar os pacientes (recepção)
- Digite **nome** e **sobrenome** e toque em **Cadastrar**; ou toque no nome em **Pré-inscritos**.
- A tela mostra a orientação: *aguardar na Sala de Evangelhoterapia (térreo)*.
- Se aparecer **"Já existe um paciente com este nome no fluxo"**: **Cadastrar mesmo assim** (é outra pessoa) ou **Cancelar**.
- ✎ corrige o nome; ✕ remove (pede confirmação).

## Chamar para uma sala (controle)
Cada etapa é uma coluna, com suas salas e a lista **Aguardando**. Cada etapa tem **duas salas** (ex.: Captação 1 e 2), então atendem **2 pacientes ao mesmo tempo**. As salas mostram as vagas (ex.: `1/1 vagas`).

- **Chamar próximo** (na sala): chama o primeiro da espera.
- **→ nome da sala** (no cartão do paciente): escolhe quem entra (os doutores definem a ordem).
- Só chama se há vaga. A TV mostra o nome, a sala e toca o sinal.

## Acompanhar cada paciente
Paciente **Chamado** (a caminho):
- **Iniciar**: chegou à sala.
- **Chamar novamente**: repete aviso e som.
- **Voltar à espera**: devolve ao fim da fila da etapa.
- **Não compareceu**: encerra o paciente.

Paciente **Em atendimento**:
- **Concluir etapa**: libera a vaga e leva o paciente para a espera da próxima etapa. A **TV orienta**:
  "Etapa concluída — aguarde: Sala de espera do 1º andar".

Quem foi marcado **Não compareceu** aparece em **Finalizados hoje**. Se chegar atrasado, toque em
**Voltar à espera**: ele entra no fim da fila da mesma etapa.

Ao concluir a etapa, a **vaga da sala volta na hora**: dá para chamar o próximo em seguida.

## Doutores: prontuário e Acupuntura
No cartão do paciente na sala dos **Doutores**:
- **Prontuário recebido**: marca que o controle recebeu o prontuário do tratamento pedido. O cartão passa a
  mostrar "📋 Prontuário com o paciente" e, nas salas seguintes, lembra que o paciente deve entregá-lo.
- **Incluir Acupuntura** (só se os doutores pedirem): acrescenta a Acupuntura à rota, antes do
  Reiki/Cromoterapia. **Retirar Acupuntura** desfaz. Sem isso, o paciente segue direto ao Reiki/Cromoterapia.

## Reiki/Cromoterapia: guardar o prontuário e encerrar
Na última etapa, o botão é **Concluir e guardar prontuário**: conclui a etapa, registra que o prontuário foi
guardado e **encerra o fluxo do paciente no dia**. Se sobrar algum prontuário sem guardar, o controle avisa ao
lado do botão de fechar o dia.

## Mudar a rota de um paciente
No cartão de quem aguarda:
- **⇄ Alterar rota**: toque nas etapas que faltam e em **Salvar rota** (sempre na ordem do fluxo).
- **⏭ Pular esta etapa**: segue direto para a próxima.
- **✕ Remover do fluxo**: tira o paciente do fluxo.

No cartão de quem está na sala também há **Alterar rota**.

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
- Para mudar etapas, salas, nomes ou capacidades padrão, edite `config/bio.json` e reinicie o servidor.
