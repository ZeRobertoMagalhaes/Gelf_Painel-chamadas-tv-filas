const fs = require('fs');
const path = require('path');
const { dataLocal, novoDia } = require('./regras');

const PADRAO_ARQUIVO = /^fila-(\d{4}-\d{2}-\d{2})\.json(?:\.corrompido)?$/;

// Armazenamento em arquivo JSON: um arquivo por dia (fila-AAAA-MM-DD.json).
//  - Gravação segura: escreve num .tmp e só então renomeia sobre o oficial;
//    se faltar luz no meio, o arquivo anterior continua íntegro.
//  - Recuperação: ao iniciar no mesmo dia, relê o arquivo do dia.
//  - Limpeza: arquivos de outros dias são apagados (dados pessoais não ficam
//    guardados além do dia de atendimento).
function criarStore(pasta, relogio = () => new Date()) {
    fs.mkdirSync(pasta, { recursive: true });

    const arquivoDoDia = (data) => path.join(pasta, `fila-${data}.json`);

    function limparOutrosDias(dataAtual) {
        for (const nome of fs.readdirSync(pasta)) {
            const m = PADRAO_ARQUIVO.exec(nome);
            if (m && m[1] !== dataAtual) fs.rmSync(path.join(pasta, nome), { force: true });
            else if (nome.endsWith('.tmp')) fs.rmSync(path.join(pasta, nome), { force: true });
        }
    }

    function salvar(estado) {
        const destino = arquivoDoDia(estado.data);
        const temporario = `${destino}.tmp`;
        const fd = fs.openSync(temporario, 'w');
        try {
            fs.writeSync(fd, JSON.stringify(estado, null, 2));
            fs.fsyncSync(fd);
        } finally {
            fs.closeSync(fd);
        }
        fs.renameSync(temporario, destino);
    }

    function carregar() {
        const hoje = dataLocal(relogio());
        limparOutrosDias(hoje);
        try {
            const lido = JSON.parse(fs.readFileSync(arquivoDoDia(hoje), 'utf8'));
            if (lido && lido.data === hoje && Array.isArray(lido.pacientes)) {
                return { ...novoDia(hoje), ...lido, historicoChamadas: lido.historicoChamadas || [] };
            }
        } catch (e) {
            if (e.code !== 'ENOENT') {
                // Arquivo corrompido: guarda de lado para análise e começa o dia vazio.
                console.error('Arquivo do dia ilegível, iniciando vazio:', e.message);
                try { fs.renameSync(arquivoDoDia(hoje), `${arquivoDoDia(hoje)}.corrompido`); } catch { /* sem problema */ }
            }
        }
        const vazio = novoDia(hoje);
        salvar(vazio);
        return vazio;
    }

    return { carregar, salvar, arquivoDoDia, limparOutrosDias };
}

module.exports = { criarStore };
