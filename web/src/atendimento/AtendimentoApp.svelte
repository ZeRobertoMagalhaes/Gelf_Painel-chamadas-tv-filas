<script>
  import { onMount } from "svelte";
  import { rede, conectar, agir } from "../lib/conexao.svelte.js";
  import { tratamentoPorId, lembrar, idDoAparelho, SITUACAO } from "../lib/util.js";
  import HeroHeader from "../lib/HeroHeader.svelte";
  import ConnStatus from "../lib/ConnStatus.svelte";

  const equipeId = idDoAparelho();

  let meuTratamento = $state(lembrar("gelf.tratamento"));
  let sala = $state(lembrar("gelf.sala") ?? "");
  let aviso = $state({ texto: "", erro: false });
  let confirmandoFalta = $state(null);
  let ocupado = $state(false);
  let timerAviso;

  const config = $derived(rede.config);
  const estado = $derived(rede.estado);
  const trat = $derived(meuTratamento && config ? tratamentoPorId(config, meuTratamento) : null);
  const porId = $derived(new Map((estado?.pacientes ?? []).map((p) => [p.id, p])));
  const fila = $derived((estado?.filas?.[meuTratamento] ?? []).map((id) => porId.get(id)).filter(Boolean));
  // Todos os pacientes em andamento deste tratamento (não só os meus): se o
  // aparelho perdeu a identidade (dados do navegador apagados), qualquer um da
  // equipe ainda consegue concluir quem ficou preso.
  const emCurso = $derived(
    (estado?.pacientes ?? [])
      .filter((p) => p.tratamento === meuTratamento && ["chamado", "em_atendimento"].includes(p.situacao))
      .sort((a, b) => (b.chamadoPor === equipeId) - (a.chamadoPor === equipeId)),
  );
  const euAtendo = $derived(emCurso.some((p) => p.chamadoPor === equipeId));
  // Atalhos de sala: numeradas (1..N, tocar escolhe "Sala N") e as de nome próprio
  // da configuração (ex.: "Sala Reiki"). O campo continua livre.
  const salasRapidas = $derived([
    ...Array.from({ length: config?.salas.quantidade ?? 0 }, (_, i) => ({ valor: `${config.salas.prefixo} ${i + 1}`, rotulo: String(i + 1) })),
    ...(config?.salas.extras ?? []).map((nome) => ({ valor: nome, rotulo: nome, nomeada: true })),
  ]);
  // Pacientes aguardando em cada tratamento (visão geral para toda a equipe).
  const pendentes = $derived(
    (config?.tratamentos ?? []).map((t) => ({ ...t, total: estado?.filas?.[t.id]?.length ?? 0 })),
  );
  const fechado = $derived(estado && !estado.atendimentoAberto);

  onMount(() => conectar());

  function mostrar(texto, erro = false) {
    aviso = { texto, erro };
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => (aviso = { texto: "", erro: false }), erro ? 6000 : 3000);
  }

  function escolher(id) {
    meuTratamento = id;
    lembrar("gelf.tratamento", id);
  }

  function trocarTratamento() {
    meuTratamento = null;
    lembrar("gelf.tratamento", "");
  }

  async function executar(tipo, payload, sucesso) {
    if (ocupado) return;
    ocupado = true;
    const r = await agir(tipo, payload);
    ocupado = false;
    if (r.ok) {
      navigator.vibrate?.(40);
      if (sucesso) mostrar(sucesso);
    } else {
      mostrar(r.mensagem, true);
    }
    return r;
  }

  async function chamarProximo() {
    const valor = sala.trim();
    if (!valor) return mostrar("Informe a sala antes de chamar.", true);
    lembrar("gelf.sala", valor);
    const r = await executar("chamarProximo", { tratamento: meuTratamento, sala: valor, equipeId });
    if (r?.ok) mostrar(`Chamando ${r.chamada.nome} ${r.chamada.sobrenome}`);
  }

  const rechamar = (p) => executar("rechamar", { id: p.id }, "Chamada repetida na TV");
  const iniciar = (p) => executar("iniciar", { id: p.id }, "Atendimento iniciado");
  const concluir = (p) => executar("concluir", { id: p.id }, "Atendimento concluído");

  async function naoCompareceu(p) {
    if (confirmandoFalta !== p.id) {
      confirmandoFalta = p.id;
      return;
    }
    confirmandoFalta = null;
    await executar("naoCompareceu", { id: p.id }, "Marcado como não compareceu");
  }
