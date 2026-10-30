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

test('chegada aceita o nome completo em um único campo', () => {
    const e = diaAberto();
    const p = R.registrarChegada(e, { nome: 'João  da Silva' }, ctx()).paciente;
    assert.equal(p.nome, 'João');
    assert.equal(p.sobrenome, 'da Silva');
    assert.equal(codigo(() => R.registrarChegada(e, { nome: 'Joao' }, ctx())), 'invalido');
    assert.equal(codigo(() => R.registrarChegada(e, { nome: 'joao DA silva' }, ctx())), 'duplicado');
    R.corrigir(e, { id: p.id, nome: 'João Lima' }, ctx());
    assert.equal(p.sobrenome, 'Lima');
});

test('configuração: rota padrão, salas e capacidades válidas', () => {
    assert.deepEqual(config.rotaPadrao, ['captacao', 'doutores', 'reiki']);
    // todas as etapas têm 2 atendimentos simultâneos (duas salas de 1 vaga) e nenhuma tem preparo ("sala pronta")
    for (const e of config.etapas) {
        assert.equal(e.salas.length, 2, e.id);
        assert.deepEqual(e.salas.map((s) => s.capacidade), [1, 1], e.id);
        assert.equal(e.preparo, false, e.id);
    }
    assert.throws(() => normalizarBio({ etapas: [{ id: 'a', nome: 'A', cor: '#000000', salas: [] }] }), /ao menos uma sala/);
});

test('abrir dia usa a configuração, aceita ajustes (macas) e exige uma sala ativa', () => {
    const e = diaAberto([{ id: 'reiki', capacidade: 3 }, { id: 'doutores2', ativa: false }]);
    assert.equal(e.salas.find((s) => s.id === 'reiki').capacidade, 3);
    assert.equal(e.salas.find((s) => s.id === 'doutores2').ativa, false);
    assert.equal(codigo(() => R.abrirDia(e, {}, ctx())), 'ja_aberto');
    const f = R.novoDiaBio('2026-10-10');
    const todas = config.etapas.flatMap((x) => x.salas).map((s) => ({ id: s.id, ativa: false }));
    assert.equal(codigo(() => R.abrirDia(f, { salas: todas }, ctx())), 'invalido');
    // paciente não entra em etapa sem sala ativa
    const p = cheg(e, 'Ana', 'Lima');
    assert.deepEqual(p.rota, ['captacao', 'doutores', 'reiki']);
});

test('jornada completa pela rota: ao concluir, a vaga da sala volta na hora (sem "sala pronta")', () => {
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
    // sem preparo: a captação 1 já pode chamar o próximo
    assert.equal(e.salas.find((s) => s.id === 'captacao1').emPreparo, 0);
    const c = cheg(e, 'Carla', 'Reis');
    assert.equal(R.chamar(e, { pacienteId: c.id, salaId: 'captacao1' }, ctx()).paciente.situacao, 'chamado');
    assert.equal(codigo(() => R.liberarSala(e, { salaId: 'captacao1' })), 'estado_invalido');
});

test('etapa com preparo (opção de configuração): a vaga só volta após "sala pronta"', () => {
    const cfg = normalizarBio({
        etapas: [{ id: 'a', nome: 'A', cor: '#000000', preparo: true, salas: [{ id: 's1', nome: 'S1', capacidade: 1 }] }],
        rotaPadrao: ['a'],
    });
    const c = (min = 1) => ({ agora: new Date((t0 = new Date(t0.getTime() + min * 60000))), config: cfg });
    const e = R.novoDiaBio('2026-10-10');
    R.abrirDia(e, {}, c());
    const p = R.registrarChegada(e, { nome: 'Ana', sobrenome: 'Lima' }, c()).paciente;
    R.registrarChegada(e, { nome: 'Beto', sobrenome: 'Dias' }, c());
    R.chamarProximo(e, { salaId: 's1' }, c());
    R.iniciar(e, { id: p.id }, c());
    R.concluir(e, { id: p.id }, c());
    assert.equal(codigo(() => R.chamarProximo(e, { salaId: 's1' }, c())), 'sem_vaga');
    R.liberarSala(e, { salaId: 's1' });
    assert.equal(R.chamarProximo(e, { salaId: 's1' }, c()).paciente.nome, 'Beto');
});

