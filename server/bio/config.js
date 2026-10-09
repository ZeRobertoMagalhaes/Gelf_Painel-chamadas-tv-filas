const fs = require('fs');
const path = require('path');
const { normalizar } = require('../config');

const ID = /^[a-z0-9_-]+$/;
const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const inteiro = (v, min, max, padrao) => (Number.isInteger(v) && v >= min && v <= max ? v : padrao);

// Configuração do módulo bioenergético (config/bio.json): locais de espera,
// etapas (cada uma com suas salas e capacidades) e a rota padrão. Mudar o
// fluxo é editar este arquivo; valores inválidos são descartados.
function normalizarBio(bruto) {
    const locais = (Array.isArray(bruto.locais) ? bruto.locais : [])
        .filter((l) => l && ID.test(l.id) && texto(l.nome, 40))
        .map((l) => ({ id: l.id, nome: texto(l.nome, 40) }));
    if (locais.length === 0) locais.push({ id: 'espera', nome: 'Sala de espera' });

    const etapasBrutas = (Array.isArray(bruto.etapas) ? bruto.etapas : []).filter((e) => e && ID.test(e.id) && texto(e.nome, 40));
    // Cor e demais campos comuns passam pela mesma validação dos tratamentos.
    const base = normalizar({ tratamentos: etapasBrutas.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor })), som: bruto.som, painel: bruto.painel });
    const etapas = base.tratamentos.map((t) => {
        const e = etapasBrutas.find((x) => x.id === t.id);
        const salas = (Array.isArray(e.salas) ? e.salas : [])
            .filter((s) => s && ID.test(s.id) && texto(s.nome, 40))
            .map((s) => ({ id: s.id, nome: texto(s.nome, 40), capacidade: inteiro(s.capacidade, 1, 20, 1) }));
        if (salas.length === 0) throw new Error(`bio.json: a etapa "${t.id}" precisa de ao menos uma sala.`);
        return {
            ...t,
            esperaEm: locais.some((l) => l.id === e.esperaEm) ? e.esperaEm : locais[0].id,
            preparo: e.preparo === true,
            salas: salas.map((s) => ({ ...s, etapa: t.id })),
        };
    });
    const ids = new Set();
    for (const s of etapas.flatMap((e) => e.salas)) {
        if (ids.has(s.id)) throw new Error(`bio.json: id de sala repetido: "${s.id}".`);
        ids.add(s.id);
    }
    const rotaPadrao = (Array.isArray(bruto.rotaPadrao) ? bruto.rotaPadrao : etapas.map((e) => e.id)).filter((id, i, a) => etapas.some((e) => e.id === id) && a.indexOf(id) === i);
    return { locais, etapas, rotaPadrao, som: base.som, painel: base.painel };
}

function carregarConfigBio(arquivo = path.join(__dirname, '..', '..', 'config', 'bio.json')) {
    return normalizarBio(JSON.parse(fs.readFileSync(arquivo, 'utf8')));
}

module.exports = { carregarConfigBio, normalizarBio };