</script>

<ConnStatus online={rede.online} />
<HeroHeader tagline="Atendimento" subtitle="Chame e acompanhe sua fila" />

<main class="atend">
  {#if !config || !estado}
    <p class="atend-vazio">Conectando ao servidor…</p>
  {:else if !trat}
    <h2 class="atend-titulo">Qual é o seu tratamento?</h2>
    <p class="atend-dica">Você escolhe uma vez; este aparelho vai lembrar.</p>
    <div class="trat-grade">
      {#each config.tratamentos as t (t.id)}
        <button class="trat-botao" style:background-color={t.cor} onclick={() => escolher(t.id)}>
          {t.nome}
          <span class="trat-contagem">{estado.filas?.[t.id]?.length ?? 0} aguardando</span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="atend-topo" style:border-color={trat.cor}>
      <span class="trat-pilula" style:background-color={trat.cor}>{trat.nome}</span>
      <span class="atend-contagem">{fila.length} aguardando</span>
      <button class="link-botao" onclick={trocarTratamento}>trocar</button>
    </div>

    <div class="resumo-filas" role="list" aria-label="Pacientes aguardando por tratamento">
      {#each pendentes as t (t.id)}
        <div class="resumo-item" role="listitem" class:meu={t.id === meuTratamento} class:vazio={t.total === 0} style:--cor={t.cor}>
          <span class="resumo-numero">{t.total}</span>
          <span class="resumo-nome">{t.nome}</span>
        </div>
      {/each}
    </div>

    {#if fechado}
      <div class="faixa-aviso">O atendimento está fechado. Peça à recepção para abrir.</div>
    {/if}

    {#each emCurso as p (p.id)}
      <section class="paciente-atual" class:meu={p.chamadoPor === equipeId} style:border-color={trat.cor}>
        <div class="situacao-chip">{SITUACAO[p.situacao]} • {p.sala}</div>
        <div class="paciente-nome">{p.nomeExibicao}</div>
        {#if p.situacao === "chamado"}
          <button class="btn-call btn-grande" disabled={ocupado} onclick={() => iniciar(p)}>Iniciar atendimento</button>
          <div class="acoes-secundarias">
            <button class="btn-contorno" disabled={ocupado} onclick={() => rechamar(p)}>Chamar novamente</button>
            <button class="btn-contorno perigo" disabled={ocupado} onclick={() => naoCompareceu(p)}>
              {confirmandoFalta === p.id ? "Confirmar: não compareceu" : "Não compareceu"}
            </button>
          </div>
        {:else}
          <button class="btn-call btn-grande" disabled={ocupado} onclick={() => concluir(p)}>Concluir atendimento</button>
        {/if}
      </section>
    {/each}

    {#if !euAtendo}
      <section class="bloco-chamar">
        <label for="sala">Sala / Maca</label>
        <input id="sala" bind:value={sala} placeholder="Ex: Sala 02 ou digite livremente" maxlength="40" autocomplete="off" />
        {#if salasRapidas.length > 0}
          <div class="room-quick-select">
            {#each salasRapidas as s (s.valor)}
              <button type="button" class="room-chip" class:nomeada={s.nomeada} class:active={sala === s.valor} onclick={() => (sala = s.valor)}>{s.rotulo}</button>
            {/each}
          </div>
          <div class="room-hint">Toque em uma sala ou digite livremente acima</div>
        {/if}
        <button class="btn-call btn-grande" disabled={ocupado || fechado || fila.length === 0} onclick={chamarProximo}>
          {fila.length ? `Chamar próximo: ${fila[0].nomeExibicao}` : "Fila vazia"}
        </button>
      </section>
    {/if}

    {#if fila.length > 0}
      <section class="fila-lista">
        <h3>Fila de espera</h3>
        {#each fila as p, i (p.id)}
          <div class="fila-item" style:border-left-color={trat.cor}>
            <span class="fila-pos">{i + 1}</span>
            <span class="fila-nome">{p.nomeExibicao}</span>
            {#if p.prioridade}<span class="selo-prioridade">Prioridade</span>{/if}
          </div>
        {/each}
      </section>
    {/if}
  {/if}
</main>

{#if aviso.texto}
  <div class="toast" class:erro={aviso.erro} role="status">{aviso.texto}</div>
{/if}
