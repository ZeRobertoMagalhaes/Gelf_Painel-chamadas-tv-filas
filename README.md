# Painel GELF — chamadas por filas

Sistema web local (sem banco de dados, sem internet) que organiza filas por
tratamento e chama cada paciente na TV com nome, sobrenome, sala e sinal sonoro
duplo. Especificação: `docs/Proposta de Solução — Sistema de Chamadas por Painel de TV.pdf`.

## Telas

| Tela | Endereço | Quem usa |
|---|---|---|
| Recepção | `/recepcao` | Cadastro, prioridade, correção, troca de fila, remoção, abrir/fechar atendimento |
| Atendimento | `/atendimento` | Equipes no celular/tablet: chamar próximo, chamar novamente, iniciar, concluir, não compareceu |
| Painel TV | `/painel` | Navegador em tela cheia no notebook ligado à TV |

## Rodar

```bash
npm install
npm start          # http://localhost:3000 (PORT=... para mudar)
npm test           # regras, persistência e integração Socket.io
```

Front-end (Svelte + Vite) em `web/`; `public/` é o build e fica versionado, para
o notebook-servidor só precisar do Node.js:

```bash
cd web && npm install && npm run build
```

## Configuração

`config/configuracao.json`: tratamentos (id, nome, cor), salas (atalhos numerados: quantidade e prefixo, padrão 6 × "Sala"; mais `extras` com salas de nome próprio, ex.: "Sala Reiki"), som (repetições, intervalo
em ms — padrão 4000, volume) e painel (tempo de destaque, exibir sobrenome completo,
quantidade de chamadas anteriores). Alterações valem ao reiniciar o servidor.

## Dados

`dados/fila-AAAA-MM-DD.json`: um arquivo por dia, gravado de forma atômica
(`.tmp` + rename) antes de avisar as telas; recuperado se o servidor reiniciar no
mesmo dia; arquivos de dias anteriores são apagados ao iniciar e na virada do dia.
"Fechar atendimento" apaga tudo na hora. Os arquivos não são versionados (LGPD).

## Regras decididas no servidor

- Situações: aguardando → chamado → em atendimento → concluído (ou não compareceu / removido).
- Fila por tratamento: prioritários primeiro, depois ordem de chegada.
- Dois aparelhos chamando ao mesmo tempo nunca recebem o mesmo paciente.
- Cada aparelho atende um paciente por vez (`equipeId` guardado no navegador).
- Aviso de nome repetido (ignora acento e maiúsculas), com opção de confirmar.
- A sala é informada por quem chama, a cada chamada.

## Instalação, guias e checklist

`instalacao/` (scripts do Windows) e `docs/guias/` (instalação, checklist de abertura, guia da recepção, das equipes e da Cura Mediúnica `bio.md`).

## Identidade visual

Herdada de `Gelf_Painel-chamadas-tv`: tokens em `web/src/style.css`, hero com foto e
logo, tema claro, botão primário dourado→âmbar. Cores dos tratamentos vêm da configuração.

## TV do painel (Samsung LN32C450E1M)

LCD 32" de 2010, 16:9, resolução nativa 1366×768 (HD ready), entrada HDMI, sem navegador próprio:
o painel roda no notebook ligado por HDMI. O modo TV (`body.tv-only` em `web/src/style.css`)
usa só unidades vh/vw, com margem de segurança de 4% (TVs dessa geração cortam as bordas por
overscan) e nomes em até duas linhas, sem rolagem.

No notebook/TV: resolução 1366×768 (ou 1280×720), Chrome em tela cheia (F11), zoom 100%.
Na TV: tela "16:9" / "Ajuste de tela → Ajuste à tela" (ou renomear a entrada HDMI para "PC"/"DVI PC")
para desligar o overscan; dê uma chamada de teste para conferir que nada é cortado.

## Módulo Cura Mediúnica / Bioenergético (`/bio`)

Tratamento em que o paciente percorre uma **rota de etapas** (esboço em `docs/Cura Mediunica - Esboco e Discovery.pdf`,
complementado por `docs/Roteiro para tratamento bioenergetico.pdf`). Independente das filas por tratamento: namespace
próprio do Socket.io (`/bio`) e arquivo diário próprio (`dados/bio-AAAA-MM-DD.json`, apagado na virada do dia e em "Fechar o dia").

| Tela | Endereço | Quem usa |
|---|---|---|
| Controle | `/bio/controle` | Responsável pelo fluxo: abre o dia (salas e capacidades, pré-inscritos), registra chegadas, chama cada paciente para uma sala, inicia, conclui, altera a rota, vê o relatório |
| Painel TV | `/bio/painel` | As duas TVs (térreo e 1º andar) mostram o mesmo: etapa, nome, sala e status |

- **Etapas, salas e capacidades** ficam em `config/bio.json` (captação 2 salas de 1 vaga; doutores 2 por vez; reiki 2 macas; 5ª sala a confirmar).
  Mudar o fluxo é editar esse arquivo e reiniciar. No dia, as vagas (macas) e salas em uso se ajustam na própria tela.
- **Espera por local**: cada etapa tem o seu local de espera (térreo ou 1º andar), mostrado nas colunas.
- **Quem chama**: o controle chama o próximo da espera ou escolhe quem entra (os doutores definem a ordem). Só chama se há vaga.
- **Preparo**: na captação, a sala só volta a ter vaga depois de "Sala pronta" (fechamento das energias).
- **Rota por paciente**: igual para a maioria; dá para pular etapa ou redefinir o que falta.
- **Não compareceu**: encerra o paciente; "Voltar à espera" o devolve ao fim da fila da etapa.
- **Relatório do dia** (sem nomes): chegadas, concluídos, tempo médio total e, por etapa, atendidos, espera média e duração média.
  Ao fechar o dia fica salvo em `dados/relatorios/bio-AAAA-MM-DD.json` (fora do Git); os nomes são apagados.
- Pré-inscritos: colar uma pessoa por linha, `Nome Sobrenome ; dia ; descrição`.

Regras em `server/bio/regras.js` (testes em `tests/bio.test.js`). Fase seguinte: tela de sala para celular (reiki avisa pelo celular),
orientações pós-atendimento do roteiro (o guia de uso já está em `docs/guias/bio.md`).
