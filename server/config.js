const fs = require('fs');
const path = require('path');

const PADRAO = {
    tratamentos: [],
    som: { repeticoes: 2, intervaloMs: 4000, volume: 0.3 },
    painel: { destaqueMs: 15000, exibirSobrenomeCompleto: true, ultimasChamadas: 4 },
};

function numeroEntre(valor, min, max, padrao) {
    return Number.isFinite(valor) && valor >= min && valor <= max ? valor : padrao;
}

// Valida o arquivo editável pela equipe técnica. Valores inválidos caem no
// padrão em vez de derrubar o servidor no dia do atendimento; só a lista de
// tratamentos é obrigatória (sem ela o sistema não tem o que mostrar).
function normalizar(bruto) {
    const tratamentos = (Array.isArray(bruto.tratamentos) ? bruto.tratamentos : [])
        .filter((t) => t && typeof t.id === 'string' && /^[a-z0-9_-]+$/.test(t.id) && typeof t.nome === 'string' && t.nome.trim())
        .map((t) => ({
            id: t.id,
            nome: t.nome.trim(),
            cor: /^#[0-9a-fA-F]{6}$/.test(t.cor) ? t.cor : '#1e40af',
        }));
    if (tratamentos.length === 0) {
        throw new Error('configuracao.json: defina ao menos um tratamento (id, nome, cor).');
    }
    const som = bruto.som || {};
    const painel = bruto.painel || {};
    return {
        tratamentos,
        som: {
            repeticoes: numeroEntre(som.repeticoes, 1, 5, PADRAO.som.repeticoes),
            intervaloMs: numeroEntre(som.intervaloMs, 500, 15000, PADRAO.som.intervaloMs),
            volume: numeroEntre(som.volume, 0, 1, PADRAO.som.volume),
        },
        painel: {
            destaqueMs: numeroEntre(painel.destaqueMs, 3000, 120000, PADRAO.painel.destaqueMs),
            exibirSobrenomeCompleto: painel.exibirSobrenomeCompleto !== false,
            ultimasChamadas: numeroEntre(painel.ultimasChamadas, 0, 8, PADRAO.painel.ultimasChamadas),
        },
    };
}

function carregarConfig(arquivo = path.join(__dirname, '..', 'config', 'configuracao.json')) {
    return normalizar(JSON.parse(fs.readFileSync(arquivo, 'utf8')));
}

module.exports = { carregarConfig, normalizar };
