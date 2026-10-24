<script>
  // Barra de progresso por etapas do dia de um paciente: uma bolinha por etapa da rota.
  let { p, etapas = [] } = $props();

  const ROTULO = { feita: "concluída", atendendo: "em atendimento", chamado: "chamado", espera: "aguardando", pendente: "a fazer" };

  const passos = $derived.by(() => {
    const lista = p.rota.map((id, i) => {
      const e = etapas.find((x) => x.id === id);
      let estado = "pendente";
      if (p.situacao === "concluido" || i < p.posicao) estado = "feita";
      else if (i === p.posicao) estado = p.situacao === "em_atendimento" ? "atendendo" : p.situacao === "chamado" ? "chamado" : "espera";
      return { id, nome: e?.nome ?? id, cor: e?.cor ?? "#1e40af", estado, ligada: false };
    });
    lista.forEach((x, i) => (x.ligada = i > 0 && lista[i - 1].estado === "feita"));
    return lista;
  });
</script>

<ol class="prog" aria-label="Etapas do atendimento de hoje">
  {#each passos as x, i (x.id)}
    <li class="prog-passo" class:ligada={x.ligada} data-estado={x.estado} style:--cor={x.cor} title="{x.nome}: {ROTULO[x.estado]}">
      <span class="prog-bolinha">{x.estado === "feita" ? "✓" : i + 1}</span>
      <span class="prog-nome">{x.nome}</span>
    </li>
  {/each}
</ol>
