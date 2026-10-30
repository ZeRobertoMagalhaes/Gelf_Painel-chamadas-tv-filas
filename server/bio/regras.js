// Regras do módulo bioenergético / cura mediúnica: o paciente percorre uma
// ROTA de etapas (captação, doutores, reiki, ...). Cada etapa tem salas com
// capacidade própria (ex.: doutores 2 por vez) e um local de espera (térreo
// ou 1º andar). Quem controla o fluxo chama o paciente para uma sala quando
// há vaga; ao concluir, o paciente passa à espera da próxima etapa da sua rota.
//
// Mesmo desenho das regras das filas: funções puras sobre o estado do dia,
// sem rede nem disco; cada uma valida antes de alterar e lança ErroRegra.

const { ErroRegra, dataLocal, isoLocal, chavePaciente, lerNome } = require('../regras');

const LIMITE_HISTORICO = 20;
const EM_SALA = ['chamado', 'em_atendimento'];
const ATIVAS = ['aguardando', ...EM_SALA];

function novoDiaBio(data) {
    return {
        data,
        diaAberto: false,
        seq: 0,
        ordemEspera: 0,
        prioridadeSeq: 0,
        chamadaSeq: 0,
        salas: [],
        preinscritos: [],
        pacientes: [],
        historicoChamadas: [],
        relatorioFinal: null,
    };
}

