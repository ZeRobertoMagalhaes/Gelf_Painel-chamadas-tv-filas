// Regras de negócio das filas. Funções puras sobre o objeto de estado do dia:
// não sabem de rede nem de disco (isso é do index.js e do store.js), o que
// as torna fáceis de testar. Cada função valida, altera o estado e devolve o
// resultado; em caso de violação de regra lança ErroRegra, e o estado fica
// intacto (toda validação acontece antes de qualquer alteração).

const ATIVAS = ['aguardando', 'chamado', 'em_atendimento'];
const LIMITE_HISTORICO = 20;

class ErroRegra extends Error {
    constructor(codigo, mensagem, detalhe) {
        super(mensagem);
        this.codigo = codigo;
        this.detalhe = detalhe;
    }
}

function dataLocal(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ISO 8601 com o fuso da máquina (ex: 2026-10-10T08:42:00-03:00), como no
// exemplo da proposta.
function isoLocal(d) {
    const p = (n) => String(n).padStart(2, '0');
    const off = -d.getTimezoneOffset();
    const sinal = off >= 0 ? '+' : '-';
    const abs = Math.abs(off);
    return `${dataLocal(d)}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sinal}${p(Math.floor(abs / 60))}:${p(abs % 60)}`;
}

function novoDia(data) {
    return { data, atendimentoAberto: false, seq: 0, chamadaSeq: 0, pacientes: [], historicoChamadas: [], relatorioFinal: null };
}

function limparTexto(valor, max) {
    return String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// A tela pede um único campo, "nome completo". O arquivo do dia continua
// guardando nome (1ª palavra) e sobrenome (o resto), que é o que o painel usa
// para abreviar. Aceita também os campos antigos separados (nome + sobrenome).
// Sem args.nome/args.sobrenome, usa `atual` (ex.: corrigir sem mudar o nome).
function lerNome(args, atual = {}) {
    const texto = (v) => (typeof v === 'string' ? v : '');
    const completo =
        args.nome === undefined && args.sobrenome === undefined
            ? `${texto(atual.nome)} ${texto(atual.sobrenome)}`
            : `${texto(args.nome)} ${texto(args.sobrenome)}`;
    const palavras = limparTexto(completo, 101).split(' ').filter(Boolean);
    if (palavras.length < 2) throw new ErroRegra('invalido', 'Informe o nome completo (nome e sobrenome).');
    return { nome: palavras[0].slice(0, 40), sobrenome: palavras.slice(1).join(' ').slice(0, 60) };
}

// Chave para detectar a mesma pessoa: ignora caixa, acentos e espaços extras.
function chavePaciente(nome, sobrenome) {
    return `${nome} ${sobrenome}`
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function exigirAberto(estado) {
    if (!estado.atendimentoAberto) {
        throw new ErroRegra('fechado', 'O atendimento está fechado. Abra o atendimento para continuar.');
    }
}

function exigirTratamento(config, id) {
    if (!config.tratamentos.some((t) => t.id === id)) {
        throw new ErroRegra('invalido', 'Tratamento inválido.');
    }
}

function buscar(estado, id) {
    const p = estado.pacientes.find((x) => x.id === id);
    if (!p) throw new ErroRegra('nao_encontrado', 'Paciente não encontrado.');
    return p;
}

function exigirSituacao(p, permitidas, acao) {
    if (!permitidas.includes(p.situacao)) {
        throw new ErroRegra('estado_invalido', `Não é possível ${acao}: o paciente está "${p.situacao}".`);
    }
}

// Fila de um tratamento: prioritários primeiro (na ordem em que receberam
// prioridade), depois os demais por ordem de chegada.
function fila(estado, tratamento) {
    return estado.pacientes
        .filter((p) => p.tratamento === tratamento && p.situacao === 'aguardando')
        .sort((a, b) => {
            if (a.prioridade !== b.prioridade) return a.prioridade ? -1 : 1;
            return a.prioridade ? a.prioridadeEm - b.prioridadeEm : a.ordem - b.ordem;
        });
}

function abrirAtendimento(estado) {
    estado.atendimentoAberto = true;
    estado.relatorioFinal = null;
}

// Apaga filas e chamadas na hora (privacidade/LGPD) e deixa o dia fechado,
// guardando só o relatório do dia (números, sem nomes).
function fecharAtendimento(estado, args, ctx) {
    const rel = relatorio(estado, ctx.config);
    estado.atendimentoAberto = false;
    estado.seq = 0;
    estado.pacientes = [];
    estado.historicoChamadas = [];
    estado.relatorioFinal = rel;
    return { relatorio: rel };
}

function cadastrar(estado, args, ctx) {
    exigirAberto(estado);
    const { nome, sobrenome } = lerNome(args);
    exigirTratamento(ctx.config, args.tratamento);

    if (!args.confirmarDuplicado) {
        const chave = chavePaciente(nome, sobrenome);
        const existentes = estado.pacientes.filter((p) => ATIVAS.includes(p.situacao) && chavePaciente(p.nome, p.sobrenome) === chave);
        if (existentes.length > 0) {
            throw new ErroRegra(
                'duplicado',
                'Já existe um paciente com este nome na fila.',
                existentes.map((p) => ({ tratamento: p.tratamento, situacao: p.situacao })),
            );
        }
    }

    const ordem = ++estado.seq;
    const paciente = {
        id: `p${String(ordem).padStart(3, '0')}`,
        nome,
        sobrenome,
        tratamento: args.tratamento,
        sala: null,
        situacao: 'aguardando',
        prioridade: false,
        prioridadeEm: null,
        ordem,
        chegada: isoLocal(ctx.agora),
        chamado: null,
        iniciado: null,
        concluido: null,
        chamadas: 0,
        chamadoPor: null,
        movimentos: [],
    };
    movimento(paciente, 'cadastrado', ctx, { tratamento: paciente.tratamento });
    estado.pacientes.push(paciente);
    return { paciente };
}

// Histórico de movimentos do paciente (só cresce; a recepção consulta sob demanda).
function movimento(p, acao, ctx, extra = {}) {
    if (!Array.isArray(p.movimentos)) p.movimentos = [];
    p.movimentos.push({ acao, em: isoLocal(ctx.agora), ...extra });
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

// Troca de fila: o paciente entra no fim da fila nova (mantém a prioridade).
function trocarFila(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['aguardando'], 'trocar de fila');
    exigirTratamento(ctx.config, args.tratamento);
    if (p.tratamento === args.tratamento) return { paciente: p };
    const de = p.tratamento;
    p.tratamento = args.tratamento;
    movimento(p, 'fila_trocada', ctx, { de, para: args.tratamento });
    p.ordem = ++estado.seq;
    if (p.prioridade) p.prioridadeEm = ++estado.seq;
    return { paciente: p };
}

function priorizar(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['aguardando'], 'priorizar');
    const quer = args.prioridade !== false;
    if (quer && !p.prioridade) {
        p.prioridade = true;
        p.prioridadeEm = ++estado.seq;
        movimento(p, 'prioridade_ligada', ctx);
    } else if (!quer && p.prioridade) {
        p.prioridade = false;
        p.prioridadeEm = null;
        movimento(p, 'prioridade_removida', ctx);
    }
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

function registrarChamada(estado, p, ctx) {
    p.chamado = isoLocal(ctx.agora);
    p.chamadas += 1;
    movimento(p, p.chamadas === 1 ? 'chamado' : 'rechamado', ctx, { sala: p.sala });
    const chamada = {
        seq: ++estado.chamadaSeq,
        pacienteId: p.id,
        nome: p.nome,
        sobrenome: p.sobrenome,
        tratamento: p.tratamento,
        sala: p.sala,
        em: p.chamado,
    };
    // Rechamada: a entrada anterior do mesmo paciente sobe para o topo em vez
    // de aparecer duplicada no histórico da TV.
    estado.historicoChamadas = [chamada, ...estado.historicoChamadas.filter((c) => c.pacienteId !== p.id)].slice(0, LIMITE_HISTORICO);
    return chamada;
}

function limparSala(valor) {
    const sala = limparTexto(valor, 40);
    if (!sala) throw new ErroRegra('invalido', 'Informe a sala antes de chamar.');
    return sala;
}

// Chama o primeiro da fila. A transição acontece aqui, no servidor, numa única
// operação síncrona: se duas equipes tocarem em "Chamar próximo" ao mesmo
// tempo, cada uma recebe um paciente diferente (nunca o mesmo duas vezes).
// "equipeId" identifica o aparelho de quem chama: cada aparelho atende um
// paciente por vez.
function chamarProximo(estado, args, ctx) {
    exigirAberto(estado);
    exigirTratamento(ctx.config, args.tratamento);
    const sala = limparSala(args.sala);
    const equipeId = limparTexto(args.equipeId, 64);
    if (equipeId) {
        const ocupado = estado.pacientes.find((p) => p.chamadoPor === equipeId && ['chamado', 'em_atendimento'].includes(p.situacao));
        if (ocupado) {
            throw new ErroRegra('equipe_ocupada', 'Conclua ou marque o paciente atual antes de chamar o próximo.');
        }
    }
    const proximo = fila(estado, args.tratamento)[0];
    if (!proximo) throw new ErroRegra('fila_vazia', 'Não há pacientes aguardando neste tratamento.');

    proximo.situacao = 'chamado';
    proximo.sala = sala;
    proximo.chamadoPor = equipeId || null;
    const chamada = registrarChamada(estado, proximo, ctx);
    return { paciente: proximo, chamada };
}

function rechamar(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['chamado'], 'chamar novamente');
    if (args.sala !== undefined && String(args.sala).trim()) p.sala = limparSala(args.sala);
    const chamada = registrarChamada(estado, p, ctx);
    return { paciente: p, chamada };
}

function iniciar(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['chamado'], 'iniciar o atendimento');
    p.situacao = 'em_atendimento';
    p.iniciado = isoLocal(ctx.agora);
    movimento(p, 'atendimento_iniciado', ctx, { sala: p.sala });
    return { paciente: p };
}

function concluir(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['em_atendimento'], 'concluir');
    p.situacao = 'concluido';
    p.concluido = isoLocal(ctx.agora);
    movimento(p, 'concluido', ctx, { sala: p.sala });
    return { paciente: p };
}