test('doutores recebem 2 por vez (duas salas) e escolhem a ordem; sala só chama quem espera a sua etapa', () => {
    const e = diaAberto();
    const [a, b, c] = ['A', 'B', 'C'].map((n) => cheg(e, n, 'Silva'));
    for (const p of [a, b, c]) {
        R.chamar(e, { pacienteId: p.id, salaId: 'captacao1' }, ctx());
        R.iniciar(e, { id: p.id }, ctx());
        R.concluir(e, { id: p.id }, ctx());
    }
    assert.equal(codigo(() => R.chamar(e, { pacienteId: a.id, salaId: 'reiki' }, ctx())), 'etapa_errada');
    // doutores escolhem c e a (não a ordem de chegada)
    R.chamar(e, { pacienteId: c.id, salaId: 'doutores' }, ctx());
    R.chamar(e, { pacienteId: a.id, salaId: 'doutores2' }, ctx());
    assert.equal(codigo(() => R.chamar(e, { pacienteId: b.id, salaId: 'doutores' }, ctx())), 'sem_vaga');
    assert.equal(codigo(() => R.chamar(e, { pacienteId: b.id, salaId: 'doutores2' }, ctx())), 'sem_vaga');
    R.iniciar(e, { id: c.id }, ctx());
    R.concluir(e, { id: c.id }, ctx());
    assert.equal(R.chamarProximo(e, { salaId: 'doutores' }, ctx()).paciente.id, b.id);
    assert.equal(c.rota[c.posicao], 'reiki');
});

test('etapa opcional (opção de configuração): incluída durante o atendimento, sempre na ordem do fluxo', () => {
    const cfg = normalizarBio({
        etapas: [
            { id: 'a', nome: 'A', cor: '#000000', salas: [{ id: 'sa', nome: 'SA', capacidade: 1 }] },
            { id: 'o', nome: 'O', cor: '#111111', opcional: true, salas: [{ id: 'so', nome: 'SO', capacidade: 1 }] },
            { id: 'c', nome: 'C', cor: '#222222', salas: [{ id: 'sc', nome: 'SC', capacidade: 1 }] },
        ],
        rotaPadrao: ['a', 'c'],
    });
    const c = (min = 1) => ({ agora: new Date((t0 = new Date(t0.getTime() + min * 60000))), config: cfg });
    const e = R.novoDiaBio('2026-10-10');
    R.abrirDia(e, {}, c());
    const p = R.registrarChegada(e, { nome: 'Ana', sobrenome: 'Lima' }, c()).paciente;
    assert.deepEqual(p.rota, ['a', 'c']); // a opcional fica fora da rota padrão
    R.chamarProximo(e, { salaId: 'sa' }, c());
    R.iniciar(e, { id: p.id }, c());
    R.definirRota(e, { id: p.id, rota: ['c', 'o'] }, c());
    assert.deepEqual(p.rota, ['a', 'o', 'c']); // a ordem do fluxo vale, mesmo pedida ao contrário
    R.concluir(e, { id: p.id }, c());
    assert.equal(p.rota[p.posicao], 'o');
});

test('config oficial: Captação/Apometria › Doutores (inclui a acupuntura) › Reiki/Cromoterapia', () => {
    assert.deepEqual(config.etapas.map((e) => e.id), ['captacao', 'doutores', 'reiki']);
    assert.equal(config.etapas.some((e) => e.opcional), false); // a acupuntura é feita no atendimento dos doutores
    assert.equal(config.etapas.find((e) => e.id === 'doutores').emiteProntuario, true);
    assert.equal(config.prioridade.localEspera, 'terreo');
    assert.match(config.prioridade.aviso, /térreo/);
    const e = diaAberto();
    const a = cheg(e, 'Ana', 'Lima');
    assert.deepEqual(a.rota, ['captacao', 'doutores', 'reiki']);
});

