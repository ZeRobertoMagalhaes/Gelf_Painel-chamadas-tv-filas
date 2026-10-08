<script>
  import { onMount } from "svelte";
  import { rede, conectar, agir } from "../lib/conexao.svelte.js";
  import { horaCurta, SITUACAO } from "../lib/util.js";
  import HeroHeader from "../lib/HeroHeader.svelte";
  import ConnStatus from "../lib/ConnStatus.svelte";

  let nome = $state("");
  let sobrenome = $state("");
  let tratamento = $state(null);
  let duplicado = $state(null); // { situacoes } quando o servidor avisa de nome repetido
  let aviso = $state({ texto: "", erro: false });
  let editando = $state(null); // { id, modo: "corrigir" | "trocar" | "remover", nome, sobrenome }
  let confirmandoFechar = $state(false);
  let campoNome = $state();
  let timerAviso;

  const config = $derived(rede.config);
  const estado = $derived(rede.estado);
  const aberto = $derived(estado?.atendimentoAberto ?? false);
  const porId = $derived(new Map((estado?.pacientes ?? []).map((p) => [p.id, p])));

  function colunas() {
    return (config?.tratamentos ?? []).map((t) => {
      const espera = (estado?.filas?.[t.id] ?? []).map((id) => porId.get(id)).filter(Boolean);
      const emCurso = (estado?.pacientes ?? []).filter((p) => p.tratamento === t.id && ["chamado", "em_atendimento"].includes(p.situacao));
      const concluidos = (estado?.pacientes ?? []).filter((p) => p.tratamento === t.id && p.situacao === "concluido").length;
      return { ...t, espera, emCurso, concluidos };
    });
  }
  const filas = $derived(colunas());

  onMount(() => conectar());

  function mostrar(texto, erro = false) {
    aviso = { texto, erro };
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => (aviso = { texto: "", erro: false }), erro ? 6000 : 3000);
  }

  async function cadastrar(confirmarDuplicado = false) {
    if (!tratamento) return mostrar("Escolha o tratamento.", true);
    const r = await agir("cadastrar", { nome, sobrenome, tratamento, confirmarDuplicado });
    if (r.ok) {
      mostrar(`${r.paciente.nome} ${r.paciente.sobrenome} entrou na fila.`);
      nome = "";
      sobrenome = "";
      duplicado = null;
      campoNome?.focus();
    } else if (r.codigo === "duplicado") {
      duplicado = r.detalhe;
    } else {
      mostrar(r.mensagem, true);
    }
  }

  function aoEnviar(e) {
    e.preventDefault();
    duplicado = null;
    cadastrar(false);
  }

  async function acao(tipo, payload) {
    const r = await agir(tipo, payload);
    if (!r.ok) mostrar(r.mensagem, true);
    else editando = null;
    return r;
  }

  const priorizar = (p) => acao("priorizar", { id: p.id, prioridade: !p.prioridade });
  const salvarCorrecao = () => acao("corrigir", { id: editando.id, nome: editando.nome, sobrenome: editando.sobrenome });
  const trocar = (p, t) => acao("trocarFila", { id: p.id, tratamento: t });
  const remover = (p) => acao("remover", { id: p.id });

  async function alternarAtendimento() {
    if (!aberto) return acao("abrirAtendimento");
    if (!confirmandoFechar) {
      confirmandoFechar = true;
      return;
    }
    confirmandoFechar = false;
    const r = await acao("fecharAtendimento");
    if (r.ok) mostrar("Atendimento fechado. Filas e chamadas foram apagadas.");
  }

  function nomeTrat(id) {
    return config?.tratamentos.find((t) => t.id === id)?.nome ?? id;
  }
</script>

<ConnStatus online={rede.online} />
<HeroHeader tagline="Recepção" subtitle="Cadastro de pacientes e filas por tratamento" />