function naoCompareceu(estado, args, ctx) {
    exigirAberto(estado);
    const p = buscar(estado, args.id);
    exigirSituacao(p, ['chamado'], 'marcar "não compareceu"');
    p.situacao = 'nao_compareceu';
    p.concluido = isoLocal(ctx.agora);
    movimento(p, 'nao_compareceu', ctx, { sala: p.sala });
    // Sai do histórico da TV: não faz sentido manter na tela quem não veio.
    estado.historicoChamadas = estado.historicoChamadas.filter((c) => c.pacienteId !== p.id);
    return { paciente: p };
}

// ---------------------------------------------------------------- relatório

const minutos = (a, b) => (Date.parse(b) - Date.parse(a)) / 60000;
const media = (lista) => (lista.length ? Math.round((lista.reduce((s, x) => s + x, 0) / lista.length) * 10) / 10 : null);
const primeiraChamada = (p) => (p.movimentos ?? []).find((m) => m.acao === 'chamado')?.em ?? null;

// Números de um grupo de pacientes: situação atual e tempos médios (em minutos)
// de espera (chegada até a 1ª chamada) e de atendimento (início até a conclusão).
function resumirGrupo(lista) {
    const esperas = [];
    const duracoes = [];
    for (const p of lista) {
        const chamado = primeiraChamada(p);
        if (chamado) esperas.push(minutos(p.chegada, chamado));
        if (p.situacao === 'concluido' && p.iniciado && p.concluido) duracoes.push(minutos(p.iniciado, p.concluido));
    }
    return {
        cadastrados: lista.length,
        concluidos: lista.filter((p) => p.situacao === 'concluido').length,
        naoCompareceram: lista.filter((p) => p.situacao === 'nao_compareceu').length,
        aguardando: lista.filter((p) => p.situacao === 'aguardando').length,
        emAtendimento: lista.filter((p) => ['chamado', 'em_atendimento'].includes(p.situacao)).length,
        prioritarios: lista.filter((p) => p.prioridade).length,
        esperaMediaMin: media(esperas),
        duracaoMediaMin: media(duracoes),
    };
}

