const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { io: cliente } = require('socket.io-client');
const R = require('../server/bio/regras');
const { carregarConfigBio, normalizarBio } = require('../server/bio/config');
const { criarStore } = require('../server/store');
const { criarAppBio } = require('../server/bio/app');

const config = carregarConfigBio();
let t0 = new Date('2026-10-10T08:00:00-03:00');
const ctx = (min = 1) => ({ agora: new Date((t0 = new Date(t0.getTime() + min * 60000))), config });
const codigo = (fn) => {
    try { fn(); } catch (e) { return e.codigo; }
    return null;
};
const cheg = (e, nome, sobrenome, extra = {}) => R.registrarChegada(e, { nome, sobrenome, ...extra }, ctx()).paciente;

function diaAberto(salas) {
    const e = R.novoDiaBio('2026-10-10');
    R.abrirDia(e, { salas }, ctx());
    return e;
}

test('configuração: rota padrão, salas e capacidades válidas', () => {
    assert.deepEqual(config.rotaPadrao, ['captacao', 'doutores', 'reiki', 'quinta']);
    assert.equal(config.etapas.find((e) => e.id === 'doutores').salas[0].capacidade, 2);
    assert.throws(() => normalizarBio({ etapas: [{ id: 'a', nome: 'A', cor: '#000000', salas: [] }] }), /ao menos uma sala/);
});

test('abrir dia usa a configuração, aceita ajustes (macas) e exige uma sala ativa', () => {
    const e = diaAberto([{ id: 'reiki', capacidade: 3 }, { id: 'quinta', ativa: false }]);
    assert.equal(e.salas.find((s) => s.id === 'reiki').capacidade, 3);
    assert.equal(e.salas.find((s) => s.id === 'quinta').ativa, false);
    assert.equal(codigo(() => R.abrirDia(e, {}, ctx())), 'ja_aberto');
    const f = R.novoDiaBio('2026-10-10');
    const todas = config.etapas.flatMap((x) => x.salas).map((s) => ({ id: s.id, ativa: false }));
    assert.equal(codigo(() => R.abrirDia(f, { salas: todas }, ctx())), 'invalido');
    // paciente não entra em etapa sem sala ativa
    const p = cheg(e, 'Ana', 'Lima');
    assert.deepEqual(p.rota, ['captacao', 'doutores', 'reiki']);
});

test('jornada completa pela rota, com captação em preparo antes de chamar o próximo', () => {
    const e = diaAberto();
    const a = cheg(e, 'Ana', 'Lima');
    const b = cheg(e, 'Beto', 'Dias');
    assert.equal(a.situacao, 'aguardando');
    assert.deepEqual(R.filaEspera(e, 'captacao').map((p) => p.id), [a.id, b.id]);

    const { chamada } = R.chamarProximo(e, { salaId: 'captacao1' }, ctx());
    assert.equal(chamada.sala, 'Captação 1');
    assert.equal(codigo(() => R.chamarProximo(e, { salaId: 'captacao1' }, ctx())), 'sem_vaga'); // 1 por vez
    R.chamarProximo(e, { salaId: 'captacao2' }, ctx());

    R.iniciar(e, { id: a.id }, ctx());
    R.concluir(e, { id: a.id }, ctx());
    assert.equal(a.situacao, 'aguardando');
    assert.equal(a.rota[a.posicao], 'doutores');
    // captação 1 fica em preparo até ser liberada
    assert.equal(e.salas.find((s) => s.id === 'captacao1').emPreparo, 1);
    const c = cheg(e, 'Carla', 'Reis');
    assert.equal(codigo(() => R.chamar(e, { pacienteId: c.id, salaId: 'captacao1' }, ctx())), 'sem_vaga');
    R.liberarSala(e, { salaId: 'captacao1' });
    assert.equal(R.chamar(e, { pacienteId: c.id, salaId: 'captacao1' }, ctx()).paciente.situacao, 'chamado');
    assert.equal(codigo(() => R.liberarSala(e, { salaId: 'captacao1' })), 'estado_invalido');
});