test('prontuário: recebido nos doutores, acompanha o paciente e é guardado ao fim da rota', () => {
    const e = diaAberto();
    const a = cheg(e, 'Ana', 'Lima', { rota: ['doutores', 'reiki'] });
    assert.equal(a.prontuario, null);
    assert.equal(codigo(() => R.registrarProntuario(e, { id: a.id, situacao: 'guardado' }, ctx())), 'estado_invalido');
    R.chamarProximo(e, { salaId: 'doutores' }, ctx());
    R.iniciar(e, { id: a.id }, ctx());
    R.registrarProntuario(e, { id: a.id, situacao: 'recebido' }, ctx());
    assert.equal(a.prontuario, 'recebido');
    R.concluir(e, { id: a.id, guardarProntuario: true }, ctx()); // não é a última etapa: não guarda ainda
    assert.equal(a.prontuario, 'recebido');
    R.chamarProximo(e, { salaId: 'reiki' }, ctx());
    R.iniciar(e, { id: a.id }, ctx());
    R.concluir(e, { id: a.id, guardarProntuario: true }, ctx());
    assert.equal(a.situacao, 'concluido');
    assert.equal(a.prontuario, 'guardado');
    assert.deepEqual(a.movimentos.filter((m) => m.acao.startsWith('prontuario')).map((m) => m.acao), ['prontuario_recebido', 'prontuario_guardado']);
});

test('prioridade: passa na frente em cada espera, vale para a jornada toda e pode ser retirada', () => {
    const e = diaAberto();
    const [a, b, c] = ['A', 'B', 'C'].map((n) => cheg(e, n, 'Silva'));
    R.priorizar(e, { id: c.id }, ctx());
    assert.equal(c.prioridade, true);
    assert.deepEqual(R.filaEspera(e, 'captacao').map((p) => p.id), [c.id, a.id, b.id]);
    // dois prioritários: vale a ordem em que foram marcados
    R.priorizar(e, { id: b.id }, ctx());
    assert.deepEqual(R.filaEspera(e, 'captacao').map((p) => p.id), [c.id, b.id, a.id]);
    // "chamar próximo" respeita a prioridade
    assert.equal(R.chamarProximo(e, { salaId: 'captacao1' }, ctx()).paciente.id, c.id);
    // a prioridade acompanha o paciente nas esperas seguintes
    R.iniciar(e, { id: c.id }, ctx());
    R.concluir(e, { id: c.id }, ctx());
    R.chamarProximo(e, { salaId: 'captacao1' }, ctx()); // b
    R.chamarProximo(e, { salaId: 'captacao2' }, ctx()); // a
    R.iniciar(e, { id: a.id }, ctx());
    R.concluir(e, { id: a.id }, ctx());
    assert.deepEqual(R.filaEspera(e, 'doutores').map((p) => p.id), [c.id, a.id]); // c prioritário, a não
    // retirar a prioridade devolve à ordem de chegada na espera
    R.priorizar(e, { id: c.id, prioridade: false }, ctx());
    assert.equal(c.prioridade, false);
    assert.deepEqual(R.filaEspera(e, 'doutores').map((p) => p.id), [c.id, a.id]); // c entrou antes de a
    assert.deepEqual(c.movimentos.filter((m) => m.acao.startsWith('prioridade')).map((m) => m.acao), ['prioridade_ligada', 'prioridade_removida']);
    assert.equal(codigo(() => R.priorizar(e, { id: 'zzz' }, ctx())), 'nao_encontrado');
});

