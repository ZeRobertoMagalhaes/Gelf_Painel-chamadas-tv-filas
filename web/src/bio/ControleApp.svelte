<script>
  import { onMount } from "svelte";
  import { rede, conectar, agir } from "../lib/conexao.svelte.js";
  import { horaCurta } from "../lib/util.js";
  import HeroHeader from "../lib/HeroHeader.svelte";
  import ConnStatus from "../lib/ConnStatus.svelte";

  const ROTULO_SITUACAO = {
    aguardando: "Aguardando",
    chamado: "Chamado",
    em_atendimento: "Em atendimento",
    concluido: "Concluído",
    nao_compareceu: "Não compareceu",
  };
  const ROTULO_MOV = {
    chegada: "Chegou",
    aguardando: "Entrou na espera",
    nome_corrigido: "Nome corrigido",
    chamado: "Chamado",
    rechamado: "Chamado novamente",
    atendimento_iniciado: "Atendimento iniciado",
    etapa_concluida: "Etapa concluída",
    etapa_pulada: "Etapa pulada",
    rota_alterada: "Rota alterada",
    devolvido_espera: "Voltou para a espera",
    nao_compareceu: "Não compareceu",
    concluido: "Fluxo concluído",
    removido: "Removido do fluxo",
  };

  let nome = $state("");
  let sobrenome = $state("");
  let duplicado = $state(null);
  let aviso = $state({ texto: "", erro: false });
  let confirmandoFechar = $state(false);
  let campoNome = $state();
  let timerAviso;
  let ajustesDia = $state({}); // salaId -> { ativa, capacidade } na abertura
  let textoPre = $state("");
  let editRota = $state(null); // { id, lista }
  let historicoAberto = $state(new Set());
  let verRelatorio = $state(false);

  const config = $derived(rede.config);
  const estado = $derived(rede.estado);
  const aberto = $derived(estado?.diaAberto ?? false);
  const pacientes = $derived(estado?.pacientes ?? []);
  const porId = $derived(new Map(pacientes.map((p) => [p.id, p])));
  const etapa = (id) => config?.etapas.find((e) => e.id === id);
  const local = (id) => config?.locais.find((l) => l.id === id)?.nome ?? "";
  const faltamChegar = $derived((estado?.preinscritos ?? []).filter((i) => !i.pacienteId));
  const esperaDe = (id) => (estado?.espera?.[id] ?? []).map((x) => porId.get(x)).filter(Boolean);
  const salasDe = (id) => (estado?.salas ?? []).filter((s) => s.etapa === id);
  const naSala = (s) => pacientes.filter((p) => p.salaId === s.id && ["chamado", "em_atendimento"].includes(p.situacao));
  const finalizados = $derived(
    pacientes.filter((p) => ["concluido", "nao_compareceu"].includes(p.situacao)).sort((a, b) => (b.concluido ?? "").localeCompare(a.concluido ?? "")),
  );
  const faltaDaRota = (p) => p.rota.slice(p.posicao + (p.situacao === "aguardando" ? 0 : 1)).map((id) => etapa(id)?.nome ?? id);

  onMount(() => conectar("/bio"));

  $effect(() => {
    if (!config) return;
    for (const s of config.etapas.flatMap((e) => e.salas)) {
      if (!ajustesDia[s.id]) ajustesDia[s.id] = { ativa: true, capacidade: s.capacidade };
    }
  });

  function mostrar(texto, erro = false) {
    aviso = { texto, erro };
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => (aviso = { texto: "", erro: false }), erro ? 6000 : 3000);
  }

  async function acao(tipo, payload, sucesso) {
    const r = await agir(tipo, payload);
    if (!r.ok) mostrar(r.mensagem, true);
    else if (sucesso) mostrar(sucesso);
    return r;
  }

  async function registrarChegada(confirmarDuplicado = false) {
    const r = await agir("registrarChegada", { nome, sobrenome, confirmarDuplicado });
    if (r.ok) {
      mostrar(`${r.paciente.nome} ${r.paciente.sobrenome}: chegada registrada.`);
      nome = "";
      sobrenome = "";
      duplicado = null;
      campoNome?.focus();
    } else if (r.codigo === "duplicado") duplicado = r.detalhe;
    else mostrar(r.mensagem, true);
  }

  function aoEnviar(e) {
    e.preventDefault();
    duplicado = null;
    registrarChegada(false);
  }

  const chegouPre = (i) => acao("registrarChegada", { preinscritoId: i.id }, `${i.nome} ${i.sobrenome}: chegada registrada.`);
  const chamar = (p, s) => acao("chamar", { pacienteId: p.id, salaId: s.id });
  const chamarProximo = (s) => acao("chamarProximo", { salaId: s.id });
  const rechamar = (p) => acao("rechamar", { id: p.id }, "Chamada repetida na TV");
  const iniciar = (p) => acao("iniciar", { id: p.id });
  const concluir = (p) => acao("concluir", { id: p.id });
  const faltou = (p) => acao("naoCompareceu", { id: p.id });
  const devolver = (p) => acao("devolverEspera", { id: p.id });
  const pular = (p) => acao("pularEtapa", { id: p.id });
  const remover = (p) => acao("remover", { id: p.id });
  const liberar = (s) => acao("liberarSala", { salaId: s.id });
  const capacidade = (s, delta) => acao("ajustarSala", { salaId: s.id, capacidade: s.capacidade + delta });
  const alternarSala = (s) => acao("ajustarSala", { salaId: s.id, ativa: !s.ativa });

  function abrirRota(p) {
    editRota = { id: p.id, lista: p.rota.slice(p.posicao + (p.situacao === "aguardando" ? 0 : 1)) };
  }
  function marcarEtapa(id) {
    const l = editRota.lista;
    editRota.lista = l.includes(id) ? l.filter((x) => x !== id) : [...l, id];
  }
  async function salvarRota() {
    const r = await acao("definirRota", { id: editRota.id, rota: editRota.lista });
    if (r.ok) editRota = null;
  }

  // Só lê: gravar estado durante o desenho da tela quebra o Svelte (state_unsafe_mutation).
  // Os padrões são preenchidos em $effect assim que a configuração chega.
  function ajusteDe(s) {
    return ajustesDia[s.id] ?? { ativa: true, capacidade: s.capacidade };
  }
  async function abrirDia() {
    const salas = config.etapas.flatMap((e) => e.salas).map((s) => ({ id: s.id, ...ajusteDe(s) }));
    const r = await acao("abrirDia", { salas });
    if (r.ok && textoPre.trim()) {
      const i = await acao("importarPreinscritos", { texto: textoPre });
      if (i.ok) mostrar(`${i.importados} pré-inscrito(s) importado(s).`);
      textoPre = "";
    }
  }
  async function fecharDia() {
    if (!confirmandoFechar) return (confirmandoFechar = true);
    confirmandoFechar = false;
    const r = await acao("fecharDia", {});
    if (r.ok) mostrar("Dia fechado. Nomes apagados; o relatório ficou salvo.");
  }

  function alternarHistorico(id) {
    const novo = new Set(historicoAberto);
    novo.has(id) ? novo.delete(id) : novo.add(id);
    historicoAberto = novo;
  }
  function descMov(m) {
    const base = ROTULO_MOV[m.acao] ?? m.acao;
    if (m.acao === "rota_alterada") return `${base}: ${m.rota.map((id) => etapa(id)?.nome).join(" › ") || "fim"}`;
    const onde = m.sala ?? (m.etapa ? etapa(m.etapa)?.nome : null);
    return onde ? `${base} • ${onde}` : base;
  }
  const min = (v) => (v === null || v === undefined ? "—" : `${v} min`);