test('doutores recebem 2 por vez e escolhem a ordem; sala só chama quem espera a sua etapa', () => {
    const e = diaAberto();
    const [a, b, c] = ['A', 'B', 'C'].map((n) => cheg(e, n, 'Silva'));
    for (const p of [a, b, c]) {
        R.chamar(e, { pacienteId: p.id, salaId: 'captacao1' }, ctx());
        R.iniciar(e, { id: p.id }, ctx());
        R.concluir(e, { id: p.id }, ctx());
        R.liberarSala(e, { salaId: 'captacao1' });
    }
    assert.equal(codigo(() => R.chamar(e, { pacienteId: a.id, salaId: 'reiki' }, ctx())), 'etapa_errada');
    // doutores escolhem c e a (não a ordem de chegada)
    R.chamar(e, { pacienteId: c.id, salaId: 'doutores' }, ctx());
    R.chamar(e, { pacienteId: a.id, salaId: 'doutores' }, ctx());
    assert.equal(codigo(() => R.chamar(e, { pacienteId: b.id, salaId: 'doutores' }, ctx())), 'sem_vaga');
    R.iniciar(e, { id: c.id }, ctx());
    R.concluir(e, { id: c.id }, ctx());
    assert.equal(R.chamarProximo(e, { salaId: 'doutores' }, ctx()).paciente.id, b.id);
    assert.equal(c.rota[c.posicao], 'reiki');
});

test('rota por paciente: pular etapa, alterar o que falta e terminar a rota', () => {
    const e = diaAberto();
    const a = cheg(e, 'Ana', 'Lima', { rota: ['doutores', 'reiki'] });
    assert.equal(a.rota[0], 'doutores');
    R.pularEtapa(e, { id: a.id }, ctx());
    assert.equal(a.rota[a.posicao], 'reiki');
    R.definirRota(e, { id: a.id, rota: ['quinta'] }, ctx());
    assert.equal(a.rota[a.posicao], 'quinta');
    R.chamarProximo(e, { salaId: 'quinta' }, ctx());
    R.iniciar(e, { id: a.id }, ctx());
    R.concluir(e, { id: a.id }, ctx());
    assert.equal(a.situacao, 'concluido');
    assert.equal(codigo(() => cheg(e, 'X', 'Y', { rota: [] })), 'invalido');
    assert.equal(codigo(() => cheg(e, 'X', 'Y', { rota: ['nada'] })), 'invalido');
    assert.equal(codigo(() => R.pularEtapa(e, { id: a.id }, ctx())), 'estado_invalido');
});

test('não compareceu encerra; devolver à espera volta ao fim da fila da etapa', () => {
    const e = diaAberto();
    const [a, b, c] = ['A', 'B', 'C'].map((n) => cheg(e, n, 'Souza'));
    R.chamarProximo(e, { salaId: 'captacao1' }, ctx());
    R.devolverEspera(e, { id: a.id }, ctx());
    assert.deepEqual(R.filaEspera(e, 'captacao').map((p) => p.id), [b.id, c.id, a.id]);
    R.chamarProximo(e, { salaId: 'captacao1' }, ctx());
    R.naoCompareceu(e, { id: b.id }, ctx());
    assert.equal(b.situacao, 'nao_compareceu');
    assert.equal(e.historicoChamadas.some((h) => h.pacienteId === b.id), false);
    // a sala voltou a ter vaga (sem preparo, pois não houve atendimento)
    assert.equal(R.vagas(e, e.salas.find((s) => s.id === 'captacao1')), 1);
});

test('ajustar sala: capacidade do reiki muda no dia; não desativa sala ocupada', () => {
    const e = diaAberto();
    R.ajustarSala(e, { salaId: 'reiki', capacidade: 3 });
    assert.equal(R.vagas(e, e.salas.find((s) => s.id === 'reiki')), 3);
    assert.equal(codigo(() => R.ajustarSala(e, { salaId: 'reiki', capacidade: 0 })), 'invalido');
    const a = cheg(e, 'A', 'B', { rota: ['reiki'] });
    R.chamarProximo(e, { salaId: 'reiki' }, ctx());
    assert.equal(codigo(() => R.ajustarSala(e, { salaId: 'reiki', ativa: false })), 'sala_ocupada');
    assert.equal(a.situacao, 'chamado');
});

test('nome repetido avisa; pré-inscritos importam e marcam a chegada', () => {
    const e = diaAberto();
    cheg(e, 'Ana', 'Lima');
    assert.equal(codigo(() => cheg(e, 'ANA', 'líma')), 'duplicado');
    cheg(e, 'ANA', 'líma', { confirmarDuplicado: true });
    const { importados } = R.importarPreinscritos(e, { texto: 'João Silva Souza ; 10/10 ; Dor nas costas\nsemsobrenome\nJoão Silva Souza;10/10;repetido\nMaria Rosa\t11/10\tAnsiedade' });
    assert.equal(importados, 2);
    const p = R.registrarChegada(e, { preinscritoId: e.preinscritos[0].id }, ctx()).paciente;
    assert.equal(p.sobrenome, 'Silva Souza');
    assert.equal(codigo(() => R.registrarChegada(e, { preinscritoId: e.preinscritos[0].id }, ctx())), 'duplicado_chegada');
});

