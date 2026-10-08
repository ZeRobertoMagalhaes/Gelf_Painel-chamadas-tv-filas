const test = require('node:test');
const assert = require('node:assert/strict');
const { carregarConfig, normalizar } = require('../server/config');

test('salas: padrão do arquivo e valores inválidos caem no padrão', () => {
    const c = carregarConfig();
    assert.deepEqual(c.salas, { quantidade: 6, prefixo: 'Sala', extras: ['Sala Reiki'] });
    const t = [{ id: 'a', nome: 'A', cor: '#111111' }];
    assert.deepEqual(normalizar({ tratamentos: t }).salas, { quantidade: 6, prefixo: 'Sala', extras: [] });
    assert.deepEqual(normalizar({ tratamentos: t, salas: { quantidade: 999, prefixo: '  ' } }).salas, { quantidade: 6, prefixo: 'Sala', extras: [] });
    assert.deepEqual(normalizar({ tratamentos: t, salas: { quantidade: 4, prefixo: 'Maca', extras: [' Sala Reiki ', '', 7] } }).salas, { quantidade: 4, prefixo: 'Maca', extras: ['Sala Reiki'] });
});
