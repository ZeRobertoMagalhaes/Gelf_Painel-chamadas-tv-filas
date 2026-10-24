# Guia da TV (TV Box + Samsung LN32C450)

Equipamento em uso: **TV Box MXQ Pro 4K** ligada por HDMI à **Samsung LN32C450E1M** (LCD de 32", 1366×768, sem recursos smart). O
navegador roda **na caixinha**; a TV só mostra a imagem.

## Qual endereço abrir na caixinha
Use o **endereço numérico** do computador (a página inicial `http://ENDEREÇO:3000/` mostra, com QR code), e não o nome `.local`,
que muitas caixas Android não entendem.

| Tela | Endereço |
|---|---|
| Painel do Bio | `http://ENDEREÇO:3000/bio/painel` |
| Painel das filas | `http://ENDEREÇO:3000/painel` |
| **Painel do Bio, versão simples** | `http://ENDEREÇO:3000/bio/painel-simples` |
| **Painel das filas, versão simples** | `http://ENDEREÇO:3000/painel-simples` |
| **Diagnóstico da TV** | `http://ENDEREÇO:3000/diagnostico` |

A caixinha e o computador precisam estar na **mesma rede**. Reserve o IP do computador no roteador para o endereço não mudar.

## Se o painel não abrir: passo a passo
1. Na caixinha, abra **`/diagnostico`**. Essa página usa só recursos antigos e abre até em navegador velho.
2. Leia o **veredito** em destaque (e, se precisar, tire uma foto):
   - **"Este navegador NÃO alcançou o servidor"** → é rede ou endereço. Confira Wi-Fi/cabo, se o computador está ligado com o sistema no ar,
     e o endereço digitado. Se o celular na mesma Wi-Fi abre, mas a caixinha não, tente o cabo de rede (a MXQ tem entrada Ethernet).
   - **"Este navegador é antigo para o painel normal"** → use o **painel simples** (botões na própria página).
   - **"Tudo certo"** → o painel normal abre; se não abrir, use o simples.
3. Deixe o **painel simples** nos favoritos da caixinha. Ele mostra o mesmo conteúdo (nome, etapa, sala, situação, últimos chamados) e
   toca o mesmo sinal sonoro.

## Som
Na primeira vez, aperte **OK** no botão **Ativar som** (canto inferior da tela). O navegador só libera o áudio depois de um clique.

## Ajuste da TV
A LN32C450 tem tela 1366×768. Se as bordas forem cortadas, entre no menu de imagem da TV e escolha **"Ajuste à tela"** / **16:9**.
O painel já deixa uma margem de 4% nas bordas.

## Caixa antiga não alcança o sistema novo?
O sistema antigo (`Gelf_Painel-chamadas-tv`) e este usam a mesma porta (3000). O nome de rede deste sistema é
**`painel-gelf-filas.local`** (o antigo continua `painel-gelf.local`), para os dois não disputarem o mesmo nome na rede.