function limparTexto(valor, max) {
    return String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

const exigirAberto = (estado) => {
    if (!estado.diaAberto) throw new ErroRegra('fechado', 'O dia está fechado. Abra o dia para continuar.');
};

function buscar(estado, id) {
    const p = estado.pacientes.find((x) => x.id === id);
    if (!p) throw new ErroRegra('nao_encontrado', 'Paciente não encontrado.');
    return p;
}

function buscarSala(estado, id) {
    const s = estado.salas.find((x) => x.id === id);
    if (!s) throw new ErroRegra('nao_encontrado', 'Sala não encontrada.');
    return s;
}

function exigirSituacao(p, permitidas, acao) {
    if (!permitidas.includes(p.situacao)) {
        throw new ErroRegra('estado_invalido', `Não é possível ${acao}: o paciente está "${p.situacao}".`);
    }
}

const etapaDe = (config, id) => config.etapas.find((e) => e.id === id);
const etapaAtual = (p) => p.rota[p.posicao];

// Histórico de movimentos do paciente (só cresce); alimenta o relatório.
function movimento(p, acao, ctx, extra = {}) {
    p.movimentos.push({ acao, em: isoLocal(ctx.agora), ...extra });
}

// ---------------------------------------------------------------- salas e vagas

const ocupantes = (estado, sala) => estado.pacientes.filter((p) => p.salaId === sala.id && EM_SALA.includes(p.situacao));

// Vagas livres: capacidade menos quem está na sala e menos o que está em
// preparo (ex.: fechamento das energias na captação). Sala desativada: 0.
function vagas(estado, sala) {
    if (!sala.ativa) return 0;
    return Math.max(0, sala.capacidade - ocupantes(estado, sala).length - sala.emPreparo);
}

const salasDaEtapa = (estado, etapaId) => estado.salas.filter((s) => s.etapa === etapaId);
const etapaAtiva = (estado, etapaId) => salasDaEtapa(estado, etapaId).some((s) => s.ativa);

// Espera de uma etapa: prioritários primeiro (na ordem em que receberam a
// prioridade), depois os demais por ordem de entrada na espera. Quem escolhe a
// ordem de chamada é o controle; esta é a ordem sugerida.
function filaEspera(estado, etapaId) {
    return estado.pacientes
        .filter((p) => p.situacao === 'aguardando' && etapaAtual(p) === etapaId)
        .sort((a, b) => {
            // !! : estado gravado antes da prioridade existir não tem o campo.
            if (!!a.prioridade !== !!b.prioridade) return a.prioridade ? -1 : 1;
            return a.prioridade ? a.prioridadeEm - b.prioridadeEm : a.ordemEspera - b.ordemEspera;
        });
}

// ---------------------------------------------------------------- dia

// Abertura dos trabalhos. `salas` (opcional) ajusta, por id, se a sala
// funciona hoje e a capacidade do dia (ex.: macas do reiki).
function abrirDia(estado, args, ctx) {
    if (estado.diaAberto) throw new ErroRegra('ja_aberto', 'O dia já está aberto.');
    const ajustes = new Map((Array.isArray(args.salas) ? args.salas : []).map((s) => [s?.id, s]));
    const salas = [];
    for (const etapa of ctx.config.etapas) {
        for (const base of etapa.salas) {
            const aj = ajustes.get(base.id) ?? {};
            salas.push({
                id: base.id,
                etapa: etapa.id,
                nome: base.nome,
                ativa: aj.ativa !== false,
                capacidade: Number.isInteger(aj.capacidade) && aj.capacidade >= 1 && aj.capacidade <= 20 ? aj.capacidade : base.capacidade,
                // Sala/local físico onde o tratamento acontece hoje (informado na abertura do dia; vale o padrão da config).
                local: limparTexto(aj.local ?? base.local ?? '', 40) || null,
                emPreparo: 0,
            });
        }
    }
    if (!salas.some((s) => s.ativa)) throw new ErroRegra('invalido', 'Ative ao menos uma sala.');
    estado.salas = salas;
    estado.relatorioFinal = null;
    estado.diaAberto = true;
}

// Muda durante o dia: sala fora de uso, ou capacidade diferente (macas).
function ajustarSala(estado, args) {
    exigirAberto(estado);
    const sala = buscarSala(estado, args.salaId);
    if (args.capacidade !== undefined) {
        if (!Number.isInteger(args.capacidade) || args.capacidade < 1 || args.capacidade > 20) {
            throw new ErroRegra('invalido', 'A capacidade deve ser um número de 1 a 20.');
        }
        sala.capacidade = args.capacidade;
    }
    if (args.ativa !== undefined) {
        if (args.ativa === false && (ocupantes(estado, sala).length > 0 || sala.emPreparo > 0)) {
            throw new ErroRegra('sala_ocupada', 'Conclua os atendimentos da sala antes de desativá-la.');
        }
        sala.ativa = args.ativa !== false;
    }
    if (args.local !== undefined) {
        const antigo = sala.local ?? null;
        const novo = limparTexto(args.local ?? '', 40) || null;
        sala.local = novo;
        // Quem está na sala com o local antigo acompanha a mudança (o que foi digitado à mão para o paciente fica).
        for (const p of ocupantes(estado, sala)) if ((p.salaDestino ?? null) === antigo) p.salaDestino = novo;
    }
}

// Apaga tudo na hora (LGPD), guardando só o relatório sem nomes.
function fecharDia(estado, args, ctx) {
    const rel = relatorio(estado, ctx.config);
    Object.assign(estado, novoDiaBio(estado.data));
    estado.relatorioFinal = rel;
    return { relatorio: rel };
}

// Lista de pré-inscritos colada pela organização: uma pessoa por linha,
// "Nome Sobrenome ; dia ; descrição" (separador ; ou tabulação).
function importarPreinscritos(estado, args) {
    let novos = 0;
    for (const linha of String(args.texto ?? '').split(/\r?\n/)) {
        const [nomeCompleto, dia, ...resto] = linha.split(/;|\t/);
        const partes = limparTexto(nomeCompleto, 100).split(' ').filter(Boolean);
        if (partes.length < 2) continue;
        const nome = partes[0].slice(0, 40);
        const sobrenome = partes.slice(1).join(' ').slice(0, 60);
        const chave = chavePaciente(nome, sobrenome);
        if (estado.preinscritos.some((i) => chavePaciente(i.nome, i.sobrenome) === chave)) continue;
        estado.preinscritos.push({
            id: `i${String(++estado.seq).padStart(3, '0')}`,
            nome,
            sobrenome,
            dia: limparTexto(dia, 30),
            descricao: limparTexto(resto.join(' '), 200),
            pacienteId: null,
        });
        novos += 1;
    }
    return { importados: novos };
}

// ---------------------------------------------------------------- rota

// Valida uma lista de etapas (sem repetir; todas com sala ativa hoje).
function validarRota(estado, config, lista) {
    if (!Array.isArray(lista)) throw new ErroRegra('invalido', 'Rota inválida.');
    const rota = [];
    for (const id of lista) {
        if (rota.includes(id)) continue;
        if (!etapaDe(config, id)) throw new ErroRegra('invalido', 'Etapa inválida.');
        if (!etapaAtiva(estado, id)) throw new ErroRegra('invalido', `A etapa "${etapaDe(config, id).nome}" não tem sala ativa hoje.`);
        rota.push(id);
    }
    // As etapas seguem sempre a ordem do fluxo (config), seja qual for a ordem pedida.
    const ordem = config.etapas.map((e) => e.id);
    return rota.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));
}

