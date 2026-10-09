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

`instalacao/` (scripts do Windows) e `docs/guias/` (instalação, checklist de abertura, guia da recepção e das equipes).

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
