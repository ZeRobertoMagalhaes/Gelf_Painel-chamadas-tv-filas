const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { io: cliente } = require('socket.io-client');
const { criarStore } = require('../server/store');
const { criarApp } = require('../server/app');
const { carregarConfig } = require('../server/config');

async function subir(relogio) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gelf-int-'));
    const http = createServer();
    const io = new Server(http);
    const app = criarApp({ config: carregarConfig(), store: criarStore(dir, relogio), io, relogio });
    io.on('connection', app.aoConectar);
    await new Promise((r) => http.listen(0, r));
    const url = `http://localhost:${http.address().port}`;
    const abrir = () => new Promise((res) => {
        const s = cliente(url, { transports: ['websocket'] });
        s.once('estado', () => res(s));
    });
    const agir = (s, tipo, payload) => new Promise((res) => s.emit('acao', tipo, payload, res));
    const fechar = (...ss) => { ss.forEach((s) => s.close()); io.close(); http.close(); };
    return { abrir, agir, fechar, dir, app };
}
const esperar = (s, ev) => new Promise((res) => s.once(ev, res));

test('dia completo: recepção cadastra, equipe chama, painel recebe o evento em menos de 1 s', async () => {
    const relogio = () => new Date();
    const { abrir, agir, fechar } = await subir(relogio);
    const recepcao = await abrir();
    const equipe = await abrir();
    const painel = await abrir();

    assert.equal((await agir(recepcao, 'cadastrar', { nome: 'Ana', sobrenome: 'Lima', tratamento: 'reiki' })).codigo, 'fechado');
    assert.equal((await agir(recepcao, 'abrirAtendimento')).ok, true);
    const cad = await agir(recepcao, 'cadastrar', { nome: 'Ana', sobrenome: 'Lima', tratamento: 'reiki' });
    assert.equal(cad.ok, true);

    const chamadaNoPainel = esperar(painel, 'chamada');
    const t = Date.now();
    const r = await agir(equipe, 'chamarProximo', { tratamento: 'reiki', sala: 'Sala 3', equipeId: 'tablet-1' });
    assert.equal(r.ok, true);
    const chamada = await chamadaNoPainel;
    assert.ok(Date.now() - t < 1000, 'RNF01: chamada deve chegar em até 1 s');
    assert.equal(chamada.nomeExibicao, 'Ana Lima');
    assert.equal(chamada.sala, 'Sala 3');

    assert.equal((await agir(equipe, 'iniciar', { id: cad.paciente.id })).ok, true);
    assert.equal((await agir(equipe, 'concluir', { id: cad.paciente.id })).ok, true);
    fechar(recepcao, equipe, painel);
});

test('clientes simultâneos disputando o último da fila: só um consegue', async () => {
    const { abrir, agir, fechar } = await subir(() => new Date());
    const a = await abrir();
    const b = await abrir();
    await agir(a, 'abrirAtendimento');
    await agir(a, 'cadastrar', { nome: 'Ana', sobrenome: 'Lima', tratamento: 'gao' });
    const [r1, r2] = await Promise.all([
        agir(a, 'chamarProximo', { tratamento: 'gao', sala: '1', equipeId: 'a' }),
        agir(b, 'chamarProximo', { tratamento: 'gao', sala: '2', equipeId: 'b' }),
    ]);
    assert.equal([r1, r2].filter((r) => r.ok).length, 1);
    assert.equal([r1, r2].find((r) => !r.ok).codigo, 'fila_vazia');
    fechar(a, b);
});

test('ações inválidas e payloads estranhos são recusados sem derrubar o servidor', async () => {
    const { abrir, agir, fechar } = await subir(() => new Date());
    const a = await abrir();
    assert.equal((await agir(a, 'naoExiste', {})).codigo, 'invalido');
    assert.equal((await agir(a, 'cadastrar', 'texto')).codigo, 'invalido');
    assert.equal((await agir(a, 'cadastrar', [])).codigo, 'invalido');
    await agir(a, 'abrirAtendimento');
    assert.equal((await agir(a, 'concluir', { id: '../x' })).codigo, 'nao_encontrado');
    assert.equal((await agir(a, 'cadastrar', { nome: {}, sobrenome: null, tratamento: 'reiki' })).codigo, 'invalido');
    fechar(a);
});

test('quem conecta (ou reconecta) recebe config e estado atuais, sem evento de chamada', async () => {
    const { abrir, agir, fechar } = await subir(() => new Date());
    const a = await abrir();
    await agir(a, 'abrirAtendimento');
    await agir(a, 'cadastrar', { nome: 'Ana', sobrenome: 'Lima', tratamento: 'reiki' });
    await agir(a, 'chamarProximo', { tratamento: 'reiki', sala: '1', equipeId: 'a' });
    let chamadas = 0;
    const recebeuEstado = new Promise((res) => {
        const s = cliente(a.io.uri, { transports: ['websocket'] });
        s.on('chamada', () => chamadas++);
        s.once('config', (c) => assert.equal(c.tratamentos.length, 6));
        s.once('estado', (e) => { res(e); setTimeout(() => s.close(), 100); });
    });
    const e = await recebeuEstado;
    assert.equal(e.atendimentoAberto, true);
    assert.equal(e.historico[0].nomeExibicao, 'Ana Lima');
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(chamadas, 0);
    fechar(a);
});

test('exibirSobrenomeCompleto=false mostra nome e inicial', () => {
    const { nomeExibicao } = require('../server/app');
    const cfg = { painel: { exibirSobrenomeCompleto: false } };
    assert.equal(nomeExibicao(cfg, 'Maria', 'silva'), 'Maria S.');
    assert.equal(nomeExibicao({ painel: { exibirSobrenomeCompleto: true } }, 'Maria', 'Silva'), 'Maria Silva');
});

test('virada do dia com o servidor ligado apaga o dia anterior', async () => {
    let agora = new Date('2026-10-10T20:00:00-03:00');
    const { abrir, agir, fechar, dir, app } = await subir(() => agora);
    const a = await abrir();
    await agir(a, 'abrirAtendimento');
    await agir(a, 'cadastrar', { nome: 'Ana', sobrenome: 'Lima', tratamento: 'reiki' });
    assert.ok(fs.existsSync(path.join(dir, 'fila-2026-10-10.json')));
    agora = new Date('2026-10-11T08:00:00-03:00');
    assert.equal(app.verificarVirada(), true);
    assert.deepEqual(fs.readdirSync(dir), ['fila-2026-10-11.json']);
    assert.equal(app.visao().atendimentoAberto, false);
    assert.equal(app.visao().pacientes.length, 0);
    fechar(a);
});