function entrarEspera(estado, p, ctx) {
    p.situacao = 'aguardando';
    p.salaId = null;
    p.sala = null;
    p.ordemEspera = ++estado.ordemEspera;
    movimento(p, 'aguardando', ctx, { etapa: etapaAtual(p) });
}

function finalizar(p, ctx) {
    p.situacao = 'concluido';
    p.salaId = null;
    p.concluido = isoLocal(ctx.agora);
    movimento(p, 'concluido', ctx);
}

// Passa para a próxima etapa da rota (ou termina, se não há mais).
function avancar(estado, p, ctx) {
    p.salaDestino = null; // a sala de destino era da etapa que acabou
    p.posicao += 1;
    if (p.posicao >= p.rota.length) finalizar(p, ctx);
    else entrarEspera(estado, p, ctx);
}

// Substitui as etapas que ainda faltam. Se o paciente está esperando, a
// primeira da lista passa a ser a etapa em que ele espera.
function definirRota(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ATIVAS, 'alterar a rota');
    const nova = validarRota(estado, ctx.config, args.rota);
    if (p.situacao === 'aguardando') {
        p.rota = [...p.rota.slice(0, p.posicao), ...nova];
        movimento(p, 'rota_alterada', ctx, { rota: nova });
        if (p.posicao >= p.rota.length) finalizar(p, ctx);
        else entrarEspera(estado, p, ctx);
    } else {
        p.rota = [...p.rota.slice(0, p.posicao + 1), ...nova];
        movimento(p, 'rota_alterada', ctx, { rota: nova });
    }
    return { paciente: p };
}

function pularEtapa(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['aguardando'], 'pular a etapa');
    movimento(p, 'etapa_pulada', ctx, { etapa: etapaAtual(p) });
    avancar(estado, p, ctx);
    return { paciente: p };
}

// ---------------------------------------------------------------- pacientes

function registrarChegada(estado, args, ctx) {
    exigirAberto(estado);
    let nome;
    let sobrenome;
    let descricao = '';
    let pre = null;
    if (args.preinscritoId) {
        pre = estado.preinscritos.find((i) => i.id === args.preinscritoId);
        if (!pre) throw new ErroRegra('nao_encontrado', 'Pré-inscrição não encontrada.');
        if (pre.pacienteId) throw new ErroRegra('duplicado_chegada', 'Esta pessoa já teve a chegada registrada.');
        ({ nome, sobrenome, descricao } = pre);
    } else {
        ({ nome, sobrenome } = lerNome(args));
    }

    if (!args.confirmarDuplicado) {
        const chave = chavePaciente(nome, sobrenome);
        const existentes = estado.pacientes.filter((p) => ATIVAS.includes(p.situacao) && chavePaciente(p.nome, p.sobrenome) === chave);
        if (existentes.length > 0) {
            throw new ErroRegra('duplicado', 'Já existe um paciente com este nome no fluxo.', {
                situacoes: existentes.map((p) => ({ situacao: p.situacao, etapa: etapaAtual(p) })),
            });
        }
    }

    const rota = args.rota !== undefined
        ? validarRota(estado, ctx.config, args.rota)
        : validarRota(estado, ctx.config, ctx.config.rotaPadrao.filter((id) => etapaAtiva(estado, id)));
    if (rota.length === 0) throw new ErroRegra('invalido', 'A rota do paciente não pode ficar vazia.');

    const paciente = {
        id: `b${String(++estado.seq).padStart(3, '0')}`,
        nome,
        sobrenome,
        descricao,
        rota,
        posicao: 0,
        situacao: 'aguardando',
        salaId: null,
        sala: null,
        ordemEspera: 0,
        chegada: isoLocal(ctx.agora),
        chamado: null,
        concluido: null,
        chamadas: 0,
        prioridade: false,
        prioridadeEm: null,
        salaDestino: null,
        prontuario: null,
        movimentos: [],
    };
    movimento(paciente, 'chegada', ctx);
    estado.pacientes.push(paciente);
    entrarEspera(estado, paciente, ctx);
    if (pre) pre.pacienteId = paciente.id;
    return { paciente };
}