test('prioridade: estado gravado antes do campo existir mantém a ordem de chegada e aceita priorizar', () => {
    const e = diaAberto();
    const [a, b, c] = ['A', 'B', 'C'].map((n) => cheg(e, n, 'Silva'));
    for (const p of [a, b]) { delete p.prioridade; delete p.prioridadeEm; }
    delete e.prioridadeSeq;
    assert.deepEqual(R.filaEspera(e, 'captacao').map((p) => p.id), [a.id, b.id, c.id]);
    R.priorizar(e, { id: b.id }, ctx());
    assert.deepEqual(R.filaEspera(e, 'captacao').map((p) => p.id), [b.id, a.id, c.id]);
});

test('rota fora de ordem é reordenada pelo servidor (a ordem do fluxo vale)', () => {
    const e = diaAberto();
    const a = cheg(e, 'Ana', 'Lima', { rota: ['reiki', 'doutores', 'captacao', 'reiki'] });
    assert.deepEqual(a.rota, ['captacao', 'doutores', 'reiki']);
    R.chamarProximo(e, { salaId: 'captacao1' }, ctx());
    R.definirRota(e, { id: a.id, rota: ['reiki', 'doutores'] }, ctx());
    assert.deepEqual(a.rota, ['captacao', 'doutores', 'reiki']);
});

test('prontuário: pode ser guardado depois de concluído; estado antigo não gera "desfeito" espúrio', () => {
    const e = diaAberto();
    const a = cheg(e, 'Ana', 'Lima', { rota: ['doutores', 'reiki'] });
    R.chamarProximo(e, { salaId: 'doutores' }, ctx());
    R.iniciar(e, { id: a.id }, ctx());
    R.registrarProntuario(e, { id: a.id, situacao: 'recebido' }, ctx());
    R.concluir(e, { id: a.id }, ctx());
    R.pularEtapa(e, { id: a.id }, ctx()); // pula o reiki: o fluxo termina sem passar pelo "concluir e guardar"
    assert.equal(a.situacao, 'concluido');
    assert.equal(a.prontuario, 'recebido');
    assert.equal(codigo(() => R.registrarProntuario(e, { id: a.id, situacao: 'recebido' }, ctx())), 'estado_invalido'); // depois de concluído, só guardar
    R.registrarProntuario(e, { id: a.id, situacao: 'guardado' }, ctx());
    assert.equal(a.prontuario, 'guardado');
    // paciente de estado gravado antes do campo existir
    const b = cheg(e, 'Beto', 'Dias');
    delete b.prontuario;
    R.registrarProntuario(e, { id: b.id, situacao: null }, ctx());
    assert.equal(b.movimentos.some((m) => m.acao === 'prontuario_desfeito'), false);
});

test('integração /bio: prioridade e prontuário pelo socket (o que as telas realmente chamam)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gelf-bio-'));
    const http = createServer();
    const io = new Server(http);
    const app = criarAppBio({ config, store: criarStore(dir, undefined, { prefixo: 'bio', novoDia: R.novoDiaBio }), io: io.of('/bio') });
    io.of('/bio').on('connection', app.aoConectar);
    await new Promise((r) => http.listen(0, r));
    const s = await new Promise((res) => { const c = cliente(`http://localhost:${http.address().port}/bio`, { transports: ['websocket'] }); c.once('estado', () => res(c)); });
    const agir = (t, p) => new Promise((res) => s.emit('acao', t, p, res));

    await agir('abrirDia', {});
    const a = (await agir('registrarChegada', { nome: 'Ana', sobrenome: 'Lima', rota: ['doutores', 'reiki'] })).paciente;
    const b = (await agir('registrarChegada', { nome: 'Beto', sobrenome: 'Dias', rota: ['doutores', 'reiki'] })).paciente;
    const mudou = new Promise((res) => s.once('estado', res));
    assert.equal((await agir('priorizar', { id: b.id, prioridade: true })).ok, true);
    const est = await mudou;
    assert.equal(est.pacientes.find((p) => p.id === b.id).prioridade, true);
    assert.deepEqual(est.espera.doutores, [b.id, a.id]); // prioritário primeiro
    assert.equal((await agir('priorizar', { id: b.id, prioridade: false })).ok, true);

    assert.equal((await agir('chamarProximo', { salaId: 'doutores' })).ok, true); // chama a (voltou à ordem de chegada)
    await agir('iniciar', { id: a.id });
    assert.equal((await agir('registrarProntuario', { id: a.id, situacao: 'recebido' })).paciente.prontuario, 'recebido');
    await agir('concluir', { id: a.id });
    await agir('chamarProximo', { salaId: 'reiki' });
    await agir('iniciar', { id: a.id });
    const fim = await agir('concluir', { id: a.id, guardarProntuario: true });
    assert.equal(fim.paciente.situacao, 'concluido');
    assert.equal(fim.paciente.prontuario, 'guardado');
    s.close(); io.close(); http.close();
});