<div class="app-body">
  <aside class="operator-panel">
    <h2>Novo paciente</h2>

    {#if config}
      <form class="form-recepcao" onsubmit={aoEnviar}>
        <div class="form-group">
          <label for="nome">Nome</label>
          <input id="nome" bind:this={campoNome} bind:value={nome} maxlength="40" autocomplete="off" required />
        </div>
        <div class="form-group">
          <label for="sobrenome">Sobrenome</label>
          <input id="sobrenome" bind:value={sobrenome} maxlength="60" autocomplete="off" required />
        </div>
        <div class="form-group">
          <span class="rotulo">Tratamento</span>
          <div class="chips-trat">
            {#each config.tratamentos as t (t.id)}
              <button
                type="button"
                class="chip-trat"
                class:ativo={tratamento === t.id}
                style:--cor={t.cor}
                aria-pressed={tratamento === t.id}
                onclick={() => (tratamento = t.id)}>{t.nome}</button>
            {/each}
          </div>
        </div>

        {#if duplicado}
          <div class="alerta-duplicado" role="alert">
            <strong>Já existe um paciente com este nome</strong>
            <span>
              {duplicado.map((d) => `${nomeTrat(d.tratamento)} (${SITUACAO[d.situacao].toLowerCase()})`).join(", ")}.
            </span>
            <div class="alerta-acoes">
              <button type="button" class="btn-mini ouro" onclick={() => cadastrar(true)}>Cadastrar mesmo assim</button>
              <button type="button" class="btn-mini" onclick={() => (duplicado = null)}>Cancelar</button>
            </div>
          </div>
        {/if}

        <button type="submit" class="btn-call" disabled={!aberto}>Cadastrar</button>
        <div class="send-feedback" class:show={aviso.texto} class:erro={aviso.erro} role="status">{aviso.texto}</div>
      </form>
    {/if}

    <div class="estado-atendimento" class:aberto>
      <div class="estado-texto">
        <span class="estado-ponto"></span>
        {estado ? (aberto ? "Atendimento aberto" : "Atendimento fechado") : "Conectando…"}
      </div>
      {#if estado}
        <button class="btn-mini" class:ouro={!aberto} class:perigo={confirmandoFechar} onclick={alternarAtendimento}>
          {aberto ? (confirmandoFechar ? "Confirmar: apagar tudo" : "Fechar atendimento") : "Abrir atendimento"}
        </button>
      {/if}
      {#if confirmandoFechar}
        <p class="estado-dica">
          Fechar apaga todas as filas e chamadas de hoje.
          <button class="link-claro" onclick={() => (confirmandoFechar = false)}>Cancelar</button>
        </p>
      {/if}
    </div>

    <div class="panel-footer">GELF Apometria Campinas</div>
  </aside>

  <section class="filas-painel">
    <div class="filas-grade">
      {#each filas as f (f.id)}
        <article class="fila-coluna" style:--cor={f.cor}>
          <header class="fila-cabeca">
            <span class="fila-titulo">{f.nome}</span>
            <span class="fila-total" title="Aguardando">{f.espera.length}</span>
          </header>

          {#each f.emCurso as p (p.id)}
            <div class="cartao-paciente em-curso">
              <div class="cartao-nome">{p.nomeExibicao}</div>
              <div class="cartao-meta">{SITUACAO[p.situacao]} • {p.sala}</div>
            </div>
          {/each}

          {#each f.espera as p, i (p.id)}
            <div class="cartao-paciente" class:prioridade={p.prioridade}>
              {#if editando?.id === p.id && editando.modo === "corrigir"}
                <div class="edicao">
                  <input bind:value={editando.nome} maxlength="40" aria-label="Nome" />
                  <input bind:value={editando.sobrenome} maxlength="60" aria-label="Sobrenome" />
                  <div class="alerta-acoes">
                    <button class="btn-mini ouro" onclick={salvarCorrecao}>Salvar</button>
                    <button class="btn-mini" onclick={() => (editando = null)}>Cancelar</button>
                  </div>
                </div>
              {:else}
                <div class="cartao-linha">
                  <span class="cartao-pos">{i + 1}</span>
                  <div class="cartao-info">
                    <div class="cartao-nome">{p.nomeExibicao}</div>
                    <div class="cartao-meta">
                      chegou {horaCurta(p.chegada)}{#if p.prioridade} • <strong>prioridade</strong>{/if}
                    </div>
                  </div>
                </div>

                {#if editando?.id === p.id && editando.modo === "trocar"}
                  <div class="trocar-lista">
                    {#each config.tratamentos.filter((t) => t.id !== p.tratamento) as t (t.id)}
                      <button class="chip-trat pequeno" style:--cor={t.cor} onclick={() => trocar(p, t.id)}>{t.nome}</button>
                    {/each}
                    <button class="btn-mini" onclick={() => (editando = null)}>Cancelar</button>
                  </div>
                {:else if editando?.id === p.id && editando.modo === "remover"}
                  <div class="trocar-lista">
                    <span class="confirma-texto">Remover da fila?</span>
                    <button class="btn-mini perigo" onclick={() => remover(p)}>Remover</button>
                    <button class="btn-mini" onclick={() => (editando = null)}>Não</button>
                  </div>
                {:else}
                  <div class="cartao-acoes">
                    <button class="icone" class:ligado={p.prioridade} title="Prioridade" aria-label="Prioridade" aria-pressed={p.prioridade} onclick={() => priorizar(p)}>★</button>
                    <button class="icone" title="Corrigir nome" aria-label="Corrigir nome" onclick={() => (editando = { id: p.id, modo: "corrigir", nome: p.nome, sobrenome: p.sobrenome })}>✎</button>
                    <button class="icone" title="Trocar de fila" aria-label="Trocar de fila" onclick={() => (editando = { id: p.id, modo: "trocar" })}>⇄</button>
                    <button class="icone perigo" title="Remover da fila" aria-label="Remover da fila" onclick={() => (editando = { id: p.id, modo: "remover" })}>✕</button>
                  </div>
                {/if}
              {/if}
            </div>
          {:else}
            {#if f.emCurso.length === 0}<p class="fila-vazia">Ninguém aguardando</p>{/if}
          {/each}

          {#if f.concluidos > 0}
            <footer class="fila-rodape">{f.concluidos} {f.concluidos === 1 ? "concluído" : "concluídos"} hoje</footer>
          {/if}
        </article>
      {/each}
    </div>
  </section>
</div>