function corrigir(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['aguardando'], 'corrigir');
    const { nome, sobrenome } = lerNome(args, p);
    p.nome = nome;
    p.sobrenome = sobrenome;
    movimento(p, 'nome_corrigido', ctx);
    return { paciente: p };
}

function remover(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['aguardando'], 'remover');
    p.situacao = 'removido';
    movimento(p, 'removido', ctx);
    return { paciente: p };
}

// ---------------------------------------------------------------- chamadas

function registrarChamada(estado, p, sala, ctx) {
    p.chamado = isoLocal(ctx.agora);
    p.chamadas += 1;
    // O local da sala (informado na abertura do dia) já vem como sala de destino do paciente, salvo se o controle digitou outro.
    if (!p.salaDestino && sala.local) p.salaDestino = sala.local;
    movimento(p, 'chamado', ctx, { etapa: sala.etapa, sala: sala.nome, local: sala.local ?? null });
    const chamada = {
        seq: ++estado.chamadaSeq,
        pacienteId: p.id,
        nome: p.nome,
        sobrenome: p.sobrenome,
        etapa: sala.etapa,
        sala: sala.nome,
        em: p.chamado,
    };
    // Rechamada ou nova etapa: a entrada anterior do paciente sobe para o topo.
    estado.historicoChamadas = [chamada, ...estado.historicoChamadas.filter((c) => c.pacienteId !== p.id)].slice(0, LIMITE_HISTORICO);
    return chamada;
}

// Chama um paciente específico (quem controla escolhe a ordem — ex.: os
// doutores decidem quem entra) para uma sala da etapa em que ele espera.
function chamar(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.pacienteId);
    exigirSituacao(p, ['aguardando'], 'chamar');
    const sala = buscarSala(estado, args.salaId);
    if (sala.etapa !== etapaAtual(p)) {
        throw new ErroRegra('etapa_errada', `Este paciente aguarda a etapa "${etapaDe(ctx.config, etapaAtual(p)).nome}", não esta sala.`);
    }
    if (!sala.ativa) throw new ErroRegra('sala_inativa', 'Esta sala não está em uso hoje.');
    if (vagas(estado, sala) <= 0) {
        throw new ErroRegra('sem_vaga', sala.emPreparo > 0 ? 'A sala está em preparo. Libere-a antes de chamar.' : 'A sala está sem vaga no momento.');
    }
    p.situacao = 'chamado';
    p.salaId = sala.id;
    p.sala = sala.nome;
    return { paciente: p, chamada: registrarChamada(estado, p, sala, ctx) };
}

// Chama o primeiro da espera da etapa da sala (ordem de chegada à espera).
function chamarProximo(estado, args, ctx) {
    exigirAberto(estado);
    const sala = buscarSala(estado, args.salaId);
    const proximo = filaEspera(estado, sala.etapa)[0];
    if (!proximo) throw new ErroRegra('fila_vazia', 'Não há ninguém aguardando esta etapa.');
    return chamar(estado, { pacienteId: proximo.id, salaId: sala.id }, ctx);
}