test('registro do dia: passagens por etapa com sala, início, fim e duração, e resumo geral', () => {
    const e = diaAberto();
    const a = cheg(e, 'Ana', 'Lima', { rota: ['captacao', 'doutores'] });
    const b = cheg(e, 'Beto', 'Dias', { rota: ['captacao'] });
    R.priorizar(e, { id: b.id }, ctx());
    R.chamarProximo(e, { salaId: 'captacao1' }, ctx(5)); // b (prioritário), espera 5 min
    R.iniciar(e, { id: b.id }, ctx(2));
    R.concluir(e, { id: b.id }, ctx(30)); // 30 min de atendimento
    R.chamarProximo(e, { salaId: 'captacao1' }, ctx(1)); // a
    R.naoCompareceu(e, { id: a.id }, ctx(1));
    R.devolverEspera(e, { id: a.id }, ctx(1));
    R.chamarProximo(e, { salaId: 'captacao2' }, ctx(1));
    R.iniciar(e, { id: a.id }, ctx(1));
    const reg = R.registroDoDia(e, config);
    assert.equal(reg.data, '2026-10-10');
    assert.deepEqual(reg.pacientes.map((p) => p.nome), ['Ana', 'Beto']); // ordem de chegada
    const pb = reg.pacientes[1];
    assert.equal(pb.prioridade, true);
    assert.equal(pb.situacao, 'concluido');
    assert.equal(pb.passos.length, 1);
    assert.deepEqual([pb.passos[0].nome, pb.passos[0].sala, pb.passos[0].resultado], ['Captação/Apometria', 'Captação 1', 'concluida']);
    assert.ok(pb.passos[0].esperaMin >= 5);
    assert.equal(pb.passos[0].duracaoMin, 30);
    assert.ok(pb.tempoTotalMin > 30);
    const pa = reg.pacientes[0];
    assert.deepEqual(pa.passos.map((x) => x.resultado), ['nao_compareceu', 'em_atendimento']); // duas passagens pela captação
    assert.equal(pa.passos[1].sala, 'Captação 2');
    assert.equal(reg.resumo.chegadas, 2);
    assert.equal(reg.resumo.prioritarios, 1);
    assert.equal(reg.resumo.concluidos, 1);
    assert.equal(reg.resumo.naoCompareceram, 0); // a voltou à espera e está em atendimento
});

test('sala informada pelo controle: texto livre, limpa ao esvaziar, aparece no registro do dia', () => {
    const e = diaAberto();
    const a = cheg(e, 'Ana', 'Lima', { rota: ['doutores', 'reiki'] });
    assert.equal(a.salaDestino, null);
    R.informarSala(e, { id: a.id, sala: '  Sala 02 (térreo)  ' }, ctx());
    assert.equal(a.salaDestino, 'Sala 02 (térreo)');
    R.informarSala(e, { id: a.id, sala: 'Sala 02 (térreo)' }, ctx()); // igual: sem novo movimento
    assert.equal(a.movimentos.filter((m) => m.acao === 'sala_informada').length, 1);
    assert.equal(R.registroDoDia(e, config).pacientes[0].salaDestino, 'Sala 02 (térreo)');
    R.informarSala(e, { id: a.id, sala: '   ' }, ctx());
    assert.equal(a.salaDestino, null);
    R.informarSala(e, { id: a.id, sala: 'x'.repeat(100) }, ctx());
    assert.equal(a.salaDestino.length, 40);
    // quem já saiu do fluxo não recebe sala nova
    R.pularEtapa(e, { id: a.id }, ctx());
    R.pularEtapa(e, { id: a.id }, ctx());
    assert.equal(codigo(() => R.informarSala(e, { id: a.id, sala: 'Sala 1' }, ctx())), 'estado_invalido');
});

