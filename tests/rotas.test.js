const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const express = require('express');
const { registrarRotas } = require('../server/rotas');

async function comServidor(fn) {
    const app = express();
    registrarRotas(app, {
        publicDir: path.join(__dirname, '..', 'public'),
        porta: 3000,
        nomeMdns: 'painel-gelf-filas.local',
        obterEstadoFilas: () => ({ data: '2026-10-12', atendimentoAberto: true }),
        interfaces: () => ({ 'Wi-Fi': [{ family: 'IPv4', address: '192.168.0.50', internal: false }] }),
    });
    const servidor = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
    try {
        await fn(`http://localhost:${servidor.address().port}`);
    } finally {
        servidor.close();
    }
}
const get = (url, opcoes = {}) => fetch(url, { redirect: 'manual', ...opcoes });

test('rotas: página inicial com links das telas e QR code do IP atual', async () => {
    await comServidor(async (base) => {
        const r = await get(`${base}/`);
        assert.equal(r.status, 200);
        assert.match(r.headers.get('content-type'), /html/);
        assert.equal(r.headers.get('cache-control'), 'no-store');
        const html = await r.text();
        assert.ok(html.includes('http://192.168.0.50:3000/') && html.includes('<svg '));
        for (const href of ['/bio/recepcao', '/controle', '/bio/painel', '/bio/relatorio', '/recepcao', '/atendimento', '/painel']) {
            assert.ok(html.includes(`href="${href}"`), href);
        }
    });
});

test('rotas: painel simples e diagnóstico (TV Box), com JavaScript ES5 de verdade', async () => {
    await comServidor(async (base) => {
        for (const rota of ['/painel-simples', '/bio/painel-simples', '/diagnostico', '/legado/painel-simples.js', '/legado/diagnostico.js']) {
            const r = await get(`${base}${rota}`);
            assert.equal(r.status, 200, rota);
        }
        assert.match(await (await get(`${base}/bio/painel-simples`)).text(), /painel-simples\.js/);
    });
    // os arquivos antigos precisam ser ES5 (sem =>, let/const, crases, ?. ou ??), senão não servem à TV Box
    let acorn = null;
    try { acorn = require('../web/node_modules/acorn'); } catch { /* sem as dependências de desenvolvimento */ }
    if (acorn) {
        for (const f of ['painel-simples.js', 'diagnostico.js']) {
            const codigo = require('fs').readFileSync(path.join(__dirname, '..', 'server', 'legado', f), 'utf8');
            assert.doesNotThrow(() => acorn.parse(codigo, { ecmaVersion: 5 }), f);
        }
    }
});

test('rotas: todas as telas existem, e /controle e /bio levam ao controle do Bio', async () => {
    await comServidor(async (base) => {
        for (const rota of ['/bio/recepcao', '/bio/controle', '/bio/painel', '/bio/relatorio', '/recepcao', '/atendimento', '/painel', '/relatorio']) {
            const r = await get(`${base}${rota}`);
            assert.equal(r.status, 200, rota);
            assert.match(await r.text(), /<div id="app">/, rota);
        }
        for (const rota of ['/controle', '/bio']) {
            const r = await get(`${base}${rota}`);
            assert.equal(r.status, 302, rota);
            assert.equal(new URL(r.headers.get('location'), base).pathname, '/bio/controle', rota);
        }
        assert.deepEqual(await (await get(`${base}/status`)).json(), { servico: 'painel-gelf-filas', data: '2026-10-12', atendimentoAberto: true });
    });
});