function rechamar(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['chamado'], 'chamar novamente');
    const sala = buscarSala(estado, p.salaId);
    movimento(p, 'rechamado', ctx, { etapa: sala.etapa, sala: sala.nome });
    p.chamadas += 1;
    const chamada = { seq: ++estado.chamadaSeq, pacienteId: p.id, nome: p.nome, sobrenome: p.sobrenome, etapa: sala.etapa, sala: sala.nome, em: isoLocal(ctx.agora) };
    estado.historicoChamadas = [chamada, ...estado.historicoChamadas.filter((c) => c.pacienteId !== p.id)].slice(0, LIMITE_HISTORICO);
    return { paciente: p, chamada };
}

function iniciar(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['chamado'], 'iniciar o atendimento');
    p.situacao = 'em_atendimento';
    movimento(p, 'atendimento_iniciado', ctx, { etapa: etapaAtual(p), sala: p.sala });
    return { paciente: p };
}

// Conclui a etapa: libera a vaga (ou a põe em preparo, se a etapa pede) e
// leva o paciente à espera da próxima etapa da rota.
function concluir(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['em_atendimento'], 'concluir');
    const sala = buscarSala(estado, p.salaId);
    movimento(p, 'etapa_concluida', ctx, { etapa: sala.etapa, sala: sala.nome });
    // Última etapa da rota: quem controla recolhe e guarda o prontuário.
    if (args.guardarProntuario === true && p.prontuario === 'recebido' && p.posicao === p.rota.length - 1) {
        p.prontuario = 'guardado';
        movimento(p, 'prontuario_guardado', ctx);
    }
    if (etapaDe(ctx.config, sala.etapa).preparo) sala.emPreparo += 1;
    avancar(estado, p, ctx);
    return { paciente: p };
}

// Prioridade (idosos, gestantes, pessoas com deficiência): vale para a jornada
// toda, então o paciente passa na frente em cada espera por onde ainda for passar.
function priorizar(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ATIVAS, 'priorizar');
    const quer = args.prioridade !== false;
    if (quer && !p.prioridade) {
        p.prioridade = true;
        estado.prioridadeSeq = (estado.prioridadeSeq || 0) + 1;
        p.prioridadeEm = estado.prioridadeSeq;
        movimento(p, 'prioridade_ligada', ctx);
    } else if (!quer && p.prioridade) {
        p.prioridade = false;
        p.prioridadeEm = null;
        movimento(p, 'prioridade_removida', ctx);
    }
    return { paciente: p };
}

// Sala onde o paciente deve se dirigir, informada por quem controla o fluxo (texto livre,
// ex.: "Sala 02 (térreo)"). Aparece no controle, na recepção e na TV no lugar da sala da
// chamada; vazio apaga e volta a valer o nome da sala chamada.
function informarSala(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ATIVAS, 'informar a sala');
    const sala = limparTexto(args.sala, 40) || null;
    if (sala === (p.salaDestino ?? null)) return { paciente: p };
    p.salaDestino = sala;
    movimento(p, 'sala_informada', ctx, { sala });
    return { paciente: p };
}

// Prontuário do tratamento pedido pelos doutores: o controle o recebe ao
// concluir a etapa deles ("recebido"), o paciente o leva às etapas seguintes e
// o controle o recolhe e guarda ao final da rota ("guardado").
function registrarProntuario(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    const novo = args.situacao === undefined ? 'recebido' : args.situacao;
    if (![null, 'recebido', 'guardado'].includes(novo)) throw new ErroRegra('invalido', 'Situação de prontuário inválida.');
    // Quem já saiu do fluxo (concluído, não compareceu) ainda pode ter o prontuário guardado depois.
    exigirSituacao(p, novo === 'guardado' ? [...ATIVAS, 'concluido', 'nao_compareceu'] : ATIVAS, 'registrar o prontuário');
    if (novo === 'guardado' && p.prontuario !== 'recebido') {
        throw new ErroRegra('estado_invalido', 'Só é possível guardar um prontuário que foi recebido.');
    }
    // Estado gravado antes do campo existir: ausente equivale a "sem prontuário".
    if (novo === (p.prontuario ?? null)) return { paciente: p };
    p.prontuario = novo;
    if (novo === 'recebido') movimento(p, 'prontuario_recebido', ctx);
    else if (novo === 'guardado') movimento(p, 'prontuario_guardado', ctx);
    else movimento(p, 'prontuario_desfeito', ctx);
    return { paciente: p };
}

