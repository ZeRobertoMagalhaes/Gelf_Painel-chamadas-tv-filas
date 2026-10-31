const test = require('node:test');
const assert = require('node:assert/strict');
const { renderizarInicio, enderecosParaExibir } = require('../server/inicio');

test('página inicial: links das telas, seções por tipo de tratamento e dois QR codes (nome e IP) em cada uma', () => {
    const html = renderizarInicio({ porta: 3000, nomeMdns: 'painel-gelf-filas.local', ips: ['192.168.0.10', '10.0.0.5'] });
    for (const href of ['/bio/recepcao', '/controle', '/bio/painel', '/bio/relatorio', '/recepcao', '/atendimento', '/painel', '/relatorio', '/diagnostico', '/painel-simples', '/bio/painel-simples']) {
        assert.ok(html.includes(`href="${href}"`), href);
    }
    assert.ok(html.includes('http://painel-gelf-filas.local:3000/'));
    assert.ok(html.includes('Tratamentos - Evangelho Terapia') && html.includes('Tratamentos - Bio Energia'));
    // QR codes de cada tipo: pelo nome e por cada IP, apontando para a tela usada no celular
    for (const caminho of ['/atendimento', '/bio/controle']) {
        assert.ok(html.includes(`<code>http://painel-gelf-filas.local:3000${caminho}</code>`), caminho);
        assert.ok(html.includes(`<code>http://192.168.0.10:3000${caminho}</code>`), caminho);
        assert.ok(html.includes(`<code>http://10.0.0.5:3000${caminho}</code>`), caminho);
    }
    assert.equal((html.match(/<svg /g) || []).length, 6); // 2 tipos x (1 pelo nome + 2 pelos IPs)
});

test('página inicial: sem rede avisa em vez de mostrar QR pelo IP; texto externo é escapado', () => {
    const html = renderizarInicio({ porta: 3000, nomeMdns: '<x>.local', ips: [] });
    assert.ok(html.includes('Nenhuma rede detectada'));
    assert.equal((html.match(/<svg /g) || []).length, 2); // só os QR codes pelo nome
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
