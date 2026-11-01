const test = require('node:test');
const assert = require('node:assert/strict');
const { carregarConfig, normalizar } = require('../server/config');

test('salas: padrão do arquivo e valores inválidos caem no padrão', () => {
    const c = carregarConfig();
    assert.deepEqual(c.salas, { quantidade: 6, prefixo: 'Sala', extras: ['Sala Reiki', 'Sala Prioritários - Térreo'] });
    const t = [{ id: 'a', nome: 'A', cor: '#111111' }];
    assert.deepEqual(normalizar({ tratamentos: t }).salas, { quantidade: 6, prefixo: 'Sala', extras: [] });
    assert.deepEqual(normalizar({ tratamentos: t, salas: { quantidade: 999, prefixo: '  ' } }).salas, { quantidade: 6, prefixo: 'Sala', extras: [] });
    assert.deepEqual(normalizar({ tratamentos: t, salas: { quantidade: 4, prefixo: 'Maca', extras: [' Sala Reiki ', '', 7] } }).salas, { quantidade: 4, prefixo: 'Maca', extras: ['Sala Reiki'] });
});

test('rede.ipServidor: aceita IPv4 e ignora valores inválidos', () => {
    assert.equal(carregarConfig().rede.ipServidor, '192.168.0.192');
    const t = [{ id: 'a', nome: 'A', cor: '#111111' }];
    assert.equal(normalizar({ tratamentos: t }).rede.ipServidor, '');
    assert.equal(normalizar({ tratamentos: t, rede: { ipServidor: ' 10.0.0.7 ' } }).rede.ipServidor, '10.0.0.7');
    assert.equal(normalizar({ tratamentos: t, rede: { ipServidor: 'meu-servidor' } }).rede.ipServidor, '');
    assert.equal(normalizar({ tratamentos: t, rede: { ipServidor: 7 } }).rede.ipServidor, '');
});
