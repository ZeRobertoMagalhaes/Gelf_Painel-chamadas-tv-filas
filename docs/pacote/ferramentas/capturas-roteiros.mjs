// Tira as capturas de tela dos roteiros rápidos (docs/pacote/img/*.webp) usando o sistema de verdade.
// Sobe uma CÓPIA do sistema em pasta temporária (nada é gravado em dados/), com pacientes de exemplo,
// abre o Chrome e percorre os dois fluxos (Evangelho Terapia e Bio Energia).
// Uso (na raiz do projeto):   CHROME_PATH=/usr/bin/google-chrome node docs/pacote/ferramentas/capturas-roteiros.mjs
// Requer: Node 22+ (WebSocket nativo), Chrome/Chromium e as dependências do projeto instaladas (npm ci).
import { createRequire } from 'module';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SAIDA = path.join(RAIZ, 'docs/pacote/img');
const CHROME = process.env.CHROME_PATH || 'google-chrome';
const PORTA = 3931;
const DEBUG = 9335;
const URL_BASE = `http://localhost:${PORTA}`;
const { io } = createRequire(path.join(RAIZ, 'package.json'))('socket.io-client');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- sistema temporário
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gelf-capturas-'));
for (const d of ['server', 'public', 'config']) fs.cpSync(path.join(RAIZ, d), path.join(tmp, d), { recursive: true });
fs.copyFileSync(path.join(RAIZ, 'package.json'), path.join(tmp, 'package.json'));
fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(tmp, 'node_modules'));
fs.mkdirSync(path.join(tmp, 'dados'));
const servidor = spawn(process.execPath, ['server/index.js'], { cwd: tmp, env: { ...process.env, PORT: String(PORTA) }, stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${path.join(tmp, 'perfil')}`, 'about:blank'], { stdio: 'ignore' });
function encerrar() {
  servidor.kill();
  chrome.kill();
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.on('exit', encerrar);
await esperar(3000);

// ---------------------------------------------------------------- Chrome (CDP)
const alvo = (await (await fetch(`http://localhost:${DEBUG}/json`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const pend = {};
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  pend[d.id]?.(d.result);
};
const cdp = (method, params = {}) => new Promise((r) => { pend[++seq] = r; ws.send(JSON.stringify({ id: seq, method, params })); });
const js = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;

let modoCelular = false; // no celular a captura é da página inteira (rolagem incluída)
async function ir(caminho, { w = 1366, h = 860, celular = false } = {}) {
  modoCelular = celular;
  await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: celular ? 2 : 1, mobile: celular });
  await cdp('Page.navigate', { url: URL_BASE + caminho });
  await esperar(1800);
}
const clicar = (texto, seletor = 'button') =>
  js(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(seletor)})].find((x) => x.textContent.trim().includes(${JSON.stringify(texto)})); if (!b) return false; b.click(); return true; })()`);
const preencher = (seletor, valor) =>
  js(`(() => { const e = document.querySelector(${JSON.stringify(seletor)}); e.focus(); e.value = ${JSON.stringify(valor)}; e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
async function foto(nome, seletor) {
  await esperar(500);
  let clip;
  if (seletor) {
    const r = await js(`(() => { const e = ${seletor}; if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; })()`);
    if (r) clip = { ...r, scale: 1 };
  } else if (modoCelular) {
    const r = await js('({ width: document.documentElement.clientWidth, height: document.documentElement.scrollHeight })');
    clip = { x: 0, y: 0, ...r, scale: 1 };
  }
  const r = await cdp('Page.captureScreenshot', { format: 'webp', quality: 82, ...(clip ? { clip, captureBeyondViewport: true } : {}) });
  fs.writeFileSync(path.join(SAIDA, `${nome}.webp`), Buffer.from(r.data, 'base64'));
  console.log('ok', nome);
}

// ---------------------------------------------------------------- ações no servidor (dados de exemplo)
function conectar(ns) {
  const s = io(URL_BASE + ns);
  const est = { v: null };
  s.on('estado', (e) => (est.v = e));
  return new Promise((r) => s.once('connect', () => setTimeout(() => r({ s, est }), 300)));
}
const agir = (c, tipo, payload = {}) =>
  new Promise((r) => c.s.emit('acao', tipo, payload, (x) => setTimeout(() => r(x), 80)));

fs.mkdirSync(SAIDA, { recursive: true });
const filas = await conectar('');
const bio = await conectar('/bio');
const idDe = (c, nome) => c.est.v.pacientes.find((p) => p.nome === nome).id;
const secao = (titulo) => `[...document.querySelectorAll('section')].find((s) => s.querySelector('h2')?.textContent.includes(${JSON.stringify(titulo)}))`;

// ---------------------------------------------------------------- janela do sistema (texto igual ao do ligador)
{
  const ip = execSync("hostname -I | awk '{print $1}'").toString().trim() || '192.168.0.10';
  const linhas = [
    '==========================================',
    ' PAINEL GELF - Filas e Bio',
    '==========================================',
    ' Pagina inicial (links de todas as telas e QR code para o celular):',
    '     http://localhost:3000',
    ` Em outros aparelhos da mesma rede:  http://${ip}:3000`,
    '',
    ' O navegador vai abrir na pagina inicial em instantes.',
    ' PARA ENCERRAR: feche esta janela ou pressione Ctrl+C.',
    '------------------------------------------',
    'Painel GELF (filas) em http://0.0.0.0:3000',
  ];
  const html = `<body style="margin:0;background:#2b2b2b"><div id="t" style="display:inline-block;margin:0;padding:14px 18px;background:#1e1e1e;color:#e5e5e5;font:15px/1.45 'DejaVu Sans Mono',monospace;border-top:26px solid #3c3c3c;white-space:pre">${linhas.join('\n').replace(/</g, '&lt;')}</div></body>`;
  await cdp('Emulation.setDeviceMetricsOverride', { width: 760, height: 400, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });
  await esperar(500);
  await foto('00-janela-do-sistema', "document.getElementById('t')");
}

// ================================================================ EVANGELHO TERAPIA (filas)
await ir('/', { w: 900, h: 900 });
await foto('e-01-pagina-inicial', secao('Evangelho Terapia'));

await ir('/recepcao');
await foto('e-02-recepcao-fechada');
await agir(filas, 'abrirAtendimento');
for (const [n, t] of [['Maria Souza', 'reiki'], ['João Pereira', 'reiki'], ['Ana Paula Lima', 'gao'], ['Carlos Mendes', 'apometrico'], ['Helena Rocha', 'acolhimento']]) {
  await agir(filas, 'cadastrar', { nome: n, tratamento: t });
}
await agir(filas, 'priorizar', { id: idDe(filas, 'João') });
await ir('/recepcao');
await preencher('#nome', 'Beatriz Alves Costa');
await clicar('Reiki', 'button.chip-trat');
await foto('e-03-recepcao-cadastro');
await clicar('Cadastrar');
await esperar(600);
await foto('e-04-recepcao-filas');

await js("localStorage.clear()");
await ir('/atendimento', { w: 390, h: 800, celular: true });
await foto('e-05-atendimento-escolher');
await clicar('Reiki', 'button.trat-botao');
await esperar(500);
await clicar('1', 'button.room-chip');
await foto('e-06-atendimento-chamar');

await ir('/painel', { w: 1280, h: 720 });
await agir(filas, 'chamarProximo', { tratamento: 'reiki', sala: 'Sala 1', equipeId: 'exemplo' });
await esperar(1500);
await foto('e-07-tv-chamada');

await ir('/atendimento', { w: 390, h: 800, celular: true });
await foto('e-08-atendimento-chamado');
await clicar('Iniciar atendimento');
await foto('e-09-atendimento-em-atendimento');
await clicar('Concluir atendimento');
await foto('e-10-atendimento-concluido');

await ir('/recepcao');
await clicar('Fechar atendimento');
await esperar(400);
await foto('e-11-recepcao-fechar');
await ir('/relatorio', { h: 760 });
await foto('e-12-relatorio');

// ================================================================ BIO ENERGIA
await ir('/', { w: 900, h: 900 });
await foto('b-01-pagina-inicial', secao('Bio Energia'));

await ir('/bio/controle', { h: 1000 });
await preencher('#pre', 'Rita Gomes ; 31/10 ; ansiedade\nPaulo Dias ; 31/10 ; dor nas costas');
await foto('b-02-controle-abertura');
await clicar('Abrir o dia');
await esperar(700);
for (const [n, pri] of [['Marta Souza', false], ['José Almeida', true], ['Luiza Prado', false], ['Rafael Costa', false]]) {
  const r = await agir(bio, 'registrarChegada', { nome: n });
  if (pri && r?.paciente) await agir(bio, 'priorizar', { id: r.paciente.id });
}
await ir('/bio/recepcao');
await preencher('#rnome', 'Sandra Ribeiro Lima');
await foto('b-03-recepcao-cadastro');
await clicar('Cadastrar');
await esperar(600);

await ir('/bio/controle', { h: 900 });
await foto('b-04-controle-espera');

const salasDe = (etapa) => bio.est.v.salas.filter((s) => s.etapa === etapa);
await ir('/bio/painel', { w: 1280, h: 720 });
await agir(bio, 'chamarProximo', { salaId: salasDe('captacao')[0].id });
await esperar(1500);
await foto('b-05-tv-chamada');

await ir('/bio/controle', { h: 900 });
await foto('b-06-controle-chamado');
await clicar('Iniciar');
await foto('b-07-controle-em-atendimento');

// avança o primeiro paciente: captação → doutores (prontuário) → reiki
const pac = bio.est.v.pacientes.find((p) => p.situacao === 'em_atendimento');
await agir(bio, 'concluir', { id: pac.id });
await agir(bio, 'chamar', { pacienteId: pac.id, salaId: salasDe('doutores')[0].id });
await agir(bio, 'iniciar', { id: pac.id });
await agir(bio, 'registrarProntuario', { id: pac.id });
await ir('/bio/controle', { h: 900 });
await foto('b-08-controle-doutores-prontuario');
await agir(bio, 'concluir', { id: pac.id });
await agir(bio, 'chamar', { pacienteId: pac.id, salaId: salasDe('reiki')[0].id });
await agir(bio, 'iniciar', { id: pac.id });
await ir('/bio/controle', { h: 900 });
await foto('b-09-controle-reiki-guardar');

await ir('/bio/relatorio', { h: 760 });
await foto('b-10-relatorio');
await ir('/bio/controle', { h: 900 });
await clicar('Fechar o dia');
await esperar(400);
await foto('b-11-controle-fechar');

filas.s.close();
bio.s.close();
ws.close();

process.exit(0);
