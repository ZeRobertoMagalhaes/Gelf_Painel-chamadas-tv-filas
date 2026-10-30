# Guia da Recepção

Endereço: `/recepcao` (ex.: http://painel-gelf-filas.local:3000/recepcao)

**Começar o dia:** toque em **Abrir atendimento** (no canto esquerdo, embaixo). Sem isso ninguém cadastra nem chama.

**Cadastrar um paciente**
1. Digite o **nome completo** (nome e sobrenome, no mesmo campo).
2. Toque no **tratamento** (botão colorido).
3. Toque em **Cadastrar** (ou Enter). O paciente entra no fim da fila e o cursor volta ao nome.

Se aparecer **"Já existe um paciente com este nome"**, confira: se for outra pessoa, toque em
*Cadastrar mesmo assim*; se for a mesma, toque em *Cancelar*.

**Em cada paciente que aguarda**
- ★ **Prioridade:** sobe para o início da fila (idosos, gestantes, pessoas com deficiência). Toque de novo para tirar.
- ✎ **Corrigir** o nome. ⇄ **Trocar de fila** (vai para o fim da fila nova). ✕ **Remover** (desistência ou cadastro errado; pede confirmação).

**Paciente com dois tratamentos no dia:** quando ele concluir o primeiro, cadastre-o de novo na fila seguinte.

**Fim do dia**
1. Toque em **Relatório do dia (PDF)** (abre em outra aba): mostra o resumo por tratamento e o registro de cada paciente
   (chegada, chamada, sala, início, fim, espera e duração). Toque em **Salvar em PDF / Imprimir** e escolha *Salvar como PDF*.
2. Só depois toque em **Fechar atendimento** (confirme com o segundo toque): apaga todas as filas e nomes.
   Fica salvo apenas o resumo em números, sem nomes (`dados/relatorios/fila-AAAA-MM-DD.json`).
