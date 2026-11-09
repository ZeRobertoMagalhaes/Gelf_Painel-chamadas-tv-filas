const fs = require('fs');
const path = require('path');
const R = require('./regras');

// Último limite de "pacientes chamados ao mesmo tempo" usado pela recepção (por tratamento).
// Fica em dados/limites-padrao.json, que NÃO é apagado na virada do dia: todo dia novo já
// começa com esses valores, e a recepção só ajusta o que mudou. Não tem dados de pacientes.
function criarLimitesPadrao(pasta, arquivo = 'limites-padrao.json') {
    const caminho = path.join(pasta, arquivo);

    // Lê o arquivo; ausente, ilegível ou com valores inválidos nunca derruba o sistema (vale o que for válido).
    function carregar(config) {
        try {
            return R.filtrarLimites(JSON.parse(fs.readFileSync(caminho, 'utf8')), config);
        } catch {
            return {};
        }
    }

    // Gravação segura (.tmp + rename), como o arquivo do dia. Falhar aqui não impede o atendimento.
    function salvar(limites) {
        try {
            fs.mkdirSync(pasta, { recursive: true });
            fs.writeFileSync(`${caminho}.tmp`, JSON.stringify(limites, null, 2));
            fs.renameSync(`${caminho}.tmp`, caminho);
        } catch (e) {
            console.error('Não foi possível gravar os limites padrão:', e.message);
        }
    }

    return { carregar, salvar, caminho };
}

module.exports = { criarLimitesPadrao };
