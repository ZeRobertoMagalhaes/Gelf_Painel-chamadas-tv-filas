const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { criarStore } = require('../server/store');
const { criarApp } = require('../server/app');
const { criarLimitesPadrao } = require('../server/limitesPadrao');
const { carregarConfig } = require('../server/config');

const config = carregarConfig();
const pasta = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gelf-lim-'));
const todos = (valor) => Object.fromEntries(config.tratamentos.map((t) => [t.id, valor]));

function subir(dir, relogio) {
    const app = criarApp({ config, store: criarStore(dir, relogio), io: { emit() {} }, relogio, limitesPadrao: criarLimitesPadrao(dir) });
    return app;
}

test('arquivo de limites padrão: ausente vale vazio; grava e relê; ignora o que for inválido ou corrompido', () => {
    const dir = pasta();
    const lp = criarLimitesPadrao(dir);
    assert.deepEqual(lp.carregar(config), {});
    lp.salvar({ reiki: 3, gao: 2 });
    assert.deepEqual(criarLimitesPadrao(dir).carregar(config), { reiki: 3, gao: 2 });
    assert.ok(!fs.existsSync(`${lp.caminho}.tmp`));
    fs.writeFileSync(lp.caminho, JSON.stringify({ reiki: 0, gao: 21, passe: 'x', acolhimento: 4, inexistente: 5, entrevista: 2.5 }));
    assert.deepEqual(lp.carregar(config), { acolhimento: 4 });
    fs.writeFileSync(lp.caminho, '{ não é json');
    assert.deepEqual(lp.carregar(config), {});
});

test('o limite usado na abertura vale também nos dias seguintes, até a recepção mudar', () => {
    const dir = pasta();
    let agora = new Date('2026-10-10T08:00:00-03:00');
    const app = subir(dir, () => agora);
    assert.deepEqual(app.visao().limites, todos(1)); // primeira vez: padrão 1

    assert.equal(app.executar('abrirAtendimento', { limites: todos(3) }).ok, true);
    assert.deepEqual(app.visao().limites, todos(3));

    // dia seguinte, servidor ligado: começa fechado, já com 3 em todos
    agora = new Date('2026-10-11T08:00:00-03:00');
    assert.equal(app.verificarVirada(), true);
    assert.equal(app.visao().atendimentoAberto, false);
    assert.deepEqual(app.visao().limites, todos(3));
    assert.ok(fs.existsSync(path.join(dir, 'limites-padrao.json')), 'o arquivo de padrão não é apagado na virada do dia');

    // ajuste durante o dia também vira o novo padrão
    app.executar('abrirAtendimento', {});
    assert.equal(app.executar('definirLimites', { limites: { reiki: 2 } }).ok, true);
    agora = new Date('2026-10-12T08:00:00-03:00');
    app.verificarVirada();
    assert.deepEqual(app.visao().limites, { ...todos(3), reiki: 2 });

    // servidor reiniciado em outro dia (processo novo): também lê o padrão
    agora = new Date('2026-10-13T08:00:00-03:00');
    const reiniciado = subir(dir, () => agora);
    assert.deepEqual(reiniciado.visao().limites, { ...todos(3), reiki: 2 });
});

test('limite inválido na abertura não altera o padrão guardado', () => {
    const dir = pasta();
    const app = subir(dir, () => new Date('2026-10-10T08:00:00-03:00'));
    app.executar('abrirAtendimento', { limites: todos(2) });
    app.executar('fecharAtendimento', {});
    assert.equal(app.executar('abrirAtendimento', { limites: { reiki: 99 } }).ok, false);
    assert.deepEqual(criarLimitesPadrao(dir).carregar(config), todos(2));
});
