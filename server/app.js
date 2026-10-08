const R = require('./regras');

// Cola entre as regras (puras), o disco e a rede. Toda ação do cliente entra
// por executar(): valida e aplica a regra, GRAVA o arquivo e só então avisa as
// telas. Como o Node processa uma ação por vez (tudo aqui é síncrono), não há
// condição de corrida entre cliques simultâneos.
function nomeExibicao(config, nome, sobrenome) {
    if (config.painel.exibirSobrenomeCompleto) return `${nome} ${sobrenome}`;
    const inicial = Array.from(sobrenome)[0];
    return inicial ? `${nome} ${inicial.toUpperCase()}.` : nome;
}

function criarApp({ config, store, io, relogio = () => new Date() }) {
    let estado = store.carregar();

    const acoes = {
        abrirAtendimento: (e) => R.abrirAtendimento(e),
        fecharAtendimento: (e) => R.fecharAtendimento(e),
        cadastrar: R.cadastrar,
        corrigir: R.corrigir,
        trocarFila: R.trocarFila,
        priorizar: R.priorizar,
        remover: R.remover,
        chamarProximo: R.chamarProximo,
        rechamar: R.rechamar,
        iniciar: R.iniciar,
        concluir: R.concluir,
        naoCompareceu: R.naoCompareceu,
    };

    function configPublica() {
        return { tratamentos: config.tratamentos, som: config.som, painel: config.painel };
    }

    function visao() {
        const pacientes = estado.pacientes
            .filter((p) => p.situacao !== 'removido')
            .map((p) => ({ ...p, nomeExibicao: nomeExibicao(config, p.nome, p.sobrenome) }));
        const filas = {};
        for (const t of config.tratamentos) filas[t.id] = R.fila(estado, t.id).map((p) => p.id);
        const historico = estado.historicoChamadas.map((c) => ({ ...c, nomeExibicao: nomeExibicao(config, c.nome, c.sobrenome) }));
        return { data: estado.data, atendimentoAberto: estado.atendimentoAberto, pacientes, filas, historico };
    }

    function transmitirEstado() {
        io.emit('estado', visao());
    }

    // Virada do dia com o servidor ligado: o dia anterior é apagado (dados
    // pessoais) e o novo começa fechado e vazio.
    function verificarVirada() {
        const hoje = R.dataLocal(relogio());
        if (hoje === estado.data) return false;
        estado = R.novoDia(hoje);
        store.limparOutrosDias(hoje);
        store.salvar(estado);
        transmitirEstado();
        return true;
    }

    function executar(tipo, payload) {
        const acao = acoes[tipo];
        if (!acao) return { ok: false, codigo: 'invalido', mensagem: 'Ação desconhecida.' };
        if (payload === undefined || payload === null) payload = {};
        if (typeof payload !== 'object' || Array.isArray(payload)) {
            return { ok: false, codigo: 'invalido', mensagem: 'Pedido inválido.' };
        }
        verificarVirada();

        const antes = structuredClone(estado);
        let resultado;
        try {
            resultado = acao(estado, payload, { agora: relogio(), config }) || {};
            store.salvar(estado);
        } catch (e) {
            estado = antes;
            if (e instanceof R.ErroRegra) {
                return { ok: false, codigo: e.codigo, mensagem: e.message, detalhe: e.detalhe };
            }
            console.error(`Falha ao executar "${tipo}":`, e);
            return { ok: false, codigo: 'erro', mensagem: 'Não foi possível gravar. Tente novamente.' };
        }

        transmitirEstado();
        if (resultado.chamada) {
            const c = resultado.chamada;
            io.emit('chamada', { ...c, nomeExibicao: nomeExibicao(config, c.nome, c.sobrenome) });
        }
        return { ok: true, paciente: resultado.paciente, chamada: resultado.chamada };
    }

    function aoConectar(socket) {
        verificarVirada();
        socket.emit('config', configPublica());
        socket.emit('estado', visao());
        socket.on('acao', (tipo, payload, ack) => {
            const resposta = executar(String(tipo), payload);
            if (typeof ack === 'function') ack(resposta);
        });
    }

    return { executar, visao, aoConectar, verificarVirada, configPublica, obterEstado: () => estado };
}

module.exports = { criarApp, nomeExibicao };
