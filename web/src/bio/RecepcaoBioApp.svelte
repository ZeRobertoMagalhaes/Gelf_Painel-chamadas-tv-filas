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

  let nome = $state("");
  let sobrenome = $state("");
  let duplicado = $state(null);
  let aviso = $state({ texto: "", erro: false });
  let campoNome = $state();
  let editando = $state(null); // { id, modo: "corrigir" | "remover", nome, sobrenome }
  let timerAviso;

  const config = $derived(rede.config);
  const estado = $derived(rede.estado);
  const aberto = $derived(estado?.diaAberto ?? false);
  const pacientes = $derived(estado?.pacientes ?? []);
  const etapa = (id) => config?.etapas.find((e) => e.id === id);
  const local = (id) => config?.locais.find((l) => l.id === id)?.nome ?? "";
  // Orientação ao paciente logo após o cadastro: onde aguardar o início dos tratamentos.
  const localInicial = $derived(local(etapa(config?.rotaPadrao?.[0])?.esperaEm));
  const primeiraEtapa = $derived(etapa(config?.rotaPadrao?.[0]));
  // Mesma ordem da fila do controle: prioritários primeiro, depois a ordem de chegada.
  const aguardandoInicio = $derived(
    pacientes.filter((p) => p.situacao === "aguardando" && p.rota[p.posicao] === primeiraEtapa?.id && p.posicao === 0)
      .sort((a, b) => (!!a.prioridade === !!b.prioridade ? (a.prioridade ? a.prioridadeEm - b.prioridadeEm : a.ordemEspera - b.ordemEspera) : a.prioridade ? -1 : 1)),
  );
  const noFluxo = $derived(pacientes.filter((p) => !aguardandoInicio.includes(p)));
  const faltamChegar = $derived((estado?.preinscritos ?? []).filter((i) => !i.pacienteId));

  onMount(() => conectar("/bio"));

  function mostrar(texto, erro = false) {
    aviso = { texto, erro };
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => (aviso = { texto: "", erro: false }), erro ? 6000 : 8000);
  }

  async function acao(tipo, payload, sucesso) {
    const r = await agir(tipo, payload);
    if (!r.ok) mostrar(r.mensagem, true);
    else if (sucesso) mostrar(sucesso);
    return r;
  }

  const priorizar = (p) => acao("priorizar", { id: p.id, prioridade: !p.prioridade });
  const orientacao = (p) => `${p.nome} ${p.sobrenome} cadastrado(a). Orientar: aguardar na ${localInicial}.`;

  async function cadastrar(confirmarDuplicado = false) {
    const r = await agir("registrarChegada", { nome, sobrenome, confirmarDuplicado });
    if (r.ok) {
      mostrar(orientacao(r.paciente));
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
    cadastrar(false);
  }

  async function cadastrarPre(i) {
    const r = await agir("registrarChegada", { preinscritoId: i.id });
    if (r.ok) mostrar(orientacao(r.paciente));
    else mostrar(r.mensagem, true);
  }

  async function salvarCorrecao() {
    const r = await acao("corrigir", { id: editando.id, nome: editando.nome, sobrenome: editando.sobrenome });
    if (r.ok) editando = null;
  }
  async function confirmarRemocao() {
    const r = await acao("remover", { id: editando.id });
    if (r.ok) editando = null;
  }
  const situacaoDe = (p) => `${ROTULO_SITUACAO[p.situacao]}${etapa(p.rota[p.posicao]) && ["aguardando", "chamado", "em_atendimento"].includes(p.situacao) ? ` • ${etapa(p.rota[p.posicao]).nome}` : ""}`;
</script>

<ConnStatus online={rede.online} />
<HeroHeader tagline="Cura Mediúnica — Recepção" subtitle="Cadastro dos pacientes dos tratamentos bioenergéticos" />

<div class="app-body">
  <aside class="operator-panel">
    <h2>Novo paciente</h2>

    {#if config}
      <form class="form-recepcao" onsubmit={aoEnviar}>
        <div class="form-group">
          <label for="rnome">Nome</label>
          <input id="rnome" bind:this={campoNome} bind:value={nome} maxlength="40" autocomplete="off" required />
        </div>
        <div class="form-group">
          <label for="rsobrenome">Sobrenome</label>
          <input id="rsobrenome" bind:value={sobrenome} maxlength="60" autocomplete="off" required />
        </div>

        {#if duplicado}
          <div class="alerta-duplicado" role="alert">
            <strong>Já existe um paciente com este nome no fluxo</strong>
            <span>{duplicado.situacoes.map((d) => ROTULO_SITUACAO[d.situacao].toLowerCase()).join(", ")}.</span>
            <div class="alerta-acoes">
              <button type="button" class="btn-mini ouro" onclick={() => cadastrar(true)}>Cadastrar mesmo assim</button>
              <button type="button" class="btn-mini" onclick={() => { duplicado = null; nome = ""; sobrenome = ""; campoNome?.focus(); }}>Cancelar</button>
            </div>
          </div>
        {/if}

        <button type="submit" class="btn-call" disabled={!aberto}>Cadastrar</button>
        <div class="send-feedback" class:show={aviso.texto} class:erro={aviso.erro} role="status">{aviso.texto}</div>
      </form>
    {/if}

    {#if aberto && faltamChegar.length > 0}
      <div class="pre-lista">
        <h3>Pré-inscritos ({faltamChegar.length})</h3>
        {#each faltamChegar as i (i.id)}
          <button class="pre-item" onclick={() => cadastrarPre(i)} title={i.descricao}>
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
      {#if estado && !aberto}
        <p class="estado-dica">O responsável pelo controle abre o dia em <strong>/bio/controle</strong>.</p>
      {/if}
    </div>

    <div class="panel-footer">GELF Apometria Campinas</div>
  </aside>

  <section class="filas-painel">
    {#if !config || !estado}
      <p class="fila-vazia">Conectando ao servidor…</p>
    {:else}
      <div class="orientacao-recepcao">
        Após o cadastro, oriente o paciente a aguardar na <strong>{localInicial}</strong> até ser chamado.
      </div>

      <h3 class="etapa-titulo">Aguardando o início dos tratamentos <small>({aguardandoInicio.length})</small></h3>
      <div class="filas-grade">
        {#each aguardandoInicio as p, i (p.id)}
          <div class="cartao-paciente" class:prioridade={p.prioridade}>
            {#if editando?.id === p.id && editando.modo === "corrigir"}
              <div class="cartao-edicao">
                <input bind:value={editando.nome} maxlength="40" aria-label="Nome" />
                <input bind:value={editando.sobrenome} maxlength="60" aria-label="Sobrenome" />
                <div class="alerta-acoes">
                  <button class="btn-mini ouro" onclick={salvarCorrecao}>Salvar</button>
                  <button class="btn-mini" onclick={() => (editando = null)}>Cancelar</button>
                </div>
              </div>
            {:else if editando?.id === p.id && editando.modo === "remover"}
              <div class="cartao-nome">{p.nomeExibicao}</div>
              <div class="alerta-acoes">
                <button class="btn-mini perigo" onclick={confirmarRemocao}>Remover</button>
                <button class="btn-mini" onclick={() => (editando = null)}>Não</button>
              </div>
            {:else}
              <div class="cartao-linha">
                <span class="cartao-pos">{i + 1}</span>
                <div class="cartao-info">
                  <div class="cartao-nome">{p.nomeExibicao}</div>
                  <div class="cartao-meta">chegou {horaCurta(p.chegada)}{p.descricao ? ` • ${p.descricao}` : ""}{#if p.prioridade} • <strong>prioridade</strong>{/if}</div>
                </div>
              </div>
              <div class="cartao-acoes">
                <button class="icone" class:ligado={p.prioridade} title="Prioridade" aria-label="Prioridade" aria-pressed={p.prioridade} onclick={() => priorizar(p)}>★</button>
                <button class="icone" title="Corrigir nome" aria-label="Corrigir nome" onclick={() => (editando = { id: p.id, modo: "corrigir", nome: p.nome, sobrenome: p.sobrenome })}>✎</button>
                <button class="icone perigo" title="Remover do fluxo" aria-label="Remover do fluxo" onclick={() => (editando = { id: p.id, modo: "remover" })}>✕</button>
              </div>
            {/if}
          </div>
        {:else}
          <p class="fila-vazia">Ninguém aguardando</p>
        {/each}
      </div>

      {#if noFluxo.length > 0}
        <h3 class="etapa-titulo">Já em atendimento ou encerrados <small>({noFluxo.length})</small></h3>
        <div class="filas-grade">
          {#each noFluxo as p (p.id)}
            <div class="cartao-paciente finalizado" class:faltou={p.situacao === "nao_compareceu"}>
              <div class="cartao-nome">{p.nomeExibicao}</div>
              <div class="cartao-meta">{situacaoDe(p)}</div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </section>
</div>

<style>
  .orientacao-recepcao {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    color: #78350f;
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 8px;
  }
</style>
