const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../server/regras');
const { carregarConfig } = require('../server/config');

const config = carregarConfig();
let t0 = new Date('2026-10-10T08:00:00-03:00');
const ctx = () => ({ agora: new Date((t0 = new Date(t0.getTime() + 60000))), config });

function diaAberto() {
    const e = R.novoDia('2026-10-10');
    R.abrirAtendimento(e);
    return e;
}
const cad = (e, nome, sobrenome, tratamento = 'reiki', extra = {}) =>
    R.cadastrar(e, { nome, sobrenome, tratamento, ...extra }, ctx()).paciente;
const erro = (fn) => assert.throws(fn, (e) => e instanceof R.ErroRegra && e);
const codigo = (fn) => {
    try { fn(); } catch (e) { return e.codigo; }
    return null;
};

test('atendimento fechado bloqueia cadastro e chamada', () => {
    const e = R.novoDia('2026-10-10');
    assert.equal(codigo(() => cad(e, 'Maria', 'Silva')), 'fechado');
    assert.equal(codigo(() => R.chamarProximo(e, { tratamento: 'reiki', sala: '1' }, ctx())), 'fechado');
});

test('cadastro valida campos e normaliza espaços', () => {
    const e = diaAberto();
    assert.equal(codigo(() => cad(e, '', 'Silva')), 'invalido');
    assert.equal(codigo(() => cad(e, 'Maria', 'Silva', 'inexistente')), 'invalido');
    const p = cad(e, '  Maria   ', ' da  Silva ');
    assert.equal(p.nome, 'Maria');
    assert.equal(p.sobrenome, 'da Silva');
    assert.equal(p.situacao, 'aguardando');
});

test('fila respeita ordem de chegada', () => {
    const e = diaAberto();
    const a = cad(e, 'Ana', 'A');
    const b = cad(e, 'Bia', 'B');
    const c = cad(e, 'Caio', 'C');
    assert.deepEqual(R.fila(e, 'reiki').map((p) => p.id), [a.id, b.id, c.id]);
});

test('filas por tratamento são independentes', () => {
    const e = diaAberto();
    cad(e, 'Ana', 'A', 'reiki');
    const g = cad(e, 'Gil', 'G', 'gao');
    assert.deepEqual(R.fila(e, 'gao').map((p) => p.id), [g.id]);
});

test('prioridade sobe para o início; entre prioritários vale quem recebeu antes', () => {
    const e = diaAberto();
    const a = cad(e, 'Ana', 'A');
    const b = cad(e, 'Bia', 'B');
    const c = cad(e, 'Caio', 'C');
    R.priorizar(e, { id: c.id });
    R.priorizar(e, { id: b.id });
    assert.deepEqual(R.fila(e, 'reiki').map((p) => p.id), [c.id, b.id, a.id]);
    R.priorizar(e, { id: c.id, prioridade: false });
    assert.deepEqual(R.fila(e, 'reiki').map((p) => p.id), [b.id, a.id, c.id]);
});

test('duplicidade: avisa, e permite confirmar (inclusive em outra fila, ignorando acento/caixa)', () => {
    const e = diaAberto();
    cad(e, 'Maria', 'Silva');
    assert.equal(codigo(() => cad(e, 'MARIA', 'silva')), 'duplicado');
    assert.equal(codigo(() => cad(e, 'Maria', 'Sílva', 'gao')), 'duplicado');
    const p = cad(e, 'Maria', 'Silva', 'gao', { confirmarDuplicado: true });
    assert.equal(p.tratamento, 'gao');
});

test('após concluir, o mesmo paciente entra em outra fila sem aviso', () => {
    const e = diaAberto();
    const p = cad(e, 'Maria', 'Silva', 'reiki');
    R.chamarProximo(e, { tratamento: 'reiki', sala: 'Sala 1', equipeId: 'x' }, ctx());
    R.iniciar(e, { id: p.id }, ctx());
    R.concluir(e, { id: p.id }, ctx());
    const q = cad(e, 'Maria', 'Silva', 'gao');
    assert.equal(q.situacao, 'aguardando');
});

test('chamar próximo: pega o primeiro, exige sala, fila vazia dá erro', () => {
    const e = diaAberto();
    assert.equal(codigo(() => R.chamarProximo(e, { tratamento: 'reiki', sala: 'Sala 1' }, ctx())), 'fila_vazia');
    const a = cad(e, 'Ana', 'A');
    cad(e, 'Bia', 'B');
    assert.equal(codigo(() => R.chamarProximo(e, { tratamento: 'reiki', sala: '  ' }, ctx())), 'invalido');
    const r = R.chamarProximo(e, { tratamento: 'reiki', sala: 'Sala 2', equipeId: 'e1' }, ctx());
    assert.equal(r.paciente.id, a.id);
    assert.equal(r.paciente.situacao, 'chamado');
    assert.equal(r.paciente.sala, 'Sala 2');
    assert.equal(r.chamada.sala, 'Sala 2');
});

test('duas equipes chamando seguidamente recebem pacientes diferentes', () => {
    const e = diaAberto();
    const a = cad(e, 'Ana', 'A');
    const b = cad(e, 'Bia', 'B');
    const r1 = R.chamarProximo(e, { tratamento: 'reiki', sala: '1', equipeId: 'e1' }, ctx());
    const r2 = R.chamarProximo(e, { tratamento: 'reiki', sala: '2', equipeId: 'e2' }, ctx());
    assert.deepEqual([r1.paciente.id, r2.paciente.id], [a.id, b.id]);
});

