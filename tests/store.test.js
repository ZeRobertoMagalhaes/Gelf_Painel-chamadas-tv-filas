const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { criarStore } = require('../server/store');
const R = require('../server/regras');
const { carregarConfig } = require('../server/config');

const pasta = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gelf-store-'));
const hoje = () => new Date('2026-10-10T09:00:00-03:00');
const dia = R.dataLocal(hoje());

test('grava e recupera o estado no mesmo dia (reinício do servidor)', () => {
    const dir = pasta();
    const s1 = criarStore(dir, hoje);
    const e = s1.carregar();
    R.abrirAtendimento(e);
    R.cadastrar(e, { nome: 'Maria', sobrenome: 'Silva', tratamento: 'reiki' }, { agora: hoje(), config: carregarConfig() });
    s1.salvar(e);
    const lido = criarStore(dir, hoje).carregar();
    assert.equal(lido.atendimentoAberto, true);
    assert.equal(lido.pacientes[0].nome, 'Maria');
    assert.equal(lido.seq, 1);
});

test('apaga arquivos de dias anteriores ao iniciar', () => {
    const dir = pasta();
    fs.writeFileSync(path.join(dir, 'fila-2026-10-09.json'), JSON.stringify({ data: '2026-10-09', pacientes: [{ nome: 'Antigo' }] }));
    fs.writeFileSync(path.join(dir, 'fila-2026-10-08.json.corrompido'), 'x');
    const e = criarStore(dir, hoje).carregar();
    assert.equal(e.data, dia);
    assert.equal(e.pacientes.length, 0);
    assert.deepEqual(fs.readdirSync(dir), [`fila-${dia}.json`]);
});

test('gravação é atômica: não deixa .tmp e o arquivo anterior sobrevive a um .tmp incompleto', () => {
    const dir = pasta();
    const s = criarStore(dir, hoje);
    const e = s.carregar();
    e.seq = 7;
    s.salvar(e);
    // simula queda de energia no meio de uma gravação seguinte
    fs.writeFileSync(`${s.arquivoDoDia(dia)}.tmp`, '{"data":"truncad');
    const lido = criarStore(dir, hoje).carregar();
    assert.equal(lido.seq, 7);
    assert.ok(!fs.readdirSync(dir).some((n) => n.endsWith('.tmp')));
});

test('arquivo corrompido: começa vazio e preserva o original para análise', () => {
    const dir = pasta();
    fs.writeFileSync(path.join(dir, `fila-${dia}.json`), '{lixo');
    const e = criarStore(dir, hoje).carregar();
    assert.equal(e.pacientes.length, 0);
    assert.ok(fs.existsSync(path.join(dir, `fila-${dia}.json.corrompido`)));
});
