<script>
  import { onMount } from "svelte";
  import { rede, conectar, aoChamar } from "../lib/conexao.svelte.js";
  import { playChime, ativarAudio, aoMudarAudio } from "../lib/chime.js";
  import { tratamentoPorId } from "../lib/util.js";
  import HeroHeader from "../lib/HeroHeader.svelte";
  import ConnStatus from "../lib/ConnStatus.svelte";

  let somAtivo = $state(true);
  let destaque = $state(null); // chamada em destaque (a mais recente exibida)
  let pulsando = $state(false);
  let revisao = $state(0);

  const historico = $derived(rede.estado?.historico ?? []);
  // O destaque só vale enquanto o paciente continua no histórico do servidor
  // (some se "não compareceu" ou se o atendimento for fechado).
  const atual = $derived(
    destaque && historico.some((c) => c.pacienteId === destaque.pacienteId) ? destaque : (historico[0] ?? null),
  );
  const anteriores = $derived(
    historico.filter((c) => c.pacienteId !== atual?.pacienteId).slice(0, rede.config?.painel.ultimasChamadas ?? 4),
  );
  // Status vem do estado dos pacientes: muda sem som, só a chamada toca o alarme.
  const STATUS_TV = { chamado: "Chamado", em_atendimento: "Em atendimento", concluido: "Atendimento concluído" };
  const situacaoPorId = $derived(new Map((rede.estado?.pacientes ?? []).map((p) => [p.id, p.situacao])));
  const statusDe = (c) => situacaoPorId.get(c?.pacienteId);
  const tratamento = $derived(atual ? tratamentoPorId(rede.config, atual.tratamento) : null);

  // Fila de exibição: se duas salas chamam ao mesmo tempo, as chamadas
  // aparecem uma após a outra, sem que o som de uma corte o da outra.
  const pendentes = [];
  let ocupado = false;
  const timers = new Set();

  function depois(ms, fn) {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  }

  function processar() {
    if (ocupado || pendentes.length === 0 || !rede.config) return;
    const chamada = pendentes.shift();
    const { som, painel } = rede.config;
    ocupado = true;
    destaque = chamada;
    revisao += 1;
    pulsando = true;
    for (let i = 0; i < som.repeticoes; i++) depois(i * som.intervaloMs, () => playChime(som.volume));
    depois(painel.destaqueMs, () => (pulsando = false));
    // O próximo da fila só entra depois que o último toque terminou.
    depois((som.repeticoes - 1) * som.intervaloMs + 4000, () => {
      ocupado = false;
      processar();
    });
  }

  onMount(() => {
    document.body.classList.add("tv-only");
    conectar();
    const parar = aoChamar((c) => {
      pendentes.push(c);
      processar();
    });
    const pararAudio = aoMudarAudio((ok) => (somAtivo = ok));
    return () => {
      parar();
      pararAudio();
      timers.forEach(clearTimeout);
    };
  });

  async function ativar() {
    if (await ativarAudio()) playChime(rede.config?.som.volume ?? 0.3);
  }
</script>

<ConnStatus online={rede.online} />

{#if !somAtivo}
  <button class="btn-som" onclick={ativar}>🔊 Ativar som</button>
{/if}

<HeroHeader tagline="Painel de Chamada" subtitle="Pacientes em atendimento" />

<div class="app-body">
  <div class="tv-display">
    {#key revisao}
      <div class="call-card" class:pulse={pulsando} aria-live="assertive">
        {#if atual}
          <div class="badge-therapy" style:background-color={tratamento.cor}>{tratamento.nome}</div>
          <div class="patient-name">{atual.nomeExibicao}</div>
          <div class="location-info">{atual.sala}</div>
          {#if STATUS_TV[statusDe(atual)]}
            <div class="status-tv" data-status={statusDe(atual)}>{STATUS_TV[statusDe(atual)]}</div>
          {/if}
        {:else if rede.estado && !rede.estado.atendimentoAberto}
          <div class="patient-name ocioso">Atendimento encerrado</div>
        {:else}
          <div class="patient-name ocioso">Aguardando próxima chamada</div>
        {/if}
      </div>
    {/key}

    {#if anteriores.length > 0}
      <div class="history-section">
        <div class="history-title">Últimos Chamados</div>
        <div class="history-container">
          {#each anteriores as item, i (item.pacienteId)}
            <div
              class="history-card"
              style:border-left-color={tratamentoPorId(rede.config, item.tratamento).cor}
              style:animation-delay={`${i * 0.05}s`}
            >
              <div class="h-name">{item.nomeExibicao}</div>
              <div class="h-type">{tratamentoPorId(rede.config, item.tratamento).nome} • {item.sala}{#if STATUS_TV[statusDe(item)]}{" "}• {STATUS_TV[statusDe(item)]}{/if}</div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
