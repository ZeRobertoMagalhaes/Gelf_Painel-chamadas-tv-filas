// Abre o Painel de TV em tela cheia (modo quiosque) no PC ligado à TV.
// Espera o servidor responder antes de abrir e reabre o navegador se ele
// fechar ou travar. Funciona no Windows e no Linux e só usa módulos do próprio Node.
//
// Variáveis opcionais:
//   PAINEL_URL      endereço do painel (padrão: http://localhost:3000/painel)
//   PAINEL_BROWSER  caminho do navegador, se a detecção automática não achar

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const PAINEL_URL = process.env.PAINEL_URL || 'http://localhost:3000/painel';
const STATUS_URL = new URL('/status', PAINEL_URL).href;
const PERFIL = path.join(os.homedir(), '.painel-gelf-filas-kiosk');
const ESPERA_MS = 3000;
const ESPERA_APOS_FALHA_RAPIDA_MS = 15000;
const FALHA_RAPIDA_MS = 5000;

const log = (msg) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);
const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function candidatosDeNavegador() {
    if (process.env.PAINEL_BROWSER) return [process.env.PAINEL_BROWSER];
    if (process.platform === 'win32') {
        const pastas = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean);
        const relativos = [
            'Microsoft\\Edge\\Application\\msedge.exe',
            'Google\\Chrome\\Application\\chrome.exe',
        ];
        return pastas.flatMap((pasta) => relativos.map((rel) => path.join(pasta, rel)));
    }
    return ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome'];
}

function acharNavegador() {
    return candidatosDeNavegador().find((caminho) => fs.existsSync(caminho));
}

function argumentosDoNavegador() {
    const args = [
        '--kiosk',
        `--user-data-dir=${PERFIL}`,
        '--no-first-run',
        '--noerrdialogs',
        '--disable-infobars',
        '--disable-session-crashed-bubble',
        '--autoplay-policy=no-user-gesture-required',
        '--overscroll-history-navigation=0',
    ];
    if (process.platform === 'win32') args.push('--edge-kiosk-type=fullscreen');
    args.push(PAINEL_URL);
    return args;
}

// Só considera "no ar" se quem responde é mesmo o Painel GELF (e não outro
// programa que por acaso use a mesma porta).
function servidorRespondendo() {
    return new Promise((resolve) => {
        const req = http.get(STATUS_URL, { timeout: 2000 }, (res) => {
            let corpo = '';
            res.on('data', (parte) => (corpo += parte));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(corpo).servico === 'painel-gelf-filas');
                } catch {
                    resolve(false);
                }
            });
        });
        req.on('timeout', () => req.destroy());
        req.on('error', () => resolve(false));
    });
}

async function esperarServidor() {
    let tentativas = 0;
    while (!(await servidorRespondendo())) {
        if (tentativas % 10 === 0) log(`Aguardando o servidor em ${STATUS_URL} ...`);
        tentativas += 1;
        await dormir(ESPERA_MS);
    }
}

async function principal() {
    const navegador = acharNavegador();
    if (!navegador) {
        log('Nenhum navegador encontrado (Edge/Chrome/Chromium). Defina PAINEL_BROWSER com o caminho do .exe.');
        process.exit(1);
    }
    log(`Navegador: ${navegador}`);

    for (;;) {
        await esperarServidor();
        log(`Servidor no ar. Abrindo ${PAINEL_URL}`);

        const inicio = Date.now();
        await new Promise((resolve) => {
            const processo = spawn(navegador, argumentosDoNavegador(), { stdio: 'ignore' });
            processo.on('error', (erro) => {
                log(`Falha ao abrir o navegador: ${erro.message}`);
                resolve();
            });
            processo.on('exit', () => resolve());
        });

        const duracao = Date.now() - inicio;
        log(`Navegador fechou depois de ${Math.round(duracao / 1000)} s. Reabrindo...`);
        await dormir(duracao < FALHA_RAPIDA_MS ? ESPERA_APOS_FALHA_RAPIDA_MS : ESPERA_MS);
    }
}

principal();
