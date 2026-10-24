<script>
  import { onMount } from "svelte";
  import { rede, conectar } from "../lib/conexao.svelte.js";
  import { horaCurta } from "../lib/util.js";

  const estado = $derived(rede.estado);
  const config = $derived(rede.config);
  const registro = $derived(estado?.registro);
  const resumo = $derived(registro?.resumo);

  const RESULTADO = {
    concluida: "Concluída",
    nao_compareceu: "Não compareceu",
    pulada: "Etapa pulada",
    em_atendimento: "Em atendimento",
    chamado: "Chamado",
    aguardando: "Aguardando",
  };
  const SITUACAO = { aguardando: "Aguardando", chamado: "Chamado", em_atendimento: "Em atendimento", concluido: "Fluxo concluído", nao_compareceu: "Não compareceu" };
  const PRONTUARIO = { recebido: "Com o paciente (não guardado)", guardado: "Guardado" };

  const dataBR = (d) => (d ? d.split("-").reverse().join("/") : "");
  const min = (v) => (v === null || v === undefined ? "—" : `${v} min`);
  const hora = (iso) => horaCurta(iso) || "—";
  const geradoEm = new Date().toLocaleString("pt-BR");
  const nomeCompleto = (p) => `${p.nome} ${p.sobrenome}`;
  const localPrioridade = $derived(config?.locais.find((l) => l.id === config?.prioridade?.localEspera)?.nome ?? "");

  onMount(() => conectar("/bio"));
</script>

<div class="rel">
  <header class="rel-topo">
    <div>
      <h1>Cura Mediúnica — Relatório do atendimento</h1>
      <p>GELF Apometria Campinas{registro ? ` • Dia ${dataBR(registro.data)}` : ""} • gerado em {geradoEm}</p>
    </div>
    <div class="rel-acoes sem-impressao">
      <button class="rel-botao" onclick={() => window.print()} disabled={!registro}>Salvar em PDF / Imprimir</button>
      <a class="rel-link" href="/bio/controle">Voltar ao controle</a>
    </div>
  </header>

  {#if !estado}
    <p class="rel-aviso">Conectando ao servidor…</p>
  {:else if !registro}
    <p class="rel-aviso">
      O dia está fechado, e ao fechar o dia os nomes são apagados. Abra o dia no controle para registrar os atendimentos e gerar este relatório.
    </p>
  {:else}
    <p class="rel-dica sem-impressao">
      Para guardar em <strong>PDF</strong>: toque em <strong>Salvar em PDF / Imprimir</strong> e, na janela que abrir, escolha
      <strong>Salvar como PDF</strong> como destino. Faça isso <strong>antes de fechar o dia</strong>, pois os nomes são apagados no fechamento.
    </p>

    <section>
      <h2>Resumo geral</h2>
      <div class="rel-totais">
        <div><strong>{resumo.chegadas}</strong><span>pacientes atendidos no dia</span></div>
        <div><strong>{resumo.concluidos}</strong><span>fluxos concluídos</span></div>
        <div><strong>{resumo.emAndamento}</strong><span>em andamento</span></div>
        <div><strong>{resumo.naoCompareceram}</strong><span>não compareceram</span></div>
        <div><strong>{resumo.prioritarios}</strong><span>prioritários</span></div>
        <div><strong>{min(resumo.tempoMedioTotalMin)}</strong><span>tempo médio total</span></div>
      </div>
      <table class="rel-tabela">
        <thead>
          <tr><th>Etapa</th><th>Atendidos</th><th>Espera média</th><th>Duração média</th><th>Aguardando agora</th></tr>
        </thead>
        <tbody>
          {#each resumo.etapas as e (e.id)}
            <tr><td>{e.nome}</td><td>{e.atendidos}</td><td>{min(e.esperaMediaMin)}</td><td>{min(e.duracaoMediaMin)}</td><td>{e.aguardandoAgora}</td></tr>
          {/each}
        </tbody>
      </table>
      {#if config?.prioridade?.aviso}
        <p class="rel-nota">★ {config.prioridade.aviso}</p>
      {/if}
    </section>

    <section>
      <h2>Registro dos atendimentos por paciente</h2>
      {#if registro.pacientes.length === 0}
        <p class="rel-aviso">Nenhum paciente registrado ainda.</p>
      {:else}
        <table class="rel-tabela rel-registro">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Etapa</th>
              <th>Sala</th>
              <th>Entrou na espera</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Duração</th>
              <th>Situação da etapa</th>
            </tr>
          </thead>
          {#each registro.pacientes as p (p.id)}
            <tbody class="rel-paciente">
              {#each p.passos as x, i}
                <tr>
                  {#if i === 0}
                    <td class="rel-quem" rowspan={p.passos.length}>
                      <strong>{nomeCompleto(p)}</strong>{#if p.prioridade}{" "}<span class="rel-selo">★ prioritário</span>{/if}
                      <small>Chegada {hora(p.chegada)} • {SITUACAO[p.situacao] ?? p.situacao}{#if p.concluido} às {hora(p.concluido)}{/if}</small>
                      {#if p.tempoTotalMin !== null}<small>Tempo total: {p.tempoTotalMin} min</small>{/if}
                      {#if p.prontuario}<small>Prontuário: {PRONTUARIO[p.prontuario]}</small>{/if}
                      {#if p.salaDestino}<small>Sala informada: {p.salaDestino}</small>{/if}
                      {#if p.descricao}<small>{p.descricao}</small>{/if}
                    </td>
                  {/if}
                  <td>{x.nome}</td>
                  <td>{x.sala ?? "—"}{#if x.local}<small class="rel-local">{x.local}</small>{/if}</td>
                  <td>{hora(x.entrouEspera)}</td>
                  <td>{hora(x.inicio)}</td>
                  <td>{hora(x.fim)}</td>
                  <td>{min(x.duracaoMin)}</td>
                  <td>{RESULTADO[x.resultado] ?? x.resultado}</td>
                </tr>
              {:else}
                <tr>
                  <td class="rel-quem">
                    <strong>{nomeCompleto(p)}</strong>{#if p.prioridade}{" "}<span class="rel-selo">★ prioritário</span>{/if}
                    <small>Chegada {hora(p.chegada)}</small>
                  </td>
                  <td colspan="7">Ainda não entrou em nenhuma etapa.</td>
                </tr>
              {/each}
            </tbody>
          {/each}
        </table>
      {/if}
    </section>

    <p class="rel-rodape">
      Documento com dados de pacientes (LGPD): guarde com cuidado. Local de espera dos prioritários: {localPrioridade || "—"}.
    </p>
  {/if}
</div>