test('relatório do dia: só números (sem nomes), esperas e durações por etapa', () => {
    const e = diaAberto();
    const a = cheg(e, 'Ana', 'Lima', { rota: ['captacao', 'doutores'] });
    R.chamarProximo(e, { salaId: 'captacao1' }, ctx(10)); // espera 10 min
    R.iniciar(e, { id: a.id }, ctx(1));
    R.concluir(e, { id: a.id }, ctx(20)); // atendimento 20 min
    R.chamarProximo(e, { salaId: 'doutores' }, ctx(5)); // espera 5 min
    R.iniciar(e, { id: a.id }, ctx(1));
    R.concluir(e, { id: a.id }, ctx(30));
    cheg(e, 'Beto', 'Dias');
    const rel = R.relatorio(e, config);
    assert.equal(rel.chegadas, 2);
    assert.equal(rel.concluidos, 1);
    assert.equal(rel.emAndamento, 1);
    const cap = rel.etapas.find((x) => x.id === 'captacao');
    assert.deepEqual([cap.atendidos, cap.esperaMediaMin, cap.duracaoMediaMin, cap.aguardandoAgora], [1, 10, 20, 1]);
    const dou = rel.etapas.find((x) => x.id === 'doutores');
    assert.deepEqual([dou.atendidos, dou.esperaMediaMin, dou.duracaoMediaMin], [1, 5, 30]);
    assert.equal(rel.tempoMedioTotalMin, 67);
    assert.equal(JSON.stringify(rel).includes('Ana'), false);
});

test('fechar o dia apaga tudo, devolve o relatório e bloqueia ações', () => {
    const e = diaAberto();
    cheg(e, 'Ana', 'Lima');
    const { relatorio } = R.fecharDia(e, {}, ctx());
    assert.equal(relatorio.chegadas, 1);
    assert.equal(e.pacientes.length, 0);
    assert.equal(e.diaAberto, false);
    assert.equal(e.relatorioFinal.chegadas, 1);
    assert.equal(codigo(() => cheg(e, 'A', 'B')), 'fechado');
});

test('integração /bio: ação pelo socket, evento de chamada, relatório salvo sem nomes ao fechar', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gelf-bio-'));
    const http = createServer();
    const io = new Server(http);
    const app = criarAppBio({ config, store: criarStore(dir, undefined, { prefixo: 'bio', novoDia: R.novoDiaBio }), io: io.of('/bio') });
    io.of('/bio').on('connection', app.aoConectar);
    await new Promise((r) => http.listen(0, r));
    const url = `http://localhost:${http.address().port}`;
    const abrir = () => new Promise((res) => { const s = cliente(`${url}/bio`, { transports: ['websocket'] }); s.once('estado', () => res(s)); });
    const agir = (s, t, p) => new Promise((res) => s.emit('acao', t, p, res));

    const controle = await abrir();
    const painel = await abrir();
    assert.equal((await agir(controle, 'abrirDia', {})).ok, true);
    const c = await agir(controle, 'registrarChegada', { nome: 'Rita', sobrenome: 'Alves' });
    const evento = new Promise((res) => painel.once('chamada', res));
    const r = await agir(controle, 'chamarProximo', { salaId: 'captacao1' });
    assert.equal(r.ok, true);
    const ch = await evento;
    assert.equal(ch.nomeExibicao, 'Rita Alves');
    assert.equal(ch.sala, 'Captação 1');
    assert.equal((await agir(controle, 'toString', {})).codigo, 'invalido');
    assert.ok(fs.readdirSync(dir).some((f) => /^bio-\d{4}-\d{2}-\d{2}\.json$/.test(f)));

    await agir(controle, 'iniciar', { id: c.paciente.id });
    await agir(controle, 'concluir', { id: c.paciente.id });
    const fim = await agir(controle, 'fecharDia', {});
    assert.equal(fim.ok, true);
    const arquivo = path.join(dir, 'relatorios', `bio-${fim.relatorio.data}.json`);
    const salvo = fs.readFileSync(arquivo, 'utf8');
    assert.equal(JSON.parse(salvo).chegadas, 1);
    assert.equal(salvo.includes('Rita'), false);
    controle.close(); painel.close(); io.close(); http.close();
});
