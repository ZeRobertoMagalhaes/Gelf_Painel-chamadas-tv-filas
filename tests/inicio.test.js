const test = require('node:test');
const assert = require('node:assert/strict');
const { renderizarInicio, enderecosParaExibir, enderecosDaPagina } = require('../server/inicio');

test('página inicial: links das telas, seções por tipo de tratamento e dois QR codes (nome e IP principal) em cada uma', () => {
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
        assert.ok(!html.includes(`http://10.0.0.5:3000${caminho}`), 'só o IP principal tem QR code');
    }
    assert.ok(html.includes('<code>http://10.0.0.5:3000/</code>')); // os demais IPs ficam só em texto
    assert.equal((html.match(/<svg /g) || []).length, 4); // 2 tipos x (1 pelo nome + 1 pelo IP)
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

test('endereços exibidos: o IP do servidor configurado vai primeiro; ausente, vale a ordem normal', () => {
    const v4 = (address) => [{ family: 'IPv4', address, internal: false }];
    const rede = { 'Ethernet': v4('192.168.0.103'), 'Wi-Fi': v4('192.168.0.192'), 'Wi-Fi 2': v4('192.168.0.143') };
    assert.deepEqual(enderecosParaExibir(rede, '192.168.0.192'), ['192.168.0.192', '192.168.0.103', '192.168.0.143']);
    assert.deepEqual(enderecosParaExibir(rede, '192.168.0.50'), ['192.168.0.103', '192.168.0.192', '192.168.0.143']);
    assert.deepEqual(enderecosParaExibir(rede), ['192.168.0.103', '192.168.0.192', '192.168.0.143']);
});

test('QR code pelo IP sempre disponível: cai para placas "virtuais", IP do servidor configurado e endereço da requisição', () => {
    const v4 = (address, internal = false) => [{ family: 'IPv4', address, internal }];
    // Só há placa com nome de rede virtual: ainda assim é o IP do computador.
    assert.deepEqual(enderecosDaPagina({ lo: v4('127.0.0.1', true), 'vEthernet (Padrão)': v4('172.20.0.2') }), ['172.20.0.2']);
    // Placas reais têm preferência sobre as virtuais.
    assert.deepEqual(enderecosDaPagina({ docker0: v4('172.17.0.1'), 'Wi-Fi': v4('192.168.0.5') }), ['192.168.0.5']);
    // Sem nenhuma placa: usa o IP do servidor da configuração.
    assert.deepEqual(enderecosDaPagina({ lo: v4('127.0.0.1', true) }, '192.168.0.192'), ['192.168.0.192']);
    // Sem placa nem configuração: o IP numérico pelo qual a página foi aberta (nunca localhost).
    assert.deepEqual(enderecosDaPagina({}, '', '192.168.0.50:3000'), ['192.168.0.50']);
    assert.deepEqual(enderecosDaPagina({}, '', 'localhost:3000'), []);
    assert.deepEqual(enderecosDaPagina({}, '', '127.0.0.1:3000'), []);
    assert.deepEqual(enderecosDaPagina({}, '', 'painel-gelf-filas.local:3000'), []);
});