test('local das salas: informado na abertura, pré-preenche o paciente na chamada e pode mudar durante o dia', () => {
    const e = R.novoDiaBio('2026-10-10');
    R.abrirDia(e, { salas: [{ id: 'doutores', local: '  Sala 04 (térreo)  ' }, { id: 'captacao1', local: 'Sala 01' }] }, ctx());
    assert.equal(e.salas.find((s) => s.id === 'doutores').local, 'Sala 04 (térreo)');
    assert.equal(e.salas.find((s) => s.id === 'reiki').local, null); // sem local informado
    const a = cheg(e, 'Ana', 'Lima', { rota: ['captacao', 'doutores'] });
    const b = cheg(e, 'Beto', 'Dias', { rota: ['doutores'] });
    R.chamar(e, { pacienteId: a.id, salaId: 'captacao1' }, ctx());
    assert.equal(a.salaDestino, 'Sala 01'); // pré-preenchido pelo local da sala
    R.iniciar(e, { id: a.id }, ctx());
    R.concluir(e, { id: a.id }, ctx());
    assert.equal(a.salaDestino, null); // a sala de destino era da etapa que acabou
    // o controle digitou outra sala antes de chamar: vale a digitada
    R.informarSala(e, { id: b.id, sala: 'Sala 09 (térreo)' }, ctx());
    R.chamar(e, { pacienteId: b.id, salaId: 'doutores' }, ctx());
    assert.equal(b.salaDestino, 'Sala 09 (térreo)');
    R.chamar(e, { pacienteId: a.id, salaId: 'doutores2' }, ctx()); // doutores2 sem local: nada a preencher
    assert.equal(a.salaDestino, null);
    // muda o local da sala durante o dia: quem está nela com o local antigo acompanha; a digitada à mão fica
    R.ajustarSala(e, { salaId: 'doutores', local: 'Sala 05' }, ctx());
    assert.equal(e.salas.find((s) => s.id === 'doutores').local, 'Sala 05');
    assert.equal(b.salaDestino, 'Sala 09 (térreo)');
    R.ajustarSala(e, { salaId: 'captacao1', local: '' }, ctx());
    assert.equal(e.salas.find((s) => s.id === 'captacao1').local, null);
    // aparece no registro do dia
    assert.equal(R.registroDoDia(e, config).pacientes[0].passos[0].local, 'Sala 01');
});

test('rota por paciente: pular etapa, alterar o que falta e terminar a rota', () => {
    const e = diaAberto();
    const a = cheg(e, 'Ana', 'Lima', { rota: ['captacao', 'doutores', 'reiki'] });
    assert.equal(a.rota[0], 'captacao');
    R.pularEtapa(e, { id: a.id }, ctx());
    assert.equal(a.rota[a.posicao], 'doutores');
    R.definirRota(e, { id: a.id, rota: ['reiki'] }, ctx()); // dispensa os doutores
    assert.equal(a.rota[a.posicao], 'reiki');
    R.chamarProximo(e, { salaId: 'reiki' }, ctx());
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
    // chegou atrasado: quem foi marcado "não compareceu" volta ao fim da espera
    R.devolverEspera(e, { id: b.id }, ctx());
    assert.equal(b.situacao, 'aguardando');
    assert.equal(b.concluido, null);
    assert.equal(R.filaEspera(e, 'captacao').at(-1).id, b.id);
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