// Fim do preparo (ex.: energias fechadas): a vaga volta a ficar disponível.
function liberarSala(estado, args) {
    exigirAberto(estado);
    const sala = buscarSala(estado, args.salaId);
    if (sala.emPreparo <= 0) throw new ErroRegra('estado_invalido', 'Esta sala não está em preparo.');
    sala.emPreparo -= 1;
}

function naoCompareceu(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['chamado'], 'marcar "não compareceu"');
    movimento(p, 'nao_compareceu', ctx, { etapa: etapaAtual(p), sala: p.sala });
    p.situacao = 'nao_compareceu';
    p.salaId = null;
    p.concluido = isoLocal(ctx.agora);
    estado.historicoChamadas = estado.historicoChamadas.filter((c) => c.pacienteId !== p.id);
    return { paciente: p };
}

// Paciente chamado que não apareceu, mas ainda está no local (ou que chegou
// atrasado depois de marcado "não compareceu"): volta ao fim da espera da
// mesma etapa.
function devolverEspera(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['chamado', 'nao_compareceu'], 'devolver à espera');
    movimento(p, 'devolvido_espera', ctx, { etapa: etapaAtual(p), sala: p.sala });
    p.concluido = null;
    estado.historicoChamadas = estado.historicoChamadas.filter((c) => c.pacienteId !== p.id);
    entrarEspera(estado, p, ctx);
    return { paciente: p };
}

// ---------------------------------------------------------------- relatório

const minutos = (a, b) => (Date.parse(b) - Date.parse(a)) / 60000;
const media = (lista) => (lista.length ? Math.round((lista.reduce((s, x) => s + x, 0) / lista.length) * 10) / 10 : null);

// Números do dia SEM nomes: por etapa, quantos foram atendidos e os tempos
// médios de espera e de atendimento (em minutos).
function relatorio(estado, config) {
    const porEtapa = new Map(config.etapas.map((e) => [e.id, { esperas: [], duracoes: [], atendidos: 0 }]));
    const totais = [];
    for (const p of estado.pacientes) {
        let esperaIni = null;
        let chamadoEm = null;
        let iniciadoEm = null;
        for (const m of p.movimentos) {
            const acc = porEtapa.get(m.etapa);
            if (m.acao === 'aguardando' && esperaIni === null) esperaIni = m.em;
            else if (m.acao === 'chamado' && chamadoEm === null && esperaIni !== null && acc) {
                acc.esperas.push(minutos(esperaIni, m.em));
                chamadoEm = m.em;
            } else if (m.acao === 'atendimento_iniciado') iniciadoEm = m.em;
            else if (m.acao === 'etapa_concluida' && acc) {
                acc.atendidos += 1;
                if (iniciadoEm) acc.duracoes.push(minutos(iniciadoEm, m.em));
                esperaIni = chamadoEm = iniciadoEm = null;
            } else if (m.acao === 'etapa_pulada') esperaIni = chamadoEm = iniciadoEm = null;
        }
        if (p.situacao === 'concluido' && p.concluido) totais.push(minutos(p.chegada, p.concluido));
    }
    const considerados = estado.pacientes.filter((p) => p.situacao !== 'removido');
    return {
        data: estado.data,
        chegadas: considerados.length,
        concluidos: considerados.filter((p) => p.situacao === 'concluido').length,
        naoCompareceram: considerados.filter((p) => p.situacao === 'nao_compareceu').length,
        emAndamento: considerados.filter((p) => ATIVAS.includes(p.situacao)).length,
        tempoMedioTotalMin: media(totais),
        etapas: config.etapas.map((e) => {
            const a = porEtapa.get(e.id);
            return {
                id: e.id,
                nome: e.nome,
                atendidos: a.atendidos,
                esperaMediaMin: media(a.esperas),
                duracaoMediaMin: media(a.duracoes),
                aguardandoAgora: filaEspera(estado, e.id).length,
            };
        }),
    };
}