test('cada aparelho atende um paciente por vez', () => {
    const e = diaAberto();
    cad(e, 'Ana', 'A');
    const b = cad(e, 'Bia', 'B');
    const r1 = R.chamarProximo(e, { tratamento: 'reiki', sala: '1', equipeId: 'e1' }, ctx());
    assert.equal(codigo(() => R.chamarProximo(e, { tratamento: 'reiki', sala: '1', equipeId: 'e1' }, ctx())), 'equipe_ocupada');
    assert.equal(b.situacao, 'aguardando');
    R.iniciar(e, { id: r1.paciente.id }, ctx());
    assert.equal(codigo(() => R.chamarProximo(e, { tratamento: 'reiki', sala: '1', equipeId: 'e1' }, ctx())), 'equipe_ocupada');
    R.concluir(e, { id: r1.paciente.id }, ctx());
    assert.equal(R.chamarProximo(e, { tratamento: 'reiki', sala: '1', equipeId: 'e1' }, ctx()).paciente.id, b.id);
});

test('ciclo completo e transições inválidas', () => {
    const e = diaAberto();
    const p = cad(e, 'Ana', 'A');
    assert.equal(codigo(() => R.iniciar(e, { id: p.id }, ctx())), 'estado_invalido');
    assert.equal(codigo(() => R.concluir(e, { id: p.id }, ctx())), 'estado_invalido');
    R.chamarProximo(e, { tratamento: 'reiki', sala: '1', equipeId: 'e1' }, ctx());
    assert.equal(codigo(() => R.concluir(e, { id: p.id }, ctx())), 'estado_invalido');
    assert.equal(codigo(() => R.remover(e, { id: p.id })), 'estado_invalido');
    R.iniciar(e, { id: p.id }, ctx());
    assert.equal(p.situacao, 'em_atendimento');
    assert.ok(p.iniciado);
    R.concluir(e, { id: p.id }, ctx());
    assert.equal(p.situacao, 'concluido');
    assert.ok(p.concluido);
    assert.equal(codigo(() => R.concluir(e, { id: p.id }, ctx())), 'estado_invalido');
});

test('rechamar repete a chamada sem mudar a situação nem duplicar o histórico', () => {
    const e = diaAberto();
    const p = cad(e, 'Ana', 'A');
    const outro = cad(e, 'Bia', 'B');
    R.chamarProximo(e, { tratamento: 'reiki', sala: '1', equipeId: 'e1' }, ctx());
    R.chamarProximo(e, { tratamento: 'reiki', sala: '2', equipeId: 'e2' }, ctx());
    const r = R.rechamar(e, { id: p.id }, ctx());
    assert.equal(p.situacao, 'chamado');
    assert.equal(p.chamadas, 2);
    assert.deepEqual(e.historicoChamadas.map((c) => c.pacienteId), [p.id, outro.id]);
    assert.ok(r.chamada.seq > e.historicoChamadas[1].seq);
});

test('não compareceu: sai do histórico e libera o aparelho', () => {
    const e = diaAberto();
    const p = cad(e, 'Ana', 'A');
    const b = cad(e, 'Bia', 'B');
    R.chamarProximo(e, { tratamento: 'reiki', sala: '1', equipeId: 'e1' }, ctx());
    R.naoCompareceu(e, { id: p.id }, ctx());
    assert.equal(p.situacao, 'nao_compareceu');
    assert.equal(e.historicoChamadas.length, 0);
    assert.equal(R.chamarProximo(e, { tratamento: 'reiki', sala: '1', equipeId: 'e1' }, ctx()).paciente.id, b.id);
});

test('recepção: corrigir, trocar de fila (vai para o fim) e remover', () => {
    const e = diaAberto();
    const a = cad(e, 'Ana', 'A', 'reiki');
    const g1 = cad(e, 'Gil', 'G', 'gao');
    R.corrigir(e, { id: a.id, nome: 'Anna' }, ctx());
    assert.equal(a.nome, 'Anna');
    R.trocarFila(e, { id: a.id, tratamento: 'gao' }, ctx());
    assert.deepEqual(R.fila(e, 'gao').map((p) => p.id), [g1.id, a.id]);
    assert.equal(R.fila(e, 'reiki').length, 0);
    R.remover(e, { id: a.id });
    assert.equal(a.situacao, 'removido');
    assert.deepEqual(R.fila(e, 'gao').map((p) => p.id), [g1.id]);
});

test('fechar atendimento apaga filas e chamadas e bloqueia novas ações', () => {
    const e = diaAberto();
    cad(e, 'Ana', 'A');
    R.chamarProximo(e, { tratamento: 'reiki', sala: '1' }, ctx());
    R.fecharAtendimento(e);
    assert.equal(e.pacientes.length, 0);
    assert.equal(e.historicoChamadas.length, 0);
    assert.equal(e.atendimentoAberto, false);
    assert.equal(codigo(() => cad(e, 'Bia', 'B')), 'fechado');
});

test('erro de regra não altera o estado', () => {
    const e = diaAberto();
    cad(e, 'Ana', 'A');
    const antes = JSON.stringify(e);
    codigo(() => R.chamarProximo(e, { tratamento: 'reiki', sala: '' }, ctx()));
    codigo(() => R.cadastrar(e, { nome: 'x', sobrenome: '', tratamento: 'reiki' }, ctx()));
    assert.equal(JSON.stringify(e), antes);
});