</script>

{#snippet historico(p)}
  <button class="link-hist" aria-expanded={historicoAberto.has(p.id)} onclick={() => alternarHistorico(p.id)}>
    {historicoAberto.has(p.id) ? "Ocultar histórico" : "Ver histórico"}
  </button>
  {#if historicoAberto.has(p.id)}
    <ol class="hist-lista" aria-label="Histórico do paciente">
      {#each p.movimentos ?? [] as m}
        <li><span class="hist-hora">{horaCurta(m.em)}</span><span>{descMov(m)}</span></li>
      {/each}
    </ol>
  {/if}
{/snippet}

{#snippet tabela(rel)}
  <div class="relatorio">
    <p class="relatorio-resumo">
      <strong>{rel.chegadas}</strong> chegadas • <strong>{rel.concluidos}</strong> concluídos •
      <strong>{rel.naoCompareceram}</strong> não compareceram • <strong>{rel.emAndamento}</strong> em andamento •
      tempo médio total: <strong>{min(rel.tempoMedioTotalMin)}</strong>
    </p>
    <table>
      <thead><tr><th>Etapa</th><th>Atendidos</th><th>Espera média</th><th>Duração média</th><th>Aguardando</th></tr></thead>
      <tbody>
        {#each rel.etapas as e (e.id)}
          <tr><td>{e.nome}</td><td>{e.atendidos}</td><td>{min(e.esperaMediaMin)}</td><td>{min(e.duracaoMediaMin)}</td><td>{e.aguardandoAgora}</td></tr>
        {/each}
      </tbody>
    </table>
    <p class="relatorio-nota">Só números: nenhum nome fica guardado depois do fechamento do dia.</p>
  </div>
{/snippet}

<ConnStatus online={rede.online} />
<HeroHeader tagline="Cura Mediúnica — Controle" subtitle="Acompanhe a rota de cada paciente, da chegada à saída" />

<div class="app-body">
  <aside class="operator-panel">
    <h2>Chegada</h2>

    {#if config}
      <form class="form-recepcao" onsubmit={aoEnviar}>
        <div class="form-group">
          <label for="bnome">Nome</label>
          <input id="bnome" bind:this={campoNome} bind:value={nome} maxlength="40" autocomplete="off" required />
        </div>
        <div class="form-group">
          <label for="bsobrenome">Sobrenome</label>
          <input id="bsobrenome" bind:value={sobrenome} maxlength="60" autocomplete="off" required />
        </div>

        {#if duplicado}
          <div class="alerta-duplicado" role="alert">
            <strong>Já existe um paciente com este nome no fluxo</strong>
            <span>{duplicado.situacoes.map((d) => ROTULO_SITUACAO[d.situacao].toLowerCase()).join(", ")}.</span>
            <div class="alerta-acoes">
              <button type="button" class="btn-mini ouro" onclick={() => registrarChegada(true)}>Registrar mesmo assim</button>
              <button type="button" class="btn-mini" onclick={() => { duplicado = null; nome = ""; sobrenome = ""; campoNome?.focus(); }}>Cancelar</button>
            </div>
          </div>
        {/if}

        <button type="submit" class="btn-call" disabled={!aberto}>Registrar chegada</button>
        <div class="send-feedback" class:show={aviso.texto} class:erro={aviso.erro} role="status">{aviso.texto}</div>
      </form>
    {/if}

    {#if aberto && faltamChegar.length > 0}
      <div class="pre-lista">
        <h3>Pré-inscritos ({faltamChegar.length})</h3>
        {#each faltamChegar as i (i.id)}
          <button class="pre-item" onclick={() => chegouPre(i)} title={i.descricao}>
            <strong>{i.nome} {i.sobrenome}</strong>
            <small>{i.dia}{i.descricao ? ` • ${i.descricao}` : ""}</small>
          </button>
        {/each}
      </div>
    {/if}

    <div class="estado-atendimento" class:aberto>
      <div class="estado-texto">
        <span class="estado-ponto"></span>
        {estado ? (aberto ? "Dia aberto" : "Dia fechado") : "Conectando…"}
      </div>
      {#if estado && aberto}
        <button class="btn-mini perigo" onclick={fecharDia}>{confirmandoFechar ? "Confirmar: apagar tudo" : "Fechar o dia"}</button>
      {/if}
      {#if confirmandoFechar}
        <p class="estado-dica">
          Fechar apaga pacientes e pré-inscritos; só o relatório (sem nomes) fica salvo.
          <button class="link-claro" onclick={() => (confirmandoFechar = false)}>Cancelar</button>
        </p>
      {/if}
    </div>

    <div class="panel-footer">GELF Apometria Campinas</div>
  </aside>

  <section class="filas-painel">
    {#if !config || !estado}
      <p class="fila-vazia">Conectando ao servidor…</p>
    {:else if !aberto}
      <div class="abertura">
        <h2>Abertura dos trabalhos</h2>
        <p class="abertura-dica">Confirme as salas que funcionam hoje e a capacidade de cada uma (ex.: macas do reiki).</p>
        {#each config.etapas as e (e.id)}
          <div class="etapa-abertura" style:--cor={e.cor}>
            <strong>{e.nome}</strong> <small>espera: {local(e.esperaEm)}</small>
            {#each e.salas as s (s.id)}
              {@const aj = ajusteDe(s)}
              <div class="sala-linha">
                <label><input type="checkbox" bind:checked={aj.ativa} /> {s.nome}</label>
                <label class="cap">capacidade <input type="number" min="1" max="20" bind:value={aj.capacidade} disabled={!aj.ativa} /></label>
              </div>
            {/each}
          </div>
        {/each}
        <label for="pre" class="abertura-rotulo">Pré-inscritos (opcional): um por linha — Nome Sobrenome ; dia ; descrição</label>
        <textarea id="pre" rows="5" bind:value={textoPre} placeholder="Maria Souza ; 10/10 ; dor nas costas"></textarea>
        <button class="btn-call" onclick={abrirDia}>Abrir o dia</button>
        <div class="send-feedback" class:show={aviso.texto} class:erro={aviso.erro} role="status">{aviso.texto}</div>

        {#if estado.relatorio}
          <h3 class="etapa-titulo">Relatório do último dia fechado ({estado.relatorio.data})</h3>
          {@render tabela(estado.relatorio)}
        {/if}
      </div>
    {:else}
      <div class="filas-grade etapas-grade">
        {#each config.etapas as e (e.id)}
          {@const espera = esperaDe(e.id)}
          {@const salas = salasDe(e.id)}
          <article class="fila-coluna" style:--cor={e.cor}>
            <header class="fila-cabeca">
              <span class="fila-titulo">{e.nome}</span>
              <span class="fila-total" title="Aguardando">{espera.length}</span>
            </header>
            <div class="cartao-meta">Espera: {local(e.esperaEm)}</div>

            {#each salas as s (s.id)}
              <div class="sala-box" class:inativa={!s.ativa}>
                <div class="sala-topo">
                  <strong>{s.nome}</strong>
                  <span class="vagas-chip" class:cheia={s.vagas === 0}>{s.ativa ? `${s.vagas}/${s.capacidade} vagas` : "fora de uso"}</span>
                </div>
                {#each naSala(s) as p (p.id)}
                  <div class="cartao-paciente em-curso">
                    <div class="cartao-nome">{p.nomeExibicao}</div>
                    <div class="cartao-meta">{ROTULO_SITUACAO[p.situacao]}{faltaDaRota(p).length ? ` • depois: ${faltaDaRota(p).join(" › ")}` : ""}</div>
                    <div class="alerta-acoes">
                      {#if p.situacao === "chamado"}
                        <button class="btn-mini ouro" onclick={() => iniciar(p)}>Iniciar</button>
                        <button class="btn-mini" onclick={() => rechamar(p)}>Chamar novamente</button>
                        <button class="btn-mini" onclick={() => devolver(p)}>Voltar à espera</button>
                        <button class="btn-mini perigo" onclick={() => faltou(p)}>Não compareceu</button>
                      {:else}
                        <button class="btn-mini ouro" onclick={() => concluir(p)}>Concluir etapa</button>
                      {/if}
                    </div>
                    {@render historico(p)}
                  </div>
                {/each}
                {#if s.emPreparo > 0}
                  <div class="preparo">
                    <span>Em preparo ({s.emPreparo})</span>
                    <button class="btn-mini ouro" onclick={() => liberar(s)}>Sala pronta</button>
                  </div>
                {/if}
                <div class="sala-acoes">
                  <button class="btn-mini ouro" disabled={!s.ativa || s.vagas === 0 || espera.length === 0} onclick={() => chamarProximo(s)}>Chamar próximo</button>
                  <button class="icone" title="Menos uma vaga" aria-label="Menos uma vaga" disabled={s.capacidade <= 1} onclick={() => capacidade(s, -1)}>−</button>
                  <button class="icone" title="Mais uma vaga" aria-label="Mais uma vaga" disabled={s.capacidade >= 20} onclick={() => capacidade(s, 1)}>+</button>
                  <button class="icone" title={s.ativa ? "Tirar de uso" : "Pôr em uso"} aria-label="Alternar uso da sala" onclick={() => alternarSala(s)}>{s.ativa ? "⏻" : "▶"}</button>
                </div>
              </div>
            {/each}

            <h4 class="espera-titulo">Aguardando</h4>
            {#each espera as p, i (p.id)}
              <div class="cartao-paciente">
                <div class="cartao-linha">
                  <span class="cartao-pos">{i + 1}</span>
                  <div class="cartao-info">
                    <div class="cartao-nome">{p.nomeExibicao}</div>
                    <div class="cartao-meta">chegou {horaCurta(p.chegada)}{p.descricao ? ` • ${p.descricao}` : ""}</div>
                    {#if faltaDaRota(p).length > 1}<div class="cartao-meta">depois: {faltaDaRota(p).slice(1).join(" › ")}</div>{/if}
                  </div>
                </div>

                {#if editRota?.id === p.id}
                  <div class="rota-edicao">
                    <span class="cartao-meta">Etapas que faltam (ordem do toque):</span>
                    <div class="trocar-lista">
                      {#each config.etapas as x (x.id)}
                        {@const pos = editRota.lista.indexOf(x.id)}
                        <button class="chip-trat pequeno" class:ativo={pos >= 0} style:--cor={x.cor} onclick={() => marcarEtapa(x.id)}>{pos >= 0 ? `${pos + 1}. ` : ""}{x.nome}</button>
                      {/each}
                    </div>
                    <div class="alerta-acoes">
                      <button class="btn-mini ouro" onclick={salvarRota}>Salvar rota</button>
                      <button class="btn-mini" onclick={() => (editRota = null)}>Cancelar</button>
                    </div>
                  </div>
                {:else}
                  <div class="alerta-acoes">
                    {#each salas.filter((s) => s.ativa) as s (s.id)}
                      <button class="btn-mini ouro" disabled={s.vagas === 0} title={s.vagas === 0 ? "Sem vaga" : ""} onclick={() => chamar(p, s)}>→ {s.nome}</button>
                    {/each}
                  </div>
                  <div class="cartao-acoes">
                    <button class="icone" title="Alterar rota" aria-label="Alterar rota" onclick={() => abrirRota(p)}>⇄</button>
                    <button class="icone" title="Pular esta etapa" aria-label="Pular esta etapa" onclick={() => pular(p)}>⏭</button>
                    <button class="icone perigo" title="Remover do fluxo" aria-label="Remover do fluxo" onclick={() => remover(p)}>✕</button>
                  </div>
                {/if}
              </div>
            {:else}
              <p class="fila-vazia">Ninguém aguardando</p>
            {/each}
          </article>
        {/each}
      </div>

      {#if finalizados.length > 0}
        <h3 class="etapa-titulo">Finalizados hoje <small>({finalizados.length})</small></h3>
        <div class="filas-grade">
          {#each finalizados as p (p.id)}
            <div class="cartao-paciente finalizado" class:faltou={p.situacao === "nao_compareceu"}>
              <div class="cartao-nome">{p.nomeExibicao}</div>
              <div class="cartao-meta">{ROTULO_SITUACAO[p.situacao]} às {horaCurta(p.concluido)}</div>
              {#if p.situacao === "nao_compareceu"}
                <div class="alerta-acoes"><button class="btn-mini ouro" onclick={() => devolver(p)}>Voltar à espera</button></div>
              {/if}
              {@render historico(p)}
            </div>
          {/each}
        </div>
      {/if}

      <h3 class="etapa-titulo">
        Relatório do dia
        <button class="btn-mini" onclick={() => (verRelatorio = !verRelatorio)}>{verRelatorio ? "Ocultar" : "Mostrar"}</button>
      </h3>
      {#if verRelatorio && estado.relatorio}{@render tabela(estado.relatorio)}{/if}
    {/if}
  </section>
</div>