// Registro detalhado do dia (com nomes), para o relatório impresso/PDF: por paciente, cada
// passagem por uma etapa com sala, entrada na espera, início, fim e duração; mais o resumo
// geral. Montado só a partir dos movimentos já gravados.
function registroDoDia(estado, config) {
    const nomeEtapa = (id) => etapaDe(config, id)?.nome ?? id;
    const pacientes = estado.pacientes
        .filter((p) => p.situacao !== 'removido')
        .map((p) => {
            const passos = [];
            let atual = null;
            const abrir = (etapa, em) => {
                atual = { etapa, nome: nomeEtapa(etapa), sala: null, local: null, entrouEspera: em, chamado: null, inicio: null, fim: null, resultado: null };
                passos.push(atual);
            };
            for (const m of p.movimentos) {
                if (m.acao === 'aguardando') {
                    if (!atual || atual.etapa !== m.etapa) abrir(m.etapa, m.em);
                } else if (!atual) {
                    continue;
                } else if (m.acao === 'chamado' || m.acao === 'rechamado') {
                    atual.sala = m.sala ?? atual.sala;
                    if (m.acao === 'chamado') {
                        atual.chamado = m.em;
                        atual.local = m.local ?? null;
                    }
                } else if (m.acao === 'atendimento_iniciado') {
                    atual.inicio = m.em;
                    atual.sala = m.sala ?? atual.sala;
                } else if (m.acao === 'devolvido_espera') {
                    atual.chamado = null;
                    atual.sala = null;
                } else if (m.acao === 'etapa_concluida' || m.acao === 'nao_compareceu' || m.acao === 'etapa_pulada') {
                    atual.fim = m.em;
                    atual.resultado = { etapa_concluida: 'concluida', nao_compareceu: 'nao_compareceu', etapa_pulada: 'pulada' }[m.acao];
                    atual = null;
                }
            }
            if (atual) atual.resultado = { chamado: 'chamado', em_atendimento: 'em_atendimento' }[p.situacao] ?? 'aguardando';
            for (const x of passos) {
                x.esperaMin = x.chamado ? Math.round(minutos(x.entrouEspera, x.chamado)) : null;
                x.duracaoMin = x.inicio && x.fim && x.resultado === 'concluida' ? Math.round(minutos(x.inicio, x.fim)) : null;
            }
            return {
                id: p.id,
                nome: p.nome,
                sobrenome: p.sobrenome,
                prioridade: p.prioridade === true,
                salaDestino: p.salaDestino ?? null,
                descricao: p.descricao,
                chegada: p.chegada,
                situacao: p.situacao,
                concluido: p.concluido,
                prontuario: p.prontuario ?? null,
                tempoTotalMin: p.situacao === 'concluido' && p.concluido ? Math.round(minutos(p.chegada, p.concluido)) : null,
                passos,
            };
        })
        .sort((a, b) => a.chegada.localeCompare(b.chegada));
    return {
        data: estado.data,
        resumo: { ...relatorio(estado, config), prioritarios: pacientes.filter((p) => p.prioridade).length },
        pacientes,
    };
}

module.exports = {
    ErroRegra,
    registroDoDia,
    dataLocal,
    novoDiaBio,
    filaEspera,
    vagas,
    relatorio,
    abrirDia,
    ajustarSala,
    fecharDia,
    importarPreinscritos,
    registrarChegada,
    corrigir,
    remover,
    definirRota,
    pularEtapa,
    chamar,
    chamarProximo,
    rechamar,
    iniciar,
    concluir,
    liberarSala,
    naoCompareceu,
    devolverEspera,
    registrarProntuario,
    priorizar,
    informarSala,
};
