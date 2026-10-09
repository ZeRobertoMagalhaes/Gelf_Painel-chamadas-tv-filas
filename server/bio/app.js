const fs = require('fs');
const path = require('path');
const R = require('./regras');
const { nomeExibicao } = require('../app');

// Mesma cola do módulo das filas (regra → grava → avisa), mas num namespace
// próprio do Socket.io ("/bio"): as telas bioenergéticas não recebem, nem
// interferem, nas filas dos demais tratamentos.
function criarAppBio({ config, store, io, relogio = () => new Date() }) {
    let estado = store.carregar();

    const acoes = {
        abrirDia: R.abrirDia,
        ajustarSala: R.ajustarSala,
        fecharDia: R.fecharDia,
        importarPreinscritos: R.importarPreinscritos,
        registrarChegada: R.registrarChegada,
        corrigir: R.corrigir,
        remover: R.remover,
        definirRota: R.definirRota,
        pularEtapa: R.pularEtapa,
        chamar: R.chamar,
        chamarProximo: R.chamarProximo,
        rechamar: R.rechamar,
        iniciar: R.iniciar,
        concluir: R.concluir,
        liberarSala: R.liberarSala,
        naoCompareceu: R.naoCompareceu,
        devolverEspera: R.devolverEspera,
    };

    const configPublica = () => ({ locais: config.locais, etapas: config.etapas, rotaPadrao: config.rotaPadrao, som: config.som, painel: config.painel });

    function visao() {
        const exibir = (x) => ({ ...x, nomeExibicao: nomeExibicao(config, x.nome, x.sobrenome) });
        const espera = {};
        for (const e of config.etapas) espera[e.id] = R.filaEspera(estado, e.id).map((p) => p.id);
        return {
            data: estado.data,
            diaAberto: estado.diaAberto,
            salas: estado.salas.map((s) => ({ ...s, vagas: R.vagas(estado, s) })),
            preinscritos: estado.preinscritos,
            pacientes: estado.pacientes.filter((p) => p.situacao !== 'removido').map(exibir),
            espera,
            historico: estado.historicoChamadas.map(exibir),
            relatorio: estado.diaAberto ? R.relatorio(estado, config) : estado.relatorioFinal,
        };
    }

    function salvarRelatorio(rel) {
        try {
            const pasta = path.join(store.pasta, 'relatorios');
            fs.mkdirSync(pasta, { recursive: true });
            fs.writeFileSync(path.join(pasta, `bio-${rel.data}.json`), JSON.stringify(rel, null, 2));
        } catch (e) {
            console.error('Não foi possível gravar o relatório do dia:', e.message);
        }
    }

    const transmitirEstado = () => io.emit('estado', visao());

    function verificarVirada() {
        const hoje = R.dataLocal(relogio());
        if (hoje === estado.data) return false;
        if (estado.diaAberto) salvarRelatorio(R.relatorio(estado, config));
        estado = R.novoDiaBio(hoje);
        store.limparOutrosDias(hoje);
        store.salvar(estado);
        transmitirEstado();
        return true;
    }

    function executar(tipo, payload) {
        const acao = Object.hasOwn(acoes, tipo) ? acoes[tipo] : null;
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
            if (e instanceof R.ErroRegra) return { ok: false, codigo: e.codigo, mensagem: e.message, detalhe: e.detalhe };
            console.error(`Falha ao executar "${tipo}" (bio):`, e);
            return { ok: false, codigo: 'erro', mensagem: 'Não foi possível gravar. Tente novamente.' };
        }

        // Relatório do dia (só números, sem nomes) fica em disco ao fechar o dia.
        if (resultado.relatorio) salvarRelatorio(resultado.relatorio);
        transmitirEstado();
        if (resultado.chamada) {
            const c = resultado.chamada;
            io.emit('chamada', { ...c, nomeExibicao: nomeExibicao(config, c.nome, c.sobrenome) });
        }
        return { ok: true, paciente: resultado.paciente, chamada: resultado.chamada, importados: resultado.importados, relatorio: resultado.relatorio };
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

    return { executar, visao, aoConectar, verificarVirada, obterEstado: () => estado };
}

module.exports = { criarAppBio };
