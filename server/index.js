const os = require('os');
const path = require('path');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mdns = require('multicast-dns');
const { carregarConfig } = require('./config');
const { criarStore } = require('./store');
const { criarApp } = require('./app');
const { carregarConfigBio } = require('./bio/config');
const { novoDiaBio } = require('./bio/regras');
const { criarAppBio } = require('./bio/app');

const PORT = process.env.PORT || 3000;
// Nome fixo na rede local (http://painel-gelf.local:3000), respondido pelo
// próprio servidor — não depende de Bonjour nem do nome do computador.
const MDNS_HOST = `${(process.env.MDNS_HOST || 'painel-gelf').toLowerCase()}.local`;

function enderecosIpv4Atuais() {
    const enderecos = [];
    for (const lista of Object.values(os.networkInterfaces())) {
        for (const e of lista || []) {
            if (e.family === 'IPv4' && !e.internal) enderecos.push(e.address);
        }
    }
    return enderecos;
}

function iniciarRespondedorMdns() {
    const respondedor = mdns();
    respondedor.on('query', (consulta) => {
        const relevante = consulta.questions.some((p) => p.type === 'A' && p.name.toLowerCase() === MDNS_HOST);
        if (!relevante) return;
        const ips = enderecosIpv4Atuais();
        if (ips.length === 0) return;
        respondedor.respond({ answers: ips.map((ip) => ({ name: MDNS_HOST, type: 'A', ttl: 120, data: ip })) });
    });
    // Falha de mDNS (ex: firewall na UDP 5353) não derruba o servidor: o
    // painel continua acessível pelo IP numérico.
    respondedor.on('error', (erro) => console.error(`mDNS (${MDNS_HOST}) com problema:`, erro.message));
    const encerrar = () => {
        respondedor.destroy();
        process.exit(0);
    };
    process.on('SIGINT', encerrar);
    process.on('SIGTERM', encerrar);
}

const config = carregarConfig();
const store = criarStore(path.join(__dirname, '..', 'dados'));
const expressApp = express();
const httpServer = createServer(expressApp);
const io = new Server(httpServer);
const app = criarApp({ config, store, io });
// Módulo bioenergético: namespace "/bio" do Socket.io e arquivo diário próprio (bio-AAAA-MM-DD.json).
const appBio = criarAppBio({
    config: carregarConfigBio(),
    store: criarStore(path.join(__dirname, '..', 'dados'), undefined, { prefixo: 'bio', novoDia: novoDiaBio }),
    io: io.of('/bio'),
});

expressApp.use(express.static(path.join(__dirname, '..', 'public')));
expressApp.get('/status', (req, res) => {
    const e = app.obterEstado();
    res.json({ servico: 'painel-gelf-filas', data: e.data, atendimentoAberto: e.atendimentoAberto });
});
// Atalhos curtos para as três telas.
for (const tela of ['recepcao', 'atendimento', 'painel']) {
    expressApp.get(`/${tela}`, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', `${tela}.html`)));
}

io.on('connection', app.aoConectar);
io.of('/bio').on('connection', appBio.aoConectar);
// Virada do dia com o servidor ligado (notebook que ficou ligado a noite toda).
setInterval(app.verificarVirada, 60 * 1000).unref();
setInterval(appBio.verificarVirada, 60 * 1000).unref();

// Telas do módulo bioenergético.
for (const tela of ['controle', 'painel']) {
    expressApp.get(`/bio/${tela}`, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', `bio-${tela}.html`)));
}
expressApp.get('/bio', (req, res) => res.redirect('/bio/controle'));

httpServer.listen(PORT, () => {
    iniciarRespondedorMdns();
    console.log(`Painel GELF (filas) em http://0.0.0.0:${PORT}`);
    for (const tela of ['recepcao', 'atendimento', 'painel']) {
        console.log(`  ${tela.padEnd(11)} http://${MDNS_HOST}:${PORT}/${tela}   (ou http://<ip-do-servidor>:${PORT}/${tela})`);
    }
    for (const tela of ['controle', 'painel']) {
        console.log(`  bio ${tela.padEnd(7)} http://${MDNS_HOST}:${PORT}/bio/${tela}`);
    }
});
