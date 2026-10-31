# Painel GELF — Roteiro rápido: Evangelho Terapia

## O passo a passo de um dia de atendimento, do clique no atalho ao fim do dia

<div class="passo">

## 1. Ligar o sistema

| Computador | Como ligar |
|---|---|
| **Linux Mint** | Duplo clique no ícone **Painel GELF** (Área de Trabalho ou menu). Se o ícone mostrar um aviso, clique com o botão direito e escolha *Permitir execução*. |
| **Windows** | Duplo clique em **INICIAR-SISTEMA.bat** (dentro da pasta do sistema). |

Abre uma **janela escura** (o terminal) com os endereços do sistema. **Não feche essa janela**: ela é o sistema funcionando.
Em poucos segundos o **navegador abre sozinho** na página inicial.

<figure><img src="img/00-janela-do-sistema.webp" style="width:62%"><figcaption>A janela do sistema (exemplo). Deixe-a aberta o dia todo.</figcaption></figure>

</div>

<div class="passo">

## 2. A página inicial

Na seção **Tratamentos - Evangelho Terapia** ficam os links das telas e **dois QR codes** da tela usada no celular, o **Atendimento**:

- **Pelo nome**: use primeiro.
- **Pelo IP**: use se o primeiro não abrir no seu aparelho (acontece em alguns Android e em redes de visitantes).

O celular precisa estar na **mesma rede Wi-Fi** do computador.

<figure><img src="img/e-01-pagina-inicial.webp" style="width:80%"><figcaption>Seção Evangelho Terapia da página inicial, com os dois QR codes.</figcaption></figure>

</div>

<div class="passo">

## 3. A recepção abre o atendimento

Abra a **Recepção** (`/recepcao`) e toque em **Abrir atendimento** (canto esquerdo, embaixo). Sem isso ninguém cadastra nem chama.

<figure><img src="img/e-02-recepcao-fechada.webp"><figcaption>Recepção com o atendimento fechado: toque em <b>Abrir atendimento</b>.</figcaption></figure>

</div>

<div class="passo">

## 4. Cadastrar os pacientes

1. Digite **Nome e Sobrenome** (no mesmo campo; pelo menos duas palavras).
2. Toque no **tratamento**.
3. Toque em **Cadastrar**. O paciente entra no fim da fila. Use ★ para dar **prioridade**.

<figure><img src="img/e-03-recepcao-cadastro.webp"><figcaption>Nome e Sobrenome preenchido e o tratamento escolhido.</figcaption></figure>

<figure><img src="img/e-04-recepcao-filas.webp"><figcaption>Cada tratamento tem a sua fila. O paciente com ★ vai para a frente.</figcaption></figure>

</div>

<div class="passo">

## 5. A equipe chama o paciente, no celular

Aponte a câmera para o QR code do **Atendimento**. Na primeira vez, escolha **o seu tratamento** (o aparelho lembra). Depois toque na **sala** e em **Chamar próximo**.

<div class="lado"><figure><img src="img/e-05-atendimento-escolher.webp"><figcaption>Primeira vez: escolher o tratamento.</figcaption></figure><figure><img src="img/e-06-atendimento-chamar.webp"><figcaption>Escolher a sala e tocar em <b>Chamar próximo</b>.</figcaption></figure></div>

</div>

<div class="passo">

## 6. A TV mostra a chamada

A TV mostra o **nome**, a **sala** e toca o **sinal sonoro**. Na TV, abra o **Painel da TV**, aperte **F11** (tela cheia) e toque em **Ativar som** uma vez.

<figure><img src="img/e-07-tv-chamada.webp" style="width:80%"><figcaption>Painel da TV com a chamada.</figcaption></figure>

</div>

<div class="passo">

## 7. Iniciar e concluir o atendimento

- Paciente chegou à sala: **Iniciar atendimento**.
- Terminou: **Concluir atendimento**. Em seguida, **Chamar próximo**.
- Não apareceu: **Chamar novamente** e, se ainda assim não vier, **Não compareceu** (toque duas vezes para confirmar).

Cada aparelho atende **um paciente por vez**: conclua antes de chamar outro.

<div class="lado"><figure><img src="img/e-08-atendimento-chamado.webp"><figcaption>Chamado: <b>Iniciar atendimento</b>.</figcaption></figure><figure><img src="img/e-09-atendimento-em-atendimento.webp"><figcaption>Em atendimento: <b>Concluir atendimento</b>.</figcaption></figure><figure><img src="img/e-10-atendimento-concluido.webp"><figcaption>Concluído: já dá para chamar o próximo.</figcaption></figure></div>

</div>

<div class="passo">

## 8. Fim do dia: relatório e fechamento

1. Na Recepção, toque em **Relatório do dia (PDF)**. Ele mostra o resumo por tratamento e o registro de cada paciente (chegada, chamada, sala, início, fim, espera e duração).
2. Toque em **Salvar em PDF / Imprimir** e, na janela, escolha **Salvar como PDF**.
3. **Só depois** toque em **Fechar atendimento** e confirme: os nomes são apagados. Fica salvo apenas o resumo em números.

<figure><img src="img/e-11-recepcao-fechar.webp"><figcaption>Antes de fechar: <b>Relatório do dia (PDF)</b>. O botão de fechar pede uma confirmação.</figcaption></figure>

<figure><img src="img/e-12-relatorio.webp"><figcaption>Relatório do dia, pronto para salvar em PDF.</figcaption></figure>

</div>

<div class="passo">

## 9. Desligar

Feche a **janela escura**. Os nomes dos pacientes ficam só neste computador (pasta `dados`) e são apagados ao fechar o atendimento.

</div>

<div class="passo">

## Se algo falhar

| Sintoma | O que fazer |
|---|---|
| O navegador não abriu | Abra você mesmo `http://localhost:3000` |
| A tela do celular diz **sem conexão** | Confira o Wi-Fi e use o QR code **Pelo IP** |
| Sem som na TV | Toque em **Ativar som** e confira o volume |
| A janela escura fechou | Dê duplo clique no atalho de novo: o dia é recuperado |

</div>
