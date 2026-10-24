const test = require('node:test');
const assert = require('node:assert/strict');
const { renderizarInicio, enderecosParaExibir } = require('../server/inicio');

test('página inicial: links de todas as telas, nome na rede e um QR code por IP', () => {
    const html = renderizarInicio({ porta: 3000, nomeMdns: 'painel-gelf.local', ips: ['192.168.0.10', '10.0.0.5'] });
    for (const href of ['/bio/recepcao', '/controle', '/bio/painel', '/bio/relatorio', '/recepcao', '/atendimento', '/painel']) {
        assert.ok(html.includes(`href="${href}"`), href);
    }
    assert.ok(html.includes('http://painel-gelf.local:3000/'));
    assert.ok(html.includes('http://192.168.0.10:3000/') && html.includes('http://10.0.0.5:3000/'));
    assert.equal((html.match(/<svg /g) || []).length, 2); // um QR por endereço
});

test('página inicial: sem rede avisa em vez de mostrar QR; texto externo é escapado', () => {
    const html = renderizarInicio({ porta: 3000, nomeMdns: '<x>.local', ips: [] });
    assert.ok(html.includes('Nenhuma rede detectada'));
    assert.equal((html.match(/<svg /g) || []).length, 0);
    assert.ok(!html.includes('<x>.local') && html.includes('&lt;x&gt;.local'));
});

test('endereços exibidos: ignora redes virtuais, locais e link-local; 192.168 primeiro', () => {
    const v4 = (address, internal = false) => [{ family: 'IPv4', address, internal }];
    const ips = enderecosParaExibir({
        lo: v4('127.0.0.1', true),
        docker0: v4('172.17.0.1'),
        'br-abc123': v4('172.19.0.1'),
        'vEthernet (WSL)': v4('172.28.0.1'),
        'Ethernet 2': v4('10.0.0.8'),
        'Wi-Fi': v4('192.168.0.103'),
        'Wi-Fi 2': v4('169.254.1.2'),
    });
    assert.deepEqual(ips, ['192.168.0.103', '10.0.0.8']);
});

test('endereços exibidos: aceita family numérico (Node 18.0 a 18.3)', () => {
    const ips = enderecosParaExibir({ 'Wi-Fi': [{ family: 4, address: '192.168.1.7', internal: false }, { family: 6, address: 'fe80::1', internal: false }] });
    assert.deepEqual(ips, ['192.168.1.7']);
});
