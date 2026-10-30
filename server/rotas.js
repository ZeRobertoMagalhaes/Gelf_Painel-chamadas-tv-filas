const os = require('os');
const path = require('path');
const express = require('express');
const { renderizarInicio, enderecosParaExibir } = require('./inicio');

// Rotas HTTP do sistema (arquivos das telas, atalhos e página inicial). Ficam
// fora do index.js para poderem ser testadas sem subir o servidor completo.
function registrarRotas(expressApp, { publicDir, porta, nomeMdns, obterEstadoFilas, interfaces = () => os.networkInterfaces(), legadoDir = path.join(__dirname, 'legado') }) {
    const tela = (arquivo) => (req, res) => res.sendFile(path.join(publicDir, arquivo));

    expressApp.use(express.static(publicDir));
    expressApp.get('/status', (req, res) => {
        const e = obterEstadoFilas();
        res.json({ servico: 'painel-gelf-filas', data: e.data, atendimentoAberto: e.atendimentoAberto });
    });

    // Página inicial: links para todas as telas e QR code do endereço atual (muda com o IP).
    expressApp.get('/', (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.type('html').send(renderizarInicio({ porta, nomeMdns, ips: enderecosParaExibir(interfaces()) }));
    });

    // Versão simples da TV e diagnóstico, em JavaScript antigo, para TV Box e navegadores velhos.
    expressApp.use('/legado', express.static(legadoDir));
    expressApp.get(['/painel-simples', '/bio/painel-simples'], (req, res) => res.sendFile(path.join(legadoDir, 'painel-simples.html')));
    expressApp.get('/diagnostico', (req, res) => res.sendFile(path.join(legadoDir, 'diagnostico.html')));

    // Atalhos curtos para as telas das filas.
    for (const nome of ['recepcao', 'atendimento', 'painel', 'relatorio']) expressApp.get(`/${nome}`, tela(`${nome}.html`));

    // Telas do módulo bioenergético.
    for (const nome of ['controle', 'painel', 'recepcao', 'relatorio']) expressApp.get(`/bio/${nome}`, tela(`bio-${nome}.html`));
    expressApp.get('/bio', (req, res) => res.redirect('/bio/controle'));
    // Atalho: quem digita só "/controle" cai na tela de controle do módulo bioenergético.
    expressApp.get('/controle', (req, res) => res.redirect('/bio/controle'));
}

module.exports = { registrarRotas };