// Números do dia SEM nomes: geral e por tratamento. Quem foi removido da fila
// (cadastro errado) não conta.
function relatorio(estado, config) {
    const considerados = estado.pacientes.filter((p) => p.situacao !== 'removido');
    return {
        data: estado.data,
        ...resumirGrupo(considerados),
        tratamentos: config.tratamentos.map((t) => ({ id: t.id, nome: t.nome, ...resumirGrupo(considerados.filter((p) => p.tratamento === t.id)) })),
    };
}

// Registro detalhado do dia (com nomes), para o relatório impresso/PDF: um paciente
// por linha, na ordem de chegada, mais o resumo geral.
function registroDoDia(estado, config) {
    const nomeTrat = (id) => config.tratamentos.find((t) => t.id === id)?.nome ?? id;
    const pacientes = estado.pacientes
        .filter((p) => p.situacao !== 'removido')
        .map((p) => {
            const chamado = primeiraChamada(p);
            return {
                id: p.id,
                nome: p.nome,
                sobrenome: p.sobrenome,
                tratamento: p.tratamento,
                tratamentoNome: nomeTrat(p.tratamento),
                prioridade: p.prioridade === true,
                sala: p.sala,
                situacao: p.situacao,
                chamadas: p.chamadas,
                chegada: p.chegada,
                chamado,
                iniciado: p.iniciado,
                concluido: p.concluido,
                esperaMin: chamado ? Math.round(minutos(p.chegada, chamado)) : null,
                duracaoMin: p.situacao === 'concluido' && p.iniciado && p.concluido ? Math.round(minutos(p.iniciado, p.concluido)) : null,
            };
        })
        .sort((a, b) => a.chegada.localeCompare(b.chegada) || a.id.localeCompare(b.id));
    return { data: estado.data, resumo: relatorio(estado, config), pacientes };
}

module.exports = {
    ATIVAS,
    ErroRegra,
    dataLocal,
    isoLocal,
    novoDia,
    chavePaciente,
    lerNome,
    fila,
    abrirAtendimento,
    fecharAtendimento,
    relatorio,
    registroDoDia,
    cadastrar,
    corrigir,
    trocarFila,
    priorizar,
    remover,
    chamarProximo,
    rechamar,
    iniciar,
    concluir,
    naoCompareceu,
};
