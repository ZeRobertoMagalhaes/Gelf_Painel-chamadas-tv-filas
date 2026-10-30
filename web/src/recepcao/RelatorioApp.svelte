<script>
  import { onMount } from "svelte";
  import { rede, conectar } from "../lib/conexao.svelte.js";
  import { horaCurta, SITUACAO } from "../lib/util.js";

  const estado = $derived(rede.estado);
  const registro = $derived(estado?.registro);
  const resumo = $derived(registro?.resumo);
  const ultimo = $derived(estado?.relatorio);

  const dataBR = (d) => (d ? d.split("-").reverse().join("/") : "");
  const min = (v) => (v === null || v === undefined ? "—" : `${v} min`);
  const hora = (iso) => horaCurta(iso) || "—";
  const geradoEm = new Date().toLocaleString("pt-BR");
  const nomeCompleto = (p) => `${p.nome} ${p.sobrenome}`;

  onMount(() => conectar());
</script>

{#snippet tabela(r)}
  <div class="rel-totais">
    <div><strong>{r.cadastrados}</strong><span>pacientes cadastrados</span></div>
    <div><strong>{r.concluidos}</strong><span>atendimentos concluídos</span></div>
    <div><strong>{r.naoCompareceram}</strong><span>não compareceram</span></div>
    <div><strong>{r.aguardando + r.emAtendimento}</strong><span>ainda na fila ou em atendimento</span></div>
    <div><strong>{r.prioritarios}</strong><span>prioritários</span></div>
    <div><strong>{min(r.esperaMediaMin)}</strong><span>espera média até ser chamado</span></div>
    <div><strong>{min(r.duracaoMediaMin)}</strong><span>duração média do atendimento</span></div>
  </div>
  <table class="rel-tabela">
    <thead>
      <tr><th>Tratamento</th><th>Cadastrados</th><th>Concluídos</th><th>Não compareceram</th><th>Aguardando agora</th><th>Espera média</th><th>Duração média</th></tr>
    </thead>
    <tbody>
      {#each r.tratamentos as t (t.id)}
        <tr><td>{t.nome}</td><td>{t.cadastrados}</td><td>{t.concluidos}</td><td>{t.naoCompareceram}</td><td>{t.aguardando}</td><td>{min(t.esperaMediaMin)}</td><td>{min(t.duracaoMediaMin)}</td></tr>
      {/each}
    </tbody>
  </table>
{/snippet}

<div class="rel">
  <header class="rel-topo">
    <div>
      <h1>Filas por tratamento — Relatório do dia</h1>
      <p>GELF Apometria Campinas{registro ? ` • Dia ${dataBR(registro.data)}` : ""} • gerado em {geradoEm}</p>
    </div>
    <div class="rel-acoes sem-impressao">
      <button class="rel-botao" onclick={() => window.print()} disabled={!registro}>Salvar em PDF / Imprimir</button>
      <a class="rel-link" href="/recepcao">Voltar à recepção</a>
    </div>
  </header>

  {#if !estado}
    <p class="rel-aviso">Conectando ao servidor…</p>
  {:else if !registro}
    <p class="rel-aviso">
      O atendimento está fechado, e ao fechar os nomes são apagados. Abra o atendimento na recepção para registrar os pacientes e gerar este relatório.
    </p>
    {#if ultimo}
      <section>
        <h2>Resumo do último fechamento ({dataBR(ultimo.data)}) — só números, sem nomes</h2>
        {@render tabela(ultimo)}
      </section>
    {/if}
  {:else}
    <p class="rel-dica sem-impressao">
      Para guardar em <strong>PDF</strong>: toque em <strong>Salvar em PDF / Imprimir</strong> e, na janela que abrir, escolha
      <strong>Salvar como PDF</strong> como destino. Faça isso <strong>antes de fechar o atendimento</strong>, pois os nomes são apagados no fechamento.
    </p>

    <section>
      <h2>Resumo geral</h2>
      {@render tabela(resumo)}
    </section>

    <section>
      <h2>Registro dos atendimentos por paciente</h2>
      {#if registro.pacientes.length === 0}
        <p class="rel-aviso">Nenhum paciente cadastrado ainda.</p>
      {:else}
        <table class="rel-tabela rel-registro">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Tratamento</th>
              <th>Chegada</th>
              <th>Chamado</th>
              <th>Sala</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Espera</th>
              <th>Duração</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {#each registro.pacientes as p (p.id)}
              <tr>
                <td class="rel-quem">
                  <strong>{nomeCompleto(p)}</strong>{#if p.prioridade}{" "}<span class="rel-selo">★ prioritário</span>{/if}
                  {#if p.chamadas > 1}<small>Chamado {p.chamadas} vezes</small>{/if}
                </td>
                <td>{p.tratamentoNome}</td>
                <td>{hora(p.chegada)}</td>
                <td>{hora(p.chamado)}</td>
                <td>{p.sala ?? "—"}</td>
                <td>{hora(p.iniciado)}</td>
                <td>{p.situacao === "concluido" || p.situacao === "nao_compareceu" ? hora(p.concluido) : "—"}</td>
                <td>{min(p.esperaMin)}</td>
                <td>{min(p.duracaoMin)}</td>
                <td>{SITUACAO[p.situacao] ?? p.situacao}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>

    <p class="rel-rodape">Documento com dados de pacientes (LGPD): guarde com cuidado.</p>
  {/if}
</div>
