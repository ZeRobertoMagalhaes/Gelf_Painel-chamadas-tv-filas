# Fluxo 2 — Recepção

Quem faz: a **recepção**. Endereço: `/recepcao`. Resumo para consulta rápida no [guia da recepção](../guias/recepcao.md).

## Visão geral

```mermaid
flowchart LR
    A[Digitar nome e sobrenome] --> B[Tocar no tratamento]
    B --> C[Cadastrar]
    C -->|nome novo| D[Entra no fim da fila]
    C -->|nome repetido| E{Mesma pessoa?}
    E -->|não| F[Cadastrar mesmo assim] --> D
    E -->|sim| G[Cancelar]
    D --> H[Prioridade ★ / Corrigir ✎ /<br/>Trocar fila ⇄ / Remover ✕]
```

## Passo a passo

### 1. Cadastrar um paciente
Digite **nome** e **sobrenome** e toque no **tratamento** (o botão escolhido fica preenchido).

![Formulário de cadastro com o tratamento escolhido](img/recepcao-1-formulario.webp)

Toque em **Cadastrar** (ou Enter). O paciente entra no **fim** da fila do tratamento, aparece a confirmação
("… entrou na fila.") e o cursor volta ao campo nome, pronto para o próximo.

![Filas por tratamento com os pacientes cadastrados](img/recepcao-2-filas.webp)

Cada cartão mostra a posição, o nome, a hora de chegada e quatro botões: ★ ✎ ⇄ ✕.

### 2. Nome repetido
Se já existe um paciente com o mesmo nome (o sistema ignora acentos e maiúsculas), aparece o aviso
**"Já existe um paciente com este nome"**, dizendo em que fila ele está.

![Aviso de nome repetido](img/recepcao-3-duplicado.webp)

| Botão | O que acontece |
|---|---|
| **Cadastrar mesmo assim** | é outra pessoa: cadastra normalmente |
| **Cancelar** | é a mesma pessoa: não cadastra |

### 3. Prioridade ★
Toque em ★ no cartão (idosos, gestantes, pessoas com deficiência). O paciente **sobe para o início da fila**,
o cartão fica destacado e aparece o selo **prioridade**. Se houver mais de um prioritário, vale a ordem em que
foram marcados. Toque de novo em ★ para tirar.

![Paciente com prioridade no topo da fila](img/recepcao-4-prioridade.webp)

### 4. Trocar de fila ⇄
Toque em ⇄ e depois no tratamento de destino. O paciente vai para o **fim** da fila nova.
**Cancelar** desfaz.

![Escolha da nova fila](img/recepcao-5-trocar-fila.webp)

### 5. Corrigir ✎
Abre os campos de nome e sobrenome do cartão. **Salvar** grava a correção; **Cancelar** descarta.

### 6. Remover ✕
Pede confirmação no próprio cartão (**Remover** / **Não**). Use para desistência ou cadastro errado.

![Confirmação para remover](img/recepcao-6-remover.webp)

### 7. Acompanhar o atendimento
Quando uma equipe chama o paciente, ele sai da fila de espera e o cartão passa a mostrar a situação e a sala
(ex.: "Em atendimento • Sala Reiki"). Ao final, ele vai para **Finalizados hoje** do tratamento, com a
contagem de concluídos: em verde quem **concluiu** e em vermelho quem **não compareceu**.

![Recepção com paciente em atendimento](img/recepcao-7-em-atendimento.webp)

> Paciente com **dois tratamentos** no dia: quando ele concluir o primeiro, cadastre-o de novo na fila seguinte.

### 8. Fechar o atendimento (fim do dia)
Toque em **Fechar atendimento**. O botão vira **Confirmar: apagar tudo**, porque fechar **apaga todas as filas e
chamadas do dia** na hora; **Cancelar** desfaz. Se esquecer, o sistema apaga sozinho na virada do dia.

![Confirmação para fechar o atendimento](img/recepcao-8-fechar-confirmar.webp)

## Transições de um paciente na recepção

```mermaid
stateDiagram-v2
    [*] --> Aguardando: Cadastrar
    Aguardando --> Aguardando: ★ prioridade / ✎ corrigir
    Aguardando --> Aguardando: ⇄ trocar (vai para outra fila)
    Aguardando --> Removido: ✕ remover (confirmado)
    Aguardando --> Chamado: equipe chama (Fluxo 3)
```

Anterior: [Fluxo 1 — Abertura](1-abertura.md) · Próximo: [Fluxo 3 — Atendimento](3-atendimento.md)
